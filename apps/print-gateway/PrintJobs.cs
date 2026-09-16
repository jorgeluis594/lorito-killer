using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Lorito.PrintGateway;

public sealed record PrintClaim(string JobId, int AttemptNumber, string PrinterId, string PrinterLocalName, byte[] Content, DateTimeOffset AttemptExpiresAt, DateTimeOffset ServerNow);
public sealed class InvalidClaimException(int attemptNumber, string message) : Exception(message) { public int AttemptNumber { get; } = attemptNumber; }
public sealed record PrintBackendResult(string JobId, int AttemptNumber, string Status, bool HttpSuccess);
public sealed record PrintJournal(string JobId, int AttemptNumber, string PrinterId, string PrinterLocalName, string ContentSha256, string Phase, string? Result, string? Error, bool BackendConfirmed);

public sealed class BackendClient(HttpClient httpClient, GatewayConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    public async Task<Binding?> LinkAsync(string code, string machineName, CancellationToken cancellationToken)
    {
        using var response = await httpClient.PostAsJsonAsync(new Uri(new Uri(configuration.BackendUrl), "/api/printing/clients/link"), new { code, machineName }, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;
        var envelope = await response.Content.ReadFromJsonAsync<LinkEnvelope>(cancellationToken);
        var data = envelope?.Data;
        return data is null ? null : new(data.Id, data.CompanyId, data.CompanyName, configuration.BackendUrl, data.Credential);
    }

    public async Task PublishInventoryAsync(Binding binding, PrinterInventory inventory, CancellationToken cancellationToken)
    {
        EnsureEnvironment(binding);
        using var request = Authorized(HttpMethod.Post, "/api/printing/clients/printers", binding);
        request.Content = JsonContent.Create(new { version = inventory.Version, printers = inventory.Printers.Select(localName => new { localName }) });
        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<PrintClaim?> ClaimAsync(Binding binding, string jobId, CancellationToken cancellationToken)
    {
        EnsureEnvironment(binding);
        using var request = Authorized(HttpMethod.Post, $"/api/printing/jobs/{Uri.EscapeDataString(jobId)}/claim", binding);
        using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var body = await ReadLimitedAsync(response, 2 * 1024 * 1024, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;
        var envelope = JsonSerializer.Deserialize<ClaimEnvelope>(body, JsonOptions);
        var data = envelope?.Data ?? throw new InvalidDataException("Claim response has no data");
        if (data.AttemptNumber <= 0 || string.IsNullOrWhiteSpace(data.JobId) || data.JobId != jobId || string.IsNullOrWhiteSpace(data.PrinterId) || string.IsNullOrWhiteSpace(data.PrinterLocalName) || data.AttemptExpiresAt.Offset != TimeSpan.Zero || data.ServerNow.Offset != TimeSpan.Zero)
            throw new InvalidClaimException(data.AttemptNumber, "Invalid claim identity or dates");
        byte[] content;
        try { content = Convert.FromBase64String(data.ContentBase64); } catch (FormatException) { throw new InvalidClaimException(data.AttemptNumber, "Invalid claim content"); }
        if (content.Length > 1024 * 1024) throw new InvalidClaimException(data.AttemptNumber, "Claim content exceeds 1 MiB");
        return new(data.JobId, data.AttemptNumber, data.PrinterId, data.PrinterLocalName, content, data.AttemptExpiresAt, data.ServerNow);
    }

    public async Task<PrintBackendResult> ReportAsync(Binding binding, string jobId, int attemptNumber, string result, string? error, CancellationToken cancellationToken)
    {
        EnsureEnvironment(binding);
        using var request = Authorized(HttpMethod.Post, $"/api/printing/jobs/{Uri.EscapeDataString(jobId)}/result", binding);
        request.Content = JsonContent.Create(new { attemptNumber, result, error });
        using var response = await httpClient.SendAsync(request, cancellationToken);
        var body = await ReadLimitedAsync(response, 2 * 1024 * 1024, cancellationToken);
        var envelope = JsonSerializer.Deserialize<ResultEnvelope>(body, JsonOptions);
        return new(envelope?.Data?.JobId ?? jobId, envelope?.Data?.AttemptNumber ?? attemptNumber, envelope?.Data?.Status ?? result, response.IsSuccessStatusCode);
    }

    private HttpRequestMessage Authorized(HttpMethod method, string path, Binding binding)
    {
        var request = new HttpRequestMessage(method, new Uri(new Uri(configuration.BackendUrl), path));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", binding.Credential);
        return request;
    }
    private void EnsureEnvironment(Binding binding) { if (!string.Equals(binding.BackendUrl, configuration.BackendUrl, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("The configured backend does not match the linked environment"); }
    private static async Task<byte[]> ReadLimitedAsync(HttpResponseMessage response, int limit, CancellationToken cancellationToken)
    {
        await using var input = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var output = new MemoryStream();
        var buffer = new byte[8192];
        while (true)
        {
            var count = await input.ReadAsync(buffer, cancellationToken);
            if (count == 0) break;
            if (output.Length + count > limit) throw new InvalidDataException("HTTP response exceeds limit");
            output.Write(buffer, 0, count);
        }
        return output.ToArray();
    }
    private sealed record LinkEnvelope(bool Success, LinkData? Data);
    private sealed record LinkData(string Id, string CompanyId, string? CompanyName, string Credential);
    private sealed record ClaimEnvelope(bool Success, ClaimData? Data);
    private sealed record ClaimData(string JobId, int AttemptNumber, string PrinterId, string PrinterLocalName, int TimeoutMs, string ContentBase64, DateTimeOffset AttemptExpiresAt, DateTimeOffset ServerNow);
    private sealed record ResultEnvelope(bool Success, ResultData? Data);
    private sealed record ResultData(string JobId, int AttemptNumber, string Status, DateTimeOffset? NextAttemptAt);
}

public sealed class JournalStore
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    private readonly string root;
    private readonly object gate = new();
    public JournalStore(string? root = null) => this.root = root ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Lorito", "PrintGateway", "jobs");
    public PrintJournal? Read(string jobId)
    {
        lock (gate)
        {
            var path = PathFor(jobId);
            if (!File.Exists(path)) return null;
            try { return JsonSerializer.Deserialize<PrintJournal>(File.ReadAllBytes(path), Options) ?? throw new InvalidDataException("Invalid journal"); }
            catch (JsonException exception) { throw new InvalidDataException("Invalid journal", exception); }
        }
    }
    public void Write(PrintJournal journal)
    {
        lock (gate)
        {
            Directory.CreateDirectory(root);
            var path = PathFor(journal.JobId);
            var temp = path + ".tmp";
            using (var stream = new FileStream(temp, FileMode.Create, FileAccess.Write, FileShare.None)) { JsonSerializer.Serialize(stream, journal, Options); stream.Flush(true); }
            File.Move(temp, path, true);
        }
    }
    private string PathFor(string jobId) => Path.Combine(root, Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(jobId))).ToLowerInvariant() + ".json");
}

public sealed record NativePrintResult(string Result, string? Error);
public interface IRawPrinter { Task<NativePrintResult> PrintAsync(string printerLocalName, byte[] content, CancellationToken cancellationToken); }

public sealed class PrintJobProcessor(BackendClient backend, JournalStore journal, IRawPrinter printer, ILogger<PrintJobProcessor> logger)
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> jobs = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, SemaphoreSlim> printers = new(StringComparer.Ordinal);
    public async Task ProcessAsync(Binding binding, string jobId, CancellationToken cancellationToken)
    {
        var mutex = jobs.GetOrAdd(jobId, _ => new(1, 1));
        await mutex.WaitAsync(cancellationToken);
        try { await ProcessLockedAsync(binding, jobId, cancellationToken); }
        finally { mutex.Release(); }
    }

    private async Task ProcessLockedAsync(Binding binding, string jobId, CancellationToken cancellationToken)
    {
        var previous = journal.Read(jobId);
        if (previous?.Phase == "SENDING") { await Report(binding, previous, "FAILED", "Resultado incierto tras reinicio", cancellationToken); return; }
        if (previous?.Result is { } known) { await Report(binding, previous, known, previous.Error, cancellationToken); return; }

        var started = Stopwatch.GetTimestamp();
        PrintClaim claim;
        try { claim = await backend.ClaimAsync(binding, jobId, cancellationToken) ?? throw new InvalidOperationException("Claim rejected"); }
        catch (InvalidClaimException exception)
        {
            logger.LogError(exception, "Invalid print claim for {JobId}", jobId);
            await Report(binding, new PrintJournal(jobId, exception.AttemptNumber, "", "", "", "RESULT", "FAILED", exception.Message, false), "FAILED", exception.Message, cancellationToken);
            return;
        }
        var hash = Convert.ToHexString(SHA256.HashData(claim.Content));
        if (previous is not null && (previous.AttemptNumber != claim.AttemptNumber || previous.ContentSha256 != hash)) { await Report(binding, previous, "FAILED", "El intento cambió o su contenido no coincide", cancellationToken); return; }
        var printerMutex = printers.GetOrAdd(claim.PrinterId, _ => new(1, 1));
        await printerMutex.WaitAsync(cancellationToken);
        var release = true;
        try
        {
            var remaining = claim.AttemptExpiresAt - claim.ServerNow - Stopwatch.GetElapsedTime(started);
            if (remaining <= TimeSpan.Zero) { await SaveAndReport(binding, claim, hash, "FAILED", "El plazo del intento expiró", cancellationToken); return; }
            var record = new PrintJournal(claim.JobId, claim.AttemptNumber, claim.PrinterId, claim.PrinterLocalName, hash, "SENDING", null, null, false);
            journal.Write(record);
            var nativeTask = printer.PrintAsync(claim.PrinterLocalName, claim.Content, CancellationToken.None);
            NativePrintResult native;
            try { native = await nativeTask.WaitAsync(remaining, cancellationToken); }
            catch (TimeoutException)
            {
                release = false;
                _ = ReleaseWhenDone(nativeTask, printerMutex);
                native = new("FAILED", "La entrega nativa excedió el plazo");
            }
            catch (Exception exception) { native = new("FAILED", exception.Message); }
            await SaveAndReport(binding, claim, hash, native.Result is "DELIVERED" or "RETRYABLE_FAILURE" or "FAILED" ? native.Result : "FAILED", native.Error ?? (native.Result is "DELIVERED" or "RETRYABLE_FAILURE" or "FAILED" ? null : "Resultado nativo inválido"), cancellationToken);
        }
        finally { if (release) printerMutex.Release(); }
    }

    private static async Task ReleaseWhenDone(Task task, SemaphoreSlim mutex) { try { await task; } catch { } finally { mutex.Release(); } }

    private async Task SaveAndReport(Binding binding, PrintClaim claim, string hash, string result, string? error, CancellationToken cancellationToken)
    {
        var record = new PrintJournal(claim.JobId, claim.AttemptNumber, claim.PrinterId, claim.PrinterLocalName, hash, "RESULT", result, error, false);
        journal.Write(record);
        await Report(binding, record, result, error, cancellationToken);
    }
    private async Task Report(Binding binding, PrintJournal record, string result, string? error, CancellationToken cancellationToken)
    {
        try
        {
            var response = await backend.ReportAsync(binding, record.JobId, record.AttemptNumber, result, error, cancellationToken);
            if (!string.Equals(response.Status, result, StringComparison.Ordinal)) logger.LogWarning("Backend status {BackendStatus} differs from local result {LocalResult} for {JobId}", response.Status, result, record.JobId);
            journal.Write(record with { BackendConfirmed = response.HttpSuccess && string.Equals(response.JobId, record.JobId, StringComparison.Ordinal) });
        }
        catch (Exception exception) { logger.LogError(exception, "Print result report failed for {JobId}", record.JobId); }
    }
}

using Lorito.PrintGateway;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Xunit;

namespace Lorito.PrintGateway.Tests;

public sealed class HostTests
{
    [Fact]
    public void Pipe_frames_reject_oversized_payloads_and_preserve_leading_zeroes()
    {
        var frame = PipeProtocol.Frame("{\"version\":1,\"operation\":\"LINK\",\"code\":\"0047\"}");

        Assert.Equal((byte)'{' , frame[4]);
        Assert.Throws<ArgumentOutOfRangeException>(() => PipeProtocol.Frame(new string('x', PipeProtocol.MaxMessageBytes + 1)));
    }

    [Fact]
    public async Task Pipe_handles_camel_case_status_request_and_response()
    {
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        var request = PipeProtocol.Frame("{\"version\":1,\"operation\":\"GET_STATUS\"}");
        var cancellationToken = TestContext.Current.CancellationToken;
        await using var stream = new MemoryStream();
        await stream.WriteAsync(request, cancellationToken);
        stream.Position = 0;
        var store = new BindingStore(root);
        var backend = new BackendClient(new HttpClient(), new GatewayConfiguration());

        await PipeProtocol.HandleAsync(stream, store, backend, _ => Task.CompletedTask, cancellationToken);

        stream.Position = request.Length;
        var response = await PipeProtocol.ReadAsync(stream, cancellationToken);
        using var json = System.Text.Json.JsonDocument.Parse(response);
        Assert.True(json.RootElement.GetProperty("success").GetBoolean());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, json.RootElement.GetProperty("status").ValueKind);
    }

    [Fact]
    public void Configuration_requires_https_and_all_public_runtime_variables()
    {
        var configuration = new GatewayConfiguration();

        Assert.False(configuration.IsValid(out var error));
        Assert.Contains("PRINT_BACKEND_URL", error);
    }

    [Fact]
    public async Task Host_registers_and_stops_worker()
    {
        using var host = Program.CreateHost([]);
        var cancellationToken = TestContext.Current.CancellationToken;

        Assert.Contains(host.Services.GetServices<IHostedService>(), service => service is Worker);

        await host.StartAsync(cancellationToken);
        await host.StopAsync(cancellationToken);
    }

    [Fact]
    public void Journal_is_atomic_and_does_not_store_printable_bytes_or_external_path_data()
    {
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        store.Write(new PrintJournal("job/with\\separators", 1, "printer", "Kitchen", "ABC123", "SENDING", null, null, false));

        var journal = store.Read("job/with\\separators");
        Assert.NotNull(journal);
        Assert.Equal("SENDING", journal.Phase);
        Assert.DoesNotContain("job/with", Directory.GetFiles(root).Single());
        using var json = System.Text.Json.JsonDocument.Parse(File.ReadAllText(Directory.GetFiles(root).Single()));
        Assert.False(json.RootElement.TryGetProperty("content", out _));
    }

    [Fact]
    public void Journal_requires_existing_writable_storage_and_ignores_incomplete_temp_files()
    {
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        var store = new JournalStore(root);

        Assert.Throws<IOException>(() => store.EnsureReady());
        Directory.CreateDirectory(root);
        File.WriteAllText(Path.Combine(root, "orphan.json.tmp"), "{}");
        store.EnsureReady();
        Assert.Null(store.Read("missing"));
    }

    [Fact]
    public void Journal_cleanup_only_removes_confirmed_terminal_records_after_thirty_days()
    {
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        store.Write(new PrintJournal("old", 1, "p", "P", "hash", "RESULT", "DELIVERED", null, true, DateTimeOffset.UtcNow.AddDays(-31)));
        store.Write(new PrintJournal("pending", 1, "p", "P", "hash", "RESULT", "FAILED", null, false, null));

        Assert.Equal(1, store.Cleanup(DateTimeOffset.UtcNow));
        Assert.Null(store.Read("old"));
        Assert.NotNull(store.Read("pending"));
    }

    [Fact]
    public void Daily_logs_are_rotated_after_seven_days_and_redact_credentials_and_content()
    {
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        var provider = new DailyFileLoggerProvider(root);
        provider.CreateLogger("test").LogInformation("operation=report credential=secret contentBase64=bytes");

        var log = Directory.GetFiles(root, "*.log").Single();
        var old = Path.Combine(root, "gateway-old.log");
        File.WriteAllText(old, "old");
        File.SetLastWriteTimeUtc(old, DateTime.UtcNow.AddDays(-8));

        Assert.DoesNotContain("secret", File.ReadAllText(log));
        Assert.DoesNotContain("bytes", File.ReadAllText(log));
        Assert.Equal(1, provider.Cleanup(DateTimeOffset.UtcNow));
        Assert.False(File.Exists(old));
        Assert.True(File.Exists(log));
    }
}

using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Lorito.PrintGateway;
using Xunit;

namespace Lorito.PrintGateway.Tests;

public sealed class PrintJobsTests
{
    [Fact]
    public async Task Authorized_job_is_sent_once_and_duplicate_reports_without_resending()
    {
        var bytes = Encoding.UTF8.GetBytes("ESC/POS");
            var handler = new StubHandler(bytes);
            var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
            var printer = new CapturingPrinter();
            var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(root);
            var store = new JournalStore(root);
            var processor = new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance);
            var binding = new Binding("client", "company", "Company", "https://backend.test", "lpk_test");

            await processor.ProcessAsync(binding, "00000000-0000-0000-0000-000000000001", CancellationToken.None);
            await processor.ProcessAsync(binding, "00000000-0000-0000-0000-000000000001", CancellationToken.None);

            Assert.Equal(1, printer.Calls);
            Assert.Equal(bytes, printer.Bytes);
            Assert.Equal(1, handler.ReportCalls);
            using var report = System.Text.Json.JsonDocument.Parse(handler.LastReportBody!);
            Assert.False(report.RootElement.TryGetProperty("error", out _));
            Assert.Equal("RESULT", store.Read("00000000-0000-0000-0000-000000000001")?.Phase);
    }

    [Fact]
    public async Task Lost_report_for_retryable_failure_does_not_resend_duplicate_attempt()
    {
        var handler = new DuplicateAttemptHandler(Encoding.UTF8.GetBytes("ESC/POS"));
        var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
        var printer = new CapturingPrinter { Result = new("RETRYABLE_FAILURE", "offline") };
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        var processor = new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance);

        await processor.ProcessAsync(Binding(), "job", CancellationToken.None);
        await processor.ProcessAsync(Binding(), "job", CancellationToken.None);

        Assert.Equal(1, printer.Calls);
        Assert.Equal(2, handler.Claims);
        Assert.Equal(2, handler.Reports);
        Assert.Equal("RETRYABLE_FAILURE", handler.LastResult);
        Assert.Equal("offline", handler.LastError);
    }

    [Fact]
    public async Task Sending_after_restart_is_reported_uncertain_without_resending()
    {
        var handler = new StubHandler(Encoding.UTF8.GetBytes("ESC/POS"));
        var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
        var printer = new CapturingPrinter();
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        store.Write(new PrintJournal("job", 1, "printer-1", "Kitchen", "hash", "SENDING", null, null, false));

        await new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance).ProcessAsync(Binding(), "job", CancellationToken.None);

        Assert.Equal(0, printer.Calls);
        Assert.Equal("FAILED", store.Read("job")?.Result);
        Assert.Equal(1, handler.ReportCalls);
    }

    [Fact]
    public async Task Safe_failure_can_only_continue_with_a_new_backend_attempt_and_keeps_history()
    {
        var handler = new SequencedHandler();
        var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
        var printer = new CapturingPrinter { Result = new("RETRYABLE_FAILURE", "offline") };
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        var processor = new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance);

        await processor.ProcessAsync(Binding(), "job", CancellationToken.None);
        printer.Result = new("DELIVERED", null);
        await processor.ProcessAsync(Binding(), "job", CancellationToken.None);

        var journal = store.Read("job");
        Assert.Equal(2, printer.Calls);
        Assert.Equal(2, handler.Claims);
        Assert.Contains(journal!.History!, entry => entry.AttemptNumber == 1);
        Assert.Equal(2, journal.AttemptNumber);
    }

    [Fact]
    public async Task A_blocked_printer_fails_safe_while_another_printer_continues()
    {
        var handler = new TwoPrinterHandler();
        var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
        var printer = new BlockingPrinter();
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        var processor = new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance);

        var first = processor.ProcessAsync(Binding(), "job-1", CancellationToken.None);
        await printer.Started.Task;
        await processor.ProcessAsync(Binding(), "job-2", CancellationToken.None);
        await processor.ProcessAsync(Binding(), "job-3", CancellationToken.None);

        Assert.Equal(2, printer.Calls);
        Assert.Equal("RETRYABLE_FAILURE", store.Read("job-2")?.Result);
        Assert.Equal("DELIVERED", store.Read("job-3")?.Result);
        printer.Release.TrySetResult(true);
        await first;
    }

    [Fact]
    public void Journal_scan_returns_only_valid_unconfirmed_json_records()
    {
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        store.Write(new PrintJournal("pending", 1, "p", "P", "hash", "RESULT", "DELIVERED", null, false));
        store.Write(new PrintJournal("confirmed", 1, "p", "P", "hash", "RESULT", "DELIVERED", null, true));
        File.WriteAllText(Path.Combine(root, "broken.json"), "{");
        File.WriteAllText(Path.Combine(root, "temporary.json.tmp"), "{}");

        var journals = store.ReadUnconfirmed();

        Assert.Single(journals);
        Assert.Equal("pending", journals[0].JobId);
    }

    [Fact]
    public async Task Reconciliation_retries_a_failed_report_without_claiming_or_printing()
    {
        var handler = new ReconciliationHandler("DELIVERED") { FailReports = 1 };
        var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
        var printer = new CapturingPrinter();
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        store.Write(new PrintJournal("job", 1, "printer", "Kitchen", "hash", "RESULT", "DELIVERED", null, false));
        var processor = new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance);

        await processor.ReconcileAsync(Binding(), CancellationToken.None);
        await processor.ReconcileAsync(Binding(), CancellationToken.None);

        Assert.Equal(0, handler.Claims);
        Assert.Equal(2, handler.Reports);
        Assert.True(store.Read("job")!.BackendConfirmed);
        Assert.Equal(0, printer.Calls);
    }

    [Fact]
    public async Task Reconciliation_reports_sending_as_uncertain_without_printing()
    {
        var handler = new ReconciliationHandler("FAILED");
        var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
        var printer = new CapturingPrinter();
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        store.Write(new PrintJournal("job", 1, "printer", "Kitchen", "hash", "SENDING", null, null, false));

        await new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance).ReconcileAsync(Binding(), CancellationToken.None);

        Assert.Equal(0, handler.Claims);
        Assert.Equal(1, handler.Reports);
        Assert.Equal("FAILED", store.Read("job")!.Result);
        Assert.Equal(0, printer.Calls);
    }

    [Fact]
    public async Task Retryable_failure_is_confirmed_by_pending_backend_status()
    {
        var handler = new ReconciliationHandler("PENDING");
        var backend = new BackendClient(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var store = new JournalStore(root);
        store.Write(new PrintJournal("job", 1, "printer", "Kitchen", "hash", "RESULT", "RETRYABLE_FAILURE", "offline", false));

        await new PrintJobProcessor(backend, store, new CapturingPrinter(), NullLogger<PrintJobProcessor>.Instance).ReconcileAsync(Binding(), CancellationToken.None);

        Assert.True(store.Read("job")!.BackendConfirmed);
    }

    [Fact]
    public async Task Retryable_failure_is_confirmed_by_failed_backend_status_without_reconciliation_retry()
    {
        var handler = new ReconciliationHandler("FAILED");
        var store = Store();
        store.Write(new PrintJournal("job", 1, "printer", "Kitchen", "hash", "RESULT", "RETRYABLE_FAILURE", "offline", false));
        var processor = new PrintJobProcessor(Backend(handler), store, new CapturingPrinter(), NullLogger<PrintJobProcessor>.Instance);

        await processor.ReconcileAsync(Binding(), CancellationToken.None);
        await processor.ReconcileAsync(Binding(), CancellationToken.None);

        var saved = store.Read("job")!;
        Assert.True(saved.BackendConfirmed);
        Assert.Equal("RETRYABLE_FAILURE", saved.Result);
        Assert.Equal("FAILED", saved.BackendStatus);
        Assert.Equal(1, handler.Reports);
    }

    [Fact]
    public async Task Report_from_another_attempt_is_not_confirmed()
    {
        var handler = new ReconciliationHandler("FAILED") { AttemptNumber = 2 };
        var store = Store();
        store.Write(new PrintJournal("job", 1, "printer", "Kitchen", "hash", "RESULT", "RETRYABLE_FAILURE", "offline", false));

        await new PrintJobProcessor(Backend(handler), store, new CapturingPrinter(), NullLogger<PrintJobProcessor>.Instance).ReconcileAsync(Binding(), CancellationToken.None);

        Assert.False(store.Read("job")!.BackendConfirmed);
    }

    [Fact]
    public void Cleanup_removes_old_retryable_failure_confirmed_as_failed()
    {
        var store = Store();
        store.Write(new PrintJournal("job", 1, "printer", "Kitchen", "hash", "RESULT", "RETRYABLE_FAILURE", "offline", true, DateTimeOffset.UtcNow.AddDays(-31), "FAILED"));

        Assert.Equal(1, store.Cleanup(DateTimeOffset.UtcNow));
        Assert.Null(store.Read("job"));
    }

    [Fact]
    public void Reconciliation_jitter_stays_between_four_and_six_seconds()
    {
        foreach (var value in Enumerable.Range(0, 101).Select(index => index / 100d))
            Assert.InRange(Worker.ReconciliationDelay(() => value).TotalSeconds, 4, 6);
    }

    private static Binding Binding() => new("client", "company", "Company", "https://backend.test", "lpk_test");
    private static BackendClient Backend(HttpMessageHandler handler) => new(new HttpClient(handler), new GatewayConfiguration("https://backend.test", "https://supabase.test", "key"));
    private static JournalStore Store()
    {
        var root = Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        return new(root);
    }

    private sealed class CapturingPrinter : IRawPrinter
    {
        public int Calls { get; private set; }
        public byte[]? Bytes { get; private set; }
        public NativePrintResult Result { get; set; } = new("DELIVERED", null);
        public Task<NativePrintResult> PrintAsync(string printerLocalName, byte[] content, CancellationToken cancellationToken)
        {
            Calls++;
            Bytes = content;
            return Task.FromResult(Result);
        }
    }

    private sealed class BlockingPrinter : IRawPrinter
    {
        public int Calls { get; private set; }
        public TaskCompletionSource<bool> Started { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<bool> Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public async Task<NativePrintResult> PrintAsync(string name, byte[] content, CancellationToken cancellationToken)
        {
            Calls++;
            if (name == "blocked") { Started.SetResult(true); await Release.Task; }
            return new("DELIVERED", null);
        }
    }

    private class StubHandler(byte[] content) : HttpMessageHandler
    {
        protected byte[] Content { get; } = content;
        public int ReportCalls { get; private set; }
        public string? LastReportBody { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath.EndsWith("/claim", StringComparison.Ordinal) == true)
            {
                var now = DateTimeOffset.UtcNow;
                var json = $"{{\"success\":true,\"data\":{{\"jobId\":\"00000000-0000-0000-0000-000000000001\",\"attemptNumber\":1,\"printerId\":\"printer-1\",\"printerLocalName\":\"Kitchen\",\"timeoutMs\":10000,\"contentBase64\":\"{Convert.ToBase64String(content)}\",\"attemptExpiresAt\":\"{now.AddSeconds(10):O}\",\"serverNow\":\"{now:O}\"}}}}";
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
            }
            ReportCalls++;
            LastReportBody = await request.Content!.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"success\":true,\"data\":{\"jobId\":\"00000000-0000-0000-0000-000000000001\",\"attemptNumber\":1,\"status\":\"DELIVERED\"}}", Encoding.UTF8, "application/json") };
        }
    }

    private sealed class SequencedHandler : StubHandler
    {
        public int Claims { get; private set; }
        public SequencedHandler() : base(Encoding.UTF8.GetBytes("ESC/POS")) { }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath.EndsWith("/claim", StringComparison.Ordinal) == true)
            {
                Claims++;
                var now = DateTimeOffset.UtcNow;
                var json = $"{{\"success\":true,\"data\":{{\"jobId\":\"job\",\"attemptNumber\":{Claims},\"printerId\":\"printer-1\",\"printerLocalName\":\"Kitchen\",\"timeoutMs\":10000,\"contentBase64\":\"{Convert.ToBase64String(Content)}\",\"attemptExpiresAt\":\"{now.AddSeconds(10):O}\",\"serverNow\":\"{now:O}\"}}}}";
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
            }
            return base.SendAsync(request, cancellationToken);
        }
    }

    private sealed class TwoPrinterHandler : StubHandler
    {
        public TwoPrinterHandler() : base(Encoding.UTF8.GetBytes("ESC/POS")) { }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath.EndsWith("/claim", StringComparison.Ordinal) == true)
            {
                var job = request.RequestUri.AbsolutePath.Contains("job-1", StringComparison.Ordinal) ? "job-1" : request.RequestUri.AbsolutePath.Contains("job-2", StringComparison.Ordinal) ? "job-2" : "job-3";
                var printer = job == "job-3" ? "free" : "blocked";
                var now = DateTimeOffset.UtcNow;
                var json = $"{{\"success\":true,\"data\":{{\"jobId\":\"{job}\",\"attemptNumber\":1,\"printerId\":\"{printer}\",\"printerLocalName\":\"{printer}\",\"timeoutMs\":10000,\"contentBase64\":\"{Convert.ToBase64String(Content)}\",\"attemptExpiresAt\":\"{now.AddSeconds(10):O}\",\"serverNow\":\"{now:O}\"}}}}";
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
            }
            return base.SendAsync(request, cancellationToken);
        }
    }

    private sealed class DuplicateAttemptHandler(byte[] content) : StubHandler(content)
    {
        public int Claims { get; private set; }
        public int Reports { get; private set; }
        public string? LastResult { get; private set; }
        public string? LastError { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath.EndsWith("/claim", StringComparison.Ordinal) == true)
            {
                Claims++;
                var now = DateTimeOffset.UtcNow;
                var json = $"{{\"success\":true,\"data\":{{\"jobId\":\"job\",\"attemptNumber\":1,\"printerId\":\"printer-1\",\"printerLocalName\":\"Kitchen\",\"timeoutMs\":10000,\"contentBase64\":\"{Convert.ToBase64String(content)}\",\"attemptExpiresAt\":\"{now.AddSeconds(10):O}\",\"serverNow\":\"{now:O}\"}}}}";
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
            }

            Reports++;
            var body = await request.Content!.ReadAsStringAsync(cancellationToken);
            using var document = System.Text.Json.JsonDocument.Parse(body);
            LastResult = document.RootElement.GetProperty("result").GetString();
            LastError = document.RootElement.GetProperty("error").GetString();
            var success = Reports > 1;
            var status = success ? HttpStatusCode.OK : HttpStatusCode.InternalServerError;
            return new HttpResponseMessage(status) { Content = new StringContent($"{{\"success\":{success.ToString().ToLowerInvariant()},\"data\":{{\"jobId\":\"job\",\"attemptNumber\":1,\"status\":\"{LastResult}\"}}}}", Encoding.UTF8, "application/json") };
        }
    }

    private sealed class ReconciliationHandler(string status) : HttpMessageHandler
    {
        public int Claims { get; private set; }
        public int Reports { get; private set; }
        public int FailReports { get; init; }
        public int AttemptNumber { get; init; } = 1;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath.EndsWith("/claim", StringComparison.Ordinal) == true)
            {
                Claims++;
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Conflict));
            }
            Reports++;
            var successful = Reports > FailReports;
            var responseStatus = successful ? HttpStatusCode.OK : HttpStatusCode.InternalServerError;
            var body = $"{{\"success\":{successful.ToString().ToLowerInvariant()},\"data\":{{\"jobId\":\"job\",\"attemptNumber\":{AttemptNumber},\"status\":\"{status}\"}}}}";
            return Task.FromResult(new HttpResponseMessage(responseStatus) { Content = new StringContent(body, Encoding.UTF8, "application/json") });
        }
    }
}

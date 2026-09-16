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
            Assert.Equal("RESULT", store.Read("00000000-0000-0000-0000-000000000001")?.Phase);
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

    private static Binding Binding() => new("client", "company", "Company", "https://backend.test", "lpk_test");

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
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsolutePath.EndsWith("/claim", StringComparison.Ordinal) == true)
            {
                var now = DateTimeOffset.UtcNow;
                var json = $"{{\"success\":true,\"data\":{{\"jobId\":\"00000000-0000-0000-0000-000000000001\",\"attemptNumber\":1,\"printerId\":\"printer-1\",\"printerLocalName\":\"Kitchen\",\"timeoutMs\":10000,\"contentBase64\":\"{Convert.ToBase64String(content)}\",\"attemptExpiresAt\":\"{now.AddSeconds(10):O}\",\"serverNow\":\"{now:O}\"}}}}";
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") });
            }
            ReportCalls++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"success\":true,\"data\":{\"jobId\":\"00000000-0000-0000-0000-000000000001\",\"attemptNumber\":1,\"status\":\"DELIVERED\"}}", Encoding.UTF8, "application/json") });
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
}

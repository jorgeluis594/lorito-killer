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
            var store = new JournalStore(Path.Combine(Path.GetTempPath(), "lorito-print-tests", Guid.NewGuid().ToString("N")));
            var processor = new PrintJobProcessor(backend, store, printer, NullLogger<PrintJobProcessor>.Instance);
            var binding = new Binding("client", "company", "Company", "https://backend.test", "lpk_test");

            await processor.ProcessAsync(binding, "00000000-0000-0000-0000-000000000001", CancellationToken.None);
            await processor.ProcessAsync(binding, "00000000-0000-0000-0000-000000000001", CancellationToken.None);

            Assert.Equal(1, printer.Calls);
            Assert.Equal(bytes, printer.Bytes);
            Assert.Equal(2, handler.ReportCalls);
            Assert.Equal("RESULT", store.Read("00000000-0000-0000-0000-000000000001")?.Phase);
    }

    private sealed class CapturingPrinter : IRawPrinter
    {
        public int Calls { get; private set; }
        public byte[]? Bytes { get; private set; }
        public Task<NativePrintResult> PrintAsync(string printerLocalName, byte[] content, CancellationToken cancellationToken)
        {
            Calls++;
            Bytes = content;
            return Task.FromResult(new NativePrintResult("DELIVERED", null));
        }
    }

    private sealed class StubHandler(byte[] content) : HttpMessageHandler
    {
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
}

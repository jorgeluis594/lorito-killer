using Lorito.PrintGateway;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
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
}

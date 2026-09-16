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
}

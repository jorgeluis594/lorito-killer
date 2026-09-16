using Lorito.PrintGateway;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace Lorito.PrintGateway.Tests;

public sealed class HostTests
{
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

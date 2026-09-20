using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Lorito.PrintGateway;

public static class Program
{
    public static IHost CreateHost(string[]? args = null)
    {
        var builder = Host.CreateApplicationBuilder(args ?? []);
        builder.Services.AddHostedService<Worker>();
        return builder.Build();
    }

    public static Task Main(string[] args) => CreateHost(args).RunAsync();
}

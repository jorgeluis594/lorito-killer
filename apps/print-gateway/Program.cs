using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Lorito.PrintGateway;

public static class Program
{
    public static IHost CreateHost(string[]? args = null)
    {
        var builder = Host.CreateApplicationBuilder(args ?? []);
        var configuration = new GatewayConfiguration();
        var fileLogger = new DailyFileLoggerProvider(Path.Combine(configuration.DataPath, "logs"));
        builder.Logging.AddProvider(fileLogger);
        builder.Services.AddSingleton(fileLogger);
        builder.Services.AddWindowsService(options => options.ServiceName = "LoritoPrintGateway");
        builder.Services.AddSingleton(configuration);
        builder.Services.AddSingleton(_ => new BindingStore(configuration.DataPath));
#if WINDOWS
        builder.Services.AddSingleton<IPrinterEnumerator, WindowsPrinterEnumerator>();
#else
        builder.Services.AddSingleton<IPrinterEnumerator, EmptyPrinterEnumerator>();
#endif
        builder.Services.AddSingleton<HttpClient>();
        builder.Services.AddSingleton<BackendClient>();
        builder.Services.AddSingleton(_ => new JournalStore(Path.Combine(configuration.DataPath, "jobs")));
#if WINDOWS
        builder.Services.AddSingleton<IRawPrinter, WindowsRawPrinter>();
#else
        builder.Services.AddSingleton<IRawPrinter, UnsupportedRawPrinter>();
#endif
        builder.Services.AddSingleton<PrintJobProcessor>();
        builder.Services.AddSingleton<RealtimeClient>();
        builder.Services.AddHostedService<Worker>();
        return builder.Build();
    }

    public static Task Main(string[] args)
    {
        if (args.Contains("--tray", StringComparer.OrdinalIgnoreCase))
        {
#if WINDOWS
            TrayApp.Run();
            return Task.CompletedTask;
#else
            throw new PlatformNotSupportedException("The tray requires Windows");
#endif
        }
        return CreateHost(args).RunAsync();
    }
}

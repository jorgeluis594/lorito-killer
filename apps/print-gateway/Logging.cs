using System.Text;
using Microsoft.Extensions.Logging;

namespace Lorito.PrintGateway;

public sealed class DailyFileLoggerProvider(string directory) : ILoggerProvider
{
    private readonly object gate = new();
    public ILogger CreateLogger(string categoryName) => new Logger(categoryName, directory, gate);
    public int Cleanup(DateTimeOffset now)
    {
        lock (gate)
        {
            if (!Directory.Exists(directory)) return 0;
            var deleted = 0;
            foreach (var path in Directory.EnumerateFiles(directory, "gateway-*.log"))
                if (File.GetLastWriteTimeUtc(path) < now.UtcDateTime.AddDays(-7)) { File.Delete(path); deleted++; }
            return deleted;
        }
    }
    public void Dispose() { }

    private sealed class Logger(string category, string directory, object gate) : ILogger
    {
        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel level) => level != LogLevel.None;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(level)) return;
            var message = System.Text.RegularExpressions.Regex.Replace(formatter(state, exception), @"(?i)(authorization|credential|contentBase64)\s*[=:]\s*\S+", "$1=[redacted]");
            message = System.Text.RegularExpressions.Regex.Replace(message, @"(?i)Bearer\s+\S+", "Bearer [redacted]");
            var line = $"{DateTimeOffset.UtcNow:O}\t{level}\t{category}\t{id.Id}\t{message}{Environment.NewLine}";
            try
            {
                lock (gate)
                {
                    Directory.CreateDirectory(directory);
                    File.AppendAllText(Path.Combine(directory, $"gateway-{DateTime.UtcNow:yyyy-MM-dd}.log"), line, Encoding.UTF8);
                }
            }
            catch
            {
                if (OperatingSystem.IsWindows())
                    try { System.Diagnostics.EventLog.WriteEntry("LoritoPrintGateway", line, level >= LogLevel.Error ? System.Diagnostics.EventLogEntryType.Error : System.Diagnostics.EventLogEntryType.Information); } catch { }
            }
        }
    }
    private sealed class NullScope : IDisposable { public static readonly NullScope Instance = new(); public void Dispose() { } }
}

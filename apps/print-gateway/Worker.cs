using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Lorito.PrintGateway;

public sealed class Worker(GatewayConfiguration configuration, BindingStore bindingStore, BackendClient backend, RealtimeClient realtime, PrintJobProcessor processor, IPrinterEnumerator printers, ILogger<Worker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!configuration.IsValid(out var error)) { logger.LogError("Invalid configuration: {Error}", error); return; }
        if (!OperatingSystem.IsWindows())
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
            return;
        }
        var binding = bindingStore.Read();
        if (binding is not null)
        {
            await PublishInventory(binding, stoppingToken);
            _ = Listen(binding, stoppingToken);
        }
        while (!stoppingToken.IsCancellationRequested)
        {
            await using var pipe = PipeFactory.Create();
            await pipe.WaitForConnectionAsync(stoppingToken);
            await PipeProtocol.HandleAsync(pipe, bindingStore, backend, binding =>
            {
                _ = PublishInventory(binding, stoppingToken);
                _ = Listen(binding, stoppingToken);
                return Task.CompletedTask;
            }, stoppingToken);
        }
    }

    private async Task PublishInventory(Binding binding, CancellationToken cancellationToken)
    {
        try { await backend.PublishInventoryAsync(binding, printers.Enumerate(), cancellationToken); }
        catch (Exception exception) { logger.LogError(exception, "Printer inventory enumeration failed"); }
    }

    private async Task Listen(Binding binding, CancellationToken cancellationToken)
    {
        try { await realtime.ListenAsync(binding.ClientId, () => PublishInventory(binding, cancellationToken), jobId => processor.ProcessAsync(binding, jobId, cancellationToken), cancellationToken); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
        catch (Exception exception) { logger.LogError(exception, "Realtime subscription failed"); }
    }
}

internal static class PipeFactory
{
    public static NamedPipeServerStream Create()
    {
#if NET10_0_WINDOWS
        var security = new PipeSecurity();
        security.AddAccessRule(new PipeAccessRule("NT AUTHORITY\\INTERACTIVE", PipeAccessRights.ReadWrite, AccessControlType.Allow));
        security.AddAccessRule(new PipeAccessRule("BUILTIN\\Administrators", PipeAccessRights.FullControl, AccessControlType.Allow));
        security.AddAccessRule(new PipeAccessRule("NT AUTHORITY\\SYSTEM", PipeAccessRights.FullControl, AccessControlType.Allow));
        return NamedPipeServerStreamAcl.Create(PipeProtocol.Name, PipeDirection.InOut, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous, 0, 0, security);
#else
        return new NamedPipeServerStream(PipeProtocol.Name, PipeDirection.InOut, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
#endif
    }
}

public sealed record Binding(string ClientId, string CompanyId, string? CompanyName, string BackendUrl, string Credential);
public sealed record PrinterInventory(int Version, IReadOnlyList<string> Printers);
public interface IPrinterEnumerator { PrinterInventory Enumerate(); }
public sealed class EmptyPrinterEnumerator : IPrinterEnumerator { public PrinterInventory Enumerate() => new(1, []); }

public sealed class GatewayConfiguration
{
    public string BackendUrl { get; }
    public string SupabaseUrl { get; }
    public string SupabasePublishableKey { get; }
    public GatewayConfiguration(string? backendUrl = null, string? supabaseUrl = null, string? supabasePublishableKey = null)
    {
        BackendUrl = backendUrl ?? Environment.GetEnvironmentVariable("PRINT_BACKEND_URL") ?? "";
        SupabaseUrl = supabaseUrl ?? Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "";
        SupabasePublishableKey = supabasePublishableKey ?? Environment.GetEnvironmentVariable("SUPABASE_PUBLISHABLE_KEY") ?? "";
    }
    public bool IsValid(out string error)
    {
        if (!Uri.TryCreate(BackendUrl, UriKind.Absolute, out var backend) || backend.Scheme != Uri.UriSchemeHttps) return Fail("PRINT_BACKEND_URL must be HTTPS", out error);
        if (!Uri.TryCreate(SupabaseUrl, UriKind.Absolute, out var supabase) || supabase.Scheme != Uri.UriSchemeHttps) return Fail("SUPABASE_URL must be HTTPS", out error);
        if (string.IsNullOrWhiteSpace(SupabasePublishableKey)) return Fail("SUPABASE_PUBLISHABLE_KEY is required", out error);
        error = ""; return true;
    }
    private static bool Fail(string message, out string error) { error = message; return false; }
}

public sealed class BindingStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string path;
    private readonly object gate = new();
    public BindingStore(string? root = null) => path = Path.Combine(root ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Lorito", "PrintGateway"), "binding.dat");
    public Binding? Read()
    {
        lock (gate)
        {
            if (!File.Exists(path)) return null;
            try { return JsonSerializer.Deserialize<Binding>(Unprotect(File.ReadAllBytes(path)), JsonOptions); } catch { return null; }
        }
    }
    public void Write(Binding binding)
    {
        lock (gate)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var temporary = path + ".tmp";
            using (var stream = new FileStream(temporary, FileMode.Create, FileAccess.Write, FileShare.None)) { stream.Write(Protect(JsonSerializer.SerializeToUtf8Bytes(binding, JsonOptions))); stream.Flush(true); }
            File.Move(temporary, path, true);
        }
    }
    private static byte[] Protect(byte[] value) => WindowsDataProtection.Protect(value);
    private static byte[] Unprotect(byte[] value) => WindowsDataProtection.Unprotect(value);
}

internal static class WindowsDataProtection
{
    public static byte[] Protect(byte[] data) => Transform(data, true);
    public static byte[] Unprotect(byte[] data) => Transform(data, false);

    private static byte[] Transform(byte[] data, bool protect)
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("DPAPI is Windows-only");
        var input = new Blob(data);
        var output = new Blob();
        var success = protect ? CryptProtectData(ref input.Value, "Lorito PrintGateway", IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 4, ref output.Value) : CryptUnprotectData(ref input.Value, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, 4, ref output.Value);
        if (!success) throw new System.ComponentModel.Win32Exception();
        try { return output.ToArray(); } finally { LocalFree(output.Value.pbData); }
    }

    private sealed class Blob
    {
        private readonly IntPtr memory;
        public CRYPT_BLOB Value;
        public Blob(byte[] data) { memory = Marshal.AllocHGlobal(data.Length); Marshal.Copy(data, 0, memory, data.Length); Value = new((uint)data.Length, memory); }
        public Blob() { }
        public byte[] ToArray() { var data = new byte[Value.cbData]; Marshal.Copy(Value.pbData, data, 0, data.Length); return data; }
    }

    [StructLayout(LayoutKind.Sequential)] private struct CRYPT_BLOB(uint size, IntPtr data) { public uint cbData = size; public IntPtr pbData = data; }
    [DllImport("crypt32.dll", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool CryptProtectData(ref CRYPT_BLOB dataIn, string description, IntPtr entropy, IntPtr reserved, IntPtr prompt, uint flags, ref CRYPT_BLOB dataOut);
    [DllImport("crypt32.dll", SetLastError = true)] private static extern bool CryptUnprotectData(ref CRYPT_BLOB dataIn, IntPtr description, IntPtr entropy, IntPtr reserved, IntPtr prompt, uint flags, ref CRYPT_BLOB dataOut);
    [DllImport("kernel32.dll")] private static extern IntPtr LocalFree(IntPtr handle);
}

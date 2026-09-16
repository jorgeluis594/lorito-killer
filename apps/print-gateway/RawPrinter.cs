namespace Lorito.PrintGateway;

#if NET10_0_WINDOWS
using System.Runtime.InteropServices;
using System.Text;

public sealed class WindowsRawPrinter : IRawPrinter
{
    public Task<NativePrintResult> PrintAsync(string printerLocalName, byte[] content, CancellationToken cancellationToken)
    {
        if (!OpenPrinter(printerLocalName, out var handle, IntPtr.Zero)) return Task.FromResult(new NativePrintResult("RETRYABLE_FAILURE", "No se pudo abrir la impresora"));
        try
        {
            var document = new DOCINFO { pDocName = "Lorito Kitchen Ticket", pDataType = "RAW" };
            if (StartDocPrinter(handle, 1, ref document) == 0) return Task.FromResult(new NativePrintResult("RETRYABLE_FAILURE", "No se pudo abrir el documento"));
            var pageStarted = StartPagePrinter(handle);
            var written = 0;
            var accepted = pageStarted && WritePrinter(handle, content, content.Length, out written) && written == content.Length;
            var pageClosed = pageStarted && EndPagePrinter(handle);
            var documentClosed = EndDocPrinter(handle);
            return Task.FromResult(accepted && pageClosed && documentClosed
                ? new NativePrintResult("DELIVERED", null)
                : new NativePrintResult("FAILED", accepted ? "No se pudo cerrar el documento" : "El spooler no aceptó todos los bytes"));
        }
        finally { ClosePrinter(handle); }
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private struct DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] private static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool ClosePrinter(IntPtr handle);
    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] private static extern int StartDocPrinter(IntPtr handle, int level, ref DOCINFO doc);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool EndDocPrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool StartPagePrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool EndPagePrinter(IntPtr handle);
    [DllImport("winspool.drv", SetLastError = true)] private static extern bool WritePrinter(IntPtr handle, byte[] data, int count, out int written);
}
#else
public sealed class UnsupportedRawPrinter : IRawPrinter
{
    public Task<NativePrintResult> PrintAsync(string printerLocalName, byte[] content, CancellationToken cancellationToken) => Task.FromResult(new NativePrintResult("FAILED", "La impresión RAW requiere Windows"));
}
#endif

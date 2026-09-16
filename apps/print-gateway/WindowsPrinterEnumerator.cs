#if NET10_0_WINDOWS
using System.Drawing.Printing;

namespace Lorito.PrintGateway;

public sealed class WindowsPrinterEnumerator : IPrinterEnumerator
{
    public PrinterInventory Enumerate() => new(1, PrinterSettings.InstalledPrinters.Cast<string>().Distinct(StringComparer.OrdinalIgnoreCase).ToArray());
}
#endif

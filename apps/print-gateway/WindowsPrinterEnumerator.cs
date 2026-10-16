#if WINDOWS
using System.Drawing.Printing;

namespace Kogoz.PrintGateway;

public sealed class WindowsPrinterEnumerator : IPrinterEnumerator
{
    public PrinterInventory Enumerate() => new(1, PrinterSettings.InstalledPrinters.Cast<string>().Distinct(StringComparer.OrdinalIgnoreCase).ToArray());
}
#endif

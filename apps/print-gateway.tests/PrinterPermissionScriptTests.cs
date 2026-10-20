using System.Text;
using Kogoz.PrintGateway;
using Xunit;

namespace Kogoz.PrintGateway.Tests;

public sealed class PrinterPermissionScriptTests
{
    [Fact]
    public void Escapes_single_quotes_in_printer_names()
    {
        var script = PrinterPermissionScript.Build("KogozPrintGateway", ["Cocina", "Bar 'Norte'"]);

        Assert.Contains("@('Cocina','Bar ''Norte''')", script);
        Assert.Contains(@"NT SERVICE\KogozPrintGateway", script);
        Assert.Contains("Get-Printer -Name $name -Full", script);
    }

    [Fact]
    public void Encodes_script_as_utf16_base64_for_powershell()
    {
        var encoded = PrinterPermissionScript.Encode("Get-Printer");

        Assert.Equal("Get-Printer", Encoding.Unicode.GetString(Convert.FromBase64String(encoded)));
    }
}

using System.Text;
using Lorito.PrintGateway;
using Xunit;

namespace Lorito.PrintGateway.Tests;

public sealed class PrinterPermissionScriptTests
{
    [Fact]
    public void Escapes_single_quotes_in_printer_names()
    {
        var script = PrinterPermissionScript.Build("LoritoPrintGateway", ["Cocina", "Bar 'Norte'"]);

        Assert.Contains("@('Cocina','Bar ''Norte''')", script);
        Assert.Contains(@"NT SERVICE\LoritoPrintGateway", script);
        Assert.Contains("Get-Printer -Name $name -Full", script);
    }

    [Fact]
    public void Encodes_script_as_utf16_base64_for_powershell()
    {
        var encoded = PrinterPermissionScript.Encode("Get-Printer");

        Assert.Equal("Get-Printer", Encoding.Unicode.GetString(Convert.FromBase64String(encoded)));
    }
}

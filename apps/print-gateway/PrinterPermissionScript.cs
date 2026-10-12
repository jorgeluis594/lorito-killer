using System.Text;

namespace Lorito.PrintGateway;

internal static class PrinterPermissionScript
{
    public static string Build(string serviceName, IEnumerable<string> printerNames)
    {
        var names = string.Join(",", printerNames.Select(name => $"'{name.Replace("'", "''")}'"));
        return $$"""
            $ErrorActionPreference = 'Stop'
            $ProgressPreference = 'SilentlyContinue'
            try {
              $sid = (New-Object System.Security.Principal.NTAccount('NT SERVICE\{{serviceName}}')).Translate([System.Security.Principal.SecurityIdentifier]).Value
              foreach ($name in @({{names}})) {
                try {
                  # PermissionSDDL is only populated with -Full; it starts with owner/group (O:/G:), so the ACE goes after the DACL flags.
                  $sddl = (Get-Printer -Name $name -Full).PermissionSDDL
                  if ($sddl -notmatch [regex]::Escape($sid)) {
                    Set-Printer -Name $name -PermissionSDDL ($sddl -replace '(D:[^(]*)', "`$1(A;;LCSWSDRCWDWO;;;$sid)")
                  }
                } catch { throw "Impresora '$name': $($_.Exception.Message)" }
              }
            } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
            """;
    }

    public static string Encode(string script) => Convert.ToBase64String(Encoding.Unicode.GetBytes(script));
}

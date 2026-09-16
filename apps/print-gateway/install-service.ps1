param(
  [Parameter(Mandatory = $true)][string]$ExecutablePath,
  [string]$DataPath = "$env:ProgramData\Lorito\PrintGateway",
  [string[]]$PrinterName = @()
)

$ErrorActionPreference = "Stop"
$serviceName = "LoritoPrintGateway"
New-Item -ItemType Directory -Force -Path $DataPath | Out-Null
& icacls.exe $DataPath /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" "NT SERVICE\${serviceName}:(OI)(CI)M" | Out-Null
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
  Stop-Service $serviceName -Force -ErrorAction SilentlyContinue
  sc.exe delete $serviceName | Out-Null
}
sc.exe create $serviceName binPath= "`"$ExecutablePath`" --service" start= auto obj= "NT SERVICE\$serviceName" DisplayName= $serviceName | Out-Null
sc.exe sidtype $serviceName unrestricted | Out-Null
foreach ($name in $PrinterName) {
  $printer = Get-Printer -Name $name -ErrorAction Stop
  $sid = (New-Object System.Security.Principal.NTAccount("NT SERVICE\$serviceName")).Translate([System.Security.Principal.SecurityIdentifier]).Value
  if ($printer.PermissionSDDL -notmatch [regex]::Escape($sid)) {
    Set-Printer -Name $name -PermissionSDDL ($printer.PermissionSDDL -replace '^D:', "D:(A;;LCSWSDRCWDWO;;;$sid)")
  }
}
Start-Service $serviceName

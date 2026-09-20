param(
  [Parameter(Mandatory = $true)][string]$ExecutablePath,
  [string]$DataPath = "$env:ProgramData\Lorito\PrintGateway",
  [string[]]$PrinterName = @()
)

$ErrorActionPreference = "Stop"
$serviceName = "LoritoPrintGateway"
$JobsPath = Join-Path $DataPath "jobs"
New-Item -ItemType Directory -Force -Path $DataPath | Out-Null
New-Item -ItemType Directory -Force -Path $JobsPath | Out-Null
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
  Stop-Service $serviceName -Force -ErrorAction SilentlyContinue
  sc.exe delete $serviceName | Out-Null
}
sc.exe create $serviceName binPath= "`"$ExecutablePath`" --service" start= auto obj= "NT SERVICE\$serviceName" DisplayName= $serviceName | Out-Null
sc.exe sidtype $serviceName unrestricted | Out-Null
& icacls.exe $DataPath /inheritance:r /grant:r "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "NT SERVICE\${serviceName}:(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Failed to set permissions on $DataPath" }
& icacls.exe $JobsPath /inheritance:r /grant:r "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "NT SERVICE\${serviceName}:(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Failed to set permissions on $JobsPath" }
foreach ($name in $PrinterName) {
  $printer = Get-Printer -Name $name -ErrorAction Stop
  $sid = (New-Object System.Security.Principal.NTAccount("NT SERVICE\$serviceName")).Translate([System.Security.Principal.SecurityIdentifier]).Value
  if ($printer.PermissionSDDL -notmatch [regex]::Escape($sid)) {
    Set-Printer -Name $name -PermissionSDDL ($printer.PermissionSDDL -replace '^D:', "D:(A;;LCSWSDRCWDWO;;;$sid)")
  }
}
Start-Service $serviceName

param(
  [Parameter(Mandatory = $true)][string]$ExecutablePath,
  [string]$DataPath = "$env:ProgramData\Lorito\PrintGateway"
)

$ErrorActionPreference = "Stop"
$serviceName = "LoritoPrintGateway"
New-Item -ItemType Directory -Force -Path $DataPath | Out-Null
& icacls.exe $DataPath /inheritance:r /grant:r "SYSTEM:(OI)(CI)F" "Administrators:(OI)(CI)F" "NT SERVICE\$serviceName:(OI)(CI)M" | Out-Null
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
  Stop-Service $serviceName -Force -ErrorAction SilentlyContinue
  sc.exe delete $serviceName | Out-Null
}
sc.exe create $serviceName binPath= "`"$ExecutablePath`" --service" start= auto obj= "NT SERVICE\$serviceName" DisplayName= $serviceName | Out-Null
sc.exe sidtype $serviceName unrestricted | Out-Null
Start-Service $serviceName

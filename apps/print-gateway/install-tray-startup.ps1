param([Parameter(Mandatory = $true)][string]$ExecutablePath)

$startup = [Environment]::GetFolderPath("Startup")
$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startup "Lorito Print Gateway.lnk"))
$shortcut.TargetPath = $ExecutablePath
$shortcut.Arguments = "--tray"
$shortcut.WorkingDirectory = Split-Path $ExecutablePath
$shortcut.Save()

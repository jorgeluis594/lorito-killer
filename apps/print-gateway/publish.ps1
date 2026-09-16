param([string]$OutputPath = "$PSScriptRoot\publish")

$ErrorActionPreference = "Stop"
foreach ($runtime in @("win-x86", "win-x64")) {
  dotnet publish "$PSScriptRoot\Lorito.PrintGateway.csproj" --configuration Release --framework net10.0-windows --runtime $runtime --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true --output (Join-Path $OutputPath $runtime)
}

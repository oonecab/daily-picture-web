$ErrorActionPreference = 'Stop'
# Reuse only the metadata-reader C# source, never execute the older script.
$taskRoot = Split-Path -Parent $PSScriptRoot
$readerSource = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'ui_arch_winmd.ps1'))
$sourceMatch = [regex]::Match($readerSource, "(?s)\`$source = @'\r?\n(.*?)\r?\n'@")
if (-not $sourceMatch.Success) { throw 'Expected metadata-reader source was not found.' }
$source = $sourceMatch.Groups[1].Value.Replace('UiArchMetadata','TimerCleanupMetadata')
$runtimePath = Split-Path -Parent ([System.Reflection.Metadata.MetadataReader].Assembly.Location)
$referencePaths = Get-ChildItem -LiteralPath (Join-Path $runtimePath 'ref') -Filter '*.dll' | Select-Object -ExpandProperty FullName
Add-Type -TypeDefinition $source -ReferencedAssemblies $referencePaths
$path = 'C:\Windows\System32\WinMetadata\Windows.UI.winmd'
$selected = @('ISystemNavigationManager','ISystemNavigationManager2','ISystemNavigationManagerStatics','AppViewBackButtonVisibility')
$rows = @([PSCustomObject]@{
  path=$path
  sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  types=[TimerCleanupMetadata]::Read($path,$selected)
})
$dest = Join-Path $taskRoot 'evidence\timer-cleanup\system-navigation-winmd.json'
[IO.File]::WriteAllText($dest,(ConvertTo-Json -InputObject $rows -Depth 12),[Text.UTF8Encoding]::new($false))
$rows | ForEach-Object { [PSCustomObject]@{path=$_.path;types=$_.types.Count;sha256=$_.sha256} } | ConvertTo-Json

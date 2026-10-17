param(
    [Parameter(Mandatory=$true)][string]$AnalysisCommand,
    [Parameter(Mandatory=$true)][string]$EvidenceName
)
$ErrorActionPreference = 'Stop'
if ($EvidenceName -notmatch '^[a-z0-9-]+$') { throw 'Use a simple evidence name.' }
$taskRoot = Split-Path -Parent $PSScriptRoot
$targetDll = 'C:\Program Files\WindowsApps\14403Duracellko.NET.BingImageoftheDay_1.4.13.0_x64__1wy5t1va6xay4\Duracellko.BingImage.Universal.dll'
$env:REA_RIZIN_COMMAND = 'E:\Softwares\Cutter-v2.5.0-Windows-x86_64\rizin.exe'
$destination = Join-Path $taskRoot ('evidence\rea\' + $EvidenceName + '.json')
if (Test-Path -LiteralPath $destination) { throw "Evidence already exists: $destination" }
$textOutput = & rea execute-rizin-command $targetDll $AnalysisCommand --format json
if ($LASTEXITCODE -ne 0) { throw ($textOutput -join "`n") }
$jsonText = $textOutput -join "`n"
$evidence = $jsonText | ConvertFrom-Json
[IO.File]::WriteAllText($destination, $jsonText, [Text.UTF8Encoding]::new($false))
[PSCustomObject]@{
    path=$destination
    evidence_id=$evidence.evidence_id
    completion=$evidence.normalized_result.completion_status
    exit_code=$evidence.normalized_result.exit_code
    truncated=$evidence.normalized_result.output_truncated
    artifact_changed=$evidence.normalized_result.artifact_changed
    stderr=$evidence.normalized_result.stderr
} | ConvertTo-Json

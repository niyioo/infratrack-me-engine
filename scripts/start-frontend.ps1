$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $repoRoot "frontend"

if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    throw "Frontend package.json was not found at $frontendDir"
}

Start-Process powershell `
    -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$frontendDir'; npm run dev"
    ) `
    -WorkingDirectory $frontendDir `
    -WindowStyle Normal

Write-Host "Started frontend dev server in a separate PowerShell window."

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$pythonExe = Join-Path $backendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
    throw "Backend virtual environment Python was not found at $pythonExe"
}

$commands = @(
    @{
        Title = "InfraTrack API"
        Command = "$env:DJANGO_SETTINGS_MODULE='config.settings.dev'; & '$pythonExe' manage.py runserver 0.0.0.0:8000"
        WorkingDirectory = $backendDir
    },
    @{
        Title = "InfraTrack Celery Worker"
        Command = "$env:DJANGO_SETTINGS_MODULE='config.settings.dev'; & '$pythonExe' -m celery -A config worker -l info"
        WorkingDirectory = $backendDir
    },
    @{
        Title = "InfraTrack Celery Beat"
        Command = "$env:DJANGO_SETTINGS_MODULE='config.settings.dev'; & '$pythonExe' -m celery -A config beat -l info"
        WorkingDirectory = $backendDir
    }
)

foreach ($entry in $commands) {
    Start-Process powershell `
        -ArgumentList @(
            "-NoExit",
            "-Command",
            "Set-Location '$($entry.WorkingDirectory)'; $($entry.Command)"
        ) `
        -WorkingDirectory $entry.WorkingDirectory `
        -WindowStyle Normal
}

Write-Host "Started backend API, Celery worker, and Celery beat in separate PowerShell windows."

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Starting Civitness local stack..."

& (Join-Path $PSScriptRoot "start-backend-stack.ps1")
& (Join-Path $PSScriptRoot "start-frontend.ps1")

Write-Host ""
Write-Host "If Redis and PostgreSQL are not already running, start them first."
Write-Host "For containerized infra only: docker compose up -d db redis"

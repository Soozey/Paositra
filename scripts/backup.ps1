param(
  [string]$OutputDirectory = "backups"
)

$ErrorActionPreference = "Stop"
$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$target = Join-Path $workspace $OutputDirectory
New-Item -ItemType Directory -Path $target -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$databaseFile = Join-Path $target "paositra-$timestamp.dump"

$composeFile = Join-Path $workspace "docker-compose.yml"
$containerId = (docker compose -f $composeFile ps -q postgres).Trim()
if (-not $containerId) {
  throw "PostgreSQL container is not running."
}

$containerBackup = "/tmp/paositra-$timestamp.dump"
docker compose -f $composeFile exec -T postgres `
  pg_dump -U paositra -d paositra -Fc -f $containerBackup
docker cp "${containerId}:$containerBackup" $databaseFile
docker compose -f $composeFile exec -T postgres rm -f $containerBackup

Write-Output "Database backup created: $databaseFile"
Write-Output "The persistent upload volume must be backed up by the infrastructure storage snapshot mechanism."

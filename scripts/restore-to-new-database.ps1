param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^paositra_restore_[a-z0-9_]+$")]
  [string]$TargetDatabase
)

$ErrorActionPreference = "Stop"
$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path
$composeFile = Join-Path $workspace "docker-compose.yml"
$containerId = (docker compose -f $composeFile ps -q postgres).Trim()
if (-not $containerId) {
  throw "PostgreSQL container is not running."
}

$exists = docker compose -f $composeFile exec -T postgres `
  sh -c "PGPASSWORD=`"`$POSTGRES_PASSWORD`" psql -U postgres -d postgres -tAc `"SELECT 1 FROM pg_database WHERE datname='$TargetDatabase'`""
if (($exists -join "").Trim() -eq "1") {
  throw "Target database already exists. Refusing to overwrite it."
}

$containerBackup = "/tmp/restore-source.dump"
docker cp $resolvedBackup "${containerId}:$containerBackup"
docker compose -f $composeFile exec -T postgres `
  sh -c "PGPASSWORD=`"`$POSTGRES_PASSWORD`" createdb -U postgres -O paositra_owner $TargetDatabase"
docker compose -f $composeFile exec -T postgres `
  sh -c "PGPASSWORD=`"`$PAOSITRA_OWNER_PASSWORD`" pg_restore -U paositra_owner -d $TargetDatabase --exit-on-error $containerBackup"
docker compose -f $composeFile exec -T postgres rm -f $containerBackup

Write-Output "Backup restored to the separate database: $TargetDatabase"

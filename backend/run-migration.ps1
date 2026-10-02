# PowerShell script to run database migrations on Cloudflare D1
# Usage: .\run-migration.ps1 <migration_number>
# Example: .\run-migration.ps1 005

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationNum
)

$MigrationFile = "src\db\migrations\${MigrationNum}_*.sql"

# Find the migration file
$Files = Get-ChildItem -Path $MigrationFile -ErrorAction SilentlyContinue

if ($Files.Count -eq 0) {
    Write-Host "❌ Error: Migration file not found: $MigrationFile" -ForegroundColor Red
    exit 1
}

$MigrationPath = $Files[0].FullName
$MigrationName = $Files[0].Name

Write-Host "🔄 Running migration: $MigrationName" -ForegroundColor Yellow
Write-Host ""

# Run migration on production database
$RelativePath = "src/db/migrations/$MigrationName"
npx wrangler d1 execute spx-attendance-db --remote --file=$RelativePath

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

#!/bin/bash
# Script to run database migrations on Cloudflare D1
# Usage: ./run-migration.sh <migration_number>
# Example: ./run-migration.sh 005

MIGRATION_NUM=$1

if [ -z "$MIGRATION_NUM" ]; then
    echo "❌ Error: Please provide migration number"
    echo "Usage: ./run-migration.sh <migration_number>"
    echo "Example: ./run-migration.sh 005"
    exit 1
fi

MIGRATION_FILE="src/db/migrations/${MIGRATION_NUM}_*.sql"

# Check if file exists
if ! ls $MIGRATION_FILE 1> /dev/null 2>&1; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "🔄 Running migration: $MIGRATION_FILE"
echo ""

# Run migration on production database
wrangler d1 execute spx-attendance-db --remote --file=$MIGRATION_FILE

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi

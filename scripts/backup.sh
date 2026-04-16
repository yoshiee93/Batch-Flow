#!/bin/bash
set -e

# Configuration
# Set these env vars in your deployment environment
# DB_HOST=db
# DB_USER=postgres
# DB_NAME=cleartrace
# S3_BUCKET=my-cleartrace-backups
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/backup_${TIMESTAMP}.sql.gz"

echo "Starting backup for ${DB_NAME} at ${TIMESTAMP}..."

# Dump database
# Note: PGPASSWORD should be set in env or .pgpass
pg_dump -h "${DB_HOST:-db}" -U "${DB_USER:-postgres}" "${DB_NAME:-cleartrace}" | gzip > "$BACKUP_FILE"

echo "Backup created at ${BACKUP_FILE}. Size: $(du -h $BACKUP_FILE | cut -f1)"

# Upload to S3 (requires aws-cli installed in the container running this script)
if [ -n "$S3_BUCKET" ]; then
  echo "Uploading to s3://${S3_BUCKET}..."
  # aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/backup_${TIMESTAMP}.sql.gz"
  echo "Upload complete (simulated)."
else
  echo "S3_BUCKET not set, skipping upload."
fi

# Cleanup
rm "$BACKUP_FILE"
echo "Backup finished."

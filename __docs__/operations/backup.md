# Database Backup & Recovery Strategy

## Overview

RidePool uses Supabase (PostgreSQL) as the primary database. This document outlines the backup strategy, recovery procedures, and disaster recovery plan.

## Recovery Objectives

| Metric | Target | Justification |
|--------|--------|---------------|
| **RPO** (Recovery Point Objective) | 1 hour | Maximum acceptable data loss. Supabase provides continuous WAL archiving. |
| **RTO** (Recovery Time Objective) | 4 hours | Maximum acceptable downtime for full recovery. |
| **MTTR** (Mean Time To Recover) | 2 hours | Average expected recovery time. |

## Backup Types

### 1. Supabase Managed Backups

Supabase automatically manages:

- **Daily Backups**: Automatic daily snapshots retained for 7 days (Free/Pro) or 30 days (Enterprise)
- **Point-in-Time Recovery (PITR)**: Available on Pro plan, allows recovery to any point in the last 7 days
- **WAL Archiving**: Continuous archiving for minimal data loss

**Configuration:**
```
# Supabase Dashboard > Project Settings > Database
Enable: Point-in-Time Recovery
Retention: 7 days (Pro) / 30 days (Enterprise)
```

### 2. Application-Level Backups

For additional safety, implement custom logical backups:

```bash
# Daily logical backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/ridepool"

# Export using Supabase CLI
supabase db dump --db-url "$DATABASE_URL" > "${BACKUP_DIR}/ridepool_${DATE}.sql"

# Compress
gzip "${BACKUP_DIR}/ridepool_${DATE}.sql"

# Upload to S3/GCS
aws s3 cp "${BACKUP_DIR}/ridepool_${DATE}.sql.gz" s3://ridepool-backups/daily/

# Cleanup local files older than 7 days
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete
```

### 3. Critical Table Exports

For business-critical tables, maintain separate exports:

```bash
# Export critical tables
supabase db dump --db-url "$DATABASE_URL" \
  --table users \
  --table payments \
  --table rides \
  --table wallets \
  > critical_tables_${DATE}.sql
```

## Backup Schedule

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Supabase Snapshot | Daily (auto) | 7-30 days | Supabase |
| Logical Dump (Full) | Daily 02:00 UTC | 30 days | S3 |
| Critical Tables | Every 6 hours | 7 days | S3 |
| WAL Archive | Continuous | 7 days | Supabase |

## Recovery Procedures

### Scenario 1: Accidental Data Deletion (Single Table)

**RTO: 30 minutes**

1. Identify the deletion time from audit logs:
```sql
SELECT * FROM audit_logs 
WHERE action = 'DELETE' 
AND table_name = 'affected_table'
ORDER BY created_at DESC LIMIT 10;
```

2. Use PITR to restore to a point before deletion:
   - Supabase Dashboard > Database > Backups > Point-in-Time Recovery
   - Select timestamp before deletion
   - Restore to a new database
   
3. Export the affected table from restored DB:
```bash
supabase db dump --db-url "restored_db_url" --table affected_table > restore.sql
```

4. Import into production:
```bash
psql "$PROD_DATABASE_URL" < restore.sql
```

### Scenario 2: Database Corruption

**RTO: 2 hours**

1. Immediately pause all application traffic:
```bash
# Scale down app replicas
kubectl scale deployment ridepool-api --replicas=0
```

2. Assess corruption extent:
```sql
-- Check for corruption
SELECT * FROM pg_catalog.pg_tables WHERE schemaname = 'public';
VACUUM FULL ANALYZE;
```

3. If corruption is extensive, restore from latest snapshot:
   - Supabase Dashboard > Database > Backups
   - Select most recent healthy backup
   - Restore to production

4. Replay any lost transactions from application logs

5. Resume traffic after validation

### Scenario 3: Complete Disaster (Region Failure)

**RTO: 4 hours**

1. Activate incident response team
2. Verify Supabase status at status.supabase.com
3. If Supabase region is down:
   - Wait for Supabase recovery (they have multi-region redundancy)
   - OR provision new Supabase project in different region
   
4. Restore from S3 backup:
```bash
# Download latest backup
aws s3 cp s3://ridepool-backups/daily/latest.sql.gz .
gunzip latest.sql.gz

# Apply to new database
psql "$NEW_DATABASE_URL" < latest.sql
```

5. Update DNS and application configuration
6. Verify data integrity
7. Resume operations

## Validation & Testing

### Weekly Validation
```bash
# Verify backup exists and is valid
aws s3 ls s3://ridepool-backups/daily/ | tail -7

# Test restore to staging
./scripts/test-restore.sh staging
```

### Monthly Recovery Drill
1. Restore backup to isolated environment
2. Run integrity checks
3. Verify critical business data
4. Document any issues

### Integrity Check Query
```sql
-- Run after any restore
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM rides) as rides_count,
  (SELECT COUNT(*) FROM payments) as payments_count,
  (SELECT SUM(balance) FROM wallets) as total_wallet_balance;
```

## Monitoring & Alerts

### Backup Monitoring
- Alert if daily backup not completed by 04:00 UTC
- Alert if backup size deviates >20% from average
- Alert on S3 upload failures

### Recovery Metrics
- Track MTTR for each recovery event
- Monthly recovery drill completion status
- Backup validation success rate

## Contacts & Escalation

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 | On-call Engineer | 15 minutes |
| L2 | Database Admin | 30 minutes |
| L3 | CTO / Engineering Lead | 1 hour |
| Supabase Support | support@supabase.io | Per SLA |

## Runbook Quick Reference

```bash
# Check last backup
aws s3 ls s3://ridepool-backups/daily/ | tail -1

# Trigger manual backup
./scripts/backup.sh manual

# Restore to staging
./scripts/restore.sh staging latest

# Validate restore
./scripts/validate-restore.sh staging
```

---

**Last Updated:** 2026-01-19  
**Next Review:** 2026-02-19  
**Owner:** Engineering Team

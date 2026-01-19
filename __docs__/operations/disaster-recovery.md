# Disaster Recovery Plan

## 1. Overview

This document outlines the disaster recovery procedures for the RidePool platform. It covers various failure scenarios, recovery procedures, and escalation paths.

## 2. Recovery Objectives

| Metric | Value | Description |
|--------|-------|-------------|
| **RPO** | 1 hour | Maximum data loss tolerance |
| **RTO** | 4 hours | Maximum downtime tolerance |
| **MTTR** | 2 hours | Expected recovery time |

## 3. Critical Services Priority

| Priority | Service | Max Downtime | Recovery Order |
|----------|---------|--------------|----------------|
| P0 | Database (Supabase) | 0 min | 1 |
| P0 | API Server | 5 min | 2 |
| P0 | Redis Cache | 15 min | 3 |
| P1 | Payment Processing | 30 min | 4 |
| P1 | Push Notifications | 1 hour | 5 |
| P2 | Analytics | 4 hours | 6 |
| P2 | Admin Dashboard | 4 hours | 7 |

## 4. Failure Scenarios & Response

### 4.1 API Server Failure

**Symptoms:**
- 5xx errors from API
- Health checks failing
- No new ride requests

**Diagnosis:**
```bash
# Check server status
kubectl get pods -l app=ridepool-api
docker ps | grep ridepool

# Check logs
kubectl logs -l app=ridepool-api --tail=100
docker logs ridepool-api --tail=100
```

**Recovery:**
```bash
# Restart pods
kubectl rollout restart deployment/ridepool-api

# Or scale up
kubectl scale deployment ridepool-api --replicas=5

# Verify
kubectl get pods -l app=ridepool-api -w
```

**Time:** 5-15 minutes

---

### 4.2 Database (Supabase) Unavailable

**Symptoms:**
- Database connection errors
- API returning 503
- Health check shows supabase: unhealthy

**Diagnosis:**
1. Check Supabase status: https://status.supabase.com
2. Check connection:
```bash
psql "$DATABASE_URL" -c "SELECT 1"
```

**Recovery:**

**If Supabase-wide outage:**
1. Monitor Supabase status page
2. Activate read-only mode if possible
3. Communicate to users

**If project-specific issue:**
1. Contact Supabase support
2. Check project dashboard for errors
3. Restore from backup if needed (see backup.md)

**Time:** 30 min - 4 hours depending on cause

---

### 4.3 Redis Cache Failure

**Symptoms:**
- Slow API responses
- Cache miss rate 100%
- Redis health check failing

**Diagnosis:**
```bash
# Check Redis
redis-cli -h $REDIS_HOST ping

# Check container
docker logs redis --tail=50
```

**Recovery:**
```bash
# Restart Redis
docker restart redis
# OR
kubectl rollout restart deployment/redis

# Verify
redis-cli -h $REDIS_HOST ping
```

**Note:** Application degrades gracefully without Redis. Focus on fixing, not emergency.

**Time:** 5-15 minutes

---

### 4.4 Payment Processing Failure

**Symptoms:**
- Payment endpoints returning errors
- Payment jobs failing in queue
- User complaints about failed payments

**Diagnosis:**
```bash
# Check payment queue
./scripts/queue-status.sh payments

# Check payment logs
grep "payment" /var/log/ridepool/app.log | tail -100
```

**Recovery:**
1. Identify failed payments
2. Check payment gateway status (SSLCommerz, bKash)
3. Retry failed payments:
```sql
UPDATE payments SET status = 'PENDING', retry_count = 0
WHERE status = 'FAILED' AND created_at > NOW() - INTERVAL '1 hour';
```
4. Manually process if needed

**Time:** 30 min - 2 hours

---

### 4.5 Complete Region/Cloud Failure

**Symptoms:**
- All services unreachable
- DNS not resolving
- Cloud provider status shows outage

**Recovery:**
1. Activate DR team
2. Check cloud provider status
3. If extended outage (>1 hour):
   - Provision infrastructure in alternate region
   - Restore database from S3 backup
   - Update DNS to new region
   - Communicate with users

**Time:** 2-4 hours

## 5. Communication Plan

### Internal Communication

| Event | Channel | Recipients |
|-------|---------|------------|
| P0 Incident | Slack #incidents + PagerDuty | All engineers |
| P1 Incident | Slack #incidents | On-call team |
| P2 Incident | Slack #engineering | Engineering team |

### External Communication

| Downtime | Action |
|----------|--------|
| < 5 min | No communication |
| 5-30 min | Twitter status update |
| 30+ min | Email to active users, app notification |
| 1+ hour | Status page update, customer support alert |

### Communication Templates

**Twitter/Status:**
```
[INVESTIGATING] We're aware of issues affecting the RidePool app. Our team is investigating. Updates to follow.

[RESOLVED] The issue affecting RidePool has been resolved. All services are operating normally. We apologize for any inconvenience.
```

## 6. Escalation Matrix

| Time | Action | Contact |
|------|--------|---------|
| 0 min | On-call engineer alerted | Auto (PagerDuty) |
| 15 min | Escalate to senior engineer | On-call escalates |
| 30 min | Escalate to engineering lead | Senior engineer |
| 1 hour | Escalate to CTO | Engineering lead |
| 2 hours | Executive notification | CTO |

## 7. Post-Incident

### Immediate (within 24 hours)
- [ ] Verify all services recovered
- [ ] Check for data inconsistencies
- [ ] Review monitoring for any missed alerts
- [ ] Brief incident log entry

### Within 48 hours
- [ ] Schedule post-mortem meeting
- [ ] Gather timeline and logs
- [ ] Identify root cause
- [ ] Document lessons learned

### Within 1 week
- [ ] Complete post-mortem document
- [ ] Create action items for prevention
- [ ] Update runbooks if needed
- [ ] Share learnings with team

## 8. Testing Schedule

| Test | Frequency | Owner |
|------|-----------|-------|
| Backup restore | Monthly | DBA |
| Failover drill | Quarterly | Engineering Lead |
| Full DR exercise | Annually | CTO |
| Runbook review | Quarterly | On-call team |

## 9. Quick Reference

### Key URLs
- Supabase Dashboard: https://app.supabase.com/project/[PROJECT_ID]
- Supabase Status: https://status.supabase.com
- Redis Commander: https://redis.ridepool.app
- Grafana: https://grafana.ridepool.app
- PagerDuty: https://ridepool.pagerduty.com

### Key Commands
```bash
# Check all services
./scripts/health-check.sh all

# Emergency restart all
kubectl rollout restart deployment --all

# View recent logs
kubectl logs -l app=ridepool-api --since=5m

# Database quick check
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users"
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Next Review:** 2026-04-19  
**Owner:** Engineering Team

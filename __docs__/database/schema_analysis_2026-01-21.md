# SQL Schema Analysis Report

**File:** `20260121_ridepool_merged_schema.sql`  
**Analyzed:** 2026-01-21T10:56:03.202Z  
**Agent:** copilot-engineer

---

## Summary

| Category | Count |
|----------|-------|
| Tables | 43 |
| Indexes | 93 |
| RLS Policies | 47 |
| Functions | 22 |
| Triggers | 10 |

---

## Critical Issues

### 1. DUPLICATE AUDIT TABLES (REDUNDANCY)
**Severity:** HIGH  
**Lines:** 563-576, 767-782

Two audit tables exist with similar purposes:
- `public.audit_log` (line 563) - generic audit with old_data/new_data JSONB
- `public.audit_logs` (line 767) - admin audit with resource tracking

**Impact:** Data fragmentation, confusion about which to use, wasted storage.

**Recommendation:** Consolidate into a single `audit_logs` table with combined columns.

---

### 2. MISSING RLS FOR CRITICAL TABLES
**Severity:** HIGH

The following tables have RLS enabled but NO POLICIES defined:

| Table | Issue |
|-------|-------|
| `user_promo_usage` | RLS NOT enabled, no policies |
| `conversation_participants` | RLS NOT enabled, no policies |
| `audit_log` | RLS NOT enabled, no policies (the duplicate table) |
| `app_metadata` | No RLS at all |

**Impact:** Security vulnerability - users can access/modify data they shouldn't.

---

### 3. POTENTIAL RLS RECURSION RISK
**Severity:** MEDIUM  
**Lines:** 1592-1594, 1677

```sql
-- p_users_pool policy (line 1592)
CREATE POLICY p_users_pool ON public.users FOR SELECT USING (
  id IN (SELECT pm2.user_id FROM pool_members pm1 
         JOIN pool_members pm2 ON pm1.pool_id = pm2.pool_id 
         WHERE pm1.user_id = auth.uid() AND pm1.left_at IS NULL AND pm2.left_at IS NULL)
);

-- p_audit_logs_admin policy (line 1677)
CREATE POLICY p_audit_logs_admin ON public.audit_logs FOR SELECT USING (
  auth.uid() IN (SELECT id FROM users WHERE is_admin = TRUE)
);
```

**Impact:** These policies query other RLS-protected tables, which can cause:
- Performance degradation
- Potential infinite recursion if circular dependencies exist

**Recommendation:** Use `SECURITY DEFINER` helper functions or materialized views to break recursion chains.

---

## Medium Issues

### 4. MISSING FOREIGN KEY INDEX
**Severity:** MEDIUM

Several foreign key columns lack indexes, which will slow down JOINs and DELETE operations:

| Table | Column | Issue |
|-------|--------|-------|
| `wallet_transactions` | `wallet_id` | Has index ✓ |
| `user_promo_usage` | `promo_code_id` | Missing index |
| `conversation_participants` | `conversation_id` | Missing index (only has user_id) |

---

### 5. INCONSISTENT STATUS CHECK CONSTRAINTS
**Severity:** MEDIUM

Some tables have CHECK constraints for status, others don't:

| Table | Has CHECK | Values |
|-------|-----------|--------|
| `pools` | NO | Uses application-level validation |
| `rides` | NO | Uses application-level validation |
| `payments` | NO | Uses application-level validation |
| `driver_sessions` | YES | `('ONLINE', 'BUSY', 'OFFLINE')` |

**Recommendation:** Add CHECK constraints for `pools.status`, `rides.status`, `payments.status`.

---

### 6. POTENTIAL INDEX OVERLAP/REDUNDANCY
**Severity:** LOW

```sql
-- Line 302: 
CREATE INDEX idx_pools_dest_h3 ON public.pools(destination_h3_index, status) WHERE deleted_at IS NULL;
-- Line 305:
CREATE INDEX idx_pools_h3_status ON public.pools(destination_h3_index, status) 
  WHERE status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER');
```

These indexes overlap. The second is more specific but may be redundant if the first already covers the use case.

---

## Low Priority Issues

### 7. VARCHAR LENGTH INCONSISTENCIES
**Severity:** LOW

| Column | Length | Recommendation |
|--------|--------|----------------|
| `users.phone` | VARCHAR(20) | OK |
| `users.referral_code` | VARCHAR(10) | Could be too short for future expansion |
| `pools.status` | VARCHAR(20) | Consider ENUM type instead |

---

### 8. MISSING CASCADE ON SOME FOREIGN KEYS
**Severity:** LOW

The `conversations.last_message_id` uses `ON DELETE SET NULL` which is correct, but some other references might benefit from CASCADE review.

---

### 9. TRIGGER FUNCTION NAMING INCONSISTENCY
**Severity:** LOW

Mixed naming conventions for triggers:
- `t_users_ts`, `t_wallets_ts` (short prefix)
- `trigger_generate_referral_code`, `trigger_update_user_rating` (full prefix)

**Recommendation:** Standardize to one convention.

---

## Security Considerations

### 10. SECURITY DEFINER FUNCTIONS
**Severity:** INFO

11 functions use `SECURITY DEFINER` which runs with owner privileges:
- `deposit_promise_money`
- `deduct_promise_money`
- `atomic_join_pool`
- `atomic_accept_pool`
- `atomic_leave_pool`
- `atomic_wallet_debit`
- `atomic_wallet_credit`
- `atomic_process_payment`
- `complete_payment`
- `fail_payment`
- `update_vehicle_location`

**Status:** Appropriate for these atomic transaction functions.

**Recommendation:** Ensure these functions have proper input validation and are only GRANTED to appropriate roles.

---

## Recommended Fixes

### Fix 1: Remove Duplicate Audit Table
```sql
-- Remove the duplicate audit_log table (keep audit_logs)
DROP TABLE IF EXISTS public.audit_log CASCADE;
```

### Fix 2: Add Missing RLS Policies
```sql
-- user_promo_usage
ALTER TABLE public.user_promo_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_user_promo_usage ON public.user_promo_usage 
  FOR ALL USING (auth.uid() = user_id);

-- conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_conv_participants ON public.conversation_participants 
  FOR ALL USING (auth.uid() = user_id);
```

### Fix 3: Add Missing Indexes
```sql
CREATE INDEX idx_user_promo_promo ON public.user_promo_usage(promo_code_id);
CREATE INDEX idx_conv_participants_conv ON public.conversation_participants(conversation_id);
```

### Fix 4: Add Status CHECK Constraints
```sql
ALTER TABLE public.pools ADD CONSTRAINT chk_pools_status 
  CHECK (status IN ('WAITING_FOR_RIDERS', 'WAITING_FOR_DRIVER', 'READY_TO_START', 
                    'DRIVER_ASSIGNED', 'STARTED', 'COMPLETED', 'CANCELLED'));

ALTER TABLE public.rides ADD CONSTRAINT chk_rides_status 
  CHECK (status IN ('CREATING_POOL', 'PENDING', 'MATCHED', 'IN_PROGRESS', 
                    'WAITING_FOR_DRIVER', 'COMPLETED', 'CANCELLED'));

ALTER TABLE public.payments ADD CONSTRAINT chk_payments_status 
  CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'));
```

---

## Files Referenced

- `Server/supabase/migrations/20260121_ridepool_merged_schema.sql`

---

## Action Items

| Priority | Item | Status |
|----------|------|--------|
| HIGH | Remove duplicate audit_log table | TODO |
| HIGH | Add RLS to user_promo_usage | TODO |
| HIGH | Add RLS to conversation_participants | TODO |
| MEDIUM | Add missing FK indexes | TODO |
| MEDIUM | Add status CHECK constraints | TODO |
| LOW | Standardize trigger naming | TODO |

---

*Analysis completed by copilot-engineer agent*

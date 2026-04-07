# Pool Management Documentation Index

This directory contains comprehensive documentation of the CarPool pool management system. All documents focus on understanding the flows for:
1. **Driver accepts a pool** → Updates status to READY_TO_START
2. **Passenger joins a pool** → Manages pool members and fare
3. **Passenger leaves a pool** → Soft-delete and auto-cancel logic

---

## 📚 Documentation Files

### 1. **POOL_FLOW_ANALYSIS.md** (17 KB)
**Purpose**: Complete detailed analysis of pool management architecture

**Contents**:
- Sections 1-3: Deep-dive into each operation (accept, join, leave)
- Section 4: Pool status transition diagram
- Section 5: Realtime & notifications mechanism
- Section 6: Message queue service
- Section 7: Key database tables schema
- Section 8: Penalty & cooldown system
- Section 9: Summary of flows
- Section 10: Architecture observations (gaps & strengths)

**Best for**: Understanding the complete system architecture, database schema, and identifying improvement areas

---

### 2. **POOL_QUICK_REFERENCE.md** (6.4 KB)
**Purpose**: Quick lookup guide and checklists

**Contents**:
- File locations with line numbers
- API endpoints & request/response formats
- Database RPC functions purpose & inputs/outputs
- Pool status flow diagram
- Notifications summary table
- Key data structures
- Implementation details highlights
- Realtime mechanism explanation
- Testing checklist
- Performance considerations
- Known gaps & TODOs
- Related services list

**Best for**: Quick reference during development, testing, and debugging

---

### 3. **POOL_CODE_SNIPPETS.md** (22 KB)
**Purpose**: Full code examples for all three operations

**Contents**:
1. Driver Accept Pool - Complete code flow (lines 626-827)
2. Passenger Join Pool - Complete code flow (lines 290-480)
3. Passenger Leave Pool - Complete code flow (lines 585-850)
4. RPC Functions - All three SQL definitions
5. Notification Service Methods - Key implementations

**Best for**: Learning how to implement similar features, understanding exact code logic, copy-paste reference

---

## 🎯 Quick Navigation

### By Task
- **"I need to understand driver acceptance"** → POOL_FLOW_ANALYSIS.md § 1
- **"I need to debug pool joining"** → POOL_CODE_SNIPPETS.md § 2 + POOL_QUICK_REFERENCE.md Endpoints
- **"I need to check pool leaving logic"** → POOL_CODE_SNIPPETS.md § 3
- **"I need API endpoints"** → POOL_QUICK_REFERENCE.md § API Endpoints
- **"I need to add a test"** → POOL_QUICK_REFERENCE.md § Testing Checklist
- **"I need to find line numbers"** → POOL_QUICK_REFERENCE.md § File Locations
- **"I need to understand database schema"** → POOL_FLOW_ANALYSIS.md § 7

### By Document Type
- **Summary/Overview** → POOL_QUICK_REFERENCE.md
- **Detailed Analysis** → POOL_FLOW_ANALYSIS.md
- **Code Reference** → POOL_CODE_SNIPPETS.md

---

## 🔑 Key Findings Summary

### What Happens When Driver Accepts Pool
1. **Validation** (4 checks): Auth, no active pool, online, vehicle type match
2. **Atomic RPC Call**: Locks pool, validates unassigned + ≥2 passengers, sets driver_id + vehicle_id
3. **Driver Session Update**: status → BUSY
4. **Vehicle Update**: is_available → false
5. **Route Clear**: smartRouteService clears cached route
6. **Fetch Details**: Pool with all members and rides
7. **Navigation**: Calculate to nearest pickup, generate Google Maps URL
8. **Response**: Send pool details and navigation to driver
9. **⚠️ Gap**: NO notification sent to passengers (they rely on realtime subscription)

### What Happens When Passenger Joins Pool
1. **Validation** (4 checks): Cooldown, ride exists, pool exists, compatibility
2. **Atomic RPC Call**: Lock pool, validate capacity & not already member, insert pool_member record
3. **Passenger Count**: Increments pool.current_passengers
4. **Status Transition**: If full (≥max), status → WAITING_FOR_DRIVER
5. **Ride Update**: pool_id set, status → WAITING_FOR_DRIVER
6. **Fare Recalculation**: All members' fares updated based on new count
7. **Notifications**: 
   - Other members: "New rider joined, fare updated to ৳XYZ"
   - Pool creator (if not notified): "Pool found!"

### What Happens When Passenger Leaves Pool
1. **Atomic RPC Call**: Soft-delete pool_members (sets left_at = NOW(), not DELETE)
2. **Penalties Applied**:
   - Records cancellation → May trigger 7-min cooldown
   - Priyo Sathi: If friend pair, other friend penalized
3. **Check Remaining Members**:
   - If ≤1 remain: AUTO-CANCEL pool
     - Last member's ride cancelled
     - Remaining member notified
   - If >1 remain: RECALCULATE FARE
     - All remaining members notified: "Member left, fare now ৳XYZ"
     - Rides updated with new fare

---

## 🏗️ Architecture Highlights

### ✅ Strengths
- **Atomic RPC Functions**: Prevents race conditions with SELECT FOR UPDATE
- **Soft Delete Strategy**: pool_members.left_at = timestamp (not deleted) allows audit trail
- **Auto-Cancel Safety**: Pool auto-cancels if <2 members (prevents wasteful searching)
- **Comprehensive Penalties**: Cooldown + Priyo Sathi prevents abuse
- **Real-time Updates**: Supabase realtime subscriptions keep clients updated
- **Fare Recalculation**: Every member change triggers fare update

### ⚠️ Gaps
- **No driver accepted notification**: sendDriverAssignedNotification() exists but never called
- **Message queue not used**: BullMQ infrastructure available but not utilized
- **No server-side events**: All updates driven by client-side realtime subscriptions
- **No webhook system**: No way to integrate with external systems

---

## 📋 Notification Summary

| Event | From | To | Implementation |
|-------|------|----|----|
| Member joins | System | Other members | ✅ sendPushNotification() |
| Member joins | System | Pool creator | ✅ sendPoolFoundNotification() |
| Member leaves | System | Remaining members | ✅ sendPushNotification() (fare update) |
| Pool cancelled | System | Remaining member | ✅ sendPushNotification() |
| Cooldown applied | System | User | ✅ sendPushNotification() |
| Driver accepted | System | All members | ⚠️ NOT IMPLEMENTED |

---

## 🗄️ Database Table Keys

| Table | Primary Key | Active Filter | Important Fields |
|-------|------------|----------------|-------------------|
| `pools` | id | status != 'CANCELLED' | driver_id, vehicle_id, status, current_passengers |
| `pool_members` | id | left_at IS NULL | pool_id, user_id, ride_id, joined_at, left_at |
| `rides` | id | status != 'CANCELLED' | pool_id, status, cancelled_reason |
| `notifications` | id | - | user_id, type, metadata, is_read |

---

## 🔗 Related Code Files

### Main Controllers
- `Server/src/controllers/driver.controller.ts` - Driver operations
- `Server/src/controllers/pool.controller.ts` - Pool operations
- `Server/src/controllers/rate.controller.ts` - Related operations

### Services
- `Server/src/services/notification.service.ts` - Notifications & FCM
- `Server/src/services/penaltyService.ts` - Cooldown management
- `Server/src/services/priyoSathiService.ts` - Friend mode penalties
- `Server/src/services/fareService.ts` - Fare calculation
- `Server/src/services/rideEstimationService.ts` - Route & fare estimation
- `Server/src/services/smartRouteService.ts` - Route optimization
- `Server/src/services/lookupTimeService.ts` - Pool matching timer

### Routes
- `Server/src/routes/driver.routes.ts` - Driver endpoints
- `Server/src/routes/pool.routes.ts` - Pool endpoints

### Database
- `Server/supabase/migrations/20260121_ridepool_merged_schema.sql` - Schema + RPC functions

---

## 🧪 Testing Checklist

See POOL_QUICK_REFERENCE.md § Testing Checklist for complete list including:
- Driver acceptance validation
- Pool status transitions
- Member join/leave flows
- Notification delivery
- Penalty application
- Fare recalculation
- Auto-cancel mechanism

---

## 📞 How to Use This Documentation

1. **First time learning?** Start with POOL_QUICK_REFERENCE.md for overview
2. **Need deep understanding?** Read POOL_FLOW_ANALYSIS.md § 1-3
3. **Implementing similar feature?** Copy from POOL_CODE_SNIPPETS.md
4. **Debugging issue?** Use POOL_QUICK_REFERENCE.md to find file/line, then check POOL_CODE_SNIPPETS.md
5. **Modifying existing code?** Check POOL_FLOW_ANALYSIS.md § 10 for architecture notes

---

## 📌 Key Concepts

### Soft Delete Pattern
```sql
-- NOT THIS (hard delete):
DELETE FROM pool_members WHERE user_id = ?

-- BUT THIS (soft delete):
UPDATE pool_members SET left_at = NOW() WHERE user_id = ?
-- Query active: WHERE left_at IS NULL
```

### Atomic RPC Pattern
```sql
-- Prevents race conditions:
SELECT * FROM pools WHERE ... FOR UPDATE SKIP LOCKED
-- Validate conditions
UPDATE pools SET ... WHERE ...
RETURN json_build_object(...)
```

### Status Transitions
```
WAITING_FOR_RIDERS → WAITING_FOR_DRIVER (when pool full)
WAITING_FOR_DRIVER → READY_TO_START (when driver accepts)
ANY → CANCELLED (auto if <2 members, or manual)
```

---

## 📊 Statistics

- **Total Controllers**: 2 (driver.controller.ts, pool.controller.ts)
- **Total RPC Functions**: 3 (accept_pool, join_pool, leave_pool)
- **Notification Types**: 5+ (POOL_MATCH, DRIVER_ASSIGNED, POOL_CANCELLED, etc.)
- **Status Values**: 7 (WAITING_FOR_RIDERS, WAITING_FOR_DRIVER, READY_TO_START, STARTED, COMPLETED, CANCELLED)
- **Database Tables Involved**: 5+ (pools, pool_members, rides, notifications, driver_sessions, vehicle_locations)

---

## 🚀 Next Steps

For implementation of improvements:
1. Add `await notificationService.sendPushNotification()` in driver.acceptPool()
2. Consider message queue implementation for async notifications
3. Add server-side event listeners for pool status changes
4. Implement webhook system for third-party integrations

---

**Last Updated**: March 18, 2024
**Documentation Version**: 1.0
**Scope**: CarPool Server Pool Management System


# Critical Features Implementation - Decision Records

## ADR-001: Atomic Pool Join using Database Functions

**Status:** Accepted

**Context:**  
The original pool join implementation had a race condition where multiple users could simultaneously check `current_passengers < max_passengers` and all succeed in joining, causing overbooking.

**Decision:**  
Implement pool joining as a PostgreSQL stored procedure (`atomic_join_pool`) using `FOR UPDATE` row locking.

**Consequences:**
- Eliminates race condition completely
- Slightly slower due to row locking
- Requires database migration for the function
- All pool join logic must go through this function

---

## ADR-002: Lookup Time Timer Implementation

**Status:** Accepted

**Context:**  
Pools need a 3-minute "lookup time" where passengers can join. After timeout, if <2 passengers, cancel; otherwise, transition to WAITING_FOR_DRIVER.

**Decision:**  
Use in-memory `Map<poolId, Timer>` with `setTimeout()` for lookup time management.

**Alternatives Considered:**
- Database-based timers (too slow, requires polling)
- Redis with TTL (adds dependency)
- Bull/BullMQ job queue (overkill for MVP)

**Consequences:**
- Simple implementation
- Timers lost on server restart (acceptable for MVP)
- Need to implement recovery logic for production
- Memory usage scales with active pools

---

## ADR-003: Penalty/Cooldown System Design

**Status:** Accepted

**Context:**  
Users who cancel rides deliberately (after 30 seconds) multiple times should face a 7-minute cooldown penalty.

**Decision:**
- Track cancellations in `user_cancellations` table
- "Deliberate" = cancelled after 30+ seconds
- 3 deliberate cancellations within 5 minutes = 7-minute cooldown
- Store active cooldowns in `cooldown_periods` table

**Consequences:**
- Fair to users who cancel quickly (under 30s)
- Prevents abuse of the system
- Cooldown check required before creating/joining pools
- Daily reset of cancellation counter

---

## ADR-004: Emergency/SOS System Architecture

**Status:** Accepted

**Context:**  
Users need ability to trigger emergency alerts that notify contacts and authorities.

**Decision:**
- Dedicated `safety_incidents` table for all incidents
- `emergency_contacts` table per user (max 5)
- SOS triggers immediate notification to contacts
- Log all emergency service notifications for audit
- Store location at time of incident

**Consequences:**
- Full audit trail of emergencies
- Scalable notification system
- Integration point for 999 services (stub for now)
- Contact management built into user profile

---

## ADR-005: Standardized API Response Format

**Status:** Accepted

**Context:**  
Frontend expects consistent response format, original backend had inconsistent responses.

**Decision:**
```typescript
// Success
{
  success: true,
  data: { ... },
  timestamp: "ISO-8601"
}

// Error
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message",
    details?: [...]
  },
  timestamp: "ISO-8601"
}
```

**Consequences:**
- All controllers must follow this format
- Easier error handling on frontend
- Consistent logging and monitoring
- Breaking change for existing API consumers

---

## ADR-006: Zod for Validation Instead of express-validator

**Status:** Accepted

**Context:**  
Original code used express-validator but it was not type-safe and validation was inconsistent.

**Decision:**  
Replace with Zod for schema-based validation with TypeScript inference.

**Benefits:**
- Type-safe validation
- Reusable schemas
- Better error messages
- Compile-time type checking
- Smaller bundle than express-validator

---

## ADR-007: Priyo Sathi (Favorites) with Mutual Opt-in

**Status:** Accepted

**Context:**  
Users can add up to 5 companions who get notified when they search for rides.

**Decision:**
- Request-based system (not automatic)
- Companion must accept request
- Status: PENDING → ACCEPTED/REJECTED
- Bidirectional relationship created on acceptance
- Max 5 companions per user

**Consequences:**
- Privacy-first design
- Users control who can see their ride requests
- Notification system must integrate with ride creation
- UI needs companion management screens

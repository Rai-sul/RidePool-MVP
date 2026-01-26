# Context7 Library References

This document records the library documentation fetched from Context7 MCP during implementation.

## Libraries Used

### Express.js
- **Library ID:** `/expressjs/express`
- **Version:** 5.x
- **Benchmark Score:** 93
- **Docs Retrieved:** Router, Middleware, Request/Response patterns
- **Usage:** REST API framework, route handling, middleware chain

### Supabase JS
- **Library ID:** `/supabase/supabase-js`  
- **Version:** v2.58.0
- **Benchmark Score:** 90.3
- **Docs Retrieved:** Database queries, RPC calls, upsert operations
- **Usage:** PostgreSQL database access, authentication, stored procedures

### Zod
- **Library ID:** `/colinhacks/zod`
- **Version:** 4.x
- **Benchmark Score:** 92.7
- **Docs Retrieved:** Schema validation, safeParse, enum types
- **Usage:** Request body/query/params validation, TypeScript type inference

## Key Patterns from Documentation

### Express Middleware Pattern
```typescript
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (token === 'Bearer valid-token') {
    req.user = { id: 1, name: 'John' };
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### Supabase RPC Pattern
```typescript
const { data: result, error } = await supabaseAdmin.rpc('atomic_join_pool', {
  p_pool_id: poolId,
  p_user_id: userId,
  p_ride_id: rideId
});
```

### Zod Validation Pattern
```typescript
const result = schema.safeParse(data);
if (!result.success) {
  return res.status(400).json({ errors: result.error.issues });
}
```

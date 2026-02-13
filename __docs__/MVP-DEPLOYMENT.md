# MVP Deployment Guide

## Overview

This guide describes how to deploy RidePool in MVP mode, which simplifies the infrastructure by:
- Using in-memory LRU cache instead of Redis
- Using synchronous message processing instead of BullMQ
- Using single-threaded H3 operations instead of worker pools
- Deploying a single container without nginx load balancer

## Quick Start

### Environment Variables

Create a `.env` file with MVP settings:

```bash
# Enable MVP mode
MVP_MODE=true
SKIP_REDIS=true

# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Optional - Cache settings
MEMORY_CACHE_MAX_SIZE=1000
MEMORY_CACHE_TTL=300
```

### Local Development

```bash
cd Server
npm install
MVP_MODE=true npm run dev
```

### Docker Deployment (MVP)

```bash
cd Server
docker-compose -f docker-compose.mvp.yml up --build
```

### Railway.app Deployment

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - `MVP_MODE=true`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_MAPS_API_KEY`
3. Deploy

### Render.com Deployment

1. Create a new Web Service
2. Connect your GitHub repository
3. Set build command: `cd Server && npm ci && npm run build`
4. Set start command: `cd Server && npm start`
5. Add environment variables (same as Railway)

## Architecture Comparison

### Production Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      NGINX (Load Balancer)                   │
│                    (3 replicas, sticky sessions)             │
├─────────────────────────────────────────────────────────────┤
│  Express.js API (3 replicas)  │  Express.js API  │  Express │
├─────────────────────────────────────────────────────────────┤
│                         Redis Cluster                        │
├─────────────────────────────────────────────────────────────┤
│                    Supabase (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│  BullMQ Workers  │  Prometheus  │  Loki  │  Grafana          │
└─────────────────────────────────────────────────────────────┘
```

### MVP Architecture
```
┌─────────────────────────────────────────────────────────────┐
│              Single Express.js Server (1 replica)            │
│              - In-memory LRU cache                           │
│              - Synchronous message processing                │
│              - Single-threaded H3 operations                 │
├─────────────────────────────────────────────────────────────┤
│               Supabase Free Tier (PostgreSQL)                │
└─────────────────────────────────────────────────────────────┘
```

## Service Replacements

| Production Service | MVP Replacement | File |
|-------------------|-----------------|------|
| Redis (ioredis) | In-memory LRU cache | `memoryCache.service.ts` |
| BullMQ | Synchronous processing | `syncQueue.service.ts` |
| H3 Worker Pool | Single-threaded H3 | `h3Sync.service.ts` |
| Nginx | Direct Express | N/A |

## Health Check

The `/health/detailed` endpoint will report MVP mode status:

```json
{
  "status": "healthy",
  "mvpMode": true,
  "dependencies": {
    "supabase": { "status": "healthy" },
    "cache": { 
      "status": "healthy",
      "message": "In-memory cache (MVP mode)"
    }
  }
}
```

## Limitations

### Memory Cache Limitations
- Max 1000 entries by default (configurable via `MEMORY_CACHE_MAX_SIZE`)
- Not shared across instances (single instance only)
- Lost on restart

### Synchronous Processing Limitations
- Notifications processed synchronously (may add latency)
- No job retry with exponential backoff
- No job persistence

### Performance Considerations
- Suitable for ~1,000 DAU
- Single instance can handle ~100 concurrent requests
- H3 operations run on main thread (may block on heavy load)

## Upgrading to Production

When ready to scale beyond MVP:

1. Set `MVP_MODE=false`
2. Deploy Redis (or use Upstash)
3. Use full `docker-compose.yml` instead of `docker-compose.mvp.yml`
4. Enable nginx load balancer

```bash
# Switch to production mode
docker-compose up -d --scale app=3
```

## Cost Analysis

| Phase | Users | Monthly Cost |
|-------|-------|--------------|
| MVP (Free Tier) | 0-1,000 DAU | $0 |
| Growth | 1,000-10,000 DAU | $180-380 |
| Scale | 10,000+ DAU | $1,500-3,500 |

See `__docs__/MVP.md` for detailed cost breakdown.

## Troubleshooting

### Cache Issues
Check cache stats: `GET /health/cache`

### Memory Usage
Monitor via: `GET /health/detailed`

### Logs
```bash
docker logs -f <container_id>
```

## Files Changed for MVP

- `Server/src/services/memoryCache.service.ts` - In-memory LRU cache
- `Server/src/services/syncQueue.service.ts` - Sync message queue
- `Server/src/services/h3Sync.service.ts` - Single-threaded H3
- `Server/src/services/unifiedCache.service.ts` - Cache adapter
- `Server/src/config/env.ts` - MVP mode config
- `Server/src/app.ts` - MVP mode support
- `Server/docker-compose.mvp.yml` - Simplified deployment

# Financial Analysis - RidePool Infrastructure

## Pricing Research (January 2026)

### Cloud Hosting Providers

#### Supabase
| Plan | Monthly Cost | Database | Auth MAU | Storage | Bandwidth |
|------|--------------|----------|----------|---------|-----------|
| Free | $0 | 500 MB | 50K | 1 GB | 2 GB |
| Pro | $25 | 8 GB | 100K | 100 GB | 250 GB |
| Team | $599 | Unlimited | Unlimited | Unlimited | Unlimited |

**Source:** supabase.com/pricing (Jan 2026)

#### Railway.app
| Plan | Monthly Cost | Execution | Memory | Notes |
|------|--------------|-----------|--------|-------|
| Hobby | $5/month | Unlimited | 8 GB | Per service |
| Pro | $20/month | Unlimited | 32 GB | Team features |

**Note:** Free tier discontinued Dec 2024. Hobby is minimum.

#### Render.com
| Plan | Monthly Cost | Hours | Memory |
|------|--------------|-------|--------|
| Free | $0 | 750/month | 512 MB |
| Starter | $7 | Unlimited | 512 MB |
| Standard | $25 | Unlimited | 2 GB |

**Source:** render.com/pricing (Jan 2026)

#### Fly.io
| Plan | Monthly Cost | VMs | Memory |
|------|--------------|-----|--------|
| Hobby | $0 | 3 shared | 256 MB |
| Launch | $29 | Unlimited | 1 GB |

**Source:** fly.io/docs/about/pricing (Jan 2026)

### Redis Providers

#### Upstash
| Plan | Monthly Cost | Commands/day | Storage |
|------|--------------|--------------|---------|
| Free | $0 | 10K | 256 MB |
| Pay-as-go | ~$0.20/100K | Unlimited | 1 GB |
| Pro | $10 | Unlimited | 3 GB |

**Source:** upstash.com/pricing (Jan 2026)

#### Redis Cloud
| Plan | Monthly Cost | Memory | HA |
|------|--------------|--------|-----|
| Free | $0 | 30 MB | No |
| Fixed | $7 | 250 MB | No |
| Pro | $50+ | 1 GB+ | Yes |

**Source:** redis.com/pricing (Jan 2026)

### Maps APIs

#### Google Maps Platform
| API | Free Credit | Per 1K after |
|-----|-------------|--------------|
| Directions | $200/month | $5.00 |
| Distance Matrix | $200/month | $5.00 |
| Geocoding | $200/month | $5.00 |
| Places | $200/month | $17.00-$32.00 |

**Calculation:** With $200 credit = ~40K Directions calls free/month

**Source:** cloud.google.com/maps-platform/pricing (Jan 2026)

#### Mapbox
| API | Free Tier | Per 1K after |
|-----|-----------|--------------|
| Directions | 100K/month | $0.50 |
| Geocoding | 100K/month | $0.75 |
| Maps SDK | 50K MAU | $4.00/1K MAU |

**Advantage:** 2.5x more free requests than Google Maps
**Source:** mapbox.com/pricing (Jan 2026)

#### OpenRouteService (Free Alternative)
| Tier | Requests/day | Cost |
|------|--------------|------|
| Free | 2,000 | $0 |
| Standard | 500K/month | €50 |

**Source:** openrouteservice.org (Jan 2026)

### Push Notification Services

#### Knock.app
| Plan | Monthly Cost | Notifications | Channels |
|------|--------------|---------------|----------|
| Free | $0 | 10K/month | 2 |
| Starter | $25 | 100K/month | Unlimited |
| Growth | $100 | 500K/month | Unlimited |

**Source:** knock.app/pricing (Jan 2026)

#### OneSignal
| Plan | Monthly Cost | Subscribers |
|------|--------------|-------------|
| Free | $0 | 10K |
| Growth | $9 | 100K |
| Pro | $99 | 1M |

**Source:** onesignal.com/pricing (Jan 2026)

#### Firebase Cloud Messaging (FCM)
| Tier | Cost |
|------|------|
| All messages | $0 (Free) |

**Note:** FCM is free but requires Firebase setup and EAS credentials management

### Monitoring & Observability

#### Grafana Cloud
| Plan | Monthly Cost | Metrics | Logs |
|------|--------------|---------|------|
| Free | $0 | 10K series | 50 GB |
| Pro | $49 | 50K series | 200 GB |

**Source:** grafana.com/pricing (Jan 2026)

#### Datadog (Reference)
| Plan | Monthly Cost | Hosts |
|------|--------------|-------|
| Free | $0 | 5 hosts |
| Pro | $15/host | Unlimited |

**Note:** More expensive but comprehensive

### Domain & SSL

| Service | Annual Cost |
|---------|-------------|
| Domain (.com) | $12-15 |
| Domain (.app) | $15-20 |
| SSL Certificate | Free (Let's Encrypt) |
| Cloudflare DNS | Free |

### Total Cost Scenarios

#### Scenario 1: Zero-Cost MVP
| Service | Provider | Cost |
|---------|----------|------|
| Database | Supabase Free | $0 |
| Hosting | Render Free | $0 |
| Cache | None (in-memory) | $0 |
| Maps | Google $200 credit | $0 |
| Push | Knock Free | $0 |
| Monitoring | Self-hosted | $0 |
| Domain | None (use render URL) | $0 |
| **Total** | | **$0/month** |

**Limitations:**
- 500 MB database
- Server sleeps after 15 min inactivity
- 40K map requests/month max
- 10K push notifications/month

#### Scenario 2: Low-Cost Startup ($50/month)
| Service | Provider | Cost |
|---------|----------|------|
| Database | Supabase Pro | $25 |
| Hosting | Render Starter | $7 |
| Cache | Upstash Pay-as-go | $5 |
| Maps | Google (within credit) | $0 |
| Push | Knock Free | $0 |
| Monitoring | Grafana Cloud Free | $0 |
| Domain | .com | $1 (amortized) |
| **Total** | | **$38/month** |

**Supports:** ~5,000 DAU, 50K rides/month

#### Scenario 3: Growth Stage ($200/month)
| Service | Provider | Cost |
|---------|----------|------|
| Database | Supabase Pro | $25 |
| Hosting | Railway Pro | $20 |
| Cache | Upstash Pro | $10 |
| Maps | Google (overage) | $100 |
| Push | Knock Starter | $25 |
| Monitoring | Grafana Cloud Free | $0 |
| Domain | .app | $2 |
| CDN | Cloudflare Free | $0 |
| **Total** | | **$182/month** |

**Supports:** ~20,000 DAU, 200K rides/month

#### Scenario 4: Scale ($500+/month)
| Service | Provider | Cost |
|---------|----------|------|
| Database | Supabase Team | $599 |
| Hosting | AWS ECS | $200 |
| Cache | Redis Cloud Pro | $50 |
| Maps | Mapbox (higher volume) | $150 |
| Push | Knock Growth | $100 |
| Monitoring | Grafana Cloud Pro | $49 |
| Load Balancer | AWS ALB | $25 |
| **Total** | | **$1,173/month** |

**Supports:** 100,000+ DAU

## Mapbox vs Google Maps Comparison

| Feature | Google Maps | Mapbox |
|---------|-------------|--------|
| Free tier | $200/month credit | 100K requests/month |
| Routing quality (Dhaka) | Excellent | Good |
| Traffic data | Real-time | Limited |
| Custom styling | Limited | Excellent |
| SDK size (mobile) | 50+ MB | 10 MB |
| Offline support | Limited | Excellent |
| Bangladesh coverage | Full | Full |
| **Recommendation** | Production | MVP |

**Decision:** Use Mapbox for MVP (2.5x more free requests), switch to Google Maps if routing quality is insufficient.

## ROI Analysis

### Revenue Model
- Platform commission: 15% of fare
- Average fare in Dhaka: 100-200 BDT
- Commission per ride: 15-30 BDT (~$0.14-0.28)

### Breakeven Points
| DAU | Rides/month | Revenue | Min Infra Cost | Profit |
|-----|-------------|---------|----------------|--------|
| 1,000 | 15,000 | $2,100 | $0 | $2,100 |
| 5,000 | 75,000 | $10,500 | $50 | $10,450 |
| 20,000 | 300,000 | $42,000 | $200 | $41,800 |
| 100,000 | 1,500,000 | $210,000 | $1,500 | $208,500 |

**Note:** These are gross calculations, not including staff, marketing, or driver incentives.

## Recommendations

1. **Start with $0 MVP** using free tiers
2. **Use Mapbox** instead of Google Maps initially (2.5x free quota)
3. **Delay Redis** until pool search performance becomes an issue
4. **Use Knock.app** for notifications instead of FCM directly
5. **Self-host Prometheus/Loki** to avoid monitoring costs
6. **Upgrade Supabase first** when growth requires it

---

**Last Updated:** 2026-01-19  
**Sources:** Official pricing pages as of January 2026

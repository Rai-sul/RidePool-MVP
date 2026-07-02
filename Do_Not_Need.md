# Future Feature Implementation Guide

## 1. Dynamic pooling (mid-ride passenger + vote) — **Planned**

| Area | Guidance |
|------|----------|
| **Goal** | Add passenger after STARTED with in-car majority vote |
| **Components** | New vote tables; `dynamicPool.service.ts`; push notifications |
| **API** | `POST /api/pools/:id/dynamic-offer`, `POST /api/pools/:id/vote` |
| **DB** | `pool_dynamic_invites`, vote records, fare snapshot per member |
| **Frontend** | Modal in `TripProgress` for riders; driver sees detour ETA |
| **Risks** | Fare disputes; route recalculation cost; driver fatigue |

## 6. Pool switching & predefined pools — **Planned**

| Area | Guidance |
|------|----------|
| **Goal** | FCFS switch within 30s; route comparison UI |
| **DB** | `pool_switch_cooldown` on user; audit log |
| **Risks** | Race conditions — use transactions |
# History

**Nothing in this folder describes the system as it is today.**

These are point-in-time records — original proposals, one-off audits,
verification runs and design comparisons. They are kept because they explain
*why* decisions were made, which the current docs deliberately leave out.

Do not load these for feature work or bug fixing. Start at
[`../README.md`](../README.md) instead. Reach for a file here only when you need
the reasoning behind something, and treat every claim as "true on its date".

---

| File | Date | What it is | Why it is only history |
|---|---|---|---|
| `original-proposal-2025-10.md` | Oct 2025 | The original project proposal, PRD, edge cases, use cases and API sketch. | Rich product rationale — pooling rules, gender options, switching UX. Sizes and flows differ from what shipped. |
| `documentation-flow-2026-05.md` | May 2026 | 54-section all-in-one reference. | Superseded by `architecture/` + `reference/`. Contains stale facts, e.g. CAR capacity 4 (it is 3). |
| `project-overview-2026-05.md` | May 2026 | Executive overview, vision, financial analysis, deployment. | ~85% overlaps the file above. Kept for the vision and cost modelling. |
| `audit-2026-01.md` | Jan 2026 | Full code audit: security, scalability, fault tolerance, priority matrix. | Point-in-time. Several findings have since been fixed; section numbering is duplicated (two audits concatenated). |
| `driver-app-mapbox-plan.md` | — | Implementation plan for the driver backend on **MapBox**. | MapBox was never implemented. Google Maps is the only provider. |
| `maps-provider-comparison-2026-01.md` | Jan 2026 | Google Maps vs MapBox cost/feature comparison, recommending MapBox. | Recommendation not taken. Useful if the provider is ever revisited — prices are Jan 2026. |
| `schema-analysis-2026-01.md` | Jan 2026 | SQL schema review with issues and fixes. | Predates the current `Server/supabase/migrations/` set. |
| `supabase-verification-2026-01.md` | Jan 2026 | Connection/table verification run. | A test report, not a spec. |
| `security-report-2026-01.md` | — | Security analysis of critical features. | Point-in-time. |
| `typescript-test-config-fix-2026-01.md` | Jan 2026 | How `tsconfig.test.json` was introduced to fix test type errors. | The issue is resolved; kept because it explains why that file exists. |

## Superseded by

| If you were reading… | Read instead |
|---|---|
| `documentation-flow-2026-05.md`, `project-overview-2026-05.md` | [`../architecture/README.md`](../architecture/README.md) |
| the API sections of either | [`../reference/api.md`](../reference/api.md) |
| the env/config sections | [`../reference/environment.md`](../reference/environment.md) |
| `schema-analysis-2026-01.md` | [`../database/README.md`](../database/README.md) |
| `maps-provider-comparison-2026-01.md`, `driver-app-mapbox-plan.md` | [`../architecture/server.md`](../architecture/server.md#google-maps-cost-model) |

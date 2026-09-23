# Chapter 3

# Project Description

This chapter describes RidePool in detail: what the users need, what the system must do, the tools used to build it, and the resources needed to run it. It then looks at the project's impact on society and the environment, the ethical issues involved, whether the project is feasible, its strengths and weaknesses, the main risks, and its costs and benefits.

## 3.1 Project Specifications and Requirements

RidePool has three main parts:

- **CarPoolApp** – the rider mobile app, used by passengers to find and join shared rides.
- **DriverApp** – the driver mobile app, used by drivers to accept pools and complete trips.
- **Server** – the backend that matches riders, calculates fares, handles payments and sends notifications, backed by a Supabase (PostgreSQL) database.

### 3.1.1 User Requirements

User requirements describe what each type of user expects from the system. RidePool has two main types of users: **riders** and **drivers**.

**Table 3.1: Rider requirements**

| ID | Requirement |
|----|-------------|
| UR-R1 | Register, log in and manage a personal profile (name, phone, gender, photo). |
| UR-R2 | Search for a ride by choosing a pickup point and a destination on a map. |
| UR-R3 | See a list of matching pools with fare, pickup distance, number of passengers and estimated time. |
| UR-R4 | Join a pool, or create a new pool if no suitable pool is found. |
| UR-R5 | Choose a vehicle type (CAR or CNG) and a gender preference (any or female-only). |
| UR-R6 | Book a ride in advance for a future time (up to 7 days ahead). |
| UR-R7 | Track the driver and the trip progress in real time. |
| UR-R8 | Chat with co-riders and the driver inside the app. |
| UR-R9 | Pay using the in-app wallet or cash, add money to the wallet and view transaction history. |
| UR-R10 | Add up to 5 trusted companions (*Priyo Sathi*) and ride with them. |
| UR-R11 | Save frequently used places (home, office, university). |
| UR-R12 | Rate co-riders and the driver after a trip, and receive notifications at each step. |

**Table 3.2: Driver requirements**

| ID | Requirement |
|----|-------------|
| UR-D1 | Register as a driver with vehicle details (type, number plate). |
| UR-D2 | Go online and offline, and share live location while online. |
| UR-D3 | See nearby pools that are ready and accept one. |
| UR-D4 | Navigate to each pickup point and to the destination. |
| UR-D5 | Start, update and complete the trip. |
| UR-D6 | View earnings for each trip and in total. |
| UR-D7 | Chat with riders and receive notifications. |

### 3.1.2 System Requirements

System requirements describe what the system must do (functional requirements) and how well it must do it (non-functional requirements).

**Table 3.3: Functional requirements**

| ID | Requirement | Where it is handled |
|----|-------------|---------------------|
| FR-1 | Authenticate users with secure tokens (JWT) and protect private endpoints. | Supabase Auth, `auth` middleware |
| FR-2 | Index pickup and destination locations using the H3 hexagon grid. | `h3.utils.ts`, `poolMatching.service.ts` |
| FR-3 | Find and score nearby pools by route overlap, pickup distance, destination distance and how full the pool is. | `poolMatching.service.ts`, `routeOverlap.service.ts` |
| FR-4 | Never let a pool exceed vehicle capacity (CAR: 3, CNG: 2). | `atomic_join_pool` database function |
| FR-5 | Assign only one driver to a pool, even if several drivers accept at once. | `atomic_accept_pool` database function |
| FR-6 | Calculate the fare per person with a pool discount (25% for 2 riders, 35% for 3). | `fare.service.ts` |
| FR-7 | Allow female-only pools only for users whose stored profile says female. | `genderRestriction.ts` |
| FR-8 | Record cancellations and apply a short cooldown after repeated deliberate cancellations. | `penalty.service.ts` |
| FR-9 | Support scheduled (advance) rides with automatic pool assignment and rider confirmation. | `advanceBooking`, `advanceScheduler` services |
| FR-10 | Manage wallet balance safely without allowing a negative balance. | `atomic_wallet_debit` database function |
| FR-11 | Send real-time updates and notifications to riders and drivers. | Supabase Realtime, `notification.service.ts` |
| FR-12 | Calculate routes, distances and ETAs, with a fallback when the map service fails. | `smartRoute.service.ts`, Google Maps |

**Table 3.4: Non-functional requirements**

| Category | Requirement |
|----------|-------------|
| Performance | Pool search should return results within about 3 seconds. An instant pool stays open for new riders for a 40-second search window. |
| Scalability | The server can run as a single instance with in-memory cache (MVP mode) or as multiple instances with a shared Redis cache. |
| Security | All private endpoints need a valid token; input is validated with Zod and sanitized; security headers are set with Helmet; database tables use Row Level Security. |
| Abuse protection | Rate limits per client in production: 100 general requests per 15 minutes, 5 login attempts per minute, 30 searches per minute and 10 payment requests per minute. |
| Reliability | Critical operations (join pool, accept pool, wallet debit) are atomic. Health-check endpoints report the server and dependency status. |
| Usability | Simple, map-based screens; clear fare display; the same app works on Android, iOS and web. |
| Maintainability | Layered code (routes → controllers → services), TypeScript everywhere, one common data model for the apps and the server, automated tests. |
| Availability and recovery | Daily managed database backups; recovery target of 1 hour of data loss (RPO) and 4 hours of downtime (RTO). |

### 3.1.3 Platforms and Tools Utilized

**Table 3.5: Platforms, frameworks and tools**

| Area | Tool / Technology | Purpose |
|------|-------------------|---------|
| Programming language | TypeScript 5.9 | Used in the server, both apps and shared types |
| Mobile framework | React Native 0.81 with Expo SDK 54 | Build Android, iOS and web apps from one codebase |
| App navigation | Expo Router 6 | File-based screen navigation |
| App state | Zustand 5, React Context | Global state, authentication, theme, notifications |
| App styling | NativeWind 4 (Tailwind CSS) | Utility-based styling |
| Maps (mobile / web) | react-native-maps 1.20 / Leaflet 1.9 | Show maps, routes and vehicles |
| Backend runtime | Node.js 20 | Run the server |
| Backend framework | Express 5.1 | REST API |
| Database and auth | Supabase (PostgreSQL, Auth, Realtime) | Store data, log users in, push live updates |
| Geospatial indexing | H3 (h3-js 4.3) by Uber | Hexagon-based location matching |
| Routing and ETA | Google Maps Platform | Routes, distances and travel times |
| Caching | Redis (ioredis 5) / in-memory cache | Faster responses, fewer map API calls |
| Validation | Zod 4 (server), Zod 3 (DriverApp) | Check request data |
| Security | Helmet 8, express-rate-limit | Security headers and request limits |
| Logging | Winston 3 | Structured server logs |
| Testing | Vitest 4 (server), Jest (apps) | Unit and integration tests |
| Deployment | Docker, Docker Compose, Nginx | Package and run the server |
| Version control | Git and GitHub | Source code management and collaboration |
| Development tools | Visual Studio Code, Expo Go, Android Studio emulator | Writing, running and testing the code |
| Diagrams | LaTeX (TikZ) | Use case, activity, data flow, sequence and ER diagrams |

### 3.1.4 Computing Resource Requirements

**Table 3.6: Development environment**

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Processor | Dual-core, 64-bit | Quad-core or better |
| Memory (RAM) | 8 GB | 16 GB (to run the server, two Expo apps and an emulator together) |
| Storage | 20 GB free | SSD with 40 GB+ free |
| Operating system | Windows 10/11, macOS or Linux | Any of these |
| Software | Node.js 20, npm, Git, VS Code | Plus Android Studio and Docker |
| Internet | Stable broadband | Needed for Supabase, Google Maps and package installs |

**Table 3.7: Runtime environment**

| Component | Requirement |
|-----------|-------------|
| Rider / driver phone | Android 7.0 or later, or iOS 15.1 or later; GPS; internet connection (mobile data or Wi-Fi) |
| Web client | Any modern browser (Chrome, Edge, Firefox, Safari) |
| Server (MVP) | 1 vCPU, 512 MB – 1 GB RAM, one instance, in-memory cache |
| Server (production) | 2+ vCPU, 2–4 GB RAM per instance, multiple instances behind Nginx, shared Redis cache |
| Database | Supabase PostgreSQL (free tier: 500 MB; paid tier for larger data and point-in-time recovery) |
| External services | Google Maps API key; Firebase Cloud Messaging for push notifications |

## 3.2 Societal Impact

Transport affects almost every part of daily life in Dhaka. The World Bank has estimated that traffic congestion in Dhaka wastes about **3.2 million working hours every day**, and that average traffic speed has dropped from about 21 km/h to about 7 km/h in ten years [1]. A system that puts more people into fewer vehicles can help, even at a small scale.

### 3.2.1 Impact on Research and Policy

- **Travel demand data:** Because every search and trip is linked to H3 hexagon cells, RidePool can produce anonymous, area-based data about where and when people travel. This kind of data can help researchers and city planners understand travel patterns in Dhaka.
- **Evidence for pooling policy:** Bangladesh's *Ride-sharing Service Guidelines 2017* mainly regulate one-trip, one-customer services by cars, motorcycles and ambulances [2]. A working pooling system provides practical evidence for how shared rides could be covered in future transport policy.
- **Open design for further study:** The matching method (H3 indexing plus route-overlap scoring) is documented, so other students and researchers can study, test and improve it.

### 3.2.2 Educational Accessibility

- **Affordable travel for students:** Students are a large group of daily commuters with limited budgets. Sharing a car or CNG lowers the cost per person enough to make comfortable travel to universities and coaching centres affordable.
- **Planned trips for class schedules:** Advance booking lets students book rides for fixed class times, so they do not need to search for a ride every morning.
- **Safer travel for female students:** The female-only option and the Priyo Sathi feature let female students travel with other women or with trusted friends, which can make it easier for them to attend classes far from home.
- **Learning resource:** The project itself — its code, documentation and diagrams — is a practical example of full-stack mobile development that other students can learn from.

### 3.2.3 Health Impact Assessment

**Table 3.8: Health impacts**

| Area | Possible impact | Positive / Negative | How RidePool responds |
|------|-----------------|---------------------|-----------------------|
| Air quality | Fewer vehicles for the same number of trips means less exhaust. | Positive | Pooling is the main feature; solo rides are not the default. |
| Stress and fatigue | Crowded buses and long waits cause stress. | Positive | Seated, comfortable rides; clear waiting time and live tracking. |
| Personal safety | Sharing with strangers may feel unsafe. | Risk | Female-only rides, trusted companions, ratings, in-app chat. |
| Physical activity | Riders may walk a short distance to a pickup point. | Positive | Pickups are matched within a limited range, so the walk stays short. |
| Infection spread | Sharing a closed vehicle can spread illness. | Negative | Small groups (2–3 riders); riders can cancel early without penalty. |

### 3.2.4 Legal and Cultural Context

**Legal context**

- **Ride-sharing regulation:** Under the *Ride-sharing Service Guidelines 2017*, a ride-sharing company needs a Ride Sharing Enlistment Certificate from the Bangladesh Road Transport Authority (BRTA). The certificate costs Tk 1,00,000 for one year and Tk 10,000 for each yearly renewal, and a company in Dhaka must have at least 100 vehicles in its fleet [2]. Fares may not exceed the rates in the Taxicab Service Guideline 2010 [2]. RidePool would need to meet these conditions before a public launch.
- **Data protection:** Bangladesh's **Personal Data Protection Act, 2026** (which replaced the Personal Data Protection Ordinance, 2025) requires consent before collecting personal data and gives citizens rights over their data [3][4]. RidePool collects names, phone numbers, gender and live location, so it must follow these rules.
- **Payments:** Wallet top-ups through mobile banking must follow Bangladesh Bank rules and the terms of the payment providers.

**Cultural context**

- **Gender and comfort:** Many women in Bangladesh are uncomfortable travelling with unknown men. RidePool respects this by allowing female-only pools, which are granted only when the user's stored profile says female, so the option cannot be misused.
- **Local vehicles:** CNG auto-rickshaws are a familiar and trusted mode of transport in Dhaka, so RidePool supports CNG alongside cars.
- **Social trust:** People in Bangladesh often prefer travelling with people they know. The Priyo Sathi (“dear companion”) feature is designed around this habit.
- **Local currency and habits:** All prices are shown in Taka, and both cash and wallet payments are supported.

## 3.3 Environmental Impact

### 3.3.1 Environmental Sustainability

Road transport is a major source of air pollution in Dhaka. Studies report that the transport sector is the largest source of NOx in Dhaka and the second-largest source of particulate matter (PM) [5]. When two or three people share one car or CNG instead of taking separate vehicles, fewer vehicles are needed for the same number of trips.

**Table 3.9: Vehicles needed for 12 riders going the same way**

| Travel mode | Vehicles needed | Vehicles saved |
|-------------|-----------------|----------------|
| Solo car rides | 12 | – |
| RidePool CAR (3 riders each) | 4 | 8 (67% fewer) |
| RidePool CNG (2 riders each) | 6 | 6 (50% fewer) |

Fewer vehicles means less fuel burned, lower emissions and less road space used, which also helps reduce traffic jams.

### 3.3.2 Energy Efficiency Considerations

RidePool also tries to be efficient in its own use of computing and phone resources:

- **Light matching:** H3 hexagon lookups and in-memory scoring are cheap, so heavy distance calculations are avoided for most candidates.
- **Fewer map requests:** Only the top 10 matches are enriched with Google Maps data, and the rider's route is fetched once per search and shared by all matches. Results are cached, so repeated requests do not call the map service again.
- **Right-sized servers:** In MVP mode the whole server runs as one small instance without Redis, so no extra machines are running when demand is low.
- **Phone battery:** Real-time updates use Supabase Realtime connections, with polling only as a fallback, so the phone does not keep asking the server for updates.
- **Shorter trips per rider:** Matching favours pools with high route overlap and low detour, so vehicles do not drive extra distance to pick people up.

### 3.3.3 Alignment with Sustainable Development

**Table 3.10: Alignment with the UN Sustainable Development Goals (SDGs)**

| SDG | Target | How RidePool contributes |
|-----|--------|--------------------------|
| SDG 3 – Good Health and Well-being | 3.9: Reduce illness from air pollution | Fewer vehicles and lower emissions per trip |
| SDG 5 – Gender Equality | 5.2: Eliminate violence against women in public spaces | Female-only pools and trusted-companion rides |
| SDG 8 – Decent Work and Economic Growth | 8.5: Productive employment for all | Earning opportunity for car and CNG drivers |
| SDG 9 – Industry, Innovation and Infrastructure | 9.5: Enhance research and technology | Uses modern geospatial matching (H3) in a local product |
| SDG 11 – Sustainable Cities and Communities | 11.2: Affordable, sustainable transport for all; 11.6: Better city air quality | Cheaper shared rides and fewer vehicles on the road |
| SDG 13 – Climate Action | 13.2: Reduce greenhouse gas emissions | Lower fuel use per passenger-kilometre |

## 3.4 Ethical Issues

### 3.4.1 Transparency and Integrity of Data

- **Clear fare calculation:** Fares are calculated by a fixed, documented formula (base rate + distance + time − pool discount). The same rules apply to every rider. The fare breakdown, including the Tk 10 platform fee added to each rider's charge, must be shown to the rider before they confirm a ride.
- **Safe data changes:** Joining a pool, accepting a pool and moving wallet money are done inside atomic database functions, so the data can never end up in a broken state (for example, an overfilled car or a negative balance).
- **Records and audit:** Every wallet movement creates a transaction record, and cancellations are stored with their timing, so penalties can be checked and explained.
- **Trusted data only:** Values that matter for fairness, such as vehicle capacity and gender, are taken from the server and the stored profile, never from the client app.

### 3.4.2 Fair Representation

- **Same rules for everyone:** Pool ranking uses only route overlap, distance, destination and how full the pool is. It does not use a rider's name, religion, area of residence or any other personal detail.
- **Gender option without discrimination:** The female-only option exists to protect women's safety. It does not stop anyone from using the service, because mixed pools are always available.
- **Fair penalties:** Cancellations made within the first 30 seconds are not counted, so accidental taps are not punished. A cooldown is applied only after 3 deliberate cancellations within 5 minutes.
- **Fair treatment of drivers:** Driver earnings follow a fixed commission (the platform keeps 20% of the trip fare), and every trip's earnings are recorded for the driver to see.

### 3.4.3 User Privacy and Data Protection

**Table 3.11: Personal data and how it is protected**

| Data | Why it is needed | Protection |
|------|------------------|------------|
| Name, phone, email | Account and contact | Supabase Auth; access limited by Row Level Security |
| Gender | Female-only pool eligibility | Stored on the server; never taken from the client |
| Live location | Matching, pickup and tracking | Shared only during an active search or trip, and only with that pool's members and driver |
| Wallet and payments | Paying for rides | Atomic debit function; full transaction history |
| Chat messages | Communication inside a pool | Available only to the riders and driver of that ride |
| Saved places, Priyo Sathi list | Convenience and trusted rides | Visible only to the owner |

Other protections include token-based login, HTTPS communication, input validation and sanitization, rate limiting, secret keys stored in environment variables (never in the code), and the option for users to delete their account.

### 3.4.4 Academic and Professional Responsibility

- **Honest reporting:** Features that are complete, partly complete or planned are reported as they are. For example, the wallet and cash payment flows work, while full payment-gateway integration is left for future work.
- **Credit to others:** All open-source libraries (React Native, Expo, Express, H3, Supabase and others) are used under their licenses and credited, and outside sources are cited.
- **Professional practices:** The team used version control, code reviews, automated tests, documented architecture and a consistent coding style.
- **Responsibility to users:** Because the system deals with people's safety, location and money, security and correctness were treated as priorities, not extras.

## 3.5 Feasibility Analysis

### 3.5.1 Technical Feasibility

RidePool is technically feasible because it is built only from mature, well-supported technologies:

- **React Native and Expo** are widely used for production mobile apps and let one codebase run on Android, iOS and web.
- **Supabase** provides a managed PostgreSQL database, authentication and real-time updates, so the team did not need to build these from scratch.
- **H3** is an open-source library created by Uber for exactly this kind of location matching.
- **Google Maps Platform** provides reliable routes and travel times, and the system falls back to a simple geometric estimate if it is unavailable.
- The working system, its automated tests (14 server unit-test files covering fares, matching, penalties, advance booking, caching and validation) and its documentation show that the design works in practice.

### 3.5.2 Operational Feasibility

- **Easy to use:** Riders only need to pick a pickup point and destination; the system finds pools automatically. Drivers see ready pools and accept them with one tap.
- **Fits local habits:** Support for CNG, cash payment, Taka pricing and gender preferences matches how people in Dhaka already travel.
- **Low maintenance:** The server can run as a single Docker container in MVP mode, with health-check endpoints to monitor it. Database backups are handled by Supabase.
- **Operational challenge:** For public launch, the service needs enough drivers and riders in the same areas at the same time, and must meet BRTA requirements such as the 100-vehicle fleet minimum in Dhaka [2].

### 3.5.3 Economic Feasibility

- **Low development cost:** All frameworks and tools are free and open source, and cloud services were used within their free tiers during development (see Section 3.8.1).
- **Low starting cost:** The MVP can run for close to zero monthly cost on free tiers, and costs grow only as users grow (see Section 3.8.2).
- **Clear income source:** The platform earns a 20% commission on each trip fare plus a Tk 10 platform fee per rider.
- **Value for users:** Riders save a large share of the cost of a solo ride, which gives them a strong reason to use the service (see Section 3.8.3).

## 3.6 Positives and Negatives

### 3.6.1 Positives

- Much lower fare per person compared with a solo ride.
- Fewer vehicles on the road, less fuel use and less pollution.
- Safety features: female-only pools, trusted companions (Priyo Sathi), ratings and in-app chat.
- Supports both cars and CNGs, which suits Dhaka's transport.
- Advance booking for daily fixed trips such as office and classes.
- Fast, efficient matching using H3, with careful control of map API cost.
- Safe handling of money and seats through atomic database functions.
- One codebase for Android, iOS and web; modular and well-documented design that is easy to extend.

### 3.6.2 Negatives

- Pooling only works well when many riders are active in the same area; in quiet areas or times, riders may not find a pool.
- Riders may need to wait a short time or walk a short distance to a pickup point.
- Trips can take longer than a solo ride because of extra pickups and drop-offs.
- Because the fare is split and discounted, the driver earns less per trip than from a solo trip of the same distance; this must be balanced by more trips per day.
- The system depends on external services (Google Maps, Supabase); an outage or price change affects the service.
- Full payment-gateway integration (such as bKash or card payments) is not yet complete.
- Legal requirements (BRTA enlistment, 100-vehicle fleet) are a barrier to a public launch for a small team.

## 3.7 Risk Management

### 3.7.1 Risk Identification

**Table 3.12: Risk register**

| ID | Risk | Likelihood | Impact |
|----|------|------------|--------|
| R1 | Not enough riders or drivers in an area, so pools do not fill | High | High |
| R2 | Two riders join the last seat, or two drivers accept the same pool, at the same time | Medium | High |
| R3 | Google Maps API costs grow quickly or the service fails | Medium | Medium |
| R4 | Personal data or location is leaked | Low | High |
| R5 | Riders cancel often, disturbing other pool members | Medium | Medium |
| R6 | Harassment or unsafe behaviour during a shared ride | Low | High |
| R7 | Server or database downtime | Low | High |
| R8 | Fake accounts, spam or brute-force login attempts | Medium | Medium |
| R9 | Changes in regulations or failure to meet BRTA requirements | Medium | High |
| R10 | Payment errors, such as a negative wallet balance or double charging | Low | High |

### 3.7.2 Risk Mitigation Strategies

**Table 3.13: Mitigation strategies**

| Risk | Mitigation |
|------|------------|
| R1 | Widen the search area when no pool is found nearby; let riders create a new pool; advance booking gathers riders ahead of time. |
| R2 | `atomic_join_pool` and `atomic_accept_pool` database functions use row locking, so seats and drivers can never be double-assigned. |
| R3 | Caching, one shared route request per search, enrichment of only the top 10 matches, and a geometric fallback when map calls fail. |
| R4 | Token authentication, Row Level Security, HTTPS, input sanitization, and secret keys kept in environment variables. |
| R5 | Cancellation penalty: after 3 deliberate cancellations within 5 minutes, the rider gets a short cooldown. |
| R6 | Female-only pools based on the stored profile, Priyo Sathi, ratings and in-app chat. |
| R7 | Health-check endpoints, Docker-based deployment, managed daily backups, and a documented disaster-recovery plan. |
| R8 | Rate limiting on login (5 per minute), password reset, search and payment endpoints. |
| R9 | Follow the Ride-sharing Service Guidelines 2017 and the Personal Data Protection Act 2026; review legal needs before launch. |
| R10 | `atomic_wallet_debit` prevents negative balances and writes a transaction record for every movement. |

### 3.7.3 Risk Monitoring

- **Health checks:** The server exposes `/health/live`, `/health/ready`, `/health/detailed` and `/health/cache` endpoints to check the server, database and cache.
- **Logging:** Winston records structured logs of errors, warnings and important events (for example, penalties and failed notifications).
- **Analytics:** Pool searches and lookup times are tracked, which shows when riders are not finding pools (risk R1).
- **Cost monitoring:** Google Maps and Supabase usage are checked against their free limits in their dashboards.
- **Automated tests:** Unit tests are run after every change to catch errors in fares, matching, penalties and advance booking before release.
- **Regular review:** The risk register is reviewed at each project milestone and updated when new risks appear.

## 3.8 Economic Analysis

All amounts are in Bangladeshi Taka (Tk). US dollar prices are converted at about **US$1 ≈ Tk 122**; this rate is an approximation.

### 3.8.1 Development Costs

**Table 3.14: Development costs**

| Item | Cost | Notes |
|------|------|-------|
| Development computers and test phones | Tk 0 | Already owned by the team |
| Software and frameworks (VS Code, Node.js, Expo, React Native, Git) | Tk 0 | Free and open source |
| Supabase (database, auth, realtime) | Tk 0 | Free tier during development |
| Google Maps Platform | Tk 0 | Within the free monthly usage (10,000 free calls per product per month on the Essentials tier) [6] |
| Code hosting (GitHub) | Tk 0 | Free plan |
| Internet (6 months × about Tk 1,000) | about Tk 6,000 | Estimate |
| Google Play developer account | about Tk 3,050 | US$25, one-time |
| Apple Developer Program (optional, for iOS release) | about Tk 12,100 per year | US$99 per year |
| **Total cash cost** | **about Tk 9,000 – 21,000** | Depending on whether iOS is published |

If the team's time were paid, labour would be the largest cost. For example, **3 developers × 6 months × Tk 25,000 per month ≈ Tk 4,50,000**. This amount is shown only to express the value of the work; it was not actually spent.

### 3.8.2 Operational Costs

**Table 3.15: Estimated monthly operating costs by stage**

| Item | MVP / pilot (up to ~1,000 daily users) | Growth (~1,000 – 10,000 daily users) |
|------|------------------------------------------|---------------------------------------|
| Server hosting | Tk 0 – 850 (free tier or small VPS) | Tk 2,500 – 6,000 (2–3 instances) |
| Supabase | Tk 0 (free tier) | about Tk 3,050 (Pro plan, US$25) |
| Redis cache | Tk 0 (in-memory cache used) | Tk 0 – 1,200 |
| Google Maps | Tk 0 (within free usage) | Tk 6,000 – 24,000 (pay as you go) |
| Push notifications (FCM) | Tk 0 | Tk 0 |
| Domain and SSL | about Tk 125 | about Tk 125 |
| **Total per month** | **about Tk 0 – 1,000** | **about Tk 12,000 – 35,000** |

Legal costs are extra: the BRTA Ride Sharing Enlistment Certificate costs Tk 1,00,000 for the first year and Tk 10,000 per year to renew [2].

### 3.8.3 Cost-Benefit Analysis

**Benefit for riders.** The example below uses RidePool's actual fare formula for an 8 km, 30-minute car trip (base Tk 50 + Tk 15/km + Tk 2/min = Tk 230 before discount).

**Table 3.16: Fare per rider for an 8 km, 30-minute car trip**

| Riders in the pool | Pool discount | Fare per rider | Charged per rider (with Tk 10 fee) | Saving compared to riding alone |
|--------------------|---------------|----------------|------------------------------------|---------------------------------|
| 1 (solo, for comparison) | 0% | Tk 230 | Tk 240 | – |
| 2 | 25% | Tk 86 | Tk 96 | Tk 144 (60%) |
| 3 | 35% | Tk 50 | Tk 60 | Tk 180 (75%) |

A student who makes this trip 20 days a month would pay about **Tk 1,920** in a 2-person pool instead of **Tk 4,800** alone — a saving of about **Tk 2,880 per month**.

**Benefit for the platform.** For each completed pool, the platform keeps 20% of the trip fare plus Tk 10 from each rider:

- 2-rider pool: 20% of Tk 172 + Tk 20 ≈ **Tk 54**
- 3-rider pool: 20% of Tk 150 + Tk 30 = **Tk 60**

With average earnings of about Tk 55 per pool, the pilot's monthly costs (about Tk 1,000) are covered by around 20 pools a month. In the growth stage, costs of about Tk 35,000 per month are covered by about 640 pools a month (roughly 21 pools a day).

**Benefit for society.** Beyond money, each pool takes one or two vehicles off the road, reduces fuel use and emissions, and saves travel time for the city as a whole (Sections 3.2 and 3.3).

**Conclusion.** RidePool has a very low development cost, low running costs that grow only with usage, large savings for riders and a clear income for the platform. The benefits clearly outweigh the costs, as long as enough riders and drivers use the service for pools to fill.

---

## References

[1] The Daily Star, "Traffic jam in Dhaka eats up 3.2m working hours every day: WB." https://www.thedailystar.net/city/dhaka-traffic-jam-congestion-eats-32-million-working-hours-everyday-world-bank-1435630

[2] The Daily Star, "Ride-sharing services get cabinet nod." https://www.thedailystar.net/frontpage/ride-sharing-services-get-cabinet-nod-1520506

[3] The Daily Star, "Bangladesh's Personal Data Protection Ordinance 2025: key takeaways." https://www.thedailystar.net/tech-startup/news/bangladeshs-personal-data-protection-ordinance-2025-key-takeaways-4015401

[4] Securiti, "An Overview of Bangladesh's Personal Data Protection Act, 2026." https://securiti.ai/bangladesh-personal-data-protection-act-overview/

[5] Asian Transport Observatory, "Bangladesh Transport Air Pollution Profile 2026." https://asiantransportobservatory.org/analytical-outputs/transportairpollutionprofiles/bangladesh-transport-air-pollution-profile-2026/

[6] Google Maps Platform, "Start building today with up to 10,000 monthly free calls per product." https://mapsplatform.google.com/resources/blog/start-building-today-with-up-to-10-000-monthly-free-calls-per-product/

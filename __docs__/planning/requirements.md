# Project Proposal

# **PROJECT PROPOSAL: RIDE POOL**

We are planning to build a ride-pooling application for Dhaka City, with plans to expand in the future. The core concept is that our system will not operate in the same manner as existing platforms like Uber or Pathao; our main selling point is cost savings. The platform will enable people to share rides to reduce expenses, and at the initial stage, our focus will be solely on pooling. Specifically, if a ride in a sedan (which can accommodate up to three passengers excluding the driver) is not shared by at least two people, the ride will not proceed. In essence, our primary idea at this stage is dedicated car-pooling. Now, on to the features.

**Ride Mechanic (Elaborated):**  
Search \_\> look up \-\> show pool \=\> add to queue \-\> keep pool on for certain time-\> done

As a sedan can carry at most three passengers (excluding the driver), the app figures out an **optimized pickup location** that minimizes detours and makes it convenient for everyone. This pickup point can be suggested by the **system using algorithms**, or **the driver may decide based on how comfortable they are with detours**. Once all these factors, detours, pickup spots, destination similarity, and gender preferences are considered, the system forms a potential shared ride. **All ride requests are first placed in a queue**. For instance, when P1 searches for a ride, their information (destination, gender, pickup) goes into a queue that drivers can see. If a driver accepts P1’s request, they are also added to the same queue. Later, if P2 and P3 submit similar ride requests, the system analyzes all the information, groups compatible passengers together, and **turns the queue into a shared ride**. During the first segment of the journey (up to 15% of the total distance), provided it is t**echnically and logistically feasible**. If such a passenger is added, the fare for everyone is **recalculated and adjusted fairly** according to the updated pooling arrangement.

**Promise Money:** The concept of promise money is straightforward. It is a small fee (50 Taka) designed to discourage passengers from cancelling rides too often. This amount can be provided in two ways: either the passenger **transfers 50 Taka into the app using Bkash**, or they allow **the system to add 50 Taka to the cost of their first ride**. Once funded, the promise money stays in the passenger’s account as a **stake**. If they cancel rides a certain number of times, a portion of this money **will be deducted**. Before any deduction happens, **the passenger will receive warnings for a set number of cancellations**. However, **if they continue cancelling rides prematurely after these warnings**, the appropriate amount will be subtracted from their promise money balance. 

**Cooldown Period:** When 3 warnings have been issued after 3 cancellations, we will make him sit down for 1 hour. Warning will be issued if cancellation happens within 30 seconds.

**Customer Rating:** Passengers who share rides will be able to rate one another based on behavior during the trip, and each individual’s rating will influence future ride searches. For example, when a customer requests a shared ride and three other passengers are eligible for the same trip, but only two spots are available (since one person is already in the queue and a maximum of two more can join), **the system will prioritize the two passengers with the highest ratings**. This entire selection process will take place internally within the system to ensure that riders with better ratings receive preference in competitive matching scenarios. 

**SOS Button:** If any passenger feels **endangered** during the trip due to an incident, there will be an **SOS button** within the app. **Pressing this button will immediately send a distress request to 999**. Along with the alert, the system will transmit **key details such as the car’s information, the driver’s identity, and the other passengers’ details** to ensure quick and effective emergency response.

**Gender-Based Matching:** Gender-based matching allows customers to select the gender of the co-passengers they prefer to ride with. There will be three options available to all users: **male-only, female-only, and any**. **Every passenger must choose one of these options, even if it is “any.”** This gender preference will directly influence how rides are matched, serving as both a safety measure and a feature that enhances passenger comfort.

**Priyo Shathi (Favorites):** Priyo Shathi is a “favorites” feature that allows customers to add up to five other passengers to their favorites list. This feature influences ride matching by giving **favorites the highest priority** during searches. For example, if P1 adds P2 to their Priyo Shathi list, P2 will receive a notification whenever P1 searches for a ride, inviting them to join the queue. However, before sending the notification, the system will check **whether including P2 is feasible**; it will attempt to add them first, but if doing so would mean losing too many nearby passengers, **the notification will not be sent.** This decision will be handled algorithmically to balance efficiency and availability. The Priyo Shathi feature aims to speed up the ride-searching process by helping queues fill more quickly with preferred companions.

**Pool Cap & Driver Cap(Future Enchancement):** Demand to supply ratio problem, meaning more pool than driver or more driver than pool. We will impose a pool cap if not enough drivers found or move the drivers to the higher pool areas. 

# Edge cases

**Ridepool App – Edge Cases & Business Logic**

### **1\. Pickup Optimization**

* If the user is **far from the main road** (e.g., at home or office), the app will:

  * Suggest walking **100–200 meters** towards the nearest main road for easier pickup.

  * Indicate the exact direction to walk and estimate walking time.

  * Walking path to the main road will be shown in the map.

 * Users can search from their **current indoor location**, but may receive fewer or less optimal matches.

  ### **2\. Pool Suggestions**

* The app will display multiple pool options with key details:

  * **Route name and fill ratio** (e.g., Pool A: 3/4 filled).

  * **Fare estimate** (e.g., 120 Taka).

  * **Walking distance** to pickup point (e.g., 200 meters).

  * **Estimated wait time** (e.g., 10 minutes).

  * **Total trip distance** (e.g., 5 km).

* Example:

  * **Pool A**: Banani → Dhanmondi, 3/4 filled, fare 120 Taka, 200m walk, 10 min wait, 5 km total.

  * **Pool B**: Route B, 2/4 filled, fare 180 Taka, 50m walk or wait at current location, 15 min wait, 6 km total.

* Users can compare and select their preferred pool.

  ### 

  ### 

  ### **3\. Incentives & Penalties**

* **Passengers**:

  * 20% discount bonus when the pool reaches 4/4. After pooling off.

* **Drivers**:

  * Extra tip if they complete 3 trips in a day.

* **Platform**:

  * Add a hidden 10 Taka surcharge on each trip to subsidize losses from cancellations.

  ### **4\. Dynamic Pool Adjustments**

* During pooling, riders in the car will see:

  * Option to accept another passenger (e.g., “Rahim”) with updated fare and savings.

  * Rahim’s distance from the car.  
      
  * If they accept the “Rahim” then they can save – % and the fare will be – taka. Rahim is – km away from you.

* Pooling continues until **3–4 hexagons** (spatial units) are processed; after that, no new passengers are added.

* Drivers cannot go online again until their current pool queue is empty.

  ### **5\. Friend & Proximity Matching (Priyo Sathi Feature)** 

* The app queries the **Priyo Sathi (friends) table** for potential matches:

  * If friends are in the **same hexagon**, and the detour is **\<7 minutes** with distance **\<1 km**, they are added automatically.

  * If a friend is along the route but outside the hexagon (e.g., route Badda → Mirpur, friend near Jamuna Future Park), they are also eligible to be added.  
  * If the priyo sathi friend is 50 metres away from the initial calculated route then won’t be added to the pool.

* If the friend cancels, the **other friend gets charged** (to discourage abuse, similar to torrentBD banning rules).

  ### **6\. Failover Suggestions**

* If **no pools** or **no optimal pools** are available:

  * Suggest walking to the nearest **“Purple Zone”** (designated pooling hotspot) for higher chances and better fares.

  * Or provide a directional prompt: e.g., “Walk 300m east for better pool availability and save 20%.”  
  * Always try to **catch** the customer you can save upto 70-80%

  ---

**PRD (Product Requirement Document)**

# **PRD: Ridepool App – Edge Cases & Pooling Logic**

## **1\. Overview**

This document defines the edge cases, business logic, and user flows for the ridepool app. The goal is to ensure **efficient pooling, user-friendly pickup experience, fair pricing, and optimized driver utilization**.

---

## **2\. User Stories**

### **2.1 Passenger**

* As a passenger, I want to see multiple pool options with fare, walk distance, and wait time so I can choose the most convenient ride.

* As a passenger, I want the app to suggest walking to the nearest main road or pooling zone if it improves availability and pricing.

* As a passenger, I want to see clear incentives (discounts for full pools) so I feel rewarded for pooling.

* As a passenger, I want to know if adding another rider reduces my fare so I can choose to accept or decline.

* As a passenger, I want my Priyo Sathi (friends) to be added automatically if they are nearby and the detour is reasonable.

### **2.2 Driver**

* As a driver, I want additional incentives (tips for multiple trips) so I stay motivated.

* As a driver, I want pooling to stop after a certain threshold (3–4 hexagons) so trips don’t become endless detours.

* As a driver, I want the system to ensure my queue is empty before new trips are assigned.

### **2.3 Platform**

* As the platform, I want to add a small hidden surcharge (10 Taka) to subsidize cancellations without impacting user perception.

* As the platform, I want to discourage abuse of Priyo Sathi pooling by charging the other friend if one cancels.

---

## **3\. Functional Requirements**

### **3.1 Pickup Optimization**

* If passenger location is off the main road:

  * Suggest nearest pickup point within **100–200m walking distance**.

  * Display walking directions and estimated walk time.

* If no pool is available:

  * Suggest nearest **Purple Zone (pooling hotspot)**.

  * Or show directional prompt: “Walk X meters east for better pool and save Y%.”

### **3.2 Pool Suggestion Logic**

* Display 2–3 best pool options with:

  * Route name & fill ratio (e.g., 3/4 filled).

  * Fare estimate.

  * Walking distance to pickup.

  * Estimated wait time.

  * Trip distance.

* Example UI:

  * **Pool A**: Banani → Dhanmondi | 3/4 filled | 120 Taka | 200m walk | 10 min wait | 5 km.

  * **Pool B**: Route B | 2/4 filled | 180 Taka | 50m walk or current location | 15 min wait | 6 km.

### **3.3 Incentives & Penalties**

* Passenger bonus: **20% discount if pool reaches 4/4.**

* Driver bonus: **extra tip if 3+ trips completed in a day.**

* Platform fee: **\+10 Taka hidden surcharge per trip** (used for cancellation subsidies).

### **3.4 Dynamic Pool Adjustments**

* During active pool:

  * Notify passengers of potential new rider:

    * Show savings, updated fare, and rider’s distance.

  * Pooling cutoff: **stop after 3–4 hexagons.**

* Drivers cannot go online for new rides until the current pool queue is empty.

### **3.5 Priyo Sathi (Friends Matching)**

* Query Priyo Sathi table during pooling:

  * If in the same **hexagon** and detour \<7 minutes & distance \<1 km → auto-match.

  * If along the route but outside the hexagon → eligible for match.

* Cancellation rule: if one Priyo Sathi cancels, the other is **charged a penalty**.

---

## **4\. Acceptance Criteria**

* The app suggests alternative pickup points when the user is off the main road.

* Pools display all required details (fare, walk, wait, route, distance).

* Incentives and surcharges applied automatically.

* Pooling stops after 3–4 hexagons.

* Priyo Sathi matching respects detour/time constraints.

* Purple Zone fallback works when no pools are found.

---

## **5\. Non-Functional Requirements**

* **Performance**: Pool search & suggestions \< 3 seconds.

* **Scalability**: Handle 10k concurrent users.

* **Fairness**: Hidden surcharge must not be visible to passengers.

* **Reliability**: Pool cutoff logic enforced consistently.

---

## **6\. Open Questions**

* Should users have the option to **opt out of walking suggestions** (always request direct pickup)?

* How do we notify drivers of extra tip eligibility (before or after the 3rd trip)?

* Should the surcharge (10 Taka) remain fixed or dynamic based on market conditions?

# Rough sheet

If the user is far away from the main road (suppose he/she is in his office or home) then the app will suggest that he walk near the main road for easy pickup.  
Users can search from his office or home but they might not get optimal matching. They may find a pool but it will suggest him to go 100 \- 200 metres for easy pickup.  
And if no pool or no optimal pool appears then the app will suggest that he go to the purple zone for a better pool and save more money. Or can suggest to — meter go in that direction for better pool and save money.

			|  
|  
\* —----	 |  
|  
|  
|

Pools will come to his phone like Banani to Dhanmondi Pool A (Route A already ¾ and fare will be 120 and have to walk 200 meter that direction for easy pickup wait 10 mins, Distance approx 5 km),   
Pool B (Route B 2/4 and fare will be 180 taka but have to walk 50 metres or stay in location and wait 15 mins, distance approx 6 km). Customers will get to choose.

20% bonus if 4/4 pool.  
Extra tip for drivers if they complete 3 trips per day.  
Always charge 10 taka extra from the user without knowing them so that we can subside other users if someone cancels.  
In the pool we show the users who are in the car that if they accept the “Rahim” then they can save – % and fare will be – taka. Rahim is – km away from you. After 3-4 hexagons the app will stop pooling and it will be final and the driver won’t get online unless he empty the queue..  
The app will run a query on the priyo sathi table so that if his/her friends or favourite persons are in the same hexagon and minimum detour time less than 5-7 mins and distance less than 1 km then the app will add them and calculate the route and search for another user. OR if they are far away from some hexagon but near the route (main road  suppose route is Badda to Mirpur and priyo sathi friend is near JFP) then app will add him for the latter. He will get notification. But if he cancels then the other friend will get charged. Like torrentBD banned.

### **5\. Friend & Proximity Matching (Priyo Sathi Feature)** 

* The app queries the **Priyo Sathi (friends) table** for potential matches:

  * If friends are in the **same hexagon**, and the detour is **\<7 minutes** with distance **\<1 km**, they are added automatically.

  * If a friend is along the route but outside the hexagon (e.g., route Badda → Mirpur, friend near Jamuna Future Park), they are also eligible to be added.  
  * If the priyo sathi friend is 50 metres away from the initial calculated route then won’t be added to the pool.

* If the friend cancels, the **other friend gets charged** (to discourage abuse, similar to torrentBD banning rules).

# Finalized Features

**MVP ONLY FEATURES ( FIXED NO CHANGE)**

**Gender-Based Matching:** Gender-based matching allows customers to select the gender of the co-passengers they prefer to ride with. There will be three options available to all users: **female-only(exclusive to females), and Any(all gender)**. **Every female passenger must choose one of these options, even if it is “any.”** This gender preference will directly influence how rides are matched, serving as both a safety measure and a feature that enhances passenger comfort. **(NO CHANGE)**

**SOS Button:** If any passenger feels **endangered** during the trip due to an incident, there will be an **SOS button** within the app. **Pressing this button will immediately send a distress request to 999**. Along with the alert, the system will transmit **key details such as the car’s information, the driver’s identity, and the other passengers’ details** to ensure quick and effective emergency response. Need to contact Police Stations.  **(NO CHANGE)**

**Cooldown Period:** After 3 deliberate cancellations within 5 mins, 7 mins cooldown (penalty) will be issued. Cancellation counter refreshes daily. Penalty increases dynamically. Warning will NOT be issued if cancellation happens within 30 seconds. (**NO CHANGE)**

**Priyo Shathi (Favorites):** Priyo Shathi is a “favorites” feature that allows customers to add up to five other passengers to their favorites list. From the feature list, If active( **in app and within range** ), send gangUp req? If accepted, private q created. Then the usual stuff happens. The Priyo Shathi feature aims to speed up the ride-searching process by helping queues fill more quickly with preferred companions. (**NO CHANGE)**

**Dynamic Pooling:** Dynamic pooling is a feature that allows a car to pick up passengers after the ride starts. At minimum 2 people are needed for a ride to start. Once the ride starts, at max two more passengers can be added to the pool based on **in-pool voting (car)**. During pooling, riders in the car will get an option to accept another passenger (for example, “Rahim”) along with updated details like the new fare and **how much they will save**, as well as **Rahim’s distance from the car.** If they agree to add Rahim, t**heir fare decreases** by a certain percentage, and they are shown exactly **how much they save and how far away Rahim is**. This process of adding passengers continues only for a certain distance. Also, drivers cannot accept new rides or go online again until their current pool of passengers is fully completed.  **(NO CHANGE)**

**Incentive**: Passengers receive a 5-10% discount(**on the entire fair**) bonus when a pool ride reaches full capacity (4/4) after the trip ends. Drivers earn an **extra tip if they complete three trips in a single day**.  **(NO CHANGE)**

**Surcharge:** A certain amount to make up for losses in various scenarios. This amount can be presented as **‘discount’** to customers. This amount can be dynamic.  **(NO CHANGE)**

**The way the ride-pooling system works is as follows:**   
The app groups people with similar destinations to make sharing possible. For example, if P1 wants to go to Mohammadpoor and another passenger, P2, also wants to go there, they may be considered a **partial match**. Why partial? Because matching is not just about having the same destination. The pickup points for all customers must also be reasonably close to each other so that no one has to walk too far to reach the car(**walk-to-pickup**). The app will show users different pool ride options with all the important details (walking distance and time \+ total route distance \+ shared fare \+ how much he can save) so they can easily compare and choose. Each option will include the **route name** and how many **seats are already filled** (for example, Pool A: 3 out of 4 seats filled). It will also show the **estimated fare**, the **walking distance** to the pickup point, **how long they might need to wait**, and the total **trip distance**. For example, a suggestion might look like this: 

* *Pool A: Banani to Dhanmondi, 3/4 filled, fare 120 Taka, 200 meters walk to pickup, 10 minutes wait time, and 5 km total distance.* 

* Another option could be *Pool B: Route B, 2/4 filled, fare 180 Taka, pickup just 50 meters away (or right from the current location), 15 minutes wait, and 6 km total trip.* 

This way, users can clearly see all the details—cost, convenience, and timing—and then select the pool ride that best fits their needs. Now a bit more on the LookUp time cases, when the Lookup Time ends, there are **two** possibilities: **if the queue has only one customer and a driver, the request is cancelled**; but **if there are at least two passengers and one driver, the ride can begin, or the app will automatically convert it into an active pool once the LookUp time ends.** Even after the ride starts, the system allows one more passenger to join(explained above).  **(NO CHANGE)**

### 

### 

**Ride Mechanic:**

Our system’s first priority will be first it will search for if there is a pre-defined pool for the user around his/her range which means the destination points of that pool matches with his/her destination point. If there is no pre-defined pool then our system will try to add him/her with the other passengers within pickup range and matched destination. First a user will open the app and set all the requirements (source, dest, gender(if needed)). Gender will be registered in the registration so if male then directs to regular ride share and if female then there will be two options. Either rides shared with females or regular ride share. There will be a CAR or a CNG(Three person vehicle in Dhaka city) option. The pool will be shown or created based on that. Suppose in that moment some other users lets say 7 users do the same in that hexagon and their pickup and destination point is matched now the system will first make a pool with the nearest users if their requirements satisfy  (4 users & 3 users considering nearest path and polyline overlap). Then they will also have options if they want to switch to another pool if it exists or stay in the pool made by the system. For pool switching they will see info like how much has been saved in tk and distance will be – KM and have to walk 2 mins (200meters) to get to the pool etc. If “**YES”** he can switch to that pool and the pool he was in before with others they can see the updated fare and they also have the option if they want to switch to another pool if they want. 

**Pre defined pool** : Among the 7 users 4 are gone. Now there are 3 users remaining (after switching or staying in that pool). Finally, they formed a pool with the help of the system. Now the ride starts and they have 1 seat left in their car. When the car starts moving toward their destinations the system will search for example next 1.5 \- 2 km for that 1 seat to fill up. Now suppose after 1 km another 2 users match with their destination and a car is in the user’s range so the user can see POOL A (1 seat left, fare – taka, ETA – km and have to walk 2 mins (150meters) to get to the car. 

Pool starting condition: Pool is ready to be started as soon (2 outta 4 passengers AND 1 driver ) are found.

Both Drivers and Riders can choose to join a pool from different available pools.

Switch to any pre defined pool it will be **“First come, First serve”**. It will be within 30 sec.

 For the people who are in the pre-defined pool they see the user is – km away from them, his/her ratings, they can save – tk (person to person). Within 30 sec if the user wins he can join the pool and route will be redefined based on that if loose then another user can send req to the pool. After joining a pool he can’t change his pool to any other pool within some time (e.g. 30 secs) it is a **cool down** period. If he passed 1:30 sec and wants to change, the pool app will alert him it’s not possible.

# Use Case Diagram

Actors: Passenger, Driver, System, Police(999)

Passenger \--------------------------  
 \- Set Gender Preference  
 \- Request Ride / Join Pool  
 \- View Pool Options  
 \- Select Pool Ride  
 \- Use Priyo Shathi  
 \- Vote for Adding Passenger  
 \- Cancel Ride (Cooldown)  
 \- Get Incentive  
 \- Pay Fare (+ Surcharge/Discount)  
 \- Press SOS (→ Police)

Driver \-----------------------------  
 \- Accept Ride Request  
 \- Start Ride (min 2\)  
 \- Pick Up Dynamically  
 \- Complete Ride  
 \- Earn Incentive  
 \- Restricted until pool ends

System \-----------------------------  
 \- Match Passengers (destination \+ pickup \+ gender)  
 \- Show Ride Options  
 \- Lookup Time Handling  
 \- Apply Cooldown / Penalty  
 \- Handle Dynamic Pooling (votes, savings, fares)  
 \- Calculate Incentives  
 \- Apply Surcharge  
 \- Send SOS Data to Police

Police / Emergency \-----------------  
 \- Receive SOS  
 \- Access Passenger \+ Car \+ Driver details

# Functional \- Non functional

**Functional:**  
	

1. Gender Base search

		Female or Anyone in Female case  
		Anyone in male case

2. Priyo sathi   
   1. Like add friend  
3. Dynamic pool   
   1. Minimum 2 riders needed for a ride to start  
   2. vote whether to accept a new rider  
   3. Show  rider with in a range  
   4. Drivers cannot accept new rides until the current pool is finished.  
4. Cooldown period  
   1. After 3 deliberate cancellations within 5 minutes, a cooldown penalty applies.  
   2. Cancellation within 30 seconds does not count as deliberate.  
5. SOS  
   1. In-trip SOS triggers an emergency alert to 999  
   2. Automatically sends car, driver, and co-passenger details.  
6. Matching Logic   
   1. Destination match  
   2. Same hexagon  
7. Lookup time ( **time it takes to create a 2/4 pool \- 3 mins** )  
   1. If the system fails to create a (2 or more) /4 pool within LT the pool is cancelled and user can research   
   2. If 2 or more passengers \+ driver → ride starts or auto-converts into an active pool.  
8. Financial Service  
   1. Surcharge  
   2. Incentives  
   3. Payment (payment gateway)  
9. Verification Process  
   1. Gender verification (Main functionality)  
   2. Age verification (Security)  
   3. Email verification (Spam protection)  
10. Supply-Demand Cap  
    1. Prevents extra pools being created if no drivers found  
    2. Drivers can be diverted to high demand (where extra pools are being created) area  
11. Navigation  
    1. GPS tracking of driver & car.  
    2. Estimated Time of Arrival for Driver  
    3. Walk-to-pickup navigator

	

12. Fare & Payment System  
    1. Auto fare adjustment when new rider join the pool

# MVC

## **MVC**

### **1\. Authentication Service** 

**Purpose:** User login, registration, token management  
 **Flow:** User signs up/logs in → Generates JWT token → Validates token on each request  
 **Tech:** OAuth2, JWT, Password hashing  
 **APIs:** `/register`, `/login`, `/logout`, `/refresh-token`

### **2\. User Profile Service** 

**Purpose:** Manage rider and driver profiles  
 **Flow:** Store/update user info → Profile photos → Preferences → Document verification (for drivers)  
 **Data:** Name, email, phone, photo, preferences, ratings  
 **APIs:** `/profile/get`, `/profile/update`, `/profile/documents`

### **3\. Location Service** 

**Purpose:** Track real-time locations of riders and drivers  
 **Flow:** Mobile app sends location every 5 sec → Store in Redis → Broadcast to relevant users  
 **Tech:** WebSocket/Socket.io, Redis Geospatial  
 **APIs:** `/location/update`, `/location/nearby-drivers`

### **4\. Matching Service** 

**Purpose:** Create, find, and manage ride pools  
 **Flow:**

* Rider requests ride → Check existing pools (route ±2km, time ±15min)  
* If match found → Add to pool  
* If no match → Create new pool  
* Store pool data in DB & Redis cache  
   **APIs:** `/pool/create`, `/pool/find`, `/pool/join`, `/pool/status`

### **5\. Pool Management Service** 

**Purpose:** Match riders into pools based on routes and timing  
 **Flow:**

* Analyze pickup/drop locations  
* Calculate route similarity  
* Check timing window  
* Group compatible riders  
* Minimum 2 riders checkn vgb  
* Timeout handling (5 min)  
   **APIs:** `/match/find-riders`, `/match/optimize-route`

### **6\. Trip Management Service** 

**Purpose:** Handle entire trip lifecycle  
 **Flow:**

* Create trip → Assign driver → Track pickup/drop sequence  
* Update trip status (EN\_ROUTE, PICKING\_UP, IN\_PROGRESS, COMPLETED)  
* Store trip history  
   **States:** REQUESTED → DRIVER\_ASSIGNED → PICKING\_UP → IN\_PROGRESS → COMPLETED → PAID  
   **APIs:** `/trip/create`, `/trip/update-status`, `/trip/history`

### **7\. Driver Assignment Service** 

**Purpose:** Find and assign available drivers to pools  
 **Flow:**

* Pool ready (≥2 riders) → Query nearby drivers (5km radius)  
* Filter: Status=ONLINE, Rating\>4.0  
* Sort by distance  
* Send notification to driver  
* Wait for acceptance (30 sec timeout)  
* If declined → try next driver  
   **APIs:** `/driver/find-nearby`, `/driver/assign`, `/driver/accept`, `/driver/decline`

### **8\. Routing Service** 

**Purpose:** Calculate optimal routes for pools  
 **Flow:**

* Get all pickup/drop locations  
* Call external API (Google Maps/Mapbox)  
* Calculate optimal sequence  
* Estimate distance, time, ETA  
* Return optimized route  
   **APIs:** `/route/calculate`, `/route/optimize`, `/route/eta`

### **9\. Pricing Service** 

**Purpose:** Calculate fares dynamically  
 **Flow:**

Base Fare \+ (Distance × Rate) \+ (Time × Rate)  
Solo Price \= Base calculation  
Pool Price \= Solo × 0.7 (30% discount)  
Surge Multiplier (if high demand)

**Factors:** Distance, time, surge, discounts, promos  
 **APIs:** `/pricing/calculate`, `/pricing/estimate`, `/pricing/surge-status`

### **10\. Payment Service** 

**Purpose:** Process all payments  
 **Flow:**

* Trip completes → Calculate final fare  
* Charge rider (Stripe/PayPal)  
* Hold platform commission (20%)  
* Transfer to driver (80%)  
* Store transaction records  
   **APIs:** `/payment/charge`, `/payment/refund`, `/payment/payout`

### **11\. Wallet Service** 

**Purpose:** Manage user wallets and balances  
 **Flow:**

* Store wallet balance  
* Add money → Deduct for rides  
* Cashback/refunds  
* Transaction history  
   **APIs:** `/wallet/balance`, `/wallet/add-money`, `/wallet/transactions`

### **12\. Notification Service** 

**Purpose:** Send push notifications and alerts  
 **Flow:**

* Events trigger notifications  
* Driver assigned → Notify rider  
* Rider picked up → Notify other riders  
* Payment successful → Notify both  
   **Channels:** Push (FCM), SMS (Twilio), Email  
   **APIs:** `/notification/send`, `/notification/preferences`

### **13\. Rating & Review Service** 

**Purpose:** Handle ratings and reviews  
 **Flow:**

* Trip completes → Ask for rating (1-5 stars)  
* Store rating for driver/rider  
* Calculate average ratings  
* Display reviews  
   **APIs:** `/rating/submit`, `/rating/get`, `/review/list`

### **14\. Promo & Discount Service** 

**Purpose:** Manage promotional codes and discounts  
 **Flow:**

* User applies promo code  
* Validate code (expiry, usage limit)  
* Calculate discount  
* Apply to final fare  
   **APIs:** `/promo/validate`, `/promo/apply`, `/promo/create`

### **15\. Incentive Service** 

**Purpose:** Driver bonuses and rewards  
 **Flow:**

* Track trips completed  
* Calculate bonuses (e.g., 10 trips \= $50 bonus)  
* Track daily/weekly targets  
* Issue rewards  
   **APIs:** `/incentive/calculate`, `/incentive/targets`, `/incentive/payout`

### **16\. Penalty Service** 

**Purpose:** Manage cancellations and penalties  
 **Flow:**

* User cancels → Check time before pickup  
* If \<5 min → Apply penalty (-3 points or fee)  
* Track penalty history  
* Suspend account if too many penalties  
   **APIs:** `/penalty/calculate`, `/penalty/apply`, `/penalty/history`

### **17\. Analytics Service** 

**Purpose:** Business intelligence and reporting  
 **Flow:**

* Collect data from all services  
* Generate reports (rides/day, revenue, popular routes)  
* Real-time dashboards  
* Driver performance metrics  
   **APIs:** `/analytics/dashboard`, `/analytics/reports`, `/analytics/metrics`

### **18\. Geofencing Service** 

**Purpose:** Define service areas and zones  
 **Flow:**

* Define operational areas (polygons)  
* Check if location is in service area  
* Surge zones  
* Restricted areas  
   **APIs:** `/geofence/check`, `/geofence/zones`, `/geofence/surge-areas`

### **19\. ETA Service** 

**Purpose:** Real-time ETA calculations  
 **Flow:**

* Get current location \+ destination  
* Consider traffic conditions  
* Update ETA every 30 sec  
* Notify if delayed  
   **APIs:** `/eta/calculate`, `/eta/update`, `/eta/notify`

### **20\. Chat Service** 

**Purpose:** In-app messaging between rider and driver  
 **Flow:**

* WebSocket connection  
* Real-time messages  
* Pre-defined templates  
* Store message history  
   **APIs:** `/chat/send`, `/chat/history`, `/chat/connect`

---

## **Supporting Infrastructure Services**

### **21\. API Gateway** 

**Purpose:** Single entry point for all requests  
 **Flow:** Client → Gateway → Route to appropriate model view controller → Response  
 **Features:** Load balancing, rate limiting, auth verification

### **22\. Service Discovery** 

**Purpose:** Services find each other dynamically  
 **Tech:** Consul, Eureka  
 **Flow:** Service registers → Other services discover → Call via service name

### **23\. Config Service** 

**Purpose:** Centralized configuration management  
 **Flow:** All services pull configs from central location  
 **Tech:** Spring Cloud Config, Consul KV

### **24\. Event Bus Service** 

**Purpose:** Asynchronous communication between services  
 **Tech:** Kafka, RabbitMQ  
 **Events:** TRIP\_CREATED, DRIVER\_ASSIGNED, PAYMENT\_COMPLETED

### **25\. Cache Service** 

**Purpose:** Fast data access  
 **Tech:** Redis  
 **Data:** Active pools, driver locations, session data

### **26\. Search Service** 

**Purpose:** Fast searching (past trips, users)  
 **Tech:** Elasticsearch  
 **APIs:** `/search/trips`, `/search/users`, `/search/drivers`

### **27\. Media Service** 

**Purpose:** Handle image/file uploads  
 **Flow:** Upload profile photos, documents → Store in S3/Cloud Storage → Return URL  
 **APIs:** `/media/upload`, `/media/delete`

### **28\. Logging Service** 

**Purpose:** Centralized logging  
 **Tech:** ELK Stack (Elasticsearch, Logstash, Kibana)  
 **Flow:** All services send logs → Aggregate → Visualize

### **29\. Monitoring Service** 

**Purpose:** Health checks and metrics  
 **Tech:** Prometheus, Grafana  
 **Metrics:** Response time, error rates, CPU usage

### **30\. Fraud Detection Service** 

**Purpose:** Detect suspicious activities  
 **Flow:** Analyze patterns → Flag anomalies → Block suspicious accounts  
 **Checks:** Multiple accounts, fake GPS, payment fraud

---

## **Complete Flow Example:**

1\. RIDER REQUESTS RIDE  
   ↓  
2\. API Gateway → Auth Service (verify token)  
   ↓  
3\. Location Service (get rider location)  
   ↓  
4\. Matching Service (find/create pool)  
   ↓  
5\. Pool Management (group riders, check ≥2)  
   ↓  
6\. Routing Service (call Maps API, optimize route)  
   ↓  
7\. Driver Assignment Service (find nearby driver)  
   ↓  
8\. Notification Service (notify driver)  
   ↓  
9\. Driver accepts → Trip Management Service (create trip)  
   ↓  
10\. Location Service (real-time tracking)  
    ↓  
11\. Trip completes → Pricing Service (calculate fare)  
    ↓  
12\. Payment Service (charge riders, pay driver)  
    ↓  
13\. Wallet Service (update balances)  
    ↓  
14\. Incentive Service (check driver bonus)  
    ↓  
15\. Rating Service (request rating)  
    ↓  
16\. Analytics Service (record metrics)  
    ↓  
17\. Notification Service (send receipt)

---

## 

## **MVP Priority (Start with these):**

1. ✅ Authentication Service  
2. ✅ User Profile Service  
3. ✅ Location Service  
4. ✅ Pool Management Service  
5. ✅ Matching Service  
6. ✅ Driver Assignment Service  
7. ✅ Trip Management Service  
8. ✅ Routing Service  
9. ✅ Pricing Service  
10. ✅ Payment Service  
11. ✅ Chat Service  
12. ✅ Notification  
13. ✅ Rating

For MVP not sure about point 16-19 above.

# API's

Here's the **complete and fixed API documentation** for all model view controllers:

---

## **1\. Authentication Service** 

### **Base URL: `/api/v1/auth`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/register` | Register new user | `{ email, password, phone, role: "rider/driver", name }` | `{ userId, token, refreshToken }` |
| POST | `/login` | User login | `{ email/phone, password }` | `{ userId, token, refreshToken, role }` |
| POST | `/logout` | Logout user | `{ token }` | `{ success: true }` |
| POST | `/refresh-token` | Refresh access token | `{ refreshToken }` | `{ token, refreshToken }` |
| POST | `/verify-otp` | Verify phone OTP | `{ phone, otp }` | `{ verified: true, token }` |
| POST | `/forgot-password` | Send reset link | `{ email }` | `{ success: true, message }` |
| POST | `/reset-password` | Reset password | `{ token, newPassword }` | `{ success: true }` |

---

## 

## 

## 

## **2\. User Profile Service** 

### **Base URL: `/api/v1/profile`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| GET | `/profile/:userId` | Get user profile | \- | `{ userId, name, email, phone, photo, rating, role }` |
| PUT | `/profile/:userId` | Update profile | `{ name, email, phone, preferences }` | `{ success: true, profile }` |
| POST | `/profile/photo` | Upload photo | `FormData: { photo }` | `{ photoUrl }` |
| GET | `/profile/:userId/rating` | Get user rating | \- | `{ rating, totalTrips, reviews[] }` |
| POST | `/profile/documents` | Upload driver docs | `FormData: { license, insurance, vehicle }` | `{ documentsId, status }` |
| GET | `/profile/documents/:userId` | Get driver documents | \- | `{ documents[], verificationStatus }` |
| PUT | `/profile/preferences` | Update preferences | `{ language, notifications, paymentMethod }` | `{ success: true }` |

---

## 

## **3\. Location Service** 

### **Base URL: `/api/v1/location`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/location/update` | Update user location | `{ userId, lat, lng, timestamp, heading }` | `{ success: true }` |
| GET | `/location/:userId` | Get user location | \- | `{ userId, lat, lng, lastUpdated }` |
| GET | `/location/nearby-drivers` | Find nearby drivers | `Query: { lat, lng, radius: 5000 }` | `{ drivers: [{ driverId, lat, lng, distance }] }` |
| GET | `/location/nearby-riders` | Find nearby riders | `Query: { lat, lng, radius: 2000 }` | `{ riders: [{ riderId, lat, lng }] }` |
| POST | `/location/track` | Start tracking | `{ userId, tripId }` | `{ trackingId, wsUrl }` |
| DELETE | `/location/track/:trackingId` | Stop tracking | \- | `{ success: true }` |

---

## 

## 

## 

## 

## **4\. Pool Management Service** 

### **Base URL: `/api/v1/pool`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/pool/create` | Create new pool | `{ riderId, pickupLat, pickupLng, dropLat, dropLng, requestedTime }` | `{ poolId, status: "WAITING", timeout: 300 }` |
| GET | `/pool/find` | Find matching pools | `Query: { pickupLat, pickupLng, dropLat, dropLng, radius: 2000, timeWindow: 900 }` | `{ pools: [{ poolId, riders[], route, availableSeats }] }` |
| POST | `/pool/:poolId/join` | Join existing pool | `{ riderId, pickupLat, pickupLng, dropLat, dropLng }` | `{ poolId, status, ridersCount, estimatedPickupTime }` |
| GET | `/pool/:poolId` | Get pool details | \- | `{ poolId, riders[], status, route, fair, createdAt }` |
| PUT | `/pool/:poolId/status` | Update pool status | `{ status: "WAITING/MATCHING/ASSIGNED/ACTIVE/COMPLETED" }` | `{ poolId, status, updatedAt }` |
| DELETE | `/pool/:poolId/leave` | Leave pool | `{ riderId, reason }` | `{ success: true, penaltyApplied }` |
| GET | `/pool/:poolId/riders` | Get pool riders | \- | `{ riders: [{ riderId, name, pickup, drop, status }] }` |

---

## **5\. Matching Service** 

### **Base URL: `/api/v1/matching`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/matching/find-matches` | Find rider matches | `{ riderId, pickupLat, pickupLng, dropLat, dropLng }` | `{ matches: [{ poolId, similarity, riders[], estimatedTime }] }` |
| POST | `/matching/optimize-pool` | Optimize pool route | `{ poolId, riders: [{ riderId, pickup, drop }] }` | `{ optimizedRoute, sequence[], totalDistance, totalTime }` |
| POST | `/matching/validate` | Validate pool | `{ poolId }` | `{ valid: true/false, ridersCount, reason }` |
| GET | `/matching/compatibility` | Check compatibility | `Query: { rider1Id, rider2Id }` | `{ compatible: true/false, score, reason }` |
| POST | `/matching/timeout` | Handle pool timeout | `{ poolId }` | `{ action: "cancel/convert", reason }` |

---

## 

## **6\. Trip Management Service** 

### **Base URL: `/api/v1/trip`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/trip/create` | Create new trip | `{ poolId, driverId, riders[], route }` | `{ tripId, status: "CREATED", estimatedTime }` |
| GET | `/trip/:tripId` | Get trip details | \- | `{ tripId, poolId, driver, riders[], status, route, currentLocation }` |
| PUT | `/trip/:tripId/status` | Update trip status | `{ status: "EN_ROUTE/PICKING_UP/IN_PROGRESS/COMPLETED", location }` | `{ tripId, status, timestamp }` |
| POST | `/trip/:tripId/pickup` | Mark rider picked up | `{ riderId, location, timestamp }` | `{ success: true, remainingPickups }` |
| POST | `/trip/:tripId/drop` | Mark rider dropped | `{ riderId, location, timestamp }` | `{ success: true, remainingDrops }` |
| GET | `/trip/:tripId/status` | Get current status | \- | `{ status, currentLocation, nextStop, eta }` |
| GET | `/trip/history/:userId` | Get trip history | `Query: { role: "rider/driver", limit: 20, offset: 0 }` | `{ trips: [{ tripId, date, route, fare, rating }] }` |
| POST | `/trip/:tripId/cancel` | Cancel trip | `{ reason, cancelledBy }` | `{ success: true, refundAmount, penaltyApplied }` |
| GET | `/trip/active/:userId` | Get active trips | `Query: { role: "rider/driver" }` | `{ trips: [{ tripId, status, route }] }` |

---

## 

## 

## 

## 

## 

## 

## **7\. Driver Assignment Service** 

### **Base URL: `/api/v1/driver`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| GET | `/driver/nearby` | Find nearby drivers | `Query: { lat, lng, radius: 5000, poolId }` | `{ drivers: [{ driverId, name, rating, distance, eta, vehicleType }] }` |
| POST | `/driver/assign` | Assign driver to pool | `{ poolId, driverId }` | `{ assignmentId, status: "PENDING", expiresAt }` |
| POST | `/driver/:assignmentId/accept` | Driver accepts | `{ driverId, location }` | `{ tripId, poolDetails, route, earnings }` |
| POST | `/driver/:assignmentId/decline` | Driver declines | `{ driverId, reason }` | `{ success: true }` |
| PUT | `/driver/:driverId/status` | Update driver status | `{ status: "ONLINE/OFFLINE/BUSY", location }` | `{ driverId, status, timestamp }` |
| GET | `/driver/:driverId/earnings` | Get driver earnings | `Query: { startDate, endDate }` | `{ totalEarnings, trips, bonuses, deductions }` |
| GET | `/driver/:driverId/stats` | Get driver statistics | \- | `{ totalTrips, rating, acceptance, cancellation }` |

---

## **8\. Routing Service** 

### **Base URL: `/api/v1/routing`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/routing/calculate` | Calculate route | `{ origin: {lat, lng}, destination: {lat, lng}, waypoints[] }` | `{ route, distance, duration, polyline }` |
| POST | `/routing/optimize` | Optimize route | `{ stops: [{lat, lng, type: "pickup/drop", riderId}] }` | `{ optimizedSequence[], totalDistance, totalTime, polyline }` |
| GET | `/routing/eta` | Calculate ETA | `Query: { fromLat, fromLng, toLat, toLng, traffic: true }` | `{ eta: 900, distance: 5200, duration: 15 }` |
| POST | `/routing/alternative` | Get alternative routes | `{ origin, destination }` | `{ routes: [{ distance, duration, polyline, trafficLevel }] }` |
| GET | `/routing/distance-matrix` | Get distance matrix | `Query: { origins[], destinations[] }` | `{ matrix: [[distance, duration]] }` |

---

## **9\. Pricing Service** 

### **Base URL: `/api/v1/pricing`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/pricing/estimate` | Estimate fare | `{ pickupLat, pickupLng, dropLat, dropLng, pooled: true/false }` | `{ estimatedFare, breakdown: { base, distance, time, surge, discount }, range: { min, max } }` |
| POST | `/pricing/calculate` | Calculate final fare | `{ tripId, distance, duration, waitTime, poolRidersCount }` | `{ fare, breakdown, perRiderFare, driverEarning, platformFee }` |
| GET | `/pricing/surge` | Get surge status | `Query: { lat, lng, radius }` | `{ surgeMultiplier: 1.5, reason, expiresAt }` |
| POST | `/pricing/apply-discount` | Apply discount | `{ fare, discountType: "pool/promo/referral", value }` | `{ originalFare, discount, finalFare }` |
| GET | `/pricing/config` | Get pricing config | `Query: { city, vehicleType }` | `{ baseFare, perKm, perMinute, minFare, cancellationFee }` |

---

## **10\. Payment Service** 

### **Base URL: `/api/v1/payment`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/payment/charge` | Charge rider | `{ riderId, tripId, amount, paymentMethodId }` | `{ paymentId, status: "SUCCESS/FAILED", transactionId }` |
| POST | `/payment/refund` | Refund payment | `{ paymentId, amount, reason }` | `{ refundId, status, amount, processedAt }` |
| POST | `/payment/payout` | Driver payout | `{ driverId, amount, period: "daily/weekly" }` | `{ payoutId, amount, status, estimatedArrival }` |
| GET | `/payment/:paymentId` | Get payment details | \- | `{ paymentId, amount, status, method, timestamp, tripId }` |
| POST | `/payment/method/add` | Add payment method | `{ userId, type: "card/wallet/upi", details }` | `{ methodId, last4, brand }` |
| DELETE | `/payment/method/:methodId` | Remove payment method | \- | `{ success: true }` |
| GET | `/payment/methods/:userId` | Get payment methods | \- | `{ methods: [{ methodId, type, last4, default }] }` |
| GET | `/payment/history/:userId` | Get payment history | `Query: { limit: 20, offset: 0 }` | `{ payments: [{ paymentId, amount, date, status, tripId }] }` |

---

## **11\. Wallet Service** 

### **Base URL: `/api/v1/wallet`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| GET | `/wallet/:userId/balance` | Get wallet balance | \- | `{ balance, currency, lastUpdated }` |
| POST | `/wallet/:userId/add` | Add money to wallet | `{ amount, paymentMethodId }` | `{ transactionId, newBalance, status }` |
| POST | `/wallet/:userId/deduct` | Deduct from wallet | `{ amount, tripId, reason }` | `{ transactionId, newBalance, status }` |
| GET | `/wallet/:userId/transactions` | Get transactions | `Query: { startDate, endDate, type, limit: 50 }` | `{ transactions: [{ id, type, amount, balance, date, description }] }` |
| POST | `/wallet/:userId/cashback` | Add cashback | `{ amount, source, referenceId }` | `{ transactionId, newBalance }` |

---

## **12\. Notification Service** 

### **Base URL: `/api/v1/notification`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/notification/send` | Send notification | `{ userId, type: "push/sms/email", title, body, data: {} }` | `{ notificationId, status: "SENT/FAILED", sentAt }` |
| POST | `/notification/send-bulk` | Send bulk notifications | `{ userIds[], type, title, body, data }` | `{ sent: 150, failed: 5, notificationIds[] }` |
| GET | `/notification/:userId` | Get user notifications | `Query: { read: true/false, limit: 20 }` | `{ notifications: [{ id, title, body, read, createdAt }] }` |
| PUT | `/notification/:notificationId/read` | Mark as read | \- | `{ success: true }` |
| GET | `/notification/:userId/preferences` | Get preferences | \- | `{ push: true, sms: false, email: true, categories }` |
| PUT | `/notification/:userId/preferences` | Update preferences | `{ push, sms, email, categories: {} }` | `{ success: true, preferences }` |
| POST | `/notification/register-device` | Register device token | `{ userId, deviceToken, platform: "ios/android" }` | `{ success: true, deviceId }` |

---

## **13\. Rating & Review Service** 

### **Base URL: `/api/v1/rating`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/rating/submit` | Submit rating | `{ tripId, ratedBy, ratedUser, rating: 1-5, review, tags[] }` | `{ ratingId, success: true }` |
| GET | `/rating/:userId` | Get user ratings | `Query: { role: "rider/driver" }` | `{ averageRating, totalRatings, distribution: {5: 100, 4: 50} }` |
| GET | `/rating/trip/:tripId` | Get trip ratings | \- | `{ ratings: [{ ratedBy, ratedUser, rating, review, createdAt }] }` |
| GET | `/rating/:userId/reviews` | Get reviews | `Query: { limit: 20, offset: 0 }` | `{ reviews: [{ rating, review, tripId, date, riderName }] }` |
| POST | `/rating/:ratingId/report` | Report inappropriate review | `{ reason, details }` | `{ reportId, status: "UNDER_REVIEW" }` |

---

## **14\. Promo & Discount Service** 

### **Base URL: `/api/v1/promo`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/promo/validate` | Validate promo code | `{ code, userId, tripEstimate }` | `{ valid: true/false, discount, type, maxDiscount, reason }` |
| POST | `/promo/apply` | Apply promo code | `{ code, userId, tripId, fare }` | `{ discountAmount, finalFare, promoId }` |
| GET | `/promo/:userId/available` | Get available promos | \- | `{ promos: [{ code, discount, minFare, expiresAt, description }] }` |
| POST | `/promo/create` | Create promo (admin) | `{ code, type, discount, minFare, maxDiscount, expiresAt, usageLimit }` | `{ promoId, code, createdAt }` |
| GET | `/promo/:userId/history` | Get usage history | \- | `{ history: [{ code, discount, tripId, usedAt }] }` |

---

## **15\. Incentive Service** 

### **Base URL: `/api/v1/incentive`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| GET | `/incentive/:driverId/current` | Get current incentives | \- | `{ activeIncentives: [{ type, target, progress, reward }] }` |
| POST | `/incentive/calculate` | Calculate earned incentives | `{ driverId, tripId }` | `{ earned: [{ type, amount, reason }], totalBonus }` |
| GET | `/incentive/:driverId/targets` | Get targets | `Query: { period: "daily/weekly/monthly" }` | `{ targets: [{ trips: 20, bonus: 50, progress: 15 }] }` |
| POST | `/incentive/payout` | Process incentive payout | `{ driverId, incentiveId }` | `{ payoutId, amount, status }` |
| GET | `/incentive/:driverId/history` | Get incentive history | `Query: { startDate, endDate }` | `{ incentives: [{ type, amount, earnedAt, paidAt }] }` |

---

## **16\. Penalty Service** 

### **Base URL: `/api/v1/penalty`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/penalty/calculate` | Calculate penalty | `{ userId, tripId, reason: "late_cancel/no_show/misconduct", timeBeforePickup }` | `{ penaltyAmount, points, reason, canWaive }` |
| POST | `/penalty/apply` | Apply penalty | `{ userId, tripId, penaltyAmount, points, reason }` | `{ penaltyId, appliedAt, totalPoints, status }` |
| GET | `/penalty/:userId/history` | Get penalty history | \- | `{ penalties: [{ reason, amount, points, date, tripId }], totalPoints }` |
| POST | `/penalty/:penaltyId/appeal` | Appeal penalty | `{ reason, evidence }` | `{ appealId, status: "UNDER_REVIEW" }` |
| PUT | `/penalty/:penaltyId/waive` | Waive penalty (admin) | `{ reason }` | `{ success: true, refundAmount }` |
| GET | `/penalty/:userId/points` | Get penalty points | \- | `{ totalPoints, threshold: 15, status: "ACTIVE/WARNING/SUSPENDED" }` |

---

## **17\. Analytics Service** 

### **Base URL: `/api/v1/analytics`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| GET | `/analytics/dashboard` | Get dashboard metrics | `Query: { period: "today/week/month", role: "admin" }` | `{ totalTrips, revenue, activeUsers, averageRating, growthRate }` |
| GET | `/analytics/trips` | Get trip analytics | `Query: { startDate, endDate, groupBy: "day/week" }` | `{ data: [{ date, trips, revenue, poolPercentage }] }` |
| GET | `/analytics/drivers` | Get driver analytics | `Query: { driverId, period }` | `{ trips, earnings, rating, acceptanceRate, onlineHours }` |
| GET | `/analytics/popular-routes` | Get popular routes | `Query: { limit: 10, period }` | `{ routes: [{ from, to, count, avgFare, avgDuration }] }` |
| GET | `/analytics/revenue` | Get revenue breakdown | `Query: { startDate, endDate }` | `{ total, byPaymentMethod, platformFee, driverPayouts, refunds }` |
| POST | `/analytics/report` | Generate custom report | `{ metrics[], dimensions[], filters, format: "json/csv" }` | `{ reportId, downloadUrl, generatedAt }` |

---

## **18\. Geofencing Service 📐**

### **Base URL: `/api/v1/geofence`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/geofence/check` | Check if location in service area | `{ lat, lng }` | `{ inServiceArea: true/false, zoneId, zoneName, restrictions }` |
| GET | `/geofence/zones` | Get all zones | `Query: { type: "service/surge/restricted" }` | `{ zones: [{ zoneId, name, type, polygon, rules }] }` |
| GET | `/geofence/surge-areas` | Get surge zones | `Query: { lat, lng, radius }` | `{ surgeZones: [{ zoneId, multiplier, reason, expiresAt }] }` |
| POST | `/geofence/create` | Create zone (admin) | `{ name, type, polygon: [{lat, lng}], rules }` | `{ zoneId, createdAt }` |
| PUT | `/geofence/:zoneId` | Update zone (admin) | `{ name, polygon, rules }` | `{ success: true, updatedAt }` |

---

## **19\. ETA Service ⏱️**

### **Base URL: `/api/v1/eta`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/eta/calculate` | Calculate ETA | `{ fromLat, fromLng, toLat, toLng, traffic: true, currentSpeed }` | `{ eta: 900, distance: 5200, arrivalTime }` |
| POST | `/eta/update` | Update ETA for active trip | `{ tripId, currentLocation, nextStop }` | `{ eta, distance, updatedAt }` |
| POST | `/eta/notify` | Send ETA notification | `{ tripId, riderId, eta, reason: "delay/early" }` | `{ notificationSent: true }` |
| GET | `/eta/trip/:tripId` | Get trip ETA | \- | `{ stops: [{ stopId, riderId, eta, status }], totalETA }` |

---

## **20\. Chat Service 💬**

### **Base URL: `/api/v1/chat`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/chat/send` | Send message | `{ conversationId, senderId, message, type: "text/template" }` | `{ messageId, sentAt, status: "SENT/DELIVERED" }` |
| GET | `/chat/:conversationId/history` | Get chat history | `Query: { limit: 50, before: messageId }` | `{ messages: [{ messageId, senderId, message, timestamp, read }] }` |
| POST | `/chat/conversation/create` | Create conversation | `{ tripId, riderId, driverId }` | `{ conversationId, participants[], createdAt }` |
| GET | `/chat/:conversationId` | Get conversation | \- | `{ conversationId, participants[], lastMessage, unreadCount }` |
| PUT | `/chat/:messageId/read` | Mark message as read | \- | `{ success: true }` |
| GET | `/chat/templates` | Get message templates | `Query: { category: "pickup/directions/emergency" }` | `{ templates: [{ id, text, category }] }` |
| POST | `/chat/report` | Report conversation | `{ conversationId, reason, details }` | `{ reportId, status }` |

---

## **21\. API Gateway**

### **Base URL: `/api/v1`**

| Method | Endpoint | Description | Headers Required |
| ----- | ----- | ----- | ----- |
| ALL | `/*` | Route to model view controllers | `Authorization: Bearer {token}` |
| GET | `/health` | Health check | \- |
| GET | `/version` | API version | \- |

**Features:**

* Rate Limiting: 100 req/min per user  
* Authentication verification  
* Request/Response logging  
* Load balancing

---

## **22\. Media Service 🖼️**

### **Base URL: `/api/v1/media`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/media/upload` | Upload file | `FormData: { file, type: "profile/document/vehicle", userId }` | `{ fileId, url, size, mimeType, uploadedAt }` |
| GET | `/media/:fileId` | Get file URL | \- | `{ url, expiresAt }` |
| DELETE | `/media/:fileId` | Delete file | \- | `{ success: true }` |
| POST | `/media/upload-multiple` | Upload multiple files | `FormData: { files[] }` | `{ files: [{ fileId, url }] }` |

---

## **23\. Fraud Detection Service 🛡️**

### **Base URL: `/api/v1/fraud`**

| Method | Endpoint | Description | Request Body | Response |
| ----- | ----- | ----- | ----- | ----- |
| POST | `/fraud/check-user` | Check user risk | `{ userId, action: "signup/payment/trip" }` | `{ riskScore: 0-100, blocked: false, reasons[] }` |
| POST | `/fraud/check-payment` | Verify payment | `{ paymentId, userId, amount, paymentMethodId }` | `{ approved: true/false, requiresVerification, reason }` |
| POST | `/fraud/report` | Report suspicious activity | `{ reportedBy, userId, tripId, reason, evidence }` | `{ reportId, status: "INVESTIGATING" }` |
| GET | `/fraud/user/:userId/score` | Get user fraud score | \- | `{ score, level: "low/medium/high", factors[] }` |

---

## **API Response Standards**

### **Success Response:**

{  
  "success": true,  
  "data": { ... },  
  "timestamp": "2025-10-06T10:30:00Z"  
}

### **Error Response:**

{  
  "success": false,  
  "error": {  
    "code": "INVALID\_POOL\_ID",  
    "message": "Pool not found or expired",  
    "details": { "poolId": "abc123" }  
  },  
  "timestamp": "2025-10-06T10:30:00Z"  
}

### **Common HTTP Status Codes:**

* `200` \- Success  
* `201` \- Created  
* `400` \- Bad Request  
* `401` \- Unauthorized  
* `403` \- Forbidden  
* `404` \- Not Found  
* `409` \- Conflict  
* `429` \- Too Many Requests  
* `500` \- Internal Server Error

---

This is your **complete, production-ready API documentation**\! 🚀 Each endpoint follows REST standards and includes proper request/response structures.

# Tab 9


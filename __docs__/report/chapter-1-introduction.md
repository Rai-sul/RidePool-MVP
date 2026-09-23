# Chapter 1

# 1. Introduction

## 1.1 Background

Dhaka is one of the most crowded cities in the world. Every day, millions of people travel to offices, universities and markets using buses, CNG auto-rickshaws, rickshaws and ride-hailing services such as Uber and Pathao. Public buses are cheap but crowded, uncomfortable and often unsafe, especially for women. Ride-hailing services are comfortable, but a private car or CNG ride is too expensive for most students and working people to use every day.

At the same time, most private cars and CNGs on the road carry only one passenger, even though they have space for two or three. Many of these passengers are travelling from the same area to the same destination at the same time. If these people could share one vehicle and split the fare, each of them would pay much less, and fewer vehicles would be needed on the road.

Ride pooling (also called ride sharing or carpooling) is the idea of matching passengers who are going the same way so that they can travel together in one vehicle. This project, **RidePool**, is a ride-pooling platform built for Dhaka. It consists of a mobile app for riders (CarPoolApp), a mobile app for drivers (DriverApp) and a backend server that matches riders into shared rides, calculates fair fares and manages payments.

## 1.2 Motivation

The main motivation behind RidePool is **cost saving**. Existing platforms in Bangladesh are designed mainly for single-passenger trips, and their pooling options are either limited or not available. We wanted to build a system where sharing a ride is the main purpose, not an extra feature.

Other reasons that motivated this project are:

- **High transport cost:** Daily ride-hailing is not affordable for students and low- to middle-income workers. Splitting a fare between two or three people makes a comfortable ride affordable.
- **Traffic congestion:** Fewer vehicles carrying more passengers can help reduce traffic and fuel usage in the city.
- **Safety and comfort:** Many passengers, especially women, feel uncomfortable sharing a ride with strangers. A pooling system with a female-only option and a trusted-companion feature can make shared rides feel safer.
- **Local needs:** Most ride-sharing solutions are designed for foreign markets. Dhaka needs a solution that supports local vehicles like CNGs, local currency (BDT) and local payment habits such as mobile banking and cash.

## 1.3 Problem Discussion

Although ride pooling sounds simple, building it in practice raises several problems:

1. **Finding the right co-passengers:** The system must quickly find riders whose pickup points are close to each other and whose destinations lie in the same direction. Comparing every rider with every other rider is slow and does not scale.
2. **Fair fare sharing:** When several people share a ride, each person should pay less than a solo ride, and the fare should be calculated in a clear and fair way.
3. **Waiting time:** A rider does not want to wait a long time for other passengers to join. The system must form a pool quickly or tell the rider when no pool is available.
4. **Safety and trust:** Passengers are sharing a vehicle with strangers. The system needs gender-based preferences and a way to ride with trusted people.
5. **Cancellations:** In a shared ride, one person cancelling affects everyone else in the pool. Frequent cancellations must be discouraged.
6. **Concurrency:** Many riders may try to join the same pool at the same moment, and many drivers may try to accept the same pool. The system must never overfill a vehicle or assign two drivers to one pool.
7. **Planning ahead:** Many daily trips (office, university) are known in advance, but most services only support instant booking.

RidePool is designed to solve these problems in one integrated system.

## 1.4 Project Aims

The aim of this project is to **design and develop an affordable, safe and reliable ride-pooling platform for Dhaka city** that matches passengers travelling in the same direction into shared rides, so that each passenger pays a lower fare and vehicles are used more efficiently.

## 1.5 Project Objectives

To achieve this aim, the project has the following objectives:

1. To develop a **rider mobile app** where users can search for a ride, view available pools, join a pool, track their trip and pay.
2. To develop a **driver mobile app** where drivers can go online, accept pools, navigate to pickup points and view their earnings.
3. To build a **backend server** that handles authentication, ride requests, pool matching, fare calculation, payments and notifications.
4. To implement a **fast location-based matching system** using the H3 hexagonal grid to find nearby pools with similar routes.
5. To implement a **fair fare system** where the fare drops as more passengers share the ride (for example, 25% off with two riders and 35% off with three).
6. To support **local vehicles and their capacity** — CAR (3 passengers) and CNG (2 passengers).
7. To provide **safety features** such as female-only rides, rider ratings and the *Priyo Sathi* (trusted companions) feature.
8. To reduce misuse through a **cancellation penalty and cooldown system**.
9. To support **advance (scheduled) booking** so riders can book trips ahead of time and be automatically grouped into a pool.
10. To provide an **in-app wallet** and cash payment, with real-time notifications and in-app chat.

## 1.6 Project Challenges

During the development of RidePool we faced the following main challenges:

- **Efficient matching:** Searching for compatible riders across a whole city had to be fast. We solved this using Uber's H3 hexagonal grid, which divides the map into small hexagon cells so nearby pools can be found with simple ring searches instead of heavy distance calculations.
- **Route similarity:** Two riders being close at pickup does not mean they are going the same way. We had to build a scoring system that combines route overlap, pickup distance, destination distance and how full the pool is.
- **Cost of map services:** Google Maps APIs are charged per request. We had to reduce the number of calls using caching, a single shared route request per search, and a simple geometric fallback when map calls fail or are skipped.
- **Race conditions:** When several riders join the same pool at once, the vehicle could become overfilled. We handled this by moving critical operations (joining a pool, accepting a pool, debiting a wallet) into atomic database functions with row locking.
- **Real-time updates:** Riders and drivers need to see changes (a new passenger, driver location, trip status) immediately. We used Supabase Realtime together with a polling fallback.
- **Scheduled rides:** Advance booking needed time windows, rider confirmation and automatic assignment, all without breaking the existing instant-ride flow.
- **Two mobile apps and one server:** Keeping data types consistent between the rider app, the driver app and the server was difficult, so we wrote the common data model (rides, pools, users, payments) into a separate `shared` types package as one reference for all three.

## 1.7 Contribution

The main contribution of this project is a complete, working ride-pooling system made for the local context of Dhaka. It includes two mobile applications, a backend server and a database, all working together. The key areas of contribution are described below.

### 1.7.1 Accessibility Focus

RidePool is designed to make comfortable travel accessible to more people:

- **Affordable fares:** Sharing a ride reduces the cost per person, which makes car and CNG travel affordable for students and daily commuters.
- **Local vehicle support:** Along with cars, the system supports CNG auto-rickshaws, which are cheaper and widely used in Dhaka.
- **Flexible payments:** Riders can pay using the in-app wallet or cash, and the wallet is designed around local mobile banking methods such as bKash. All prices are shown in BDT.
- **Safe for everyone:** The female-only option and the Priyo Sathi feature make it easier for women and cautious riders to use shared rides.
- **Available on multiple platforms:** The rider app runs on Android, iOS and the web from a single codebase.

### 1.7.2 Integration of Modern Tools

The project combines several modern technologies:

- **React Native with Expo** for building both mobile apps from one codebase, with Expo Router for navigation, Zustand for state management and NativeWind (Tailwind CSS) for styling.
- **Node.js, Express and TypeScript** for the backend server, with Zod for input validation.
- **Supabase (PostgreSQL)** for the database, user authentication and real-time updates.
- **H3 (by Uber)** for hexagon-based geospatial indexing and fast pool matching.
- **Google Maps APIs** for routes, distances and ETAs, with Leaflet maps for the web version.
- **Redis or in-memory caching** to improve speed and reduce map API costs.
- **Vitest and Jest** for automated testing of the server and apps.

### 1.7.3 User-Centered Design

The system is built around the needs of its users:

- **Riders** can see a list of available pools with the fare, pickup distance, number of passengers and estimated time, and choose the one that suits them best.
- Riders can set a **gender preference**, save frequently used places, add trusted companions (Priyo Sathi), chat with co-riders and the driver, and rate each other after a trip.
- Riders who know their travel time in advance can **schedule a ride**, and the system will group them automatically without any searching.
- **Drivers** have a simple app to go online, accept pools, follow the pickup route and track their earnings.
- Users receive **notifications** at every important step, such as a pool being found, a driver arriving or a trip being completed.
- The **cancellation penalty** (a short cooldown after repeated deliberate cancellations) protects other riders in the pool from being affected by one person.

### 1.7.4 Modular and Scalable Architecture

RidePool follows a clean and modular structure so that it is easy to maintain and extend:

- The project is split into separate packages: **Server**, **CarPoolApp** (rider), **DriverApp** and **shared** (common data types).
- The server follows a layered design: **Routes → Controllers → Services → Database**. Each layer has one responsibility, so business logic (matching, fares, wallet, penalties) is kept separate from HTTP handling.
- Each feature (pools, rides, payments, wallet, ratings, messaging, advance booking) has its own route, controller and service files, so new features can be added without changing existing ones.
- Important settings such as search radius, time windows and cache mode are kept in a central configuration file and environment variables.
- The system can run in a lightweight **MVP mode** with in-memory caching, and can switch to **Redis** when more users need to be served.
- Security is handled through authentication middleware, rate limiting, input sanitization and database row-level security.

## 1.8 Organization of the Report

The rest of this report is organized as follows:

- **Chapter 2 – Literature Review:** Discusses existing ride-sharing and ride-pooling systems and related work, and compares them with RidePool.
- **Chapter 3 – Project Description:** Describes the requirements, tools and resources, and the societal, environmental, ethical, feasibility, risk and economic aspects of the project.
- **Chapter 4 – Project Analysis:** Explains the system architecture, how the app modules work together, the UML and database diagrams, the user interface, and the evaluation and testing of the system.
- **Chapter 5 – Project Implementation:** Describes how the server, apps and database were built, how the technology stack is deployed, and how to set up and run the system.
- **Chapter 6 – Result Analysis:** Presents the results of the working system and discusses how well it meets its aims.
- **Chapter 7 – Conclusion:** Summarizes the work done, discusses the limitations of the project and suggests future improvements.

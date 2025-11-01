"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFriendToPool = exports.getOpenPools = exports.leavePool = exports.joinPool = exports.getPool = exports.getTrip = exports.createTrip = exports.PoolStatus = exports.TripStatus = exports.VehicleType = void 0;
const uuid_1 = require("uuid");
var VehicleType;
(function (VehicleType) {
    VehicleType[VehicleType["VEHICLE_TYPE_CAR"] = 0] = "VEHICLE_TYPE_CAR";
    VehicleType[VehicleType["VEHICLE_TYPE_CNG"] = 1] = "VEHICLE_TYPE_CNG";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var TripStatus;
(function (TripStatus) {
    TripStatus[TripStatus["TRIP_STATUS_PENDING"] = 0] = "TRIP_STATUS_PENDING";
    TripStatus[TripStatus["TRIP_STATUS_ACCEPTED"] = 1] = "TRIP_STATUS_ACCEPTED";
    TripStatus[TripStatus["TRIP_STATUS_IN_PROGRESS"] = 2] = "TRIP_STATUS_IN_PROGRESS";
    TripStatus[TripStatus["TRIP_STATUS_COMPLETED"] = 3] = "TRIP_STATUS_COMPLETED";
    TripStatus[TripStatus["TRIP_STATUS_CANCELLED"] = 4] = "TRIP_STATUS_CANCELLED";
    TripStatus[TripStatus["TRIP_STATUS_POOLED"] = 5] = "TRIP_STATUS_POOLED";
})(TripStatus || (exports.TripStatus = TripStatus = {}));
var PoolStatus;
(function (PoolStatus) {
    PoolStatus[PoolStatus["POOL_STATUS_OPEN"] = 0] = "POOL_STATUS_OPEN";
    PoolStatus[PoolStatus["POOL_STATUS_MATCHED"] = 1] = "POOL_STATUS_MATCHED";
    PoolStatus[PoolStatus["POOL_STATUS_IN_PROGRESS"] = 2] = "POOL_STATUS_IN_PROGRESS";
    PoolStatus[PoolStatus["POOL_STATUS_COMPLETED"] = 3] = "POOL_STATUS_COMPLETED";
    PoolStatus[PoolStatus["POOL_STATUS_CANCELLED"] = 4] = "POOL_STATUS_CANCELLED";
})(PoolStatus || (exports.PoolStatus = PoolStatus = {}));
const trips = [];
const ridePools = [];
const userCooldowns = new Map(); // userId -> timestamp of last pool leave
const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_POOL_WAIT_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
const createTrip = (trip) => {
    const newTrip = Object.assign(Object.assign({}, trip), { id: (0, uuid_1.v4)(), createdAt: Date.now(), status: TripStatus.TRIP_STATUS_PENDING });
    if (newTrip.vehicleType !== undefined) { // Indicates a pooled trip request
        let foundPool;
        // Try to find an existing open pool
        for (const pool of ridePools) {
            if (pool.status === PoolStatus.POOL_STATUS_OPEN &&
                pool.vehicleType === newTrip.vehicleType &&
                pool.currentPassengers < pool.maxPassengers &&
                (Date.now() - pool.createdAt < MAX_POOL_WAIT_TIME) &&
                pool.origin.address === newTrip.origin.address && // Simple matching for now
                pool.destination.address === newTrip.destination.address // Simple matching for now
            ) {
                foundPool = pool;
                break;
            }
        }
        if (foundPool) {
            newTrip.poolId = foundPool.id;
            newTrip.status = TripStatus.TRIP_STATUS_POOLED;
            foundPool.trips.push(newTrip);
            foundPool.currentPassengers++;
            if (foundPool.currentPassengers === foundPool.maxPassengers) {
                foundPool.status = PoolStatus.POOL_STATUS_MATCHED; // Pool is full
            }
        }
        else {
            // Create a new pool
            const poolId = (0, uuid_1.v4)();
            const maxPassengers = newTrip.vehicleType === VehicleType.VEHICLE_TYPE_CAR ? 4 : 3; // Car: 4, CNG: 3
            const newPool = {
                id: poolId,
                trips: [newTrip],
                currentPassengers: 1,
                maxPassengers: maxPassengers,
                vehicleType: newTrip.vehicleType,
                origin: newTrip.origin,
                destination: newTrip.destination,
                status: PoolStatus.POOL_STATUS_OPEN,
                createdAt: Date.now(),
            };
            newTrip.poolId = poolId;
            newTrip.status = TripStatus.TRIP_STATUS_POOLED;
            ridePools.push(newPool);
        }
    }
    trips.push(newTrip);
    return newTrip;
};
exports.createTrip = createTrip;
const getTrip = (id) => {
    return trips.find(trip => trip.id === id);
};
exports.getTrip = getTrip;
const getPool = (id) => {
    return ridePools.find(pool => pool.id === id);
};
exports.getPool = getPool;
const joinPool = (poolId, userId) => {
    const lastLeaveTime = userCooldowns.get(userId);
    if (lastLeaveTime && (Date.now() - lastLeaveTime < COOLDOWN_PERIOD)) {
        console.log(`User ${userId} is on cooldown for joining pools.`);
        return undefined; // User is on cooldown
    }
    const pool = ridePools.find(p => p.id === poolId);
    if (pool && pool.status === PoolStatus.POOL_STATUS_OPEN && pool.currentPassengers < pool.maxPassengers) {
        // Check if user already has a trip in this pool
        const existingTripInPool = pool.trips.find(t => t.userId === userId);
        if (existingTripInPool) {
            console.log(`User ${userId} already has a trip in pool ${poolId}.`);
            return undefined;
        }
        // Create a new trip for the joining user and add it to the pool
        const newTrip = {
            id: (0, uuid_1.v4)(),
            userId: userId,
            origin: pool.origin,
            destination: pool.destination,
            status: TripStatus.TRIP_STATUS_POOLED,
            fare: 0, // Fare will be calculated later
            poolId: pool.id,
            createdAt: Date.now(),
            vehicleType: pool.vehicleType,
            maxPassengers: pool.maxPassengers,
        };
        trips.push(newTrip); // Add the new trip to the main trips array
        pool.trips.push(newTrip);
        pool.currentPassengers++;
        if (pool.currentPassengers === pool.maxPassengers) {
            pool.status = PoolStatus.POOL_STATUS_MATCHED;
        }
        return pool;
    }
    return undefined;
};
exports.joinPool = joinPool;
const leavePool = (poolId, userId) => {
    const pool = ridePools.find(p => p.id === poolId);
    if (pool) {
        const initialPassengerCount = pool.currentPassengers;
        pool.trips = pool.trips.filter(trip => trip.userId !== userId);
        pool.currentPassengers = pool.trips.length;
        // Also remove the individual trip from the main trips array
        const tripIndex = trips.findIndex(t => t.poolId === poolId && t.userId === userId);
        if (tripIndex > -1) {
            trips.splice(tripIndex, 1);
        }
        if (pool.currentPassengers < initialPassengerCount) {
            pool.status = PoolStatus.POOL_STATUS_OPEN; // If someone leaves, it might become open again
            userCooldowns.set(userId, Date.now()); // Set cooldown for the user
            // If pool becomes empty, remove it
            if (pool.currentPassengers === 0) {
                const poolIndex = ridePools.findIndex(p => p.id === poolId);
                if (poolIndex > -1) {
                    ridePools.splice(poolIndex, 1);
                }
            }
            return pool;
        }
    }
    return undefined;
};
exports.leavePool = leavePool;
const getOpenPools = (vehicleType) => {
    const tenMinutesAgo = Date.now() - MAX_POOL_WAIT_TIME;
    return ridePools.filter(pool => pool.status === PoolStatus.POOL_STATUS_OPEN &&
        pool.createdAt > tenMinutesAgo &&
        pool.currentPassengers < pool.maxPassengers &&
        (!vehicleType || pool.vehicleType === vehicleType));
};
exports.getOpenPools = getOpenPools;
// Placeholder for adding friends to a pool - requires profile service integration
const addFriendToPool = (poolId, friendUniqueId, requestingUserId) => {
    // Logic to verify friendUniqueId via profile service
    // Logic to add friend's trip to pool if capacity allows
    console.log(`Attempting to add friend ${friendUniqueId} to pool ${poolId} by user ${requestingUserId}`);
    return undefined; // To be implemented
};
exports.addFriendToPool = addFriendToPool;

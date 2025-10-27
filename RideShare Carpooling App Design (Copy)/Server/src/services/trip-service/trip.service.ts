import { Trip, RidePool } from './trip.model';
import { v4 as uuidv4 } from 'uuid';

const trips: Trip[] = [];
const ridePools: RidePool[] = [];
const userCooldowns: Map<string, number> = new Map(); // userId -> timestamp of last pool leave

const COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_POOL_WAIT_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

export const createTrip = (trip: Trip): Trip => {
  const newTrip: Trip = { ...trip, id: uuidv4(), createdAt: Date.now(), status: 'pending' };

  if (newTrip.vehicleType) { // Indicates a pooled trip request
    let foundPool: RidePool | undefined;

    // Try to find an existing open pool
    for (const pool of ridePools) {
      if (
        pool.status === 'open' &&
        pool.vehicleType === newTrip.vehicleType &&
        pool.currentPassengers < pool.maxPassengers &&
        (Date.now() - pool.createdAt < MAX_POOL_WAIT_TIME) &&
        pool.origin === newTrip.origin && // Simple matching for now
        pool.destination === newTrip.destination // Simple matching for now
      ) {
        foundPool = pool;
        break;
      }
    }

    if (foundPool) {
      newTrip.poolId = foundPool.id;
      newTrip.status = 'pooled';
      foundPool.trips.push(newTrip);
      foundPool.currentPassengers++;
      if (foundPool.currentPassengers === foundPool.maxPassengers) {
        foundPool.status = 'matched'; // Pool is full
      }
    } else {
      // Create a new pool
      const poolId = uuidv4();
      const maxPassengers = newTrip.vehicleType === 'car' ? 4 : 3; // Car: 4, CNG: 3
      const newPool: RidePool = {
        id: poolId,
        trips: [newTrip],
        currentPassengers: 1,
        maxPassengers: maxPassengers,
        vehicleType: newTrip.vehicleType,
        origin: newTrip.origin,
        destination: newTrip.destination,
        status: 'open',
        createdAt: Date.now(),
      };
      newTrip.poolId = poolId;
      newTrip.status = 'pooled';
      ridePools.push(newPool);
    }
  }

  trips.push(newTrip);
  return newTrip;
};

export const getTrip = (id: string): Trip | undefined => {
  return trips.find(trip => trip.id === id);
};

export const getPool = (id: string): RidePool | undefined => {
  return ridePools.find(pool => pool.id === id);
};

export const joinPool = (poolId: string, userId: string): RidePool | undefined => {
  const lastLeaveTime = userCooldowns.get(userId);
  if (lastLeaveTime && (Date.now() - lastLeaveTime < COOLDOWN_PERIOD)) {
    console.log(`User ${userId} is on cooldown for joining pools.`);
    return undefined; // User is on cooldown
  }

  const pool = ridePools.find(p => p.id === poolId);

  if (pool && pool.status === 'open' && pool.currentPassengers < pool.maxPassengers) {
    // Check if user already has a trip in this pool
    const existingTripInPool = pool.trips.find(t => t.userId === userId);
    if (existingTripInPool) {
      console.log(`User ${userId} already has a trip in pool ${poolId}.`);
      return undefined;
    }

    // Create a new trip for the joining user and add it to the pool
    const newTrip: Trip = {
      id: uuidv4(),
      userId: userId,
      origin: pool.origin,
      destination: pool.destination,
      status: 'pooled',
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
      pool.status = 'matched';
    }
    return pool;
  }
  return undefined;
};

export const leavePool = (poolId: string, userId: string): RidePool | undefined => {
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
      pool.status = 'open'; // If someone leaves, it might become open again
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

export const getOpenPools = (vehicleType?: 'car' | 'cng'): RidePool[] => {
  const tenMinutesAgo = Date.now() - MAX_POOL_WAIT_TIME;
  return ridePools.filter(pool =>
    pool.status === 'open' &&
    pool.createdAt > tenMinutesAgo &&
    pool.currentPassengers < pool.maxPassengers &&
    (!vehicleType || pool.vehicleType === vehicleType)
  );
};

// Placeholder for adding friends to a pool - requires profile service integration
export const addFriendToPool = (poolId: string, friendUniqueId: string, requestingUserId: string): RidePool | undefined => {
  // Logic to verify friendUniqueId via profile service
  // Logic to add friend's trip to pool if capacity allows
  console.log(`Attempting to add friend ${friendUniqueId} to pool ${poolId} by user ${requestingUserId}`);
  return undefined; // To be implemented
};
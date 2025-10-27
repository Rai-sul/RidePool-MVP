import { Dispatch } from './dispatch.model';
import { Trip } from '../trip-service/trip.model';

// Mock drivers with their current H3 location
const drivers = [
  { id: '1', name: 'Driver 1', available: true, lat: 23.7963, lng: 90.4092, h3Index: '884000000000000' }, // Example: Dhaka H3 index
  { id: '2', name: 'Driver 2', available: true, lat: 23.7960, lng: 90.4090, h3Index: '884000000000000' }, // Example: Dhaka H3 index
  { id: '3', name: 'Driver 3', available: false, lat: 23.8103, lng: 90.4125, h3Index: '884000000000000' }, // Example: Dhaka H3 index
  { id: '4', name: 'Driver 4', available: true, lat: 23.7500, lng: 90.3600, h3Index: '884000000000000' }, // Example: Farther away H3 index
];

export const findDriver = async (trip: Trip): Promise<Dispatch | undefined> => {
  const h3 = await import('h3-js');

  // Assuming trip.origin is a string like "lat,lng"
  const [originLat, originLng] = trip.origin.split(',').map(Number);

  if (isNaN(originLat) || isNaN(originLng)) {
    console.error("Invalid trip origin coordinates:", trip.origin);
    return undefined;
  }

  const resolution = 8; // H3 resolution for driver search
  const originH3Index = h3.geoToH3(originLat, originLng, resolution);

  let searchKRings: string[] = [];
  // Start with k=1 ring
  searchKRings = h3.kRing(originH3Index, 1);

  let availableDriver = drivers.find(driver => 
    driver.available && searchKRings.includes(driver.h3Index)
  );

  // If no driver found in k=1, expand to k=2
  if (!availableDriver) {
    searchKRings = h3.kRing(originH3Index, 2);
    availableDriver = drivers.find(driver => 
      driver.available && searchKRings.includes(driver.h3Index)
    );
  }

  if (availableDriver) {
    return {
      id: `dispatch-${Date.now()}`,
      tripId: trip.id,
      driverId: availableDriver.id,
      status: 'pending',
    };
  } else {
    return undefined;
  }
};

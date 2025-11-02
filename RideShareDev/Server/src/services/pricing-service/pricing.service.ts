import { Trip } from '../trip-service/trip.service';

export interface Price {
  tripId: string;
  fare: number;
  surgeMultiplier: number;
}

const baseFare = 10;
const surgeMultiplier = 1.5;

export const calculateFare = (trip: Trip): Price => {
  const fare = baseFare * surgeMultiplier;
  return {
    tripId: trip.id,
    fare,
    surgeMultiplier,
  };
};
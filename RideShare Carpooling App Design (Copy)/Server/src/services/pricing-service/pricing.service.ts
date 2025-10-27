import { Price } from './pricing.model';
import { Trip } from '../trip-service/trip.model';

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

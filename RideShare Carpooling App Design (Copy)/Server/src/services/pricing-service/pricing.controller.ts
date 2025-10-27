import { Request, Response } from 'express';
import * as pricingService from './pricing.service';
import { Trip } from '../trip-service/trip.model';

export const calculateFare = (req: Request, res: Response) => {
  const trip: Trip = req.body;
  const price = pricingService.calculateFare(trip);
  res.json(price);
};

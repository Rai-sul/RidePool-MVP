import { Request, Response } from 'express';
import * as dispatchService from './dispatch.service';
import { Trip } from '../trip-service/trip.service';

export const findDriver = async (req: Request, res: Response) => {
  const trip: Trip = req.body;
  const dispatch = await dispatchService.findDriver(trip);
  if (dispatch) {
    res.json(dispatch);
  } else {
    res.status(404).send('No available drivers');
  }
};

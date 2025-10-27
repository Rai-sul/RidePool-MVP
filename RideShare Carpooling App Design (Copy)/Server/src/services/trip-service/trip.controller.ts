import { Request, Response } from 'express';
import * as tripService from './trip.service';
import { Trip, RidePool } from './trip.model';

export const createTrip = (req: Request, res: Response) => {
  const trip = tripService.createTrip(req.body);
  res.status(201).json(trip);
};

export const getTrip = (req: Request, res: Response) => {
  const trip = tripService.getTrip(req.params.id);
  if (trip) {
    res.json(trip);
  } else {
    res.status(404).send('Trip not found');
  }
};

export const getPool = (req: Request, res: Response) => {
  const pool = tripService.getPool(req.params.id);
  if (pool) {
    res.json(pool);
  } else {
    res.status(404).send('Pool not found');
  }
};

export const joinPool = (req: Request, res: Response) => {
  const { poolId, userId } = req.body;
  const updatedPool = tripService.joinPool(poolId, userId);
  if (updatedPool) {
    res.json(updatedPool);
  } else {
    res.status(400).send('Could not join pool or user is on cooldown');
  }
};

export const leavePool = (req: Request, res: Response) => {
  const { poolId, userId } = req.body;
  const updatedPool = tripService.leavePool(poolId, userId);
  if (updatedPool) {
    res.json(updatedPool);
  } else {
    res.status(400).send('Could not leave pool');
  }
};

export const getOpenPools = (req: Request, res: Response) => {
  const { vehicleType } = req.query;
  const openPools = tripService.getOpenPools(vehicleType as 'car' | 'cng');
  res.json(openPools);
};

export const addFriendToPool = (req: Request, res: Response) => {
  const { poolId, friendUniqueId, requestingUserId } = req.body;
  const updatedPool = tripService.addFriendToPool(poolId, friendUniqueId, requestingUserId);
  if (updatedPool) {
    res.json(updatedPool);
  } else {
    res.status(400).send('Could not add friend to pool');
  }
};
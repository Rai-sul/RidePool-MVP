import { Request, Response } from 'express';
import * as mapsService from './maps.service';
import { Location } from './maps.model';

export const geocodeAddress = async (req: Request, res: Response) => {
  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).send('Address query parameter is required.');
  }
  try {
    const result = await mapsService.geocodeAddress(address);
    if (result) {
      res.json(result);
    } else {
      res.status(404).send('Location not found for the given address.');
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).send('Internal server error.');
  }
};

export const reverseGeocode = async (req: Request, res: Response) => {
  const { lat, lng } = req.query;
  if (!lat || !lng || typeof lat !== 'string' || typeof lng !== 'string') {
    return res.status(400).send('Latitude and longitude query parameters are required.');
  }
  const location: Location = { lat: parseFloat(lat), lng: parseFloat(lng) };
  try {
    const result = await mapsService.reverseGeocode(location);
    if (result) {
      res.json(result);
    } else {
      res.status(404).send('Address not found for the given coordinates.');
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    res.status(500).send('Internal server error.');
  }
};

export const calculateRoute = async (req: Request, res: Response) => {
  const { originLat, originLng, destinationLat, destinationLng } = req.query;
  if (!originLat || !originLng || !destinationLat || !destinationLng ||
      typeof originLat !== 'string' || typeof originLng !== 'string' ||
      typeof destinationLat !== 'string' || typeof destinationLng !== 'string') {
    return res.status(400).send('Origin and destination coordinates are required.');
  }
  const origin: Location = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
  const destination: Location = { lat: parseFloat(destinationLat), lng: parseFloat(destinationLng) };
  try {
    const route = await mapsService.calculateRoute(origin, destination);
    if (route) {
      res.json(route);
    } else {
      res.status(404).send('Route could not be calculated.');
    }
  } catch (error) {
    console.error('Error calculating route:', error);
    res.status(500).send('Internal server error.');
  }
};

export const getH3Index = (req: Request, res: Response) => {
  const { lat, lng, resolution } = req.query;
  if (!lat || !lng || typeof lat !== 'string' || typeof lng !== 'string') {
    return res.status(400).send('Latitude and longitude are required.');
  }
  const location: Location = { lat: parseFloat(lat), lng: parseFloat(lng) };
  const h3Resolution = resolution ? parseInt(resolution as string) : 8;
  try {
    const h3Index = mapsService.getH3Index(location, h3Resolution);
    res.json({ h3Index });
  } catch (error) {
    console.error('Error getting H3 index:', error);
    res.status(500).send('Internal server error.');
  }
};

export const getKRing = (req: Request, res: Response) => {
  const { h3Index, k } = req.query;
  if (!h3Index || typeof h3Index !== 'string') {
    return res.status(400).send('H3 index is required.');
  }
  const kValue = k ? parseInt(k as string) : 1;
  try {
    const kRing = mapsService.getKRing(h3Index, kValue);
    res.json({ kRing });
  } catch (error) {
    console.error('Error getting k-ring:', error);
    res.status(500).send('Internal server error.');
  }
};
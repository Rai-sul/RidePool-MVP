import { Request, Response } from 'express';
import * as profileService from './profile.service';

export const createUserProfile = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.createUserProfile(req.body);
    res.status(201).json(profile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).send('Error creating user profile');
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const profile = await profileService.getUserProfile(req.params.id);
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).send('Profile not found');
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).send('Error getting user profile');
  }
};

export const addFriend = async (req: Request, res: Response) => {
  try {
    const { userId, friendUniqueId } = req.body;
    const updatedUser = await profileService.addFriend(userId, friendUniqueId);
    if (updatedUser) {
      res.json(updatedUser);
    } else {
      res.status(400).send('Could not add friend');
    }
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).send('Error adding friend');
  }
};
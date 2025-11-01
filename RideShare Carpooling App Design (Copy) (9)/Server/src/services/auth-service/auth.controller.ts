import { Request, Response } from 'express';
import * as authService from './auth.service';
import * as profileService from '../profile-service/profile.service';

export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;
  // For now, we will use a mock user. We will replace it with a real user from the database later.
  const user = { id: '1', email: 'test@example.com' };

  if (email === user.email) {
    const token = authService.generateToken({ id: user.id, email: user.email });
    res.json({ token });
  } else {
    res.status(401).send('Invalid credentials');
  }
};

export const verifyToken = (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')?.[1];

  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      res.json(decoded);
    } else {
      res.status(401).send('Invalid token');
    }
  } else {
    res.status(401).send('Token not found');
  }
};

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password?: string; // Password should not be sent in responses
  token?: string;
}

const users: User[] = []; // In-memory user store

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token: string): object | undefined => {
  try {
    return jwt.verify(token, JWT_SECRET) as object;
  } catch (error) {
    return undefined;
  }
};

export const register = async (email: string, password: string): Promise<User> => {
  // In a real app, hash password and store in DB
  const newUser: User = {
    id: uuidv4(),
    email,
    password, // Store hashed password in real app
  };
  users.push(newUser);
  const token = generateToken({ id: newUser.id, email: newUser.email });
  return { ...newUser, token };
};

export const login = async (email: string, password: string): Promise<User | undefined> => {
  // In a real app, compare hashed password from DB
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    const token = generateToken({ id: user.id, email: user.email });
    return { ...user, token };
  }
  return undefined;
};
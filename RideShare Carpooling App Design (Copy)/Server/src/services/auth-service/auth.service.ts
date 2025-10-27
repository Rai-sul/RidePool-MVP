import jwt from 'jsonwebtoken';

const secret = 'your-secret-key';

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
};

export const verifyToken = (token: string): object | undefined => {
  try {
    return jwt.verify(token, secret) as object;
  } catch (error) {
    return undefined;
  }
};

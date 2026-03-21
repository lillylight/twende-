import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

export interface TokenPayload extends JwtPayload {
  userId: string;
  role: string;
  phone: string;
}

export function signToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string | number
): string {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { redis } from './redis';
import { prisma } from './prisma';
import { signToken, verifyToken, type TokenPayload } from './jwt';

const SALT_ROUNDS = 12;
const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_PREFIX = 'otp:';

const JWT_SECRET = requireEnv('JWT_SECRET');
const JWT_REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in your .env file.`);
  }
  return value;
}
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface AuthPayload {
  userId: string;
  role: string;
  phone: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

export async function storeOTP(phone: string, code: string): Promise<void> {
  const key = `${OTP_PREFIX}${phone}`;
  await redis.set(key, code, 'EX', OTP_TTL_SECONDS);
}

export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const key = `${OTP_PREFIX}${phone}`;
  const storedCode = await redis.get(key);

  if (!storedCode || storedCode !== code) {
    return false;
  }

  await redis.del(key);
  return true;
}

export async function getCurrentUser(request: Request): Promise<AuthPayload | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, phone: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      userId: user.id,
      role: user.role,
      phone: user.phone,
    };
  } catch {
    return null;
  }
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function createSession(userId: string, role: string, phone: string): SessionTokens {
  const payload: TokenPayload = {
    userId,
    role,
    phone,
    jti: uuidv4(),
  };

  const accessToken = signToken({ userId, role, phone }, JWT_SECRET, ACCESS_TOKEN_EXPIRY);

  const refreshToken = signToken(
    { userId, role, phone, jti: payload.jti },
    JWT_REFRESH_SECRET,
    REFRESH_TOKEN_EXPIRY
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export function verifyRefreshToken(token: string): TokenPayload {
  return verifyToken(token, JWT_REFRESH_SECRET);
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Admin, IAdmin } from './models/Admin.js';
import { isUsingMemoryStore } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gemini-assessment-super-secure-jwt-key-2026';
const ADMIN_SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || 'ADMIN_INITIAL_PROVISION_2026';

export interface AdminTokenPayload {
  adminId: string;
  username: string;
  email: string;
  role: 'superadmin' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

// In-Memory store fallback when MongoDB daemon is not running locally
export const memoryAdmins: Map<string, { id: string; username: string; email: string; passwordHash: string; role: 'superadmin' | 'admin' }> = new Map();

// Seed initial default developer admin in memory
bcrypt.hash('Admin@123', 10).then((hash) => {
  memoryAdmins.set('admin@gemini.internal', {
    id: 'mem-admin-1',
    username: 'admin',
    email: 'admin@gemini.internal',
    passwordHash: hash,
    role: 'superadmin',
  });
});

/**
 * Ensures default admin exists in MongoDB upon database connection
 */
export async function seedDefaultAdminIfEmpty(): Promise<void> {
  if (isUsingMemoryStore()) return;
  try {
    const existing = await Admin.findOne({
      $or: [{ email: 'admin@gemini.internal' }, { username: 'admin' }],
    });
    if (!existing) {
      const passwordHash = await hashPassword('Admin@123');
      await Admin.create({
        username: 'admin',
        email: 'admin@gemini.internal',
        passwordHash,
        role: 'superadmin',
      });
      console.log('🛡️ [Admin Auth] Default admin provisioned in MongoDB: admin@gemini.internal');
    }
  } catch (err) {
    console.warn('[Admin Auth] Seed admin check error:', err);
  }
}

/**
 * Hash password securely
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Compare password
 */
export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * Sign JWT token
 */
export function generateAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify JWT token
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Express middleware protecting admin-only endpoints.
 * Requires "Authorization: Bearer <token>"
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Missing or malformed Bearer token in Authorization header.',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyAdminToken(token);

  if (!decoded) {
    res.status(401).json({
      success: false,
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid or expired admin session token. Please sign in again.',
    });
    return;
  }

  req.admin = decoded;
  next();
}

/**
 * Validates setup secret for initial admin provisioning
 */
export function verifySetupSecret(candidateSecret: string): boolean {
  return Boolean(candidateSecret && candidateSecret.trim() === ADMIN_SETUP_SECRET.trim());
}

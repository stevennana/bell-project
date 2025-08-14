import jwt from 'jsonwebtoken';
import jwksClient = require('jwks-client');
import crypto from 'crypto';
import { UserRecord } from '../types/database';
import { db } from './dynamodb';

// JWT token payload interface
export interface TokenPayload {
  sub: string; // user ID
  email: string;
  restaurantId: string;
  iat: number;
  exp: number;
}

// Cognito JWT verification (for production use)
export class CognitoJWTVerifier {
  private jwksClient: any;
  private userPoolId: string;
  private region: string;

  constructor(userPoolId: string, region: string = 'ap-northeast-2') {
    this.userPoolId = userPoolId;
    this.region = region;
    
    this.jwksClient = jwksClient({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        return null;
      }

      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      const payload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`
      }) as any;

      return {
        sub: payload.sub,
        email: payload.email,
        restaurantId: payload['custom:restaurantId'],
        iat: payload.iat,
        exp: payload.exp
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }
}

// Simple JWT handler for local development
export class SimpleJWTHandler {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.JWT_SECRET || 'development-secret-key';
  }

  generateToken(userId: string, email: string, restaurantId: string): string {
    const payload: TokenPayload = {
      sub: userId,
      email,
      restaurantId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, this.secret, { algorithm: 'HS256' });
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as TokenPayload;
      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }
}

// Password hashing utilities
export class PasswordService {
  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [salt, hash] = hashedPassword.split(':');
      const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      return hash === verifyHash;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }
}

// Authentication service
export class AuthService {
  private jwtHandler: SimpleJWTHandler | CognitoJWTVerifier;

  constructor() {
    if (process.env.COGNITO_USER_POOL_ID && process.env.AWS_REGION) {
      this.jwtHandler = new CognitoJWTVerifier(
        process.env.COGNITO_USER_POOL_ID,
        process.env.AWS_REGION
      );
    } else {
      this.jwtHandler = new SimpleJWTHandler();
    }
  }

  async authenticate(token: string): Promise<TokenPayload | null> {
    if (!token) {
      return null;
    }

    // Remove 'Bearer ' prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    return await this.jwtHandler.verifyToken(token);
  }

  async authenticateOwner(token: string): Promise<{ user: UserRecord; token: TokenPayload } | null> {
    const tokenPayload = await this.authenticate(token);
    if (!tokenPayload) {
      return null;
    }

    // Verify the user exists and is an owner
    const user = await db.getItem<UserRecord>('users', {
      userId: tokenPayload.sub,
      type: 'OWNER'
    });

    if (!user) {
      return null;
    }

    // Verify restaurant ID matches
    if (user.restaurantId !== tokenPayload.restaurantId) {
      return null;
    }

    return { user, token: tokenPayload };
  }

  generateToken(userId: string, email: string, restaurantId: string): string {
    if (this.jwtHandler instanceof SimpleJWTHandler) {
      return this.jwtHandler.generateToken(userId, email, restaurantId);
    }
    
    throw new Error('Token generation not supported with Cognito JWT verifier');
  }
}

// API Gateway event authentication helper
export function extractAuthToken(headers: { [key: string]: string }): string | null {
  const authHeader = headers['Authorization'] || headers['authorization'];
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

// Create singleton instance
export const authService = new AuthService();

// Middleware-style authentication decorator
export function requireAuthentication<T extends any[]>(
  handler: (tokenPayload: TokenPayload, ...args: T) => Promise<any>
) {
  return async (authToken: string | null, ...args: T) => {
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const tokenPayload = await authService.authenticate(authToken);
    if (!tokenPayload) {
      throw new Error('Invalid authentication token');
    }

    return await handler(tokenPayload, ...args);
  };
}

// Owner-specific authentication decorator
export function requireOwnerAuthentication<T extends any[]>(
  handler: (user: UserRecord, tokenPayload: TokenPayload, ...args: T) => Promise<any>
) {
  return async (authToken: string | null, ...args: T) => {
    if (!authToken) {
      throw new Error('Owner authentication required');
    }

    const authResult = await authService.authenticateOwner(authToken);
    if (!authResult) {
      throw new Error('Invalid owner authentication');
    }

    return await handler(authResult.user, authResult.token, ...args);
  };
}
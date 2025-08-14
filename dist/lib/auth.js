"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = exports.PasswordService = exports.SimpleJWTHandler = exports.CognitoJWTVerifier = void 0;
exports.extractAuthToken = extractAuthToken;
exports.requireAuthentication = requireAuthentication;
exports.requireOwnerAuthentication = requireOwnerAuthentication;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwksClient = require("jwks-client");
const crypto_1 = __importDefault(require("crypto"));
const dynamodb_1 = require("./dynamodb");
class CognitoJWTVerifier {
    constructor(userPoolId, region = 'ap-northeast-2') {
        this.userPoolId = userPoolId;
        this.region = region;
        this.jwksClient = jwksClient({
            jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
            cache: true,
            cacheMaxAge: 24 * 60 * 60 * 1000
        });
    }
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
            if (!decoded || !decoded.header.kid) {
                return null;
            }
            const key = await this.jwksClient.getSigningKey(decoded.header.kid);
            const signingKey = key.getPublicKey();
            const payload = jsonwebtoken_1.default.verify(token, signingKey, {
                algorithms: ['RS256'],
                issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`
            });
            return {
                sub: payload.sub,
                email: payload.email,
                restaurantId: payload['custom:restaurantId'],
                iat: payload.iat,
                exp: payload.exp
            };
        }
        catch (error) {
            console.error('Token verification error:', error);
            return null;
        }
    }
}
exports.CognitoJWTVerifier = CognitoJWTVerifier;
class SimpleJWTHandler {
    constructor(secret) {
        this.secret = secret || process.env.JWT_SECRET || 'development-secret-key';
    }
    generateToken(userId, email, restaurantId) {
        const payload = {
            sub: userId,
            email,
            restaurantId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };
        return jsonwebtoken_1.default.sign(payload, this.secret, { algorithm: 'HS256' });
    }
    async verifyToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.secret, { algorithms: ['HS256'] });
            return payload;
        }
        catch (error) {
            console.error('JWT verification error:', error);
            return null;
        }
    }
}
exports.SimpleJWTHandler = SimpleJWTHandler;
class PasswordService {
    static async hashPassword(password) {
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = crypto_1.default.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }
    static async verifyPassword(password, hashedPassword) {
        try {
            const [salt, hash] = hashedPassword.split(':');
            const verifyHash = crypto_1.default.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
            return hash === verifyHash;
        }
        catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }
}
exports.PasswordService = PasswordService;
class AuthService {
    constructor() {
        if (process.env.COGNITO_USER_POOL_ID && process.env.AWS_REGION) {
            this.jwtHandler = new CognitoJWTVerifier(process.env.COGNITO_USER_POOL_ID, process.env.AWS_REGION);
        }
        else {
            this.jwtHandler = new SimpleJWTHandler();
        }
    }
    async authenticate(token) {
        if (!token) {
            return null;
        }
        if (token.startsWith('Bearer ')) {
            token = token.substring(7);
        }
        return await this.jwtHandler.verifyToken(token);
    }
    async authenticateOwner(token) {
        const tokenPayload = await this.authenticate(token);
        if (!tokenPayload) {
            return null;
        }
        const user = await dynamodb_1.db.getItem('users', {
            userId: tokenPayload.sub,
            type: 'OWNER'
        });
        if (!user) {
            return null;
        }
        if (user.restaurantId !== tokenPayload.restaurantId) {
            return null;
        }
        return { user, token: tokenPayload };
    }
    generateToken(userId, email, restaurantId) {
        if (this.jwtHandler instanceof SimpleJWTHandler) {
            return this.jwtHandler.generateToken(userId, email, restaurantId);
        }
        throw new Error('Token generation not supported with Cognito JWT verifier');
    }
}
exports.AuthService = AuthService;
function extractAuthToken(headers) {
    const authHeader = headers['Authorization'] || headers['authorization'];
    if (!authHeader) {
        return null;
    }
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return authHeader;
}
exports.authService = new AuthService();
function requireAuthentication(handler) {
    return async (authToken, ...args) => {
        if (!authToken) {
            throw new Error('Authentication required');
        }
        const tokenPayload = await exports.authService.authenticate(authToken);
        if (!tokenPayload) {
            throw new Error('Invalid authentication token');
        }
        return await handler(tokenPayload, ...args);
    };
}
function requireOwnerAuthentication(handler) {
    return async (authToken, ...args) => {
        if (!authToken) {
            throw new Error('Owner authentication required');
        }
        const authResult = await exports.authService.authenticateOwner(authToken);
        if (!authResult) {
            throw new Error('Invalid owner authentication');
        }
        return await handler(authResult.user, authResult.token, ...args);
    };
}
//# sourceMappingURL=auth.js.map
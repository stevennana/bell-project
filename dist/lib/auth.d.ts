import { UserRecord } from '../types/database';
export interface TokenPayload {
    sub: string;
    email: string;
    restaurantId: string;
    iat: number;
    exp: number;
}
export declare class CognitoJWTVerifier {
    private jwksClient;
    private userPoolId;
    private region;
    constructor(userPoolId: string, region?: string);
    verifyToken(token: string): Promise<TokenPayload | null>;
}
export declare class SimpleJWTHandler {
    private secret;
    constructor(secret?: string);
    generateToken(userId: string, email: string, restaurantId: string): string;
    verifyToken(token: string): Promise<TokenPayload | null>;
}
export declare class PasswordService {
    static hashPassword(password: string): Promise<string>;
    static verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
}
export declare class AuthService {
    private jwtHandler;
    constructor();
    authenticate(token: string): Promise<TokenPayload | null>;
    authenticateOwner(token: string): Promise<{
        user: UserRecord;
        token: TokenPayload;
    } | null>;
    generateToken(userId: string, email: string, restaurantId: string): string;
}
export declare function extractAuthToken(headers: {
    [key: string]: string;
}): string | null;
export declare const authService: AuthService;
export declare function requireAuthentication<T extends any[]>(handler: (tokenPayload: TokenPayload, ...args: T) => Promise<any>): (authToken: string | null, ...args: T) => Promise<any>;
export declare function requireOwnerAuthentication<T extends any[]>(handler: (user: UserRecord, tokenPayload: TokenPayload, ...args: T) => Promise<any>): (authToken: string | null, ...args: T) => Promise<any>;
//# sourceMappingURL=auth.d.ts.map
declare module 'jwks-client' {
  interface JwksClient {
    getSigningKey(kid: string): Promise<{ getPublicKey(): string; getRSAPublicKey(): string }>;
  }

  interface JwksClientOptions {
    jwksUri: string;
    cache?: boolean;
    cacheMaxAge?: number;
    cacheMaxEntries?: number;
    timeout?: number;
    rateLimit?: boolean;
    jwksRequestsPerMinute?: number;
    proxy?: string;
    strictSsl?: boolean;
    headers?: { [key: string]: string };
    requestAgent?: any;
  }

  function jwksClient(options: JwksClientOptions): JwksClient;

  export = jwksClient;
}
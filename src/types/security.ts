export interface SecurityConfig {
  encryption: {
    algorithm: string;
    secretKey: Buffer;
    generateIV: () => Buffer;
  };
}

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface TokenPayload {
  userId: string;
  role: string;
  exp: number;
  iat: number;
}

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'X-Content-Type-Options': string;
  'Strict-Transport-Security': string;
  'Referrer-Policy': string;
} 
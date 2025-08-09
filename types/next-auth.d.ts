import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      emailVerified?: boolean;
      role?: 'user' | 'admin';
      lastLoginAt?: Date;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    emailVerified?: boolean;
    role?: 'user' | 'admin';
    lastLoginAt?: Date;
  }

  interface Account {
    access_token: string;
    expires_at: number;
    refresh_token: string;
    scope: string;
    token_type: string;
    id_token: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    emailVerified?: boolean;
    role?: 'user' | 'admin';
    loginAt?: number;
  }
}

// エラー型定義
export interface AuthError extends Error {
  type?: 'AuthError' | 'CredentialsSignin' | 'EmailNotVerified' | 'AccountLocked';
  cause?: Error;
}

import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getOptimizedCookieSettings } from './csrf-protection';
import { auditLog, AuditAction } from './audit-logger';
import { getRealIP } from './rate-limiter';

// MongoDBクライアントの設定
const mongoClient = new MongoClient(process.env.MONGODB_URI!);

// セッションの最適化設定
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(mongoClient),
  
  // プロバイダーの設定
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email',
          placeholder: 'your@email.com' 
        },
        password: { 
          label: 'Password', 
          type: 'password' 
        }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await mongoClient.connect();
          const db = mongoClient.db(process.env.DB_NAME);
          const users = db.collection('users');

          // ユーザー検索
          const user = await users.findOne({ 
            email: credentials.email.toLowerCase() 
          });

          if (!user) {
            // 監査ログ: ログイン失敗（ユーザーが存在しない）
            const ip = getRealIP(req as any);
            const userAgent = (req as any)?.headers?.['user-agent'] || 'unknown';
            
            await auditLog.loginFailed(
              ip,
              userAgent,
              'User not found'
            );
            return null;
          }

          // パスワード検証
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // 監査ログ: ログイン失敗（パスワード不正）
            const ip = getRealIP(req as any);
            const userAgent = (req as any)?.headers?.['user-agent'] || 'unknown';
            
            await auditLog.loginFailed(
              ip,
              userAgent,
              'Invalid password'
            );
            return null;
          }

          // アカウント状態チェック
          if (user.status === 'suspended') {
            const ip = getRealIP(req as any);
            const userAgent = (req as any)?.headers?.['user-agent'] || 'unknown';
            
            await auditLog.loginFailed(
              ip,
              userAgent,
              'Account suspended'
            );
            return null;
          }

          // ログイン成功の監査ログ
          const ip = getRealIP(req as any);
          const userAgent = (req as any)?.headers?.['user-agent'] || 'unknown';
          
          await auditLog.loginSuccess(
            user._id.toString(),
            ip,
            userAgent
          );

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            emailVerified: user.emailVerified,
            image: user.image,
            lastLoginAt: new Date(),
            loginIP: ip
          };

        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],

  // セッション戦略
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24時間（秒単位）
    updateAge: 60 * 60,   // 1時間ごとに更新（セッション延長）
  },

  // JWT設定
  jwt: {
    maxAge: 24 * 60 * 60, // 24時間（秒単位）
    // セキュアな署名アルゴリズム
    encode: async ({ token, secret, maxAge }) => {
      const { encode } = await import('next-auth/jwt');
      return encode({
        token,
        secret,
        maxAge,
        // より強力な暗号化
        algorithm: 'HS512'
      });
    },
    decode: async ({ token, secret }) => {
      const { decode } = await import('next-auth/jwt');
      return decode({ token, secret });
    }
  },

  // クッキー設定の最適化
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        ...getOptimizedCookieSettings().options,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        domain: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL?.replace('https://', '').replace('http://', '')
          : undefined
      }
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        httpOnly: false // クライアントサイドでアクセスが必要
      }
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  // コールバック関数
  callbacks: {
    async jwt({ token, user, account }) {
      // 初回ログイン時
      if (user) {
        token.role = user.role;
        token.emailVerified = user.emailVerified;
        token.lastLoginAt = user.lastLoginAt;
        token.loginIP = user.loginIP;
        token.sessionId = Math.random().toString(36).substring(2, 15);
      }

      // セッション更新時のセキュリティチェック
      if (token.sessionId && token.loginIP) {
        // IPアドレスの変更を検知した場合の処理
        // 実装: リクエストのIPと比較
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.emailVerified = token.emailVerified as Date;
        session.user.lastLoginAt = token.lastLoginAt as Date;
        session.user.sessionId = token.sessionId as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // セキュアなリダイレクト処理
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    }
  },

  // イベントハンドラー
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // 新規ユーザーの場合
      if (isNewUser) {
        try {
          await mongoClient.connect();
          const db = mongoClient.db(process.env.DB_NAME);
          const users = db.collection('users');

          // ユーザー情報の更新
          await users.updateOne(
            { _id: user.id },
            {
              $set: {
                lastLoginAt: new Date(),
                loginCount: 1,
                status: 'active',
                createdAt: new Date()
              }
            }
          );
        } catch (error) {
          console.error('Sign in event error:', error);
        }
      } else {
        try {
          await mongoClient.connect();
          const db = mongoClient.db(process.env.DB_NAME);
          const users = db.collection('users');

          // 既存ユーザーの更新
          await users.updateOne(
            { _id: user.id },
            {
              $set: {
                lastLoginAt: new Date()
              },
              $inc: {
                loginCount: 1
              }
            }
          );
        } catch (error) {
          console.error('Sign in event error:', error);
        }
      }
    },

    async signOut({ session, token }) {
      // ログアウト時の監査ログ
      if (token?.sub) {
        // 監査ログの記録（IPアドレスが必要だが、ここでは取得が困難）
        // 実際の実装では別の方法で記録
      }
    },

    async session({ session, token }) {
      // セッション使用時のログ（必要に応じて）
      // 頻繁に呼ばれるため、重要なアクション時のみログを記録
    }
  },

  // ページ設定
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome'
  },

  // デバッグ設定
  debug: process.env.NODE_ENV === 'development',

  // セキュリティ設定
  secret: process.env.NEXTAUTH_SECRET,
  
  // CSRF保護を有効化
  useSecureCookies: process.env.NODE_ENV === 'production'
};

// セッションの拡張タイプ定義
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
      emailVerified?: Date;
      lastLoginAt?: Date;
      sessionId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    emailVerified?: Date;
    lastLoginAt?: Date;
    loginIP?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    emailVerified?: Date;
    lastLoginAt?: Date;
    loginIP?: string;
    sessionId?: string;
  }
}

export default authOptions;
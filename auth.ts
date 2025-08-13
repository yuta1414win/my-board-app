import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { authConfig } from './auth.config';
import dbConnect from './lib/mongodb';
import User from './models/User';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// バリデーションスキーマ
const credentialsSchema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

// プロバイダー定義（OAuthは環境変数が揃っている場合のみ有効化）
const providers = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: {
        label: 'メールアドレス',
        type: 'email',
        placeholder: 'example@email.com',
      },
      password: {
        label: 'パスワード',
        type: 'password',
        placeholder: '8文字以上のパスワード',
      },
    },
    async authorize(credentials) {
      try {
        // 入力値の検証
        const validatedFields = credentialsSchema.safeParse(credentials);

        if (!validatedFields.success) {
          console.error('認証情報の検証に失敗:', validatedFields.error.issues);
          return null;
        }

        const { email, password } = validatedFields.data;

        await dbConnect();

        const user = await User.findOne({
          email: email.toLowerCase(),
        }).select('+password');

        if (!user) {
          console.error('ユーザーが見つかりません:', email);
          return null;
        }

        // メール認証チェック
        if (!user.emailVerified) {
          throw new Error(
            'メールアドレスが確認されていません。確認メールをご確認ください。'
          );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          console.error('パスワードが正しくありません:', email);
          return null;
        }

        // ログイン成功 - 最終ログイン時刻を更新
        await User.findOneAndUpdate(
          { _id: user._id },
          { lastLoginAt: new Date() }
        );

        return {
          id: (user as any)._id.toString(),
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified
            ? typeof user.emailVerified === 'boolean'
              ? new Date()
              : new Date(user.emailVerified)
            : undefined,
        };
      } catch (error) {
        console.error('認証エラー:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('認証に失敗しました。');
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }) as any
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }) as any
  );
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours - セッション更新間隔
  },
  callbacks: {
    async jwt({ token, user, trigger, session, account }) {
      // 初回ログイン時
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.emailVerified = user.emailVerified
          ? new Date(user.emailVerified)
          : new Date(); // OAuthは認証済みとする
        token.loginAt = Date.now();

        // OAuthプロバイダーの場合
        if (account?.provider !== 'credentials') {
          token.provider = account?.provider;
          token.role = 'user'; // デフォルトロール
        }
      }

      // セッション更新時
      if (trigger === 'update' && session) {
        token.name = session.name || token.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.emailVerified = token.emailVerified as Date;
        if (token.role) {
          session.user.role = token.role as string;
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      // サインイン前の最終チェック
      if (account?.provider === 'credentials') {
        return !!user?.emailVerified;
      }
      return true;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log('サインイン成功:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        isNewUser,
      });
    },
  },
  debug: process.env.NODE_ENV === 'development',
});

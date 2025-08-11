import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/dashboard',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnBoard = nextUrl.pathname.startsWith('/board');
      const isOnAuth = nextUrl.pathname.startsWith('/auth');
      const isApiAuth = nextUrl.pathname.startsWith('/api/auth');

      // API認証エンドポイントは常に許可
      if (isApiAuth) {
        return true;
      }

      // 保護されたルート（/board）へのアクセス
      if (isOnBoard) {
        if (isLoggedIn) return true;
        return false; // 未認証ユーザーはログインページへリダイレクト
      }

      // 認証済みユーザーが認証ページにアクセスした場合
      if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;

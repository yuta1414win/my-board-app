import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/board',
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
        return Response.redirect(new URL('/board', nextUrl));
      }

      return true;
    },
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;

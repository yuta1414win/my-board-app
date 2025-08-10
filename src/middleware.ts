import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保護されたページのパス
  const protectedPaths = [
    '/board', 
    '/profile', 
    '/settings',
    '/dashboard',
    '/posts/new',
    '/posts/edit',
    '/posts/[id]/edit'
  ];
  const authPaths = ['/auth/login', '/auth/signin', '/auth/register'];

  // 既にログインしている場合、認証ページにアクセスしたら /board にリダイレクト
  if (authPaths.some((path) => pathname.startsWith(path))) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      return NextResponse.redirect(new URL('/board', request.url));
    }
    return NextResponse.next();
  }

  // 認証が不要なパス
  if (!protectedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // NextAuth.jsのトークンを取得
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // トークンがない場合はログインページにリダイレクト（callbackUrlを含む）
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // メール確認チェック（必要に応じて）
  if (!token.emailVerified && pathname !== '/auth/verify-email') {
    // メール未確認の場合、確認ページへリダイレクト（オプション）
    // return NextResponse.redirect(new URL('/auth/verify-email', request.url));
  }

  // トークンが有効な場合はそのまま続行
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下のパスを除外:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - その他の静的リソース
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

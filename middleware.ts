import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getEdgeRateLimiter, getClientIP } from './lib/edge-rate-limiter';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  console.log('🔥 MIDDLEWARE RUNNING:', pathname, 'IP:', ip);

  // 静的リソースに対してはレート制限をスキップ
  const isStaticResource =
    pathname.startsWith('/_next/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js');

  // レート制限チェック（アプリ独自のAPIのみ対象。Auth.jsやページは除外）
  let rateLimitResult = null;
  if (
    !isStaticResource &&
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth')
  ) {
    const rateLimiter = getEdgeRateLimiter();
    rateLimitResult = rateLimiter.checkLimit(ip);
  }

  if (rateLimitResult && !rateLimitResult.allowed) {
    console.log('🚨 RATE LIMIT EXCEEDED for IP:', ip);
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ).toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      }
    );
  }

  // 基本的なセキュリティヘッダーを設定（Edge Runtime互換）
  const response = NextResponse.next();

  // レート制限情報をヘッダーに追加（チェックした場合のみ）
  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set(
      'X-RateLimit-Remaining',
      rateLimitResult.remaining.toString()
    );
    response.headers.set(
      'X-RateLimit-Reset',
      rateLimitResult.resetTime.toString()
    );
  }

  // 基本セキュリティヘッダーの設定
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Content Security Policy (開発環境用)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:*",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' localhost:* ws://localhost:* wss://localhost:*",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // Permissions Policy
  const permissionsPolicy = [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'fullscreen=(self)'
  ].join(', ');

  response.headers.set('Permissions-Policy', permissionsPolicy);

  // フレームワーク情報の隠蔽
  response.headers.delete('X-Powered-By');
  response.headers.set('Server', 'SecureServer');

  // リダイレクトループ防止のため、認証関連のチェックを統一
  const protectedPaths = [
    '/board',
    '/profile',
    '/settings',
    '/dashboard',
    '/posts',
  ];
  const authPaths = ['/auth/signin', '/auth/register'];

  const isProtectedRoute = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );
  const isAuthPage = authPaths.some((path) => pathname.startsWith(path));

  // 認証が必要な場合のみトークンを取得（パフォーマンス改善）
  if (isProtectedRoute || isAuthPage) {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
      });

      // 保護されたルートで認証されていない場合
      if (isProtectedRoute && !token) {
        const loginUrl = new URL('/auth/signin', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // 認証ページで既に認証されている場合（リダイレクトループ防止）
      if (isAuthPage && token) {
        // callbackUrlがある場合はそこにリダイレクト
        const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
        if (
          callbackUrl &&
          !authPaths.some((path) => callbackUrl.startsWith(path))
        ) {
          return NextResponse.redirect(new URL(callbackUrl, request.url));
        }
        // デフォルトはダッシュボードへ
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('🚨 Token validation error:', error);
      // トークン検証エラーの場合、認証が必要なページでのみリダイレクト
      if (isProtectedRoute) {
        const loginUrl = new URL('/auth/signin', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  console.log('🔥 SECURITY HEADERS SET');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Note: API routes are now included for rate limiting
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

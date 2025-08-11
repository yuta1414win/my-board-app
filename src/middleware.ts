import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { defaultRateLimiter, getRealIP } from '../lib/rate-limiter';
import {
  applySecurityHeaders,
  PAGE_SPECIFIC_CSP,
} from '../lib/security-headers';
import { defaultCSRFProtection } from '../lib/csrf-protection';
import { auditLog } from '../lib/audit-logger';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getRealIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const startTime = Date.now();

  // レート制限チェック
  const rateLimitResult = defaultRateLimiter.checkLimit(ip);
  if (!rateLimitResult.allowed) {
    await auditLog.rateLimitExceeded(ip, userAgent, pathname);

    const response = new NextResponse(
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
        },
      }
    );

    return applySecurityHeaders(response, {
      contentSecurityPolicy: PAGE_SPECIFIC_CSP.api,
    });
  }

  // 保護されたページのパス
  const protectedPaths = ['/board', '/profile', '/settings', '/dashboard', '/posts'];
  const authPaths = ['/auth/login', '/auth/signin', '/auth/register'];

  // 既にログインしている場合の認証ページアクセス処理
  if (authPaths.some((path) => pathname.startsWith(path))) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      return applySecurityHeaders(response);
    }
  }

  // CSRF保護（API routes用）
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const csrfResult = await defaultCSRFProtection.middleware(request);
    if (csrfResult) {
      await auditLog.csrfViolation(ip, userAgent, pathname);
      return applySecurityHeaders(csrfResult);
    }
  }

  // 認証が必要なパスのチェック
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const url = new URL('/auth/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      const response = NextResponse.redirect(url);
      return applySecurityHeaders(response);
    }
  }

  // 成功時のレスポンス作成
  const response = NextResponse.next();

  // パス別のCSP設定
  let securityConfig = {};
  if (pathname.startsWith('/admin')) {
    securityConfig = { contentSecurityPolicy: PAGE_SPECIFIC_CSP.admin };
  } else if (pathname.startsWith('/auth')) {
    securityConfig = { contentSecurityPolicy: PAGE_SPECIFIC_CSP.auth };
  } else if (pathname.startsWith('/api/')) {
    securityConfig = { contentSecurityPolicy: PAGE_SPECIFIC_CSP.api };
  }

  // レート制限ヘッダーの設定
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

  // 処理時間の記録
  const duration = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${duration}ms`);

  return applySecurityHeaders(response, securityConfig);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
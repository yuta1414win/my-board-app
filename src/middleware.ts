import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { defaultRateLimiter, getRealIP } from '../lib/rate-limiter';
import { applySecurityHeaders, PAGE_SPECIFIC_CSP } from '../lib/security-headers';
import { defaultCSRFProtection } from '../lib/csrf-protection';
import { auditLog, AuditAction } from '../lib/audit-logger';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = getRealIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const startTime = Date.now();
  
  // レート制限チェック
  const rateLimitResult = defaultRateLimiter.checkLimit(ip);
  if (!rateLimitResult.allowed) {
    // 監査ログ記録
    await auditLog.rateLimitExceeded(ip, userAgent, pathname);
    
    const response = new NextResponse(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      }
    );
    
    return applySecurityHeaders(response, {
      contentSecurityPolicy: PAGE_SPECIFIC_CSP.api
    });
  }

  // 保護されたページのパス
  const protectedPaths = [
    '/board',
    '/profile',
    '/settings',
    '/dashboard',
    '/posts/new',
    '/posts/edit',
    '/posts/[id]/edit',
  ];
  const authPaths = ['/auth/login', '/auth/signin', '/auth/register'];

  // 既にログインしている場合、認証ページにアクセスしたら /board にリダイレクト
  if (authPaths.some((path) => pathname.startsWith(path))) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
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

  // NextAuth.jsのトークンを取得
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // トークンがない場合はログインページにリダイレクト（callbackUrlを含む）
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    
    const response = NextResponse.redirect(url);
    return applySecurityHeaders(response);
  }

  // CSRF保護（API routes用）
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const csrfResult = await defaultCSRFProtection.middleware(request);
    if (csrfResult) {
      // CSRF違反を監査ログに記録
      await auditLog.csrfViolation(ip, userAgent, pathname);
      return applySecurityHeaders(csrfResult);
    }
  }

  // メール確認チェック（必要に応じて）
  if (!token.emailVerified && pathname !== '/auth/verify-email') {
    // メール未確認の場合、確認ページへリダイレクト（オプション）
    // return NextResponse.redirect(new URL('/auth/verify-email', request.url));
  }

  // 成功時のレスポンス作成
  const response = NextResponse.next();
  
  // セキュリティヘッダーの適用
  let securityConfig = {};
  
  // パス別のCSP設定
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

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保護されたページのパス
  const protectedPaths = ['/board'];
  const authPaths = ['/auth/signin', '/auth/register'];

  // 認証が不要なパス
  if (!protectedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 認証トークンを取得
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // トークンがない場合はログインページにリダイレクト
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  try {
    // JWTトークンを検証
    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
    const secret = new TextEncoder().encode(JWT_SECRET);
    
    await jwtVerify(token, secret);
    
    // トークンが有効な場合はそのまま続行
    return NextResponse.next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    
    // トークンが無効な場合はクッキーをクリアしてログインページにリダイレクト
    const response = NextResponse.redirect(new URL('/auth/signin', request.url));
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  }
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
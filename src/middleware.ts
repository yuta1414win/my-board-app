import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log('🔥 MIDDLEWARE RUNNING:', request.nextUrl.pathname);

  const response = NextResponse.next();

  // Test: Add a simple header to see if middleware is working
  response.headers.set('X-Debug-Middleware', 'working');
  response.headers.set('X-Debug-Path', request.nextUrl.pathname);
  response.headers.set('X-Debug-Timestamp', new Date().toISOString());

  // Add a few security headers manually to test
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Content-Security-Policy', "default-src 'self'");

  console.log('🔥 HEADERS SET:', Array.from(response.headers.entries()));

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

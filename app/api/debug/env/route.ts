import { NextResponse } from 'next/server';

// 環境変数の状態を確認するためのデバッグエンドポイント
export async function GET() {
  // 本番環境では基本的な情報のみ返す
  const isProduction = process.env.NODE_ENV === 'production';

  const envCheck = {
    status: 'Environment Check',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      mongodb: {
        configured: !!process.env.MONGODB_URI,
        uriFormat: process.env.MONGODB_URI
          ? process.env.MONGODB_URI.startsWith('mongodb+srv://')
            ? 'Valid SRV format'
            : process.env.MONGODB_URI.startsWith('mongodb://')
              ? 'Valid standard format'
              : 'Invalid format'
          : 'Not configured',
      },
      authentication: {
        nextauth_url: !!process.env.NEXTAUTH_URL,
        nextauth_secret: !!process.env.NEXTAUTH_SECRET,
        jwt_secret: !!process.env.JWT_SECRET,
      },
      email: {
        server_configured: !!(
          process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_PORT
        ),
        credentials_configured: !!(
          process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
        ),
        from_configured: !!process.env.EMAIL_FROM,
      },
      urls: {
        app_url: !!process.env.APP_URL,
        public_app_url: !!process.env.NEXT_PUBLIC_APP_URL,
        nextauth_url: !!process.env.NEXTAUTH_URL,
      },
    },
    // 開発環境でのみ詳細情報を表示
    debug: !isProduction
      ? {
          mongodb_uri_preview: process.env.MONGODB_URI
            ? process.env.MONGODB_URI.substring(0, 30) + '...'
            : undefined,
          nextauth_url: process.env.NEXTAUTH_URL,
          email_host: process.env.EMAIL_SERVER_HOST,
          email_port: process.env.EMAIL_SERVER_PORT,
        }
      : undefined,
  };

  // MongoDBへの接続テスト
  let dbConnectionTest = 'Not tested';
  try {
    const dbConnect = (await import('@/lib/mongodb')).default;
    const connection = await dbConnect();
    dbConnectionTest = connection
      ? 'Success'
      : 'Failed - Connection returned null';
  } catch (error) {
    dbConnectionTest = `Failed - ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  return NextResponse.json({
    ...envCheck,
    database: {
      connection_test: dbConnectionTest,
    },
    recommendation: getRecommendation(envCheck.checks),
  });
}

function getRecommendation(checks: any): string[] {
  const recommendations = [];

  if (!checks.mongodb.configured) {
    recommendations.push(
      '⚠️ MONGODB_URI is not configured. Please set it in Vercel Environment Variables.'
    );
  }

  if (!checks.authentication.nextauth_secret) {
    recommendations.push(
      '⚠️ NEXTAUTH_SECRET is missing. Generate one with: openssl rand -base64 32'
    );
  }

  if (!checks.authentication.jwt_secret) {
    recommendations.push(
      '⚠️ JWT_SECRET is missing. Generate one with: openssl rand -base64 32'
    );
  }

  if (!checks.email.server_configured) {
    recommendations.push(
      '📧 Email server not configured. Registration emails will not be sent.'
    );
  }

  if (!checks.urls.nextauth_url && !checks.urls.app_url) {
    recommendations.push(
      '🔗 No application URL configured. Set NEXTAUTH_URL or APP_URL.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      '✅ All required environment variables appear to be configured.'
    );
  }

  return recommendations;
}

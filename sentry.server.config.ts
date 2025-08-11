import * as Sentry from '@sentry/nextjs';

// 本番環境でのみSentryを有効化
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンス監視
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 環境設定
  environment: process.env.NODE_ENV || 'development',

  // リリース情報
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  // サーバーサイドでのエラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境では詳細なエラー情報をログ出力
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry Server Error:', hint.originalException);
    }

    // 機密情報を含む可能性があるデータを削除
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
      delete event.request.headers?.cookie;
    }

    // 環境変数情報を削除
    if (event.contexts?.runtime?.name === 'node' && event.extra) {
      delete event.extra.env;
    }

    // 特定のエラーを除外
    const error = hint.originalException;
    if (error instanceof Error) {
      // MongoDB接続エラーは別途ログに記録
      if (
        error.message.includes('MongoError') ||
        error.message.includes('MongoDB')
      ) {
        console.error('MongoDB Error (excluded from Sentry):', error.message);
        return null;
      }

      // NextAuth関連のエラーを除外
      if (error.message.includes('NEXTAUTH')) {
        return null;
      }
    }

    return event;
  },

  // サーバーサイド統合設定
  integrations: [
    // Node.js統合
    Sentry.nodeProfilingIntegration(),
  ],

  // デバッグモード
  debug: process.env.NODE_ENV === 'development',
});

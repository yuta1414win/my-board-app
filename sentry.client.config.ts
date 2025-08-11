import * as Sentry from '@sentry/nextjs';

// 本番環境でのみSentryを有効化
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // セッション追跡を有効化
  integrations: [
    Sentry.replayIntegration({
      // セッションリプレイの設定
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      // ユーザーフィードバック
      colorScheme: 'auto',
    }),
  ],

  // パフォーマンス監視
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // セッションリプレイサンプリング
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  // 環境設定
  environment: process.env.NODE_ENV || 'development',

  // リリース情報
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  // エラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境では詳細なエラー情報を含める
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry Error:', hint.originalException);
    }

    // プライバシーを保護するために機密データを削除
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }

    // 特定のエラーを除外
    const error = hint.originalException;
    if (error instanceof Error) {
      // NextAuth関連のエラーを除外
      if (error.message.includes('NEXTAUTH')) {
        return null;
      }

      // ネットワークエラーを除外
      if (error.message.includes('NetworkError')) {
        return null;
      }
    }

    return event;
  },

  // デバッグモード
  debug: process.env.NODE_ENV === 'development',
  });
}

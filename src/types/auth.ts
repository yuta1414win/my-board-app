// 認証関連の型定義

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
}

export interface VerificationResponse extends AuthResponse {
  canResend?: boolean;
  redirectUrl?: string;
}

export interface ResendResponse extends AuthResponse {
  // 再送信固有のプロパティがあれば追加
}

// エラーコード定数
export const AUTH_ERROR_CODES = {
  // トークン関連
  TOKEN_REQUIRED: 'TOKEN_REQUIRED',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // メール認証関連
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',
  EMAIL_REQUIRED: 'EMAIL_REQUIRED',
  ALREADY_VERIFIED: 'ALREADY_VERIFIED',

  // ユーザー関連
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // システムエラー
  VERIFICATION_ERROR: 'VERIFICATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // 再送信関連
  RESEND_SUCCESS: 'RESEND_SUCCESS',
  RESEND_EMAIL_ERROR: 'RESEND_EMAIL_ERROR',
  RESEND_ERROR: 'RESEND_ERROR',
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

// エラーメッセージのマッピング
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  TOKEN_REQUIRED: '確認トークンが必要です',
  TOKEN_NOT_FOUND: '確認トークンが見つかりません',
  INVALID_TOKEN: '無効または期限切れのトークンです',
  EMAIL_VERIFIED: 'メールアドレスが確認されました。ログインできます。',
  EMAIL_REQUIRED: 'メールアドレスが必要です',
  ALREADY_VERIFIED: 'メールアドレスは既に確認済みです',
  USER_NOT_FOUND: 'ユーザーが見つかりません',
  VERIFICATION_ERROR: 'メール確認中にエラーが発生しました',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  RESEND_SUCCESS: '確認メールを再送信しました',
  RESEND_EMAIL_ERROR: '確認メールの送信に失敗しました',
  RESEND_ERROR: '確認メール再送信中にエラーが発生しました',
};

// ユーザーフレンドリーなエラーメッセージの生成
export function getUserFriendlyErrorMessage(
  code?: string,
  fallbackMessage?: string
): string {
  if (!code) return fallbackMessage || '不明なエラーが発生しました';

  return (
    AUTH_ERROR_MESSAGES[code as AuthErrorCode] ||
    fallbackMessage ||
    '不明なエラーが発生しました'
  );
}

// エラーレベルの定義
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// エラーレベルのマッピング
export const ERROR_LEVEL_MAP: Record<AuthErrorCode, ErrorLevel> = {
  TOKEN_REQUIRED: ErrorLevel.ERROR,
  TOKEN_NOT_FOUND: ErrorLevel.ERROR,
  INVALID_TOKEN: ErrorLevel.WARNING,
  EMAIL_VERIFIED: ErrorLevel.INFO,
  EMAIL_REQUIRED: ErrorLevel.ERROR,
  ALREADY_VERIFIED: ErrorLevel.WARNING,
  USER_NOT_FOUND: ErrorLevel.ERROR,
  VERIFICATION_ERROR: ErrorLevel.CRITICAL,
  NETWORK_ERROR: ErrorLevel.ERROR,
  RESEND_SUCCESS: ErrorLevel.INFO,
  RESEND_EMAIL_ERROR: ErrorLevel.ERROR,
  RESEND_ERROR: ErrorLevel.CRITICAL,
};

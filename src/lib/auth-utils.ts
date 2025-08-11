import {
  VerificationResponse,
  AuthErrorCode,
  AUTH_ERROR_CODES,
  getUserFriendlyErrorMessage,
  ErrorLevel,
  ERROR_LEVEL_MAP,
} from '@/types/auth';

/**
 * APIレスポンスを安全にパースする
 */
export async function safeParseResponse<T = VerificationResponse>(
  response: Response
): Promise<T> {
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to parse response:', error);
    throw new Error('レスポンスの解析に失敗しました');
  }
}

/**
 * 認証APIを安全に呼び出す
 */
export async function safeAuthApiCall<T = VerificationResponse>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await safeParseResponse<T>(response);
    return data;
  } catch (error) {
    console.error('Auth API call failed:', error);
    // ネットワークエラーの場合の統一レスポンス
    return {
      success: false,
      error: 'ネットワークエラーが発生しました',
      code: AUTH_ERROR_CODES.NETWORK_ERROR,
    } as T;
  }
}

/**
 * エラーコードに基づいてMaterial UIのAlertのseverityを決定
 */
export function getAlertSeverity(
  code?: string
): 'success' | 'info' | 'warning' | 'error' {
  if (!code) return 'error';

  const level = ERROR_LEVEL_MAP[code as AuthErrorCode];

  switch (level) {
    case ErrorLevel.INFO:
      return code === AUTH_ERROR_CODES.EMAIL_VERIFIED ? 'success' : 'info';
    case ErrorLevel.WARNING:
      return 'warning';
    case ErrorLevel.ERROR:
    case ErrorLevel.CRITICAL:
    default:
      return 'error';
  }
}

/**
 * 認証トークンの検証
 */
export function isValidToken(token: string | null): boolean {
  return !!(token && token.length >= 32 && /^[A-Za-z0-9]+$/.test(token));
}

/**
 * メールアドレスの基本検証
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * エラーレスポンスの作成
 */
export function createErrorResponse(
  code: AuthErrorCode,
  customMessage?: string
): VerificationResponse {
  return {
    success: false,
    error: customMessage || getUserFriendlyErrorMessage(code),
    code,
    canResend: code === AUTH_ERROR_CODES.INVALID_TOKEN,
  };
}

/**
 * 成功レスポンスの作成
 */
export function createSuccessResponse(
  message?: string,
  redirectUrl?: string
): VerificationResponse {
  return {
    success: true,
    message:
      message || getUserFriendlyErrorMessage(AUTH_ERROR_CODES.EMAIL_VERIFIED),
    code: AUTH_ERROR_CODES.EMAIL_VERIFIED,
    redirectUrl,
  };
}

/**
 * レート制限チェック（簡易実装）
 */
class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> =
    new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    // 15分間で5回まで
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return false;
    }

    // ウィンドウが過ぎている場合はリセット
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return false;
    }

    // 制限に達している場合
    if (record.count >= this.maxAttempts) {
      return true;
    }

    // 試行回数を増やす
    record.count++;
    record.lastAttempt = now;
    return false;
  }

  getRemainingTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || record.count < this.maxAttempts) return 0;

    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, this.windowMs - elapsed);
  }
}

// グローバルなレート制限インスタンス
export const emailResendRateLimiter = new RateLimiter();

/**
 * ログ記録ユーティリティ
 */
export function logAuthEvent(
  event:
    | 'verification_attempt'
    | 'verification_success'
    | 'verification_failure'
    | 'resend_request',
  details: {
    token?: string;
    email?: string;
    code?: string;
    error?: string;
    userAgent?: string;
    ip?: string;
  }
) {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
    // セキュリティ上、トークンは最初の8文字のみ記録
    token: details.token ? `${details.token.substring(0, 8)}...` : undefined,
  };

  console.log('Auth Event:', logData);

  // 本番環境では適切なログ収集サービスに送信
  //例: Sentry, LogRocket, DataDog等
}

/**
 * 認証統計の追跡（簡易実装）
 */
export class AuthMetrics {
  private static metrics = {
    verificationAttempts: 0,
    verificationSuccesses: 0,
    verificationFailures: 0,
    resendRequests: 0,
  };

  static increment(metric: keyof typeof AuthMetrics.metrics) {
    AuthMetrics.metrics[metric]++;
  }

  static getMetrics() {
    return { ...AuthMetrics.metrics };
  }

  static getSuccessRate(): number {
    const { verificationAttempts, verificationSuccesses } = AuthMetrics.metrics;
    return verificationAttempts > 0
      ? verificationSuccesses / verificationAttempts
      : 0;
  }
}

/**
 * エラーハンドリングユーティリティ
 * 認証システム全体で統一されたエラー処理を提供
 */

import { NextResponse } from 'next/server';

// エラー型定義
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// エラーコード定数
export const ERROR_CODES = {
  // 認証エラー
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // 登録エラー
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_ALREADY_VERIFIED: 'EMAIL_ALREADY_VERIFIED',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  
  // バリデーションエラー
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_PASSWORD_FORMAT: 'INVALID_PASSWORD_FORMAT',
  
  // サーバーエラー
  DATABASE_ERROR: 'DATABASE_ERROR',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  
  // レート制限
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // その他
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

// エラーメッセージマッピング
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTHENTICATION_FAILED]: '認証に失敗しました',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'メールアドレスまたはパスワードが正しくありません',
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: 'メールアドレスが確認されていません。確認メールをご確認ください。',
  [ERROR_CODES.ACCOUNT_LOCKED]: 'アカウントがロックされています。しばらく時間を置いてお試しください。',
  [ERROR_CODES.TOKEN_EXPIRED]: 'トークンの有効期限が切れています',
  [ERROR_CODES.TOKEN_INVALID]: '無効なトークンです',
  
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'このメールアドレスは既に登録されています',
  [ERROR_CODES.EMAIL_ALREADY_VERIFIED]: 'このメールアドレスは既に登録され、認証されています',
  [ERROR_CODES.WEAK_PASSWORD]: 'パスワードが弱すぎます。数字、英字、特殊文字を含む8文字以上で設定してください。',
  
  [ERROR_CODES.VALIDATION_ERROR]: '入力内容に誤りがあります',
  [ERROR_CODES.MISSING_REQUIRED_FIELDS]: '必須項目が入力されていません',
  [ERROR_CODES.INVALID_EMAIL_FORMAT]: '正しいメールアドレスを入力してください',
  [ERROR_CODES.INVALID_PASSWORD_FORMAT]: 'パスワードの形式が正しくありません',
  
  [ERROR_CODES.DATABASE_ERROR]: 'データベースエラーが発生しました',
  [ERROR_CODES.EMAIL_SEND_FAILED]: 'メールの送信に失敗しました',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'サーバーエラーが発生しました。しばらく時間を置いてお試しください。',
  
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'リクエスト制限に達しました。しばらく時間を置いてお試しください。',
  [ERROR_CODES.TOO_MANY_REQUESTS]: 'リクエスト回数が上限を超えました',
  
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'リソースが見つかりません',
  [ERROR_CODES.UNAUTHORIZED]: '認証が必要です',
  [ERROR_CODES.FORBIDDEN]: 'アクセス権限がありません',
};

/**
 * APIエラーレスポンスを作成
 */
export function createErrorResponse(
  code: string,
  statusCode: number = 400,
  customMessage?: string,
  details?: any
): NextResponse {
  const message = customMessage || ERROR_MESSAGES[code] || 'エラーが発生しました';
  
  const errorResponse = {
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };

  console.error('API Error:', {
    code,
    statusCode,
    message,
    details,
    timestamp: errorResponse.timestamp,
  });

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * バリデーションエラーレスポンスを作成
 */
export function createValidationErrorResponse(
  errors: ValidationError[],
  customMessage?: string
): NextResponse {
  const message = customMessage || ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR];
  
  const errorResponse = {
    error: message,
    code: ERROR_CODES.VALIDATION_ERROR,
    details: errors,
    timestamp: new Date().toISOString(),
  };

  console.error('Validation Error:', errorResponse);

  return NextResponse.json(errorResponse, { status: 400 });
}

/**
 * MongoDB エラーを処理
 */
export function handleMongoError(error: any): NextResponse {
  console.error('MongoDB Error:', error);

  // 重複エラー（E11000）
  if (error.code === 11000) {
    if (error.keyPattern?.email) {
      return createErrorResponse(
        ERROR_CODES.EMAIL_ALREADY_EXISTS,
        400
      );
    }
    return createErrorResponse(
      ERROR_CODES.DATABASE_ERROR,
      400,
      '既に存在するデータです'
    );
  }

  // バリデーションエラー
  if (error.name === 'ValidationError') {
    const validationErrors: ValidationError[] = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      code: 'VALIDATION_FAILED'
    }));
    
    return createValidationErrorResponse(validationErrors);
  }

  // キャストエラー
  if (error.name === 'CastError') {
    return createErrorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      400,
      '無効なデータ形式です'
    );
  }

  // その他のデータベースエラー
  return createErrorResponse(
    ERROR_CODES.DATABASE_ERROR,
    500
  );
}

/**
 * 一般的なエラーを処理
 */
export function handleGenericError(error: any, context?: string): NextResponse {
  console.error(`Generic Error${context ? ` in ${context}` : ''}:`, error);

  // API エラー
  if (error instanceof Error && 'statusCode' in error) {
    const apiError = error as ApiError;
    return createErrorResponse(
      apiError.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
      apiError.statusCode || 500,
      apiError.message,
      apiError.details
    );
  }

  // 標準エラー
  if (error instanceof Error) {
    return createErrorResponse(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }

  // 不明なエラー
  return createErrorResponse(
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    500
  );
}

/**
 * エラーログを記録
 */
export function logError(
  error: any,
  context: string,
  additionalData?: any
): void {
  const logData = {
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    },
    context,
    additionalData,
    timestamp: new Date().toISOString(),
    severity: 'error',
  };

  // 本番環境では外部ログサービスに送信可能
  console.error('Error Log:', JSON.stringify(logData, null, 2));
  
  // TODO: 外部ログサービス（Sentry、CloudWatch等）への送信
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: { context, additionalData } });
  // }
}

/**
 * 成功レスポンスを作成
 */
export function createSuccessResponse(
  data: any,
  message?: string,
  statusCode: number = 200
): NextResponse {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * NextAuth.jsエラーを変換
 */
export function transformNextAuthError(error: string): {
  code: string;
  message: string;
} {
  switch (error) {
    case 'CredentialsSignin':
      return {
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: ERROR_MESSAGES[ERROR_CODES.INVALID_CREDENTIALS],
      };
    case 'EmailNotVerified':
      return {
        code: ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: ERROR_MESSAGES[ERROR_CODES.EMAIL_NOT_VERIFIED],
      };
    case 'AccountLocked':
      return {
        code: ERROR_CODES.ACCOUNT_LOCKED,
        message: ERROR_MESSAGES[ERROR_CODES.ACCOUNT_LOCKED],
      };
    default:
      return {
        code: ERROR_CODES.AUTHENTICATION_FAILED,
        message: ERROR_MESSAGES[ERROR_CODES.AUTHENTICATION_FAILED],
      };
  }
}
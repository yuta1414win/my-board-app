import { NextResponse } from 'next/server';

// セキュリティヘッダー設定
export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: string;
  xFrameOptions?: string;
  xContentTypeOptions?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  xXSSProtection?: string;
  crossOriginEmbedderPolicy?: string;
  crossOriginOpenerPolicy?: string;
  crossOriginResourcePolicy?: string;
}

// デフォルトセキュリティヘッダー設定
const DEFAULT_HEADERS: SecurityHeadersConfig = {
  // Content Security Policy - XSS攻撃を防ぐ
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.resend.com wss: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),
  
  // HTTP Strict Transport Security - HTTPS強制
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  
  // X-Frame-Options - クリックジャッキング攻撃を防ぐ
  xFrameOptions: 'DENY',
  
  // X-Content-Type-Options - MIME型スニッフィングを防ぐ
  xContentTypeOptions: 'nosniff',
  
  // Referrer Policy - リファラー情報の制御
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions Policy - ブラウザ機能の制限
  permissionsPolicy: [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=(self)',
    'fullscreen=(self)',
    'sync-xhr=()'
  ].join(', '),
  
  // X-XSS-Protection - 古いブラウザ用XSS保護
  xXSSProtection: '1; mode=block',
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: 'require-corp',
  
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: 'same-origin',
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: 'same-site'
};

// 開発環境用のより緩い設定
const DEVELOPMENT_HEADERS: SecurityHeadersConfig = {
  ...DEFAULT_HEADERS,
  // 開発環境ではHotReloadのためより緩いCSP
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' localhost:* 127.0.0.1:* https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' localhost:* ws://localhost:* wss://localhost:* https://api.resend.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // 開発環境ではHSTSを無効化
  strictTransportSecurity: undefined,
  
  // Cross-Origin policies を開発環境では緩める
  crossOriginEmbedderPolicy: undefined,
  crossOriginOpenerPolicy: 'unsafe-none',
};

// 環境別設定の選択
function getSecurityHeaders(): SecurityHeadersConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? DEVELOPMENT_HEADERS : DEFAULT_HEADERS;
}

// NextResponseにセキュリティヘッダーを適用
export function applySecurityHeaders(
  response: NextResponse, 
  customConfig?: Partial<SecurityHeadersConfig>
): NextResponse {
  const headers = { ...getSecurityHeaders(), ...customConfig };
  
  // 各ヘッダーを設定
  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      const headerName = convertToHeaderName(key);
      response.headers.set(headerName, value);
    }
  });
  
  return response;
}

// camelCaseからkebab-caseへの変換
function convertToHeaderName(key: string): string {
  const headerMap: Record<string, string> = {
    contentSecurityPolicy: 'Content-Security-Policy',
    strictTransportSecurity: 'Strict-Transport-Security',
    xFrameOptions: 'X-Frame-Options',
    xContentTypeOptions: 'X-Content-Type-Options',
    referrerPolicy: 'Referrer-Policy',
    permissionsPolicy: 'Permissions-Policy',
    xXSSProtection: 'X-XSS-Protection',
    crossOriginEmbedderPolicy: 'Cross-Origin-Embedder-Policy',
    crossOriginOpenerPolicy: 'Cross-Origin-Opener-Policy',
    crossOriginResourcePolicy: 'Cross-Origin-Resource-Policy'
  };
  
  return headerMap[key] || key;
}

// 特定のページ用のカスタムCSP
export const PAGE_SPECIFIC_CSP = {
  // 認証ページ - より厳格
  auth: [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // 管理者ページ - 最も厳格
  admin: [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // APIエンドポイント
  api: [
    "default-src 'none'",
    "frame-ancestors 'none'"
  ].join('; ')
};

// CSPレポートの処理
export interface CSPReport {
  'csp-report': {
    'document-uri': string;
    'violated-directive': string;
    'blocked-uri': string;
    'source-file': string;
    'line-number': number;
    'column-number': number;
  };
}

// CSP違反レポートの処理
export function handleCSPReport(report: CSPReport): void {
  const violation = report['csp-report'];
  
  console.warn('CSP Violation:', {
    documentUri: violation['document-uri'],
    violatedDirective: violation['violated-directive'],
    blockedUri: violation['blocked-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number'],
    columnNumber: violation['column-number'],
    timestamp: new Date().toISOString()
  });
  
  // 本番環境では監査ログに記録
  if (process.env.NODE_ENV === 'production') {
    // 監査ログシステムに送信（後で実装）
    // auditLogger.log('csp-violation', violation);
  }
}

// セキュリティスキャナー用の設定チェック
export function validateSecurityHeaders(): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const headers = getSecurityHeaders();
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // 必須ヘッダーのチェック
  if (!headers.contentSecurityPolicy) {
    errors.push('Content-Security-Policy is missing');
  }
  
  if (!headers.xFrameOptions) {
    errors.push('X-Frame-Options is missing');
  }
  
  // 本番環境での警告
  if (process.env.NODE_ENV === 'production') {
    if (!headers.strictTransportSecurity) {
      warnings.push('HSTS should be enabled in production');
    }
    
    if (headers.contentSecurityPolicy?.includes('unsafe-inline')) {
      warnings.push('unsafe-inline in CSP reduces security');
    }
    
    if (headers.contentSecurityPolicy?.includes('unsafe-eval')) {
      warnings.push('unsafe-eval in CSP reduces security');
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

export { DEFAULT_HEADERS, DEVELOPMENT_HEADERS };
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import CryptoJS from 'crypto-js';
import { LRUCache } from 'lru-cache';

// CSRFトークンのキャッシュ（メモリ効率のため）
const csrfTokenCache = new LRUCache<string, string>({
  max: 5000, // 最大5,000エントリ
  ttl: 30 * 60 * 1000, // 30分でTTL
});

// CSRF設定
interface CSRFConfig {
  tokenLength: number;
  tokenExpiry: number;
  cookieName: string;
  headerName: string;
  ignoreMethods: string[];
  sameSitePolicy: 'strict' | 'lax' | 'none';
  secure: boolean;
  httpOnly: boolean;
}

const DEFAULT_CSRF_CONFIG: CSRFConfig = {
  tokenLength: 32,
  tokenExpiry: 30 * 60 * 1000, // 30分
  cookieName: '__csrf-token',
  headerName: 'x-csrf-token',
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  sameSitePolicy: 'strict',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: false, // フロントエンドからアクセスする必要があるため
};

// セッション設定の最適化
interface SessionConfig {
  name: string;
  secret: string;
  maxAge: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  rolling: boolean;
  regenerateOnAuth: boolean;
}

const OPTIMIZED_SESSION_CONFIG: SessionConfig = {
  name: '__session',
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
  maxAge: 24 * 60 * 60 * 1000, // 24時間
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  rolling: true, // アクセス時にセッション延長
  regenerateOnAuth: true, // 認証時にセッションID再生成
};

// セッション情報の構造
interface SessionInfo {
  userId: string;
  createdAt: number;
  lastAccess: number;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export class CSRFProtection {
  private config: CSRFConfig;

  constructor(customConfig?: Partial<CSRFConfig>) {
    this.config = { ...DEFAULT_CSRF_CONFIG, ...customConfig };
  }

  // CSRFトークンの生成
  generateToken(sessionId?: string): string {
    const timestamp = Date.now().toString();
    const randomBytes = CryptoJS.lib.WordArray.random(this.config.tokenLength);
    const payload = `${timestamp}-${randomBytes.toString(CryptoJS.enc.Hex)}`;

    // セッションIDと組み合わせてハッシュ化
    if (sessionId) {
      const hash = CryptoJS.HmacSHA256(payload, sessionId).toString(
        CryptoJS.enc.Hex
      );
      return `${payload}.${hash}`;
    }

    return CryptoJS.SHA256(payload).toString(CryptoJS.enc.Hex);
  }

  // CSRFトークンの検証
  verifyToken(token: string, sessionId?: string): boolean {
    if (!token) return false;

    try {
      if (sessionId && token.includes('.')) {
        // セッションベースの検証
        const [payload, hash] = token.split('.');
        const expectedHash = CryptoJS.HmacSHA256(payload, sessionId).toString(
          CryptoJS.enc.Hex
        );

        // タイミング攻撃を防ぐ固定時間比較
        if (!this.constantTimeCompare(hash, expectedHash)) {
          return false;
        }

        // タイムスタンプの検証
        const timestamp = parseInt(payload.split('-')[0]);
        const now = Date.now();

        return now - timestamp <= this.config.tokenExpiry;
      } else {
        // シンプルな検証（後方互換性）
        const cachedToken = csrfTokenCache.get(token);
        return cachedToken !== undefined;
      }
    } catch (error) {
      console.error('CSRF token verification failed:', error);
      return false;
    }
  }

  // 固定時間での文字列比較（タイミング攻撃対策）
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  // CSRFミドルウェア
  async middleware(request: NextRequest): Promise<NextResponse | null> {
    const method = request.method;
    const url = request.nextUrl.pathname;

    // 除外メソッドのチェック
    if (this.config.ignoreMethods.includes(method)) {
      return null; // チェックをスキップ
    }

    // API routesのみ対象
    if (!url.startsWith('/api/')) {
      return null;
    }

    // NextAuthのエンドポイントは除外
    if (url.startsWith('/api/auth/')) {
      return null;
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const sessionId = token?.sub; // ユーザーID

    // CSRFトークンの取得（ヘッダー優先、次にクッキー）
    const csrfTokenFromHeader = request.headers.get(this.config.headerName);
    const csrfTokenFromCookie = request.cookies.get(
      this.config.cookieName
    )?.value;
    const csrfToken = csrfTokenFromHeader || csrfTokenFromCookie;

    // トークンの検証
    if (!csrfToken || !this.verifyToken(csrfToken, sessionId)) {
      return new NextResponse(
        JSON.stringify({
          error: 'CSRF token validation failed',
          code: 'CSRF_TOKEN_INVALID',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return null; // 検証成功、次に進む
  }

  // CSRFトークンをレスポンスに設定
  setTokenInResponse(response: NextResponse, token: string): NextResponse {
    // クッキーに設定
    response.cookies.set({
      name: this.config.cookieName,
      value: token,
      maxAge: this.config.tokenExpiry / 1000,
      secure: this.config.secure,
      httpOnly: this.config.httpOnly,
      sameSite: this.config.sameSitePolicy,
      path: '/',
    });

    // ヘッダーにも設定（フロントエンド用）
    response.headers.set('X-CSRF-Token', token);

    return response;
  }
}

// セッション管理の最適化
export class OptimizedSessionManager {
  private config: SessionConfig;
  private activeSessions = new LRUCache<string, SessionInfo>({
    max: 10000,
    ttl: 24 * 60 * 60 * 1000, // 24時間
  });

  constructor(customConfig?: Partial<SessionConfig>) {
    this.config = { ...OPTIMIZED_SESSION_CONFIG, ...customConfig };
  }

  // セッションの作成
  createSession(userId: string, ipAddress: string, userAgent: string): string {
    const sessionId = CryptoJS.lib.WordArray.random(32).toString(
      CryptoJS.enc.Hex
    );
    const now = Date.now();

    const sessionInfo: SessionInfo = {
      userId,
      createdAt: now,
      lastAccess: now,
      ipAddress,
      userAgent: userAgent.substring(0, 500), // 長さ制限
      isActive: true,
    };

    this.activeSessions.set(sessionId, sessionInfo);
    return sessionId;
  }

  // セッションの検証と更新
  validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): {
    valid: boolean;
    userId?: string;
    shouldRegenerate?: boolean;
  } {
    const session = this.activeSessions.get(sessionId);

    if (!session || !session.isActive) {
      return { valid: false };
    }

    const now = Date.now();

    // セッションの有効期限チェック
    if (now - session.lastAccess > this.config.maxAge) {
      this.invalidateSession(sessionId);
      return { valid: false };
    }

    // セキュリティチェック（IPアドレスの変更を検知）
    if (session.ipAddress !== ipAddress) {
      console.warn(
        `Session ${sessionId} accessed from different IP: ${session.ipAddress} -> ${ipAddress}`
      );
      // 本番環境では厳格にする場合はここでセッション無効化
      // return { valid: false };
    }

    // ユーザーエージェントの変更を検知
    if (session.userAgent !== userAgent.substring(0, 500)) {
      console.warn(`Session ${sessionId} accessed with different user agent`);
      // セッション再生成を推奨
      return {
        valid: true,
        userId: session.userId,
        shouldRegenerate: true,
      };
    }

    // セッションの更新（Rolling Session）
    if (this.config.rolling) {
      session.lastAccess = now;
      this.activeSessions.set(sessionId, session);
    }

    return { valid: true, userId: session.userId };
  }

  // セッションの無効化
  invalidateSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.set(sessionId, session);
      // 一定時間後に完全削除
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 60000); // 1分後
    }
  }

  // ユーザーの全セッションを無効化
  invalidateAllUserSessions(userId: string): void {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.invalidateSession(sessionId);
      }
    }
  }

  // アクティブセッション数の取得
  getActiveSessionCount(userId: string): number {
    let count = 0;
    for (const session of this.activeSessions.values()) {
      if (session.userId === userId && session.isActive) {
        count++;
      }
    }
    return count;
  }

  // セッション統計の取得
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    uniqueUsers: number;
    averageSessionDuration: number;
  } {
    const now = Date.now();
    let activeSessions = 0;
    const uniqueUsers = new Set<string>();
    let totalDuration = 0;
    let sessionCount = 0;

    for (const session of this.activeSessions.values()) {
      if (session.isActive) {
        activeSessions++;
        uniqueUsers.add(session.userId);
        totalDuration += now - session.createdAt;
        sessionCount++;
      }
    }

    return {
      totalSessions: this.activeSessions.size,
      activeSessions,
      uniqueUsers: uniqueUsers.size,
      averageSessionDuration:
        sessionCount > 0 ? totalDuration / sessionCount : 0,
    };
  }
}

// デフォルトインスタンス
export const defaultCSRFProtection = new CSRFProtection();
export const defaultSessionManager = new OptimizedSessionManager();

// Next.js用のヘルパー関数
export async function withCSRFProtection(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // CSRF検証
  const csrfResult = await defaultCSRFProtection.middleware(request);
  if (csrfResult) {
    return csrfResult; // CSRF検証失敗
  }

  // 元のハンドラーを実行
  const response = await handler(request);

  // レスポンスに新しいCSRFトークンを設定
  const token = await getToken({ req: request });
  if (token) {
    const newCSRFToken = defaultCSRFProtection.generateToken(token.sub);
    return defaultCSRFProtection.setTokenInResponse(response, newCSRFToken);
  }

  return response;
}

// セッションクッキーの最適化設定
export function getOptimizedCookieSettings(): {
  name: string;
  options: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
  };
} {
  return {
    name: OPTIMIZED_SESSION_CONFIG.name,
    options: {
      maxAge: OPTIMIZED_SESSION_CONFIG.maxAge / 1000, // 秒単位
      secure: OPTIMIZED_SESSION_CONFIG.secure,
      httpOnly: OPTIMIZED_SESSION_CONFIG.httpOnly,
      sameSite: OPTIMIZED_SESSION_CONFIG.sameSite,
      path: '/',
    },
  };
}

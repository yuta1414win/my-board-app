import { LRUCache } from 'lru-cache';

// レート制限設定
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockUntil?: number;
}

// デフォルト設定
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1分
  maxRequests: 5,
  message: 'Too many requests, please try again later',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

// LRUキャッシュでメモリ効率を保つ
const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 10000, // 最大10,000エントリ
  ttl: 60 * 1000 * 10, // 10分でTTL
});

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // IPアドレスベースのレート制限チェック
  public checkLimit(ip: string): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    blocked?: boolean;
    blockUntil?: number;
  } {
    const now = Date.now();
    const key = `rate_limit:${ip}`;

    let entry = rateLimitCache.get(key);

    // エントリが存在しないか、リセット時間を過ぎた場合
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }

    // ブロック状態のチェック
    if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        blocked: true,
        blockUntil: entry.blockUntil,
      };
    }

    // ブロック期間が終了した場合はリセット
    if (entry.blocked && entry.blockUntil && now >= entry.blockUntil) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        blocked: false,
      };
    }

    // リクエストカウントを増加
    entry.count++;

    // 制限を超えた場合
    if (entry.count > this.config.maxRequests) {
      // 初回違反の場合、ブロック状態にする
      if (!entry.blocked) {
        entry.blocked = true;
        entry.blockUntil = now + this.config.windowMs * 2; // 2倍の時間ブロック
      }

      rateLimitCache.set(key, entry);

      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        blocked: true,
        blockUntil: entry.blockUntil,
      };
    }

    // 制限内の場合
    rateLimitCache.set(key, entry);

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  // 特定IPのリセット（管理者機能）
  public resetIP(ip: string): void {
    const key = `rate_limit:${ip}`;
    rateLimitCache.delete(key);
  }

  // 統計情報の取得
  public getStats(): {
    totalEntries: number;
    blockedIPs: string[];
    cacheSize: number;
  } {
    const blockedIPs: string[] = [];
    const now = Date.now();

    for (const [key, entry] of rateLimitCache.entries()) {
      if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
        const ip = key.replace('rate_limit:', '');
        blockedIPs.push(ip);
      }
    }

    return {
      totalEntries: rateLimitCache.size,
      blockedIPs,
      cacheSize: rateLimitCache.calculatedSize || 0,
    };
  }
}

// デフォルトのレート制限インスタンス
export const defaultRateLimiter = new RateLimiter();

// API用のレート制限インスタンス（より厳格）
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1分
  maxRequests: 3, // API用により厳格
  message: 'API rate limit exceeded',
});

// ログイン試行用のレート制限インスタンス
export const loginRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15分
  maxRequests: 5, // 15分間で5回まで
  message: 'Too many login attempts',
});

// レート制限のヘルパー関数
export function getRealIP(request: Request): string {
  // Vercel、Cloudflare、その他のプロキシを考慮
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (xRealIP) return xRealIP;
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // フォールバック（開発環境）
  return '127.0.0.1';
}

// Edge Runtime compatible rate limiter using Map instead of LRU Cache

interface RateLimitInfo {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

class EdgeRateLimiter {
  private requests = new Map<string, RateLimitInfo>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60 * 1000, maxRequests = 50) {
    // 本番環境では1分間に50回に緩和（通常のブラウジング用）
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  checkLimit(ip: string): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const existing = this.requests.get(ip);

    // 初回リクエストまたはウィンドウ期間外
    if (!existing || now - existing.firstRequest >= this.windowMs) {
      this.requests.set(ip, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });

      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      };
    }

    // ウィンドウ期間内
    existing.count++;
    existing.lastRequest = now;
    this.requests.set(ip, existing);

    const remaining = Math.max(0, this.maxRequests - existing.count);
    const allowed = existing.count <= this.maxRequests;

    return {
      allowed,
      limit: this.maxRequests,
      remaining,
      resetTime: existing.firstRequest + this.windowMs,
    };
  }

  // 古いエントリの定期削除（メモリリーク防止）
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [ip, info] of this.requests.entries()) {
      if (now - info.firstRequest >= this.windowMs * 2) {
        this.requests.delete(ip);
        removed++;
      }
    }

    return removed;
  }

  // 統計情報の取得
  getStats() {
    return {
      totalIPs: this.requests.size,
      activeRequests: Array.from(this.requests.values()).reduce(
        (sum, info) => sum + info.count,
        0
      ),
    };
  }
}

// シングルトンインスタンス（Edge Runtime対応）
let rateLimiterInstance: EdgeRateLimiter | null = null;

export function getEdgeRateLimiter(): EdgeRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new EdgeRateLimiter(60 * 1000, 5); // 1分間に5回

    // 定期クリーンアップ（Edge RuntimeでsetIntervalは使えないので、リクエスト時にクリーンアップ）
  }

  return rateLimiterInstance;
}

// IPアドレス取得（Edge Runtime互換）
export function getClientIP(request: Request): string {
  // Vercel/Cloudflare対応
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // その他のヘッダー
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // デフォルト（開発環境）
  return '127.0.0.1';
}

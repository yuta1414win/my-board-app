import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// 監査ログのレベル
export enum AuditLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// 監査アクション
export enum AuditAction {
  // 認証関連
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  
  // ユーザー管理
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',
  PROFILE_UPDATE = 'profile_update',
  
  // 投稿関連
  POST_CREATE = 'post_create',
  POST_UPDATE = 'post_update',
  POST_DELETE = 'post_delete',
  POST_VIEW = 'post_view',
  
  // セキュリティ関連
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_VIOLATION = 'csrf_violation',
  XSS_ATTEMPT = 'xss_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  
  // システム関連
  API_ACCESS = 'api_access',
  FILE_UPLOAD = 'file_upload',
  EXPORT_DATA = 'export_data',
  ADMIN_ACTION = 'admin_action'
}

// 監査ログエントリの構造
export interface AuditLogEntry {
  _id?: ObjectId;
  timestamp: Date;
  level: AuditLevel;
  action: AuditAction;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  success: boolean;
  duration?: number;
  errorMessage?: string;
  riskScore: number;
  metadata?: {
    method?: string;
    url?: string;
    statusCode?: number;
    requestSize?: number;
    responseSize?: number;
    geolocation?: {
      country?: string;
      city?: string;
      coordinates?: [number, number];
    };
  };
}

// 監査ログの設定
interface AuditConfig {
  mongoUri: string;
  databaseName: string;
  collectionName: string;
  retention: {
    days: number;
    maxEntries: number;
  };
  alertThresholds: {
    failedLogins: number;
    rateLimitViolations: number;
    suspiciousActivity: number;
  };
  sampling: {
    enabled: boolean;
    rate: number; // 0.0-1.0
  };
}

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  databaseName: process.env.DB_NAME || 'my-board-app',
  collectionName: 'audit_logs',
  retention: {
    days: 365, // 1年間保存
    maxEntries: 10000000, // 1000万エントリまで
  },
  alertThresholds: {
    failedLogins: 5,
    rateLimitViolations: 10,
    suspiciousActivity: 3,
  },
  sampling: {
    enabled: process.env.NODE_ENV === 'production',
    rate: 0.1, // 10%サンプリング（本番環境）
  }
};

// リスクスコアの計算
export class RiskScorer {
  static calculateRisk(entry: Partial<AuditLogEntry>): number {
    let score = 0;

    // アクションベースのスコア
    switch (entry.action) {
      case AuditAction.LOGIN_FAILED:
        score += 3;
        break;
      case AuditAction.CSRF_VIOLATION:
      case AuditAction.XSS_ATTEMPT:
        score += 8;
        break;
      case AuditAction.SUSPICIOUS_ACTIVITY:
        score += 7;
        break;
      case AuditAction.UNAUTHORIZED_ACCESS:
        score += 9;
        break;
      case AuditAction.RATE_LIMIT_EXCEEDED:
        score += 4;
        break;
      case AuditAction.PASSWORD_RESET:
        score += 2;
        break;
      default:
        score += 1;
    }

    // エラーの場合はスコアを上げる
    if (!entry.success) {
      score += 2;
    }

    // 時間帯による調整（深夜アクセスは怪しい）
    const hour = new Date().getHours();
    if (hour >= 23 || hour <= 5) {
      score += 1;
    }

    // IPアドレスが頻繁に変わる場合
    // (実装では前回のIPと比較する必要がある)

    return Math.min(score, 10); // 最大10点
  }
}

// メイン監査ログクラス
export class AuditLogger {
  private config: AuditConfig;
  private db: Db | null = null;
  private collection: Collection<AuditLogEntry> | null = null;
  private connectionPromise: Promise<void> | null = null;
  private cache: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(customConfig?: Partial<AuditConfig>) {
    this.config = { ...DEFAULT_AUDIT_CONFIG, ...customConfig };
    this.initializeFlushScheduler();
  }

  // データベース接続の初期化
  private async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  private async establishConnection(): Promise<void> {
    try {
      const client = new MongoClient(this.config.mongoUri);
      await client.connect();
      
      this.db = client.db(this.config.databaseName);
      this.collection = this.db.collection<AuditLogEntry>(this.config.collectionName);

      // インデックスの作成
      await this.createIndexes();
      
      console.log('Audit logger connected to MongoDB');
    } catch (error) {
      console.error('Failed to connect to MongoDB for audit logging:', error);
      this.connectionPromise = null;
    }
  }

  // インデックスの作成
  private async createIndexes(): Promise<void> {
    if (!this.collection) return;

    try {
      await Promise.all([
        this.collection.createIndex({ timestamp: -1 }),
        this.collection.createIndex({ userId: 1 }),
        this.collection.createIndex({ action: 1 }),
        this.collection.createIndex({ ipAddress: 1 }),
        this.collection.createIndex({ level: 1 }),
        this.collection.createIndex({ riskScore: -1 }),
        this.collection.createIndex({ 'metadata.url': 1 }),
        // TTL インデックス（自動削除用）
        this.collection.createIndex(
          { timestamp: 1 },
          { expireAfterSeconds: this.config.retention.days * 24 * 60 * 60 }
        ),
      ]);
    } catch (error) {
      console.error('Failed to create audit log indexes:', error);
    }
  }

  // フラッシュスケジューラーの初期化
  private initializeFlushScheduler(): void {
    // 10秒ごとにバッチ書き込み
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000);

    // プロセス終了時のクリーンアップ
    process.on('SIGTERM', () => {
      this.cleanup();
    });

    process.on('SIGINT', () => {
      this.cleanup();
    });
  }

  // ログエントリの記録
  async log(
    action: AuditAction,
    options: {
      level?: AuditLevel;
      userId?: string;
      sessionId?: string;
      ipAddress: string;
      userAgent: string;
      resource?: string;
      resourceId?: string;
      details?: Record<string, any>;
      success?: boolean;
      duration?: number;
      errorMessage?: string;
      metadata?: AuditLogEntry['metadata'];
    }
  ): Promise<void> {
    // サンプリング判定
    if (this.config.sampling.enabled && Math.random() > this.config.sampling.rate) {
      return; // サンプリングでスキップ
    }

    const entry: AuditLogEntry = {
      timestamp: new Date(),
      level: options.level || AuditLevel.INFO,
      action,
      userId: options.userId,
      sessionId: options.sessionId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent.substring(0, 500), // 長さ制限
      resource: options.resource,
      resourceId: options.resourceId,
      details: options.details,
      success: options.success !== false,
      duration: options.duration,
      errorMessage: options.errorMessage,
      riskScore: RiskScorer.calculateRisk({
        action,
        success: options.success !== false,
        ...options
      }),
      metadata: options.metadata,
    };

    // キャッシュに追加
    this.cache.push(entry);

    // キャッシュサイズが大きい場合は即座にフラッシュ
    if (this.cache.length >= 100) {
      await this.flush();
    }

    // 高リスクアクションの場合は即座に記録
    if (entry.riskScore >= 7) {
      await this.flush();
      await this.alertHighRiskActivity(entry);
    }
  }

  // キャッシュのフラッシュ（バッチ書き込み）
  private async flush(): Promise<void> {
    if (this.cache.length === 0) return;

    try {
      await this.connect();
      
      if (this.collection) {
        const entries = [...this.cache];
        this.cache = [];
        
        await this.collection.insertMany(entries);
        console.log(`Flushed ${entries.length} audit log entries`);
      }
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // エラーの場合はキャッシュを復元
      // this.cache = [...failedEntries, ...this.cache];
    }
  }

  // 高リスクアクティビティのアラート
  private async alertHighRiskActivity(entry: AuditLogEntry): Promise<void> {
    console.warn('HIGH RISK ACTIVITY DETECTED:', {
      action: entry.action,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      riskScore: entry.riskScore,
      timestamp: entry.timestamp
    });

    // 実装：アラート通知システム（メール、Slack等）
    // await this.sendAlert(entry);
  }

  // 検索とクエリ
  async search(criteria: {
    userId?: string;
    action?: AuditAction;
    level?: AuditLevel;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    riskScoreMin?: number;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    await this.connect();
    
    if (!this.collection) return [];

    const filter: Record<string, any> = {};

    if (criteria.userId) filter.userId = criteria.userId;
    if (criteria.action) filter.action = criteria.action;
    if (criteria.level) filter.level = criteria.level;
    if (criteria.ipAddress) filter.ipAddress = criteria.ipAddress;
    if (criteria.riskScoreMin) filter.riskScore = { $gte: criteria.riskScoreMin };

    if (criteria.startDate || criteria.endDate) {
      filter.timestamp = {};
      if (criteria.startDate) filter.timestamp.$gte = criteria.startDate;
      if (criteria.endDate) filter.timestamp.$lte = criteria.endDate;
    }

    return await this.collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(criteria.limit || 100)
      .skip(criteria.offset || 0)
      .toArray();
  }

  // 統計情報の取得
  async getStatistics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalEvents: number;
    failedLogins: number;
    highRiskEvents: number;
    topActions: { action: string; count: number }[];
    topIPs: { ip: string; count: number }[];
    riskDistribution: { level: number; count: number }[];
  }> {
    await this.connect();
    
    if (!this.collection) {
      return {
        totalEvents: 0,
        failedLogins: 0,
        highRiskEvents: 0,
        topActions: [],
        topIPs: [],
        riskDistribution: []
      };
    }

    const periodMap = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const startDate = new Date(Date.now() - periodMap[period]);

    const [
      totalEvents,
      failedLogins,
      highRiskEvents,
      topActions,
      topIPs,
      riskDistribution
    ] = await Promise.all([
      this.collection.countDocuments({ timestamp: { $gte: startDate } }),
      this.collection.countDocuments({ 
        timestamp: { $gte: startDate },
        action: AuditAction.LOGIN_FAILED 
      }),
      this.collection.countDocuments({ 
        timestamp: { $gte: startDate },
        riskScore: { $gte: 7 }
      }),
      this.collection.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { action: '$_id', count: 1, _id: 0 } }
      ]).toArray(),
      this.collection.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { ip: '$_id', count: 1, _id: 0 } }
      ]).toArray(),
      this.collection.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$riskScore', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { level: '$_id', count: 1, _id: 0 } }
      ]).toArray()
    ]);

    return {
      totalEvents,
      failedLogins,
      highRiskEvents,
      topActions,
      topIPs,
      riskDistribution
    };
  }

  // クリーンアップ
  private async cleanup(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    await this.flush();
    console.log('Audit logger cleanup completed');
  }
}

// デフォルトインスタンス
export const defaultAuditLogger = new AuditLogger();

// 便利な関数
export const auditLog = {
  loginSuccess: (userId: string, ipAddress: string, userAgent: string) =>
    defaultAuditLogger.log(AuditAction.LOGIN_SUCCESS, {
      level: AuditLevel.INFO,
      userId,
      ipAddress,
      userAgent,
      success: true
    }),

  loginFailed: (ipAddress: string, userAgent: string, errorMessage?: string) =>
    defaultAuditLogger.log(AuditAction.LOGIN_FAILED, {
      level: AuditLevel.WARN,
      ipAddress,
      userAgent,
      success: false,
      errorMessage
    }),

  rateLimitExceeded: (ipAddress: string, userAgent: string, endpoint: string) =>
    defaultAuditLogger.log(AuditAction.RATE_LIMIT_EXCEEDED, {
      level: AuditLevel.WARN,
      ipAddress,
      userAgent,
      resource: endpoint,
      success: false
    }),

  csrfViolation: (ipAddress: string, userAgent: string, url: string) =>
    defaultAuditLogger.log(AuditAction.CSRF_VIOLATION, {
      level: AuditLevel.ERROR,
      ipAddress,
      userAgent,
      resource: url,
      success: false
    }),

  postCreated: (userId: string, postId: string, ipAddress: string, userAgent: string) =>
    defaultAuditLogger.log(AuditAction.POST_CREATE, {
      level: AuditLevel.INFO,
      userId,
      ipAddress,
      userAgent,
      resource: 'post',
      resourceId: postId,
      success: true
    })
};

export default AuditLogger;
# セキュリティ実装ガイド

## 概要

このドキュメントは、掲示板アプリケーションに実装されたセキュリティ対策について説明します。

## 実装済みセキュリティ対策

### 1. レート制限システム 🚦

#### 機能

- IPアドレスベースの制限（1分間に5回まで）
- 違反時のブロック機能（2倍の時間延長）
- プログレッシブペナルティシステム
- メモリ効率的なLRUキャッシュ使用

#### 実装ファイル

- `lib/rate-limiter.ts`
- `src/middleware.ts` (統合)

#### 使用方法

```typescript
import { defaultRateLimiter, getRealIP } from '../lib/rate-limiter';

const ip = getRealIP(request);
const result = defaultRateLimiter.checkLimit(ip);

if (!result.allowed) {
  // レート制限に引っかかった場合の処理
}
```

### 2. セキュリティヘッダー設定 🛡️

#### 機能

- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options (クリックジャッキング対策)
- X-Content-Type-Options (MIME型スニッフィング対策)
- Permissions Policy (ブラウザ機能制限)
- 環境別設定（開発/本番）

#### 実装ファイル

- `lib/security-headers.ts`
- `src/middleware.ts` (適用)

#### ページ別CSP設定

- `/admin`: 最も厳格
- `/auth`: 認証ページ用
- `/api`: APIエンドポイント用
- デフォルト: 標準設定

### 3. XSS対策（入力値サニタイゼーション） 🧹

#### 機能

- HTMLエンティティエスケープ
- 危険なスクリプトパターン除去
- タイプ別サニタイゼーション
- バッチ処理対応
- Zodライブラリとの統合

#### 実装ファイル

- `lib/input-sanitizer.ts`

#### サニタイゼーションタイプ

```typescript
enum SanitizationType {
  STRICT = 'strict', // 完全エスケープ
  BASIC_HTML = 'basic_html', // 基本HTMLタグのみ許可
  PLAIN_TEXT = 'plain_text', // プレーンテキストのみ
  EMAIL = 'email', // メールアドレス
  URL = 'url', // URL
  FILENAME = 'filename', // ファイル名
  USERNAME = 'username', // ユーザー名
  POST_CONTENT = 'post_content', // 投稿内容
}
```

### 4. CSRF対策 🔐

#### 機能

- トークンベース保護
- セッション連動トークン
- タイミング攻撃対策
- 自動トークン更新
- NextAuth.js統合

#### 実装ファイル

- `lib/csrf-protection.ts`
- `src/middleware.ts` (適用)

#### 使用方法

```typescript
import { defaultCSRFProtection } from '../lib/csrf-protection';

// トークン生成
const token = defaultCSRFProtection.generateToken(sessionId);

// トークン検証
const isValid = defaultCSRFProtection.verifyToken(token, sessionId);
```

### 5. セッション管理最適化 🔑

#### 機能

- Rolling Sessionによるセッション延長
- セキュアクッキー設定
- セッション再生成
- 同時セッション制限
- IPアドレス/User Agent変更検知

#### 実装ファイル

- `lib/csrf-protection.ts` (OptimizedSessionManager)
- `lib/auth-config.ts` (NextAuth設定)

#### セッション設定

```typescript
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60,  // 24時間
  updateAge: 60 * 60,     // 1時間ごとに更新
}
```

### 6. 監査ログシステム 📊

#### 機能

- 包括的なセキュリティイベント記録
- リスクスコア自動計算
- MongoDB統合
- バッチ処理による高性能
- アラート機能

#### 実装ファイル

- `lib/audit-logger.ts`

#### 監査アクション

```typescript
enum AuditAction {
  // 認証関連
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',

  // セキュリティ関連
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_VIOLATION = 'csrf_violation',
  XSS_ATTEMPT = 'xss_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // その他多数...
}
```

## セキュリティテスト 🧪

### テスト内容

- レート制限機能テスト
- XSS/SQLインジェクション対策テスト
- CSRF保護テスト
- セキュリティヘッダー検証テスト
- 監査ログ機能テスト
- 統合セキュリティテスト

### テストファイル

- `__tests__/security/security-integration.test.ts`

### テスト実行

```bash
npm run test -- __tests__/security/
```

## 設定とメンテナンス

### 環境変数

```env
# 必須
NEXTAUTH_SECRET=your-secure-random-string
MONGODB_URI=your-mongodb-connection-string
DB_NAME=your-database-name

# オプション
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5
AUDIT_RETENTION_DAYS=365
```

### 監査ログの確認

```typescript
import { defaultAuditLogger } from '../lib/audit-logger';

// 統計情報取得
const stats = await defaultAuditLogger.getStatistics('day');

// ログ検索
const logs = await defaultAuditLogger.search({
  level: AuditLevel.WARN,
  startDate: new Date('2024-01-01'),
  limit: 100,
});
```

### セキュリティヘッダーの検証

```typescript
import { validateSecurityHeaders } from '../lib/security-headers';

const validation = validateSecurityHeaders();
console.log(validation); // { valid: true, warnings: [], errors: [] }
```

## ベストプラクティス

### 1. 入力値検証

```typescript
// すべての外部入力はサニタイゼーション
const sanitizedData = InputSanitizer.sanitizeBatch(formData, {
  title: { type: SanitizationType.PLAIN_TEXT, maxLength: 200 },
  content: { type: SanitizationType.POST_CONTENT, maxLength: 10000 },
  email: { type: SanitizationType.EMAIL, maxLength: 254 },
});
```

### 2. API保護

```typescript
// API routeでのCSRF保護
export async function POST(request: NextRequest) {
  const csrfResult = await defaultCSRFProtection.middleware(request);
  if (csrfResult) {
    return csrfResult; // CSRF違反
  }

  // 通常の処理...
}
```

### 3. 監査ログ記録

```typescript
// 重要なアクションは必ずログに記録
await auditLog.postCreated(
  userId,
  postId,
  getRealIP(request),
  request.headers.get('user-agent') || 'unknown'
);
```

### 4. エラーハンドリング

```typescript
try {
  // セキュリティ関連の処理
} catch (error) {
  // セキュリティエラーは詳細を隠す
  console.error('Security error:', error);
  return new Response('Security error occurred', { status: 403 });
}
```

## 緊急時対応

### 1. 攻撃検知時

```typescript
// 高リスクアクティビティの場合、自動アラート
// lib/audit-logger.ts内で自動実行
if (entry.riskScore >= 7) {
  await this.alertHighRiskActivity(entry);
}
```

### 2. IPブロック

```typescript
// 緊急時のIPブロック
rateLimiter.resetIP('malicious-ip-address');
// または完全ブロックの実装
```

### 3. セッション無効化

```typescript
// ユーザーの全セッションを無効化
sessionManager.invalidateAllUserSessions(userId);
```

## モニタリング

### 重要メトリクス

- レート制限違反数
- CSRF攻撃試行数
- XSS攻撃試行数
- ログイン失敗回数
- 高リスクスコアイベント数

### アラート設定

- 連続ログイン失敗: 5回以上
- レート制限違反: 10回以上
- 疑わしい活動: 3回以上

## 更新とパッチ

### セキュリティアップデート手順

1. 依存関係の更新確認
2. セキュリティテストの実行
3. ステージング環境での検証
4. 本番環境への段階的デプロイ

### 定期的なセキュリティ監査

- 月次: ログの確認と分析
- 四半期: セキュリティテストの実行
- 年次: 包括的なセキュリティ監査

## 追加のセキュリティ対策（今後の実装予定）

### 1. 二要素認証 (2FA)

- TOTP対応
- SMS認証
- バックアップコード

### 2. より高度な脅威検知

- 機械学習による異常検知
- IP地理位置情報の活用
- デバイスフィンガープリンティング

### 3. Web Application Firewall (WAF)

- より高度な攻撃パターン検知
- 地理的アクセス制限
- DDoS保護

---

このセキュリティ実装により、掲示板アプリケーションは多層防御によって保護されています。定期的な見直しと更新を通じて、セキュリティレベルを維持・向上させていきます。

# 🚀 会員制掲示板 本番デプロイガイド

## 📖 概要

このドキュメントは、Next.js 15 + NextAuth + MongoDB で構築された会員制掲示板システムの本番環境デプロイ手順を説明します。

**技術スタック:**
- Frontend: Next.js 15 (App Router) + TypeScript
- Authentication: NextAuth v5  
- Database: MongoDB Atlas
- Hosting: Vercel
- Monitoring: Sentry
- Email: Resend

---

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Edge Network                      │
│  • CDN + SSL自動化 + DDoS保護 + Edge Functions                │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                   Next.js App (Vercel)                        │
│                                                                 │
│  • App Router (RSC)    • NextAuth v5        • API Routes      │
│  • TypeScript          • セキュリティヘッダー    • レート制限      │
│  • MUI + Emotion       • Sentry 監視        • 入力検証        │
└─────────────┬───────────────────────┬───────────────────────────┘
              │                       │
    ┌─────────▼─────────┐   ┌─────────▼─────────┐
    │  MongoDB Atlas    │   │    Resend API     │
    │                   │   │                   │
    │ • Production DB   │   │ • DKIM設定済み    │
    │ • 自動バックアップ │   │ • 配信監視        │
    │ • レプリケーション │   │ • 送信制限管理     │
    └───────────────────┘   └───────────────────┘
```

---

## 🔧 インフラ設定

### 1. MongoDB Atlas (データベース)

#### クラスター作成
```bash
# 推奨スペック: M2 (Shared) - 初期運用
# リージョン: Asia Pacific (Tokyo) - ap-northeast-1
# バックアップ: 有効
# MongoDB Version: 7.0以上
```

#### セキュリティ設定
- **Database Access**: 本番用強力パスワード
- **Network Access**: Vercel IP許可 + 特定IPアドレス
- **接続文字列例**:
  ```
  mongodb+srv://prod-user:STRONG_PASSWORD@prod-cluster.xxxxx.mongodb.net/board-prod?retryWrites=true&w=majority
  ```

### 2. Resend (メール送信)

#### ドメイン設定
```bash
# 1. ドメイン追加 (resend.com)
# 2. DNS設定
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com"
TXT @ "v=spf1 include:_spf.resend.com ~all" 
CNAME resend._domainkey "resend._domainkey.resend.com"

# 3. API Key取得
# 形式: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Sentry (エラー監視)

#### プロジェクト作成
```bash
# 1. Sentry アカウント作成
# 2. Next.js プロジェクト作成
# 3. DSN取得
# 形式: https://xxxxx@xxxxxx.ingest.sentry.io/xxxxxxx
```

---

## ⚙️ 環境設定

### Vercel 環境変数

#### 必須設定 (Production)
```bash
# 認証
NEXTAUTH_SECRET="[openssl rand -base64 48]"
NEXTAUTH_URL="https://yourdomain.com"

# データベース
MONGODB_URI="mongodb+srv://prod-user:PASSWORD@cluster.mongodb.net/board-prod"

# メール
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="noreply@yourdomain.com"

# セキュリティ
JWT_SECRET="[openssl rand -hex 64]"
ENCRYPTION_KEY="[openssl rand -hex 32]"
NODE_ENV="production"

# レート制限（本番厳格化）
RATE_LIMIT_MAX_REQUESTS="3"         # 1時間に3回
RATE_LIMIT_WINDOW_MS="3600000"      # 1時間

# アプリケーション
APP_URL="https://yourdomain.com"
APP_NAME="My Board App"
```

#### オプション設定
```bash
# エラー監視
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxxx.ingest.sentry.io/xxxxxxx"
SENTRY_ORG="your-org"
SENTRY_PROJECT="board-app"
SENTRY_AUTH_TOKEN="your-auth-token"

# 分析
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="your-analytics-id"

# ログ
LOG_LEVEL="error"  # 本番では error のみ
```

---

## 🚀 デプロイ手順

### ステップ 1: 事前準備

```bash
# 1. リポジトリクローン
git clone <repository-url>
cd my-board-app

# 2. 依存関係インストール
npm install

# 3. 設定ファイル確認
ls -la vercel.json next.config.ts env.production.template

# 4. 全テスト実行
npm run test:all

# 5. デプロイ前チェック
npm run deploy:check
```

### ステップ 2: Vercel 設定

```bash
# 1. Vercel CLI インストール
npm i -g vercel

# 2. ログイン
vercel login

# 3. プロジェクト接続
vercel link

# 4. 環境変数設定 (Vercel Dashboard)
# → https://vercel.com/[team]/[project]/settings/environment-variables
```

### ステップ 3: プレビューデプロイ

```bash
# プレビューデプロイでテスト
vercel

# デプロイURL確認
# https://my-board-app-git-main-username.vercel.app/
```

### ステップ 4: 本番デプロイ

```bash
# 本番デプロイ実行
npm run deploy:prod
# または
vercel --prod

# カスタムドメイン設定
# Vercel Dashboard → Domains → Add Domain
```

---

## ✅ デプロイ後検証

### 基本機能テスト

```bash
# ヘルスチェック
curl https://yourdomain.com/health

# レスポンス例:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": "connected",
    "auth": "operational"
  }
}
```

### 機能確認チェックリスト

- [ ] ホームページ表示
- [ ] ユーザー登録 → メール認証
- [ ] ログイン/ログアウト
- [ ] 投稿 CRUD 操作
- [ ] レスポンシブデザイン
- [ ] セキュリティヘッダー
- [ ] レート制限動作

### セキュリティ検証

```bash
# セキュリティヘッダー確認
curl -I https://yourdomain.com/

# 必須ヘッダー確認:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=63072000
# Content-Security-Policy: default-src 'self'...
```

---

## 📊 監視・運用

### 1. Uptime 監視

**UptimeRobot 設定:**
```bash
# 監視URL: https://yourdomain.com/health
# 監視間隔: 5分
# アラート: Email + Slack (optional)
# タイムアウト: 30秒
```

### 2. エラー監視 (Sentry)

**主要メトリクス:**
- エラー率 < 1%
- 応答時間 < 2秒
- Apdex スコア > 0.8

### 3. パフォーマンス監視

**目標値:**
- First Contentful Paint < 1.8s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

---

## 🚨 障害対応

### よくある問題と解決法

#### 1. メール送信失敗
```bash
# 原因チェック
- Resend API制限確認
- DKIM設定状態
- DNS伝播確認

# 解決方法
- API制限を確認・増量申請
- DNS設定再確認
- 送信ログ確認
```

#### 2. MongoDB接続エラー
```bash
# 原因チェック  
- IP許可リスト
- 接続文字列形式
- Network Access設定

# 解決方法
- Vercel IP範囲を許可リストに追加
- 接続文字列再取得
- MongoDB Atlas ステータス確認
```

#### 3. 認証エラー
```bash
# 原因チェック
- NEXTAUTH_SECRET設定
- NEXTAUTH_URL設定
- セッション設定

# 解決方法
- 環境変数再設定
- デプロイ再実行
- ブラウザキャッシュクリア
```

### 緊急時ロールバック

```bash
# 1. Vercel Deployment履歴確認
vercel ls

# 2. 前のデプロイメントにロールバック  
vercel alias set <previous-deployment-url> <production-domain>

# 3. データベース復旧（必要に応じて）
# MongoDB Atlas → Backups → Point-in-time Recovery
```

---

## 🔄 継続的運用

### 定期メンテナンス

#### 週次
- [ ] エラー率確認 (Sentry)
- [ ] パフォーマンス確認 (Vercel Analytics)
- [ ] セキュリティアラート確認

#### 月次  
- [ ] 依存関係アップデート
- [ ] セキュリティパッチ適用
- [ ] バックアップテスト実行
- [ ] ドキュメント更新

### スケーリング計画

#### ユーザー数増加対応
- MongoDB Atlas: M2 → M10 → M30
- Vercel: Pro Plan → Team Plan
- Resend: 制限増量申請

#### 機能拡張準備
- CDN最適化 (画像配信)
- 検索機能 (Elasticsearch)
- リアルタイム通知 (WebSocket)

---

## 📚 参考資料

### ドキュメント
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)
- [NextAuth.js](https://next-auth.js.org/)

### 設定ファイル
- `vercel.json` - Vercel設定
- `next.config.ts` - Next.js設定 (セキュリティヘッダー含む)
- `env.production.template` - 環境変数テンプレート
- `sentry.client.config.ts` / `sentry.server.config.ts` - Sentry設定
- `DEPLOY_CHECKLIST.md` - デプロイチェックリスト

### コマンドリファレンス
```bash
# デプロイ関連
npm run deploy:check     # デプロイ前チェック
npm run build:prod      # 本番ビルド (lint + test + build)
npm run deploy:prod     # 本番デプロイ
vercel --prod          # 本番デプロイ (直接)

# 確認用
vercel ls              # デプロイ履歴
vercel logs <url>      # ログ確認
vercel inspect <url>   # デプロイ詳細
```

---

**🎉 デプロイ完了！**

本番環境での会員制掲示板システムが正常に稼働することを確認し、継続的な監視・運用を開始してください。

質問や問題がありましたら、各サービスのドキュメントを参照するか、サポートチームにお問い合わせください。
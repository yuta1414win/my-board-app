# Vercel本番環境デプロイメントガイド

## ✅ 現在のステータス

**ビルド状況**: ✅ 成功 - 全ての TypeScript およびコンパイルエラーが解決済み
**デプロイ準備**: ✅ 完了 - Vercel設定ファイル(`vercel.json`)が設定済み

## 🚀 デプロイ手順

### 1. Vercel にログイン
```bash
npx vercel login
```
- GitHub, Google, GitLab, Bitbucket, またはEメールでログインしてください
- 推奨: GitHubアカウントでのログイン（リポジトリ連携のため）

### 2. プロジェクトのリンク
```bash
npx vercel link
```
- 新規プロジェクトの場合は作成を選択
- 既存のプロジェクトの場合はリンクを選択

### 3. 環境変数の設定
Vercel Dashboard (https://vercel.com/dashboard) で以下の環境変数を設定:

#### 必須環境変数:
```bash
# Database
MONGODB_URI=<MongoDBの接続URL>
DB_NAME=<データベース名>

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<32文字以上のランダム文字列>

# Email (Gmail SMTP)
GMAIL_USER=<Gmail アドレス>
GMAIL_APP_PASSWORD=<Gmailアプリパスワード>

# OAuth Providers (必要に応じて)
GOOGLE_CLIENT_ID=<Google OAuth クライアントID>
GOOGLE_CLIENT_SECRET=<Google OAuth クライアントシークレット>
GITHUB_CLIENT_ID=<GitHub OAuth クライアントID>
GITHUB_CLIENT_SECRET=<GitHub OAuth クライアントシークレット>

# Sentry (エラー監視)
SENTRY_DSN=<Sentry DSN>
NEXT_PUBLIC_SENTRY_DSN=<Sentry Public DSN>
```

### 4. 本番環境デプロイ
```bash
npx vercel --prod --yes
```

## 🔒 セキュリティ設定

### セキュリティヘッダー
`vercel.json`にて以下のセキュリティヘッダーが設定済み:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `Referrer-Policy`
- `X-XSS-Protection`

### 機能ポリシー
カメラ、マイク、位置情報へのアクセスを無効化済み

## 📋 デプロイ後チェックリスト

### 1. ビルド確認
- ✅ Vercel Dashboard でビルドログを確認
- ✅ エラーがないことを確認

### 2. HTTPS・SSL確認
- ✅ https://your-domain.vercel.app でアクセス可能
- ✅ SSL証明書が有効
- ✅ セキュリティヘッダーが設定されている

### 3. 機能テスト
- ✅ ユーザー登録・ログイン機能
- ✅ メール認証システム
- ✅ 掲示板機能（投稿・表示・編集）
- ✅ プロフィール管理
- ✅ 認証保護されたページアクセス

### 4. Sentry監視
- ✅ エラー監視が動作している
- ✅ パフォーマンス監視が有効

### 5. パフォーマンス
- ✅ Lighthouse スコア > 70
- ✅ Core Web Vitals が良好

## 🌐 カスタムドメイン設定（オプション）

### 1. ドメインの追加
Vercel Dashboard → Settings → Domains で独自ドメインを追加

### 2. DNS設定
ドメインレジストラーでCNAMEレコードを設定:
```
CNAME: your-subdomain → cname.vercel-dns.com
```

### 3. 環境変数更新
`NEXTAUTH_URL`を新しいドメインに更新

## 📊 監視とメンテナンス

### Vercel Analytics
- ✅ 自動的に有効化
- ✅ パフォーマンス指標を監視

### Sentry Integration
- ✅ エラー追跡とパフォーマンス監視
- ✅ アラート設定

### 定期メンテナンス
- データベースバックアップ
- セキュリティアップデート
- 依存関係の更新

## 🎯 検証基準

以下の条件を満たせば本番環境デプロイが完了:

1. **Vercelビルド成功** ✅
2. **カスタムドメインアクセス** (設定後)
3. **HTTPS保護** (Vercel自動)
4. **全機能動作** (要テスト)
5. **Sentryエラー監視動作** (要設定・テスト)
6. **Lighthouseスコア > 70** (要測定)

## 🚨 トラブルシューティング

### ビルドエラー
- 環境変数が正しく設定されているか確認
- Node.js バージョンが18.17.0以上であることを確認

### 認証エラー
- `NEXTAUTH_SECRET`が設定されているか確認
- `NEXTAUTH_URL`が本番URLと一致しているか確認

### データベース接続エラー
- `MONGODB_URI`が有効か確認
- MongoDB Atlasの IP ホワイトリストにVercelが追加されているか確認 (0.0.0.0/0)

### メール送信エラー
- Gmailアプリパスワードが正しく設定されているか確認
- 2段階認証がGmailアカウントで有効になっているか確認

---

**準備完了**: ビルドが成功したため、上記手順でデプロイを進めてください。
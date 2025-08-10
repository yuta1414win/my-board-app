# 会員制掲示板システム

Next.js 15、NextAuth、MongoDB、MUIを使用した会員制の掲示板システムです。

## 主な機能

- **ユーザー認証**
  - メールアドレスとパスワードによる新規登録
  - メール認証（確認メール送信）
  - ログイン・ログアウト機能
  - パスワードリセット機能（実装準備済み）

- **掲示板機能**
  - 会員のみ投稿・閲覧可能
  - 投稿の作成・編集・削除（自分の投稿のみ）
  - 投稿者名と投稿日時の表示
  - ページネーション機能

- **セキュリティ**
  - bcryptによるパスワードハッシュ化
  - JWTトークンによるメール認証
  - セッション管理
  - APIルートの認証チェック

- **UI/UX**
  - MUIによるモダンなデザイン
  - レスポンシブ対応
  - ダークモード対応
  - ローディング表示
  - エラーハンドリング

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router)
- **認証**: NextAuth v5
- **データベース**: MongoDB + Mongoose
- **UI フレームワーク**: Material-UI (MUI)
- **スタイリング**: Emotion
- **メール送信**: Nodemailer
- **言語**: TypeScript

## 必要なパッケージ

```bash
# メイン依存関係
npm install next-auth@beta @auth/mongodb-adapter bcryptjs jsonwebtoken crypto-js date-fns

# 型定義
npm install @types/bcryptjs @types/jsonwebtoken @types/crypto-js --save-dev
```

## セットアップ

### 1. 環境変数の設定

`.env.local` ファイルを作成し、以下の変数を設定してください：

```bash
# ===========================================
# NextAuth.js認証システム環境変数設定
# ===========================================

# NextAuth.js設定（必須）
NEXTAUTH_SECRET=your-nextauth-secret-key-minimum-32-characters
NEXTAUTH_URL=http://localhost:3001

# MongoDB接続設定（必須）
MONGODB_URI=mongodb://localhost:27017/my-board-app
# または MongoDB Atlas の場合:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/my-board-app

# メール送信設定（必須 - Resend推奨）
RESEND_API_KEY=your-resend-api-key-here
EMAIL_FROM=noreply@yourdomain.com

# または他のメールプロバイダー（NodeMailer使用）
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# アプリケーション設定
APP_URL=http://localhost:3001
APP_NAME=My Board App
NODE_ENV=development

# セキュリティ設定（オプション）
JWT_SECRET=your-jwt-secret-key-32-characters-long
ENCRYPTION_KEY=your-encryption-key-32-characters-long

# セッション設定（オプション）
SESSION_MAX_AGE=2592000  # 30日間（秒）

# レート制限設定（オプション）
RATE_LIMIT_MAX_REQUESTS=5      # 1時間に5回まで
RATE_LIMIT_WINDOW_MS=3600000   # 1時間

# ログ設定（オプション）
LOG_LEVEL=info  # development時は debug
```

#### 重要な設定値の説明

**必須設定:**

- `NEXTAUTH_SECRET`: 32文字以上のランダムな文字列（本番では必須）
- `MONGODB_URI`: MongoDBの接続URL
- `RESEND_API_KEY`: メール送信用のResend APIキー
- `EMAIL_FROM`: 送信者メールアドレス

**セキュリティ強化設定:**

```bash
# 本番環境用の強力なシークレット生成例
openssl rand -base64 32  # NEXTAUTH_SECRET用
openssl rand -hex 32     # JWT_SECRET用
```

**メール設定オプション:**

1. **Resend（推奨）**:

   ```bash
   RESEND_API_KEY=re_xxxxx
   EMAIL_FROM=noreply@yourdomain.com
   ```

2. **Gmail SMTP**:

   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password  # Googleアプリパスワード
   ```

3. **その他のSMTP**:
   ```bash
   SMTP_HOST=your-smtp-server.com
   SMTP_PORT=587  # または 465
   SMTP_USER=your-email@domain.com
   SMTP_PASSWORD=your-password
   ```

### 2. MongoDBの起動

ローカルでMongoDBを起動するか、MongoDB Atlasなどのクラウドサービスを使用してください。

### 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3001](http://localhost:3001) でアプリケーションにアクセスできます。

## ディレクトリ構成

```
├── app/                    # App Router ページ
│   ├── api/               # API ルート
│   ├── auth/              # 認証関連ページ
│   ├── board/             # 掲示板ページ
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ
├── components/            # React コンポーネント
│   ├── auth/              # 認証関連コンポーネント
│   ├── board/             # 掲示板関連コンポーネント
│   ├── navigation/        # ナビゲーションコンポーネント
│   └── providers/         # プロバイダーコンポーネント
├── lib/                   # ユーティリティ関数
├── models/                # Mongoose モデル
├── types/                 # TypeScript 型定義
├── auth.config.ts         # NextAuth 設定
├── auth.ts                # NextAuth 実装
├── middleware.ts          # Next.js ミドルウェア
└── env.example            # 環境変数の例
```

## 使用方法

1. **新規登録**: `/auth/register` で新規アカウントを作成
2. **メール認証**: 登録時に送信される確認メールのリンクをクリック
3. **ログイン**: `/auth/signin` でログイン
4. **掲示板**: `/board` で投稿の閲覧・作成・編集・削除

## セキュリティ機能

- パスワードのbcryptハッシュ化
- セッションベースの認証
- CSRFプロテクション（NextAuth内蔵）
- APIルートの認証チェック
- メール認証による本人確認

## 開発時の注意点

- `.env.local` ファイルは絶対にコミットしない
- 本番環境では強力なシークレットキーを設定する
- メール送信にはSMTPサーバーの設定が必要
- MongoDBの接続設定を確認する

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

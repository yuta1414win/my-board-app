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

```bash
cp env.example .env.local
```

`.env.local` ファイルを編集し、以下の変数を設定してください：

```bash
# データベース
MONGODB_URI=mongodb://localhost:27017/my-board-app

# NextAuth認証設定
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production
AUTH_TRUST_HOST=true

# JWT設定（メール確認トークン用）
JWT_SECRET=your-jwt-secret-here-change-this-in-production

# メール送信設定（Nodemailer）
EMAIL_FROM=noreply@example.com
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
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

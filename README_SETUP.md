# オープン掲示板システム セットアップガイド

## 必要な環境
- Node.js 18以上
- MongoDB（ローカルまたはMongoDB Atlas）

## セットアップ手順

### 1. MongoDBの準備

#### ローカルでMongoDBを使用する場合：
```bash
# macOSの場合
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### MongoDB Atlasを使用する場合：
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)でアカウントを作成
2. 新しいクラスターを作成
3. データベースユーザーを作成
4. ネットワークアクセスで自分のIPアドレスを許可
5. 接続文字列を取得

### 2. 環境変数の設定

`.env.local`ファイルを編集して、MongoDB接続文字列を設定：

```bash
# ローカルMongoDB
MONGODB_URI=mongodb://localhost:27017/board-app

# MongoDB Atlas（例）
MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/board-app?retryWrites=true&w=majority
```

### 3. アプリケーションの起動

```bash
# 開発サーバーの起動
npm run dev
```

### 4. アクセス

ブラウザで http://localhost:3000 にアクセス

## 機能

- 誰でも投稿の作成・編集・削除が可能
- タイトル（50文字以内）と本文（200文字以内）の投稿
- 投稿日時の自動記録
- 最新の投稿が上に表示される時系列表示
- リアルタイムでの文字数カウント
- レスポンシブデザイン（モバイル・タブレット・デスクトップ対応）

## 技術スタック

- Next.js (App Router)
- Material-UI (MUI)
- MongoDB + Mongoose
- React Hooks
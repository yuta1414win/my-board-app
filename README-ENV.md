# 環境変数設定ガイド

## 必須環境変数

Vercelでデプロイする際は、以下の環境変数を設定してください：

### データベース接続

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```

### 認証設定

```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=ランダムな文字列（openssl rand -base64 32で生成）
JWT_SECRET=ランダムな文字列（openssl rand -base64 32で生成）
```

### メール送信設定（Gmail使用例）

```
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=Gmailのアプリパスワード（2段階認証設定後に生成）
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=My Board App
```

### アプリケーションURL

```
APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Vercelでの設定方法

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings → Environment Variables
4. 各環境変数を追加
5. Production、Preview、Developmentの環境を選択
6. Save

## Gmailアプリパスワードの取得方法

1. Googleアカウントの設定にアクセス
2. セキュリティ → 2段階認証を有効化
3. アプリパスワードを生成
4. 生成されたパスワードをEMAIL_SERVER_PASSWORDに設定

## トラブルシューティング

### 500エラーが出る場合

- MONGODB_URIが正しく設定されているか確認
- MongoDB Atlasのネットワークアクセスで0.0.0.0/0を許可しているか確認
- Vercelのログで環境変数チェックの結果を確認

### メールが送信されない場合

- Gmailの「安全性の低いアプリのアクセス」または「アプリパスワード」が設定されているか確認
- EMAIL*SERVER*\*の設定が正しいか確認

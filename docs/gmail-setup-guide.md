# Gmail設定ガイド

## 📧 概要

My Board AppでGmailを使用してメール送信を行うための設定手順です。

## 🔐 前提条件

- Gmailアカウント（@gmail.com または Google Workspace）
- Googleアカウントの2段階認証設定（必須）

## 📋 設定手順

### 1. 2段階認証の有効化

1. [Googleアカウント管理](https://myaccount.google.com/)にアクセス
2. 「セキュリティ」をクリック
3. 「2段階認証プロセス」を見つけて「使ってみる」をクリック
4. 電話番号またはGoogle Authenticatorアプリで設定を完了

**⚠️ 重要**: アプリパスワードを生成するには2段階認証が必須です。

### 2. アプリパスワードの生成

1. [Googleアカウント管理](https://myaccount.google.com/) → 「セキュリティ」
2. 「2段階認証プロセス」下の「アプリ パスワード」をクリック
3. 「アプリを選択」→「その他（カスタム名）」
4. アプリ名を入力: `My Board App`（または任意の名前）
5. 「生成」をクリック
6. **16文字のパスワード**をコピーして保存

**例**: `abcd efgh ijkl mnop`（スペースは除去して使用）

### 3. 環境変数の設定

`.env.local` ファイルに以下を設定：

```bash
# Gmail SMTP設定
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=abcdefghijklmnop
EMAIL_FROM_NAME=My Board App

# JWT設定
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
NEXTAUTH_URL=http://localhost:3001
```

**設定値の説明**:

- `EMAIL_SERVER_USER`: あなたのGmailアドレス
- `EMAIL_SERVER_PASSWORD`: 生成した16文字のアプリパスワード（スペース除去）
- `JWT_SECRET`: 32文字以上のランダム文字列

### 4. JWT_SECRETの生成

以下のコマンドで安全なJWTシークレットを生成：

```bash
# macOS/Linux
openssl rand -base64 32

# または、Node.jsで生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🧪 テスト実行

設定完了後、以下でテスト：

```bash
# 統合テスト実行
./scripts/run-all-email-tests.sh your-email@gmail.com

# または個別テスト
node scripts/test-email.js your-email@gmail.com
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

**1. 「アプリパスワード」が表示されない**

- 2段階認証が有効化されていない可能性
- Googleアカウント管理 → セキュリティで2段階認証を確認

**2. 認証エラー (535 Authentication failed)**

- アプリパスワードが正しく設定されていない
- 16文字のパスワードからスペースを除去してください
- 通常のGmailパスワードではなく、アプリパスワードを使用

**3. 接続エラー (ECONNREFUSED)**

- ネットワーク接続を確認
- ファイアウォール設定を確認
- ポート587が開放されているか確認

**4. SSL/TLS エラー**

- `EMAIL_SERVER_PORT=587` を使用（STARTTLSを推奨）
- ポート465（SSL）の場合は `EMAIL_SERVER_PORT=465` に変更

## 🔒 セキュリティのベストプラクティス

1. **アプリパスワードの管理**
   - 不要になったアプリパスワードは削除
   - 定期的にパスワードをローテーション

2. **環境変数の保護**
   - `.env.local` をGitにコミットしない
   - プロダクションでは環境変数管理サービスを使用

3. **権限の最小化**
   - メール送信専用のGoogleアカウントを作成することを推奨

## 📞 サポート

問題が解決しない場合は、以下の情報を含めてお問い合わせください：

1. エラーメッセージの全文
2. 使用しているGmailアカウントの種類（@gmail.com / Google Workspace）
3. 2段階認証の設定状況
4. テスト実行時のログ出力

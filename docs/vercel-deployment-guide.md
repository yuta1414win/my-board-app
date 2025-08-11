# Vercelデプロイガイド

## デプロイ手順

### 1. Vercel CLIでログイン（初回のみ）
```bash
vercel login
```

### 2. デプロイコマンド実行
```bash
vercel
```

初回は以下の質問に答えます：
- Set up and deploy? → **Y**
- Which scope? → 個人アカウントを選択
- Link to existing project? → **N**（新規プロジェクト）
- Project name? → **my-board-app**（またはお好みの名前）
- Directory? → **.**（現在のディレクトリ）
- Override settings? → **N**

### 3. 環境変数の設定

Vercelダッシュボード（https://vercel.com/dashboard）にアクセスして、
プロジェクトの Settings → Environment Variables から以下を設定：

#### 必須の環境変数

```bash
# NextAuth認証設定
NEXTAUTH_URL=https://nouchinho.com
NEXTAUTH_SECRET=（32文字以上のランダム文字列）

# MongoDB接続（MongoDB Atlas推奨）
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/my-board-app?retryWrites=true&w=majority

# メール送信設定（Gmailの例）
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=（Googleアプリパスワード）
EMAIL_FROM=noreply@nouchinho.com

# セキュリティ設定
JWT_SECRET=（32文字のランダム文字列）
CSRF_SECRET=（32文字のランダム文字列）
```

#### 環境変数生成コマンド
```bash
# ランダム文字列の生成
openssl rand -base64 32
```

### 4. カスタムドメインの設定

1. Vercelダッシュボードでプロジェクトを選択
2. Settings → Domains
3. "Add Domain" をクリック
4. `nouchinho.com` を入力
5. DNS設定の指示に従う：

#### さくらインターネットのDNS設定

さくらのコントロールパネルで以下を設定：

**Aレコード**
```
nouchinho.com A 76.76.21.21
```

**CNAMEレコード**
```
www.nouchinho.com CNAME cname.vercel-dns.com
```

または、Vercelが提供する具体的なIPアドレスとCNAMEを使用

### 5. 本番環境へのデプロイ

```bash
vercel --prod
```

## デプロイ後の確認

### 1. デプロイURLの確認
デプロイ完了後、以下のようなURLが表示されます：
- Preview: `https://my-board-app-xxxxx.vercel.app`
- Production: `https://nouchinho.com`（ドメイン設定後）

### 2. 動作確認チェックリスト

- [ ] トップページが表示される
- [ ] 新規登録ができる
- [ ] メール認証が機能する
- [ ] ログインができる
- [ ] 掲示板の投稿ができる
- [ ] HTTPSが有効になっている

## トラブルシューティング

### ビルドエラーが発生する場合

1. package.jsonのビルドコマンドを確認
2. Node.jsバージョンを指定（package.jsonに追加）：
```json
{
  "engines": {
    "node": "18.x || 20.x"
  }
}
```

### 環境変数が反映されない場合

1. Vercelダッシュボードで環境変数を設定後、再デプロイ
2. 環境変数名が正しいか確認（大文字小文字に注意）

### ドメインが接続できない場合

1. DNS伝播を待つ（最大48時間）
2. さくらのDNS設定を再確認
3. VercelのDomains設定でステータスを確認

## 継続的デプロイの設定

GitHubリポジトリと連携すると、mainブランチへのプッシュで自動デプロイされます：

1. Vercelダッシュボード → Settings → Git
2. GitHubアカウントを接続
3. リポジトリを選択
4. mainブランチを本番環境として設定

## セキュリティ設定

### 1. 環境変数の保護
- Production環境の変数は暗号化して保存
- Preview環境では開発用の値を使用

### 2. アクセス制限
- Preview環境にパスワード保護を設定可能
- Settings → Deployment Protection

### 3. ログとモニタリング
- Functions → Logsでエラーログを確認
- Analytics → Web Vitalsでパフォーマンス監視
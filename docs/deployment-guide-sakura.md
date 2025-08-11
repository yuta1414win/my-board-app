# さくらレンタルサーバーへのデプロイガイド

## 前提条件

- ドメイン: `nouchinho.com` （設定済み、403エラー状態）
- サーバー: さくらのレンタルサーバー
- 現在の状態: ドメインは有効だが、コンテンツ未配置

## デプロイ方法の選択

### 方法1: 静的サイトとしてデプロイ（推奨）

さくらのレンタルサーバーはNode.jsの直接実行をサポートしていない場合が多いため、静的サイトとしてエクスポートする方法を推奨します。

#### 制限事項

- APIルート（`/api/*`）は使用不可
- サーバーサイドレンダリング（SSR）は使用不可
- 認証機能は外部サービス（Supabase、Firebase Auth等）への移行が必要

### 方法2: Node.js対応プラン（VPS等）への移行

完全な機能を維持したい場合は、さくらのVPSなどNode.js実行可能なプランへの移行を検討してください。

## 静的サイトデプロイ手順

### 1. 環境変数の準備

```bash
# .env.local をコピーして本番用設定を作成
cp .env.local env-production-template.txt

# 以下の値を本番環境用に更新:
# - NEXTAUTH_URL=https://nouchinho.com
# - MONGODB_URI=本番用MongoDBのURI（MongoDB Atlas推奨）
# - EMAIL設定（さくらのメールサーバー設定）
```

### 2. 静的エクスポート用スクリプトの実行

```bash
# スクリプトに実行権限を付与
chmod +x deploy-static.sh

# 静的サイトをエクスポート
./deploy-static.sh
```

### 3. さくらコントロールパネルでの設定

1. **ドメイン設定**
   - コントロールパネルにログイン
   - ドメイン/SSL → ドメイン/SSL設定
   - 「ドメイン新規追加」をクリック
   - `nouchinho.com` を追加
   - `www.nouchinho.com` も追加
   - 公開フォルダを指定（例: `/home/username/www/nouchinho/`）

2. **SSL証明書の設定**
   - 同じ画面で「無料SSL設定」をクリック
   - Let's Encryptを選択
   - 自動更新をONに設定

### 4. ファイルのアップロード

#### FTPを使用する場合:

```bash
# FTP接続情報（さくらコントロールパネルで確認）
# ホスト: username.sakura.ne.jp
# ユーザー名: username
# パスワード: さくらのパスワード

# FileZillaなどのFTPクライアントを使用して
# deploy-static-sakura.tar.gz をアップロード
```

#### SSHを使用する場合:

```bash
# SSHでサーバーに接続
ssh username@username.sakura.ne.jp

# 公開フォルダに移動
cd ~/www/nouchinho/

# ローカルからファイルを転送（別ターミナルで）
scp deploy-static-sakura.tar.gz username@username.sakura.ne.jp:~/www/nouchinho/

# サーバー側で解凍
tar -xzf deploy-static-sakura.tar.gz

# 不要なファイルを削除
rm deploy-static-sakura.tar.gz
```

### 5. 動作確認

1. https://nouchinho.com にアクセス
2. サイトが正しく表示されることを確認
3. HTTPSリダイレクトが機能することを確認
4. www → 無印のリダイレクトが機能することを確認

## APIルートの代替実装（PHP）

静的エクスポートではAPIルートが使えないため、必要に応じてPHPで実装します。

### 例: お問い合わせフォーム

```php
// api/contact.php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://nouchinho.com');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // メール送信処理
    $to = 'admin@nouchinho.com';
    $subject = 'お問い合わせ';
    $message = $data['message'];
    $headers = 'From: ' . $data['email'];

    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'メール送信に失敗しました']);
    }
}
?>
```

## メール設定（さくらのメールサーバー）

### DNS設定（さくらコントロールパネル）

1. **MXレコード**

   ```
   MX 10 mail.nouchinho.com.
   ```

2. **Aレコード（メールサーバー用）**

   ```
   mail.nouchinho.com. A 133.167.8.159
   ```

3. **SPFレコード**

   ```
   TXT "v=spf1 include:spf.sakura.ne.jp ~all"
   ```

4. **DKIM設定**
   - さくらのメール設定でDKIMを有効化
   - 生成された公開鍵をDNSに登録

5. **DMARCレコード**
   ```
   _dmarc.nouchinho.com. TXT "v=DMARC1; p=none; rua=mailto:postmaster@nouchinho.com"
   ```

## トラブルシューティング

### 403 Forbiddenエラーが続く場合

1. **ファイルパーミッションを確認**

   ```bash
   chmod 755 ~/www/nouchinho/
   chmod 644 ~/www/nouchinho/index.html
   chmod 644 ~/www/nouchinho/.htaccess
   ```

2. **index.htmlが存在することを確認**

   ```bash
   ls -la ~/www/nouchinho/index.html
   ```

3. **Basic認証やIP制限を確認**
   - コントロールパネルでアクセス制限設定を確認

### SSLが有効にならない場合

1. DNSが正しく設定されているか確認
2. Let's Encryptの認証用ファイルが配置できているか確認
3. 24時間待って再度試す（DNS伝播の待機）

## 本番環境への完全移行を検討する場合

完全な機能（認証、API、SSR）を維持したい場合の選択肢:

1. **さくらのVPS**
   - Node.js実行可能
   - 月額600円程度から
   - 完全な制御が可能

2. **Vercel（推奨）**
   - Next.js公式のホスティング
   - 無料プランあり
   - 自動デプロイ対応

3. **Railway/Render**
   - Node.js対応
   - MongoDB接続可能
   - 月額5ドル程度から

## チェックリスト

- [ ] さくらコントロールパネルでドメイン設定完了
- [ ] 静的ファイルのエクスポート完了
- [ ] ファイルのアップロード完了
- [ ] HTTPSアクセス確認
- [ ] www → 無印のリダイレクト確認
- [ ] メール送信テスト（必要な場合）
- [ ] 404ページの動作確認

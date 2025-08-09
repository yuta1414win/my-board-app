# さくらインターネット メール設定ガイド（本プロジェクト運用版）

本プロジェクトは、さくらのレンタルサーバーの初期ドメインで SMTP 送信を行います。必要に応じて Resend を使った運用も可能ですが、まずは SMTP（587/STARTTLS）の手順を中心に記載します。

- 初期ドメイン（重要）: `kyounouhi.sakura.ne.jp`  ※「c」は入りません
- 利用中メールアドレス: `noreply@kyounouhi.sakura.ne.jp` / `support@kyounouhi.sakura.ne.jp` / `admin@kyounouhi.sakura.ne.jp`

## 方法1: さくらSMTPサーバー（本運用）

### 1. メールアドレス作成

コントロールパネル > メール > メール一覧 から以下を作成:

- `noreply@kyounouhi.sakura.ne.jp`（送信元）
- `support@kyounouhi.sakura.ne.jp`（返信先・窓口）
- `admin@kyounouhi.sakura.ne.jp`（管理者通知）

作成後、「受信する」設定にしてください（転送専用だと受信箱に現れません）。

### 2. メールアドレス作成

さくらのコントロールパネルで以下を作成：

- `noreply@your-domain.com` (パスワード設定不要、受信のみ)
- `admin@your-domain.com` (管理者用、パスワード設定必要)

### 3. Resend設定

1. https://resend.com でアカウント作成
2. ドメインを追加
3. DNSレコードを設定（上記参照）
4. APIキーを取得

## 方法2: さくらのSMTPサーバー直接利用

### 1. メールアドレス作成とパスワード設定

```
noreply@your-domain.com
- パスワード: 強力なパスワードを設定
- 用途: 送信専用

admin@your-domain.com
- パスワード: 強力なパスワードを設定
- 用途: 管理者通知受信
```

### 2. Nodemailerでの実装（既に実装済み）

```bash
npm install nodemailer @react-email/components @react-email/render
```

### 3. SMTP設定情報

```
SMTPホスト: kyounouhi.sakura.ne.jp
ポート: 587
暗号化: STARTTLS
認証方式: PLAIN または LOGIN
```

## 環境変数設定（本運用）

`.env.local` 例:

```env
SMTP_HOST="kyounouhi.sakura.ne.jp"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="noreply@kyounouhi.sakura.ne.jp"
SMTP_PASSWORD="＜各自のローカルで入力＞"

EMAIL_FROM="noreply@kyounouhi.sakura.ne.jp"
EMAIL_REPLY_TO="support@kyounouhi.sakura.ne.jp"
ADMIN_EMAIL="admin@kyounouhi.sakura.ne.jp"

# アプリ
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="会員制掲示板"
```

### 4. 動作確認（API）

接続確認:

```bash
curl -s http://localhost:3000/api/email-test | jq
```

テスト送信:

```bash
echo '{"to":"admin@kyounouhi.sakura.ne.jp","subject":"SMTP送信テスト","message":"これはテストです"}' \
  | curl -s -X POST http://localhost:3000/api/email-test \
      -H 'Content-Type: application/json' --data-binary @- | jq
```

## 方法2: Resend を使う（任意・将来の拡張）

### 1. Resend設定

```env
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="noreply@kyounouhi.sakura.ne.jp" # または Resend認証済みの独自ドメイン
EMAIL_REPLY_TO="support@kyounouhi.sakura.ne.jp"
ADMIN_EMAIL="admin@kyounouhi.sakura.ne.jp"
```

## セキュリティ注意事項

1. **パスワード管理**
   - 環境変数は絶対にGitにコミットしない
   - `.env.local`は`.gitignore`に含める
   - 本番環境では環境変数管理サービス利用推奨

2. **SPF/DKIM/DMARC設定**
   - SMTP（初期ドメイン）利用時は管理しやすいが、独自ドメイン運用に移行する場合はDNSにSPF/DMARCを必ず設定
   - 例（独自ドメインのSPF）: `v=spf1 include:_spf.sakura.ne.jp ~all`

3. **レート制限**
   - さくらのSMTP: 1時間あたり100通程度が目安
   - Resend: 無料プランで月3,000通まで

## トラブルシューティング

### メールが届かない場合

1. **ドメイン綴り確認**

   - `kyounouhi.sakura.ne.jp`（cなし）であることに注意

2. **SPFレコード確認（独自ドメイン運用時）**

```bash
dig TXT your-domain.com
```

3. **ポート確認**

- 587番ポートがブロックされていないか確認
- 必要に応じて465番(SSL)を試す

4. **認証情報確認**

- メールアドレスとパスワードが正しいか
- ユーザー名は完全なメールアドレス形式

### エラー対処

**認証エラー**

```
Error: Invalid login credentials
```

→ パスワード再設定、ユーザー名確認

**接続エラー**

```
Error: Connection timeout
```

→ ファイアウォール設定、ポート番号確認

## 推奨事項

1. **Resend利用を推奨**
   - 実装が簡単
   - 配信状況の追跡が可能
   - エラー処理が充実

2. **テスト環境**
   - 開発時は[Ethereal Email](https://ethereal.email/)利用
   - 本番移行前に必ずテスト送信

3. **監視設定**
   - バウンスメールの監視
   - 送信エラーのログ記録

## 参考ドキュメント

- `docs/DKIM.md`: DKIM 設計と詳細手順（さくら向け）
- `docs/dkim-setup-summary.md`: 今回実施した DKIM 実装のサマリ（手順/検証/結果）

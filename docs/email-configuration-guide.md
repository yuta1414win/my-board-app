# メール設定ガイド（さくらインターネット運用）

このプロジェクトのメール送信は、さくらのレンタルサーバー上の初期ドメインを使用して運用します。

- 初期ドメイン（重要）: `kyounouhi.sakura.ne.jp`  ※「c」は入りません
- 利用中メールアドレス:
  - `noreply@kyounouhi.sakura.ne.jp`（送信元）
  - `support@kyounouhi.sakura.ne.jp`（返信先・サポート窓口）
  - `admin@kyounouhi.sakura.ne.jp`（管理者通知）

メール送信は Nodemailer（SMTP）で行い、ポートは 587（STARTTLS）を使用します。

## 環境変数テンプレート

`.env.local` ファイルを作成して、以下の内容を設定してください（値は例。実値は各自のローカルで入力）：

```env
# ===================================
# メール設定（さくらSMTP 587/STARTTLS）
# ===================================
SMTP_HOST="kyounouhi.sakura.ne.jp"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="noreply@kyounouhi.sakura.ne.jp"
SMTP_PASSWORD="＜各自のローカルで入力。Git管理に含めない＞"

# 送信元/返信先/管理者通知
EMAIL_FROM="noreply@kyounouhi.sakura.ne.jp"
EMAIL_REPLY_TO="support@kyounouhi.sakura.ne.jp"
ADMIN_EMAIL="admin@kyounouhi.sakura.ne.jp"

# ===================================
# アプリケーション設定（例）
# ===================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="会員制掲示板"
```

## 重要な注意事項

1. **パスワード管理**
   - `.env.local` は絶対にGitにコミットしない（`.gitignore` 済）
   - パスワードはローカルのみで保持し、ドキュメント・Issue・PRに記載しない

2. **セキュリティ**
   - 必要に応じて 465/SSL（`SMTP_SECURE=true`）も選択可
   - 送信ドメインに SPF/DMARC を設定すると到達率が向上

3. **メール送信制限**
   - さくらSMTP: 1時間あたり約100通が目安

## 運用でのチェックポイント（社内共通）

- ドメイン綴りに注意: `kyounouhi.sakura.ne.jp`（cなし）
- 各メールボックスは「受信する」設定にする（転送専用だと受信箱に現れません）
- テストAPI
  - 接続確認: `GET /api/email-test` → `{ ok: true }` で正常
  - テスト送信: `POST /api/email-test`
    - 例（adminに送信）
      ```bash
      echo '{"to":"admin@kyounouhi.sakura.ne.jp","subject":"SMTP送信テスト","message":"これはテストです"}' \
        | curl -s -X POST http://localhost:3000/api/email-test \
            -H 'Content-Type: application/json' --data-binary @- | jq
      ```

## 参考ドキュメント

- `docs/email-setup-sakura.md`: 具体的なさくら設定手順・トラブルシュート

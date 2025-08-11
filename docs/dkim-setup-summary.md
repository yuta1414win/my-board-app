## DKIM 実装サマリ（さくらインターネット／kyounouhi.sakura.ne.jp）

実施日: 2025-08-09

### 目的
- さくらインターネットのメール送信で、DKIM（RSA-SHA256）署名を付与し到達率を安定化
- 本プロジェクトの送信元を `admin@kyounouhi.sakura.ne.jp` に統一

### 設計（今回の採用）
- 署名アルゴリズム: RSA-SHA256（鍵長 2048bit）
- セレクタ: `default`
- 署名ドメイン: `kyounouhi.sakura.ne.jp`
- DNS: さくらのネームサーバー利用（公開鍵 TXT を自動登録）
- 併用レコード（推奨）: SPF（`include:_spf.sakura.ne.jp`）、DMARC（観測モード p=none）

### 実装手順（今回の実施内容）
1. サーバーコントロールパネルにログイン
2. 「メール」→「メールドメイン」→ 対象ドメインの「設定」→「DKIM設定」
3. 秘密鍵を新規作成
   - 鍵長: 2048bit
   - セレクタ: `default`（UIで指定可能な場合）
4. 「DKIMレコード（利用する）」にチェック → 保存
   - さくら DNS 利用のため、公開鍵 TXT は自動登録

### 検証（DNS / アプリ / 受信ヘッダー）
- DNS 公開鍵確認
  - コマンド: `dig +short TXT default._domainkey.kyounouhi.sakura.ne.jp @8.8.8.8`
  - 期待値: `"v=DKIM1; k=rsa; p=..."` が返る（公開鍵は長いため複数行の "..." で返ることがあります）
- アプリ接続確認
  - `GET /api/email-test` → `{ ok: true }`
- 送信テスト
  - 例:
    ```bash
echo '{"to":"admin@kyounouhi.sakura.ne.jp","subject":"DKIM検証","message":"これはDKIM署名検証テストです","from":"admin@kyounouhi.sakura.ne.jp"}' \
  | curl -sS -X POST http://localhost:3000/api/email-test \
      -H 'Content-Type: application/json' --data-binary @- | jq
    ```
  - 期待: `{"ok":true, ...}`
- 受信側ヘッダー確認（Gmail: メニュー→「オリジナルを表示」）
  - `DKIM-Signature:` に以下を確認
    - `a=rsa-sha256`
    - `d=kyounouhi.sakura.ne.jp`
    - `s=default`

### 結果
- DNS: 公開鍵 TXT を確認（`default._domainkey`）
- アプリ: 接続確認 OK、送信テスト OK（messageId 取得）
- 受信ヘッダー: DKIM-Signature に `a=rsa-sha256; d=kyounouhi.sakura.ne.jp; s=default` を確認

### 運用ルールと今後
- 送信元は `admin@kyounouhi.sakura.ne.jp` に統一（From/MAIL FROM）
- DMARC は観測（p=none）から開始し、安定後に `quarantine` → `reject` 検討
- 年1回程度のキー・セレクタローテーション（例: `default`→`s2`）
- 障害時は DNS（TXT分割/引用符）、「DKIMレコード（利用する）」設定、SPF/DMARC 整合を再点検

### 参考
- 手順ガイド: [`docs/DKIM.md`](./DKIM.md)
- さくらサポート: DKIM（電子署名）について（help.sakura.ad.jp）

### 付録（コマンド集）
```bash
# DNS 公開鍵確認
dig +short TXT default._domainkey.kyounouhi.sakura.ne.jp @8.8.8.8

# 接続確認
curl -s http://localhost:3000/api/email-test | jq

# 送信テスト
echo '{"to":"admin@kyounouhi.sakura.ne.jp","subject":"DKIM検証","message":"これはDKIM署名検証テストです","from":"admin@kyounouhi.sakura.ne.jp"}' \
  | curl -sS -X POST http://localhost:3000/api/email-test \
      -H 'Content-Type: application/json' --data-binary @- | jq
```



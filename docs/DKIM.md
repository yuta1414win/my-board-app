## DKIM 設定ガイド（さくらインターネット／kyounouhi.sakura.ne.jp）

### 目的
- **到達率向上**: メールに改ざん防止の署名（DKIM）を付与し、受信側で正当性を検証できるようにする
- **このプロジェクトの前提**:
  - ドメイン: `kyounouhi.sakura.ne.jp`
  - メールサーバー: さくらのレンタルサーバー
  - 送信者（From/Mail From）: 原則 `admin@kyounouhi.sakura.ne.jp` を使用
  - 署名アルゴリズム: **RSA-SHA256**（鍵長 2048bit 推奨）

---

## 設計（推奨設定）
- **署名ドメイン（d=）**: `kyounouhi.sakura.ne.jp`
- **アルゴリズム（a=）**: `rsa-sha256`
- **鍵長**: 2048bit
- **セレクタ（s=）**: 初回は `s1`（Sakura 側の自動値でも可）
- **DNS 運用**:
  - さくらのネームサーバー利用 → 公開鍵 TXT は自動登録
  - 他社 DNS 利用 → TXT を手動登録（`<selector>._domainkey.<domain>`）
- **併用レコード（推奨）**:
  - SPF: `v=spf1 include:_spf.sakura.ne.jp ~all`
  - DMARC: `v=DMARC1; p=none; rua=mailto:admin@kyounouhi.sakura.ne.jp; aspf=r; adkim=r`

---

## 手順A（さくらDNSを利用：最短）
1. さくらのサーバーコントロールパネルへログイン
2. メニュー「メール」→「メールドメイン」→ 対象 `kyounouhi.sakura.ne.jp` の「設定」→「DKIM設定」
3. 「秘密鍵を新規作成」
   - 鍵長: 2048bit（既定でOK）
   - セレクタ: `s1`（または画面に自動表示される値）
4. 「DKIMレコード（利用する）」にチェック → 保存
   - さくらのネームサーバーを使っていれば、公開鍵 TXT は自動登録されます
5. 反映待ち（数分〜最大 24〜48 時間）
6. テスト送信し、受信メールのヘッダーに `DKIM-Signature: a=rsa-sha256; d=kyounouhi.sakura.ne.jp; s=s1` が付与されることを確認

## 手順B（他社DNSを利用：手動登録）
1. 上記 1〜3 と同様に「秘密鍵を新規作成」して、**公開鍵（p=）** を控える
2. 他社の DNS 管理画面で TXT レコードを追加
   - ホスト名: `s1._domainkey.kyounouhi.sakura.ne.jp`
   - 種別: TXT
   - 値（例）:
     ```
     v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFA...（公開鍵）...IDAQAB
     ```
   - 注意（TXT 255 文字制限）: 長い公開鍵は複数のダブルクォートで分割して登録（各行 "..." で囲む）
3. さくらのコントロールパネルに戻り「DKIMレコード（利用する）」を有効化 → 保存
4. 反映待ち後にテスト送信して署名付与を確認

---

## 追加設定（推奨）
- **SPF（独自 DNS 運用時）**
  - ホスト名: `kyounouhi.sakura.ne.jp`
  - 種別: TXT
  - 値: `v=spf1 include:_spf.sakura.ne.jp ~all`
- **DMARC（観測から開始）**
  - ホスト名: `_dmarc.kyounouhi.sakura.ne.jp`
  - 種別: TXT
  - 値（例・観測モード）:
    ```
    v=DMARC1; p=none; rua=mailto:admin@kyounouhi.sakura.ne.jp; aspf=r; adkim=r
    ```
  - 安定後は `p=quarantine` → `p=reject` へ段階的に強化

---

## 動作確認（実践）
### DNS で公開鍵の到達確認
- Google Public DNS 経由で確認（macOS ターミナル）:
  ```bash
  dig +short TXT s1._domainkey.kyounouhi.sakura.ne.jp @8.8.8.8
  ```
  期待: `"v=DKIM1; k=rsa; p=..."` 形式の TXT が返る

### プロジェクトのメール送信テスト
- 接続確認（開発サーバ起動中に実行）:
  ```bash
  curl -s http://localhost:3000/api/email-test | jq
  ```
- 送信テスト（管理者宛て例）:
  ```bash
  echo '{"to":"admin@kyounouhi.sakura.ne.jp","subject":"DKIMテスト","message":"これはDKIM確認テストです"}' \
    | curl -s -X POST http://localhost:3000/api/email-test \
        -H 'Content-Type: application/json' --data-binary @- | jq
  ```

### 受信側でヘッダー確認
- Gmail の場合: メール詳細メニュー →「オリジナルを表示」→ `DKIM-Signature` を確認
- チェックポイント:
  - `a=rsa-sha256`
  - `d=kyounouhi.sakura.ne.jp`
  - `s=s1`（セレクタ）
  - `bh=` と `b=` が存在（本文・ヘッダー署名）

---

## 運用のコツ
- **送信元アドレスの統一**: `admin@kyounouhi.sakura.ne.jp` を基本とし、SPF/DKIM/DMARC の整合性を確保
- **キーのローテーション（例: 年1回）**:
  1. 新セレクタ `s2` を作成し公開鍵を登録
  2. 送信側が `s2` 署名に切替ったことを確認
  3. 移行完了後に旧 `s1` を無効化
- **迷惑メール対策の総合調整**: 件名/本文品質、送信レート、バウンス管理、SPF/DMARC の整合も同時に点検

---

## トラブルシューティング
- **DKIM 署名が付かない**:
  - コントロールパネル「DKIMレコード（利用する）」が有効か
  - `s1._domainkey.kyounouhi.sakura.ne.jp` の TXT が引けるか（`dig` で確認）
- **公開鍵エラー**:
  - TXT 分割時のダブルクォートの閉じ忘れ/改行位置ミス
  - 反映待ち（DNS 伝播）不足
- **依然として迷惑メール判定**:
  - SPF/DMARC の整合（From/MAIL FROM のドメイン一致）
  - 送信コンテンツの品質、急激な大量送信の抑制

---

## 参考リンク
- さくらインターネット サポート「DKIM（電子署名）について」: [help.sakura.ad.jp の解説ページ](https://help.sakura.ad.jp/mail/2811/)
- Gmail でメールのオリジナルを表示（ヘッダー確認）: [ヘルプ記事](https://support.google.com/mail/answer/22454)

---

## 付録：レコード例（雛形）
### DKIM TXT（他社DNSで手動登録時）
```
ホスト名: s1._domainkey.kyounouhi.sakura.ne.jp
種別: TXT
値:    "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFA...IDAQAB"
```

### SPF TXT（独自DNS運用時）
```
ホスト名: kyounouhi.sakura.ne.jp
種別: TXT
値:    v=spf1 include:_spf.sakura.ne.jp ~all
```

### DMARC TXT（観測開始）
```
ホスト名: _dmarc.kyounouhi.sakura.ne.jp
種別: TXT
値:    v=DMARC1; p=none; rua=mailto:admin@kyounouhi.sakura.ne.jp; aspf=r; adkim=r
```



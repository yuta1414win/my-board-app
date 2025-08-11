# メール到達率ガイド（さくらインターネット運用版）

本ドキュメントは、本プロジェクトでメールが「届かない」/「迷惑メールに入る」場合の原因と対処を、実例ベースで整理したものです。さくらインターネットの共有サーバーでのSMTP送信を前提にしています。

---

## 1. 今回の学び（なぜ届くようになったか）
- **SPFの型を公式 include に変更**: `v=spf1 include:_spf.sakura.ne.jp ~all`
  - さくらの送信IP帯を網羅的に許可でき、SPFが安定して PASS になりやすい
- **封筒アドレス（MAIL FROM/Return-Path）を同一ドメインに固定**
  - `envelope.from = admin@kyounouhi.sakura.ne.jp` とし、見た目のFromと揃えて整合性を向上
- **プレーンテキストの簡素メールで再送**
  - コンテンツ要因のスパムスコアを最小化（件名: `Test`, 本文: `Test message`）

---

## 2. 恒久対策（必須〜推奨）
- **SPF（必須）**
  - TXT（@ ルート）: `v=spf1 include:_spf.sakura.ne.jp ~all`
  - 既存のSPFがあれば統合。SPFレコードは1ドメイン1つにする
- **DMARC（強く推奨）**
  - TXT（`_dmarc`）: `v=DMARC1; p=none; rua=mailto:dmarc@kyounouhi.sakura.ne.jp; fo=1`
  - 監視モード（p=none）で開始 → 問題なければ `quarantine` → 最終 `reject`
- **DKIM（推奨）**
  - さくらのコントロールパネルで DKIM を有効化 → 指示された `default._domainkey` のTXTを追加
  - DKIMが通れば、Return-Path が書き換わっても DMARC が PASS しやすい

---

## 3. アプリ側の推奨実装
- **封筒Fromの固定（重要）**
  - Nodemailer送信時に `envelope.from` を送信ドメインのアドレスに固定し、見た目のFromと揃える
- **プレーンテキストの同梱**
  - HTMLメールでも `text` を同梱（マルチパート）。フィルタ評価が改善

抜粋（`src/lib/email-nodemailer.ts`）:
```ts
// 重要ポイントのみ抜粋
const info = await transporter.sendMail({
  from: `"${process.env.NEXT_PUBLIC_APP_NAME}" <${sender}>`,
  to,
  subject,
  html,
  text: plainText,
  replyTo: customReplyTo || replyTo,
  envelope: {
    from: sender,
    to,
  },
});
```

---

## 4. テスト手順（到達確認）
1) DNS確認（macOS）
```bash
dig +short TXT kyounouhi.sakura.ne.jp
dig +short TXT _dmarc.kyounouhi.sakura.ne.jp || true
```
- SPFに `include:_spf.sakura.ne.jp` が含まれていること
- DMARCは監視モードの文字列が返ること（導入後）

2) 送信APIでテスト
```bash
# 接続検証
curl -s http://localhost:3000/api/email-test | jq

# シンプル送信（推奨）
echo '{"to":"your-gmail@example.com","subject":"Test","message":"Test message","from":"admin@kyounouhi.sakura.ne.jp","mode":"simple"}' \
| curl -s -X POST http://localhost:3000/api/email-test -H 'Content-Type: application/json' --data-binary @- | jq
```

3) Gmailで確認
- メールを開く → 右上「…」→「メッセージのソースを表示」
- `SPF: PASS`、`Authentication-Results` に `spf=pass`（DKIM導入後は `dkim=pass`）があること

4) 可視化テスト（任意）
- `https://www.mail-tester.com/` に送信 → スコアと詳細（SPF/DKIM/DMARC/Return-Path）を確認

---

## 5. トラブルシュート早見表
- 届かない/迷惑行き
  - SPFが古い形式 → `include:_spf.sakura.ne.jp` に統一
  - DMARC未設定 → `_dmarc` を追加（p=none）
  - DKIM未設定 → 有効化してTXT追加
  - From と SMTPユーザー/封筒From の不一致 → 同一ドメインで統一
  - 本文が重い/URL多い → 一旦プレーンテキストで検証

---

## 6. 参考
- さくらインターネット：SPF/DKIM/DMARC 設定ガイド（公式）
- 本リポジトリ：`docs/email-setup-sakura.md` / `src/lib/email-nodemailer.ts`



## nouchinho.com ドメイン確認レポート

このドキュメントは、独自ドメイン `nouchinho.com` の有効性チェック結果と、公開に向けた具体手順を初心者向けにまとめたものです。

### 結論（現在の状態）
- **ドメイン登録**: 有効（Status: ok）
- **DNS**: 解決OK（A/NS/MX 設定あり）
- **Web応答**: 到達OKだが現在は **403 Forbidden**（表示不可）
- **HTTPS**: 有効（証明書はさくら側の `*.sakura.ne.jp` で応答）

つまり「ドメインは使える状態」ですが、「公開コンテンツ未配置」または「アクセス制限」が理由で403になっています。

---

### 取得した確認結果（サマリ）
- **Whois（登録情報）**
  - レジストラ: JPRS（Japan Registry Services）
  - 作成日: 2025-08-08 / 期限: 2026-08-08
  - ネームサーバ: `ns1.dns.ne.jp`, `ns2.dns.ne.jp`（さくら）

- **DNS**
  - A: `nouchinho.com -> 133.167.8.159`
  - A(www): `www.nouchinho.com -> 133.167.8.159`（無印へエイリアス相当）
  - NS: `ns1.dns.ne.jp`, `ns2.dns.ne.jp`
  - MX: `10 nouchinho.com.`（受信先を自ドメインへ向ける設定）
  - AAAA(IPv6): なし
  - CAA: なし

- **Web応答**
  - HTTP(80): 403 Forbidden（nginx 応答）
  - HTTPS(443): 403 Forbidden（HTTP/2, nginx 応答）

- **TLS（証明書）**
  - サーバ証明書: `CN=*.sakura.ne.jp`（有効）

よくある原因:
- 公開フォルダに `index.html` 等が未配置
- ディレクトリリスティング禁止＋トップページなし
- Basic認証やIP制限がON
- ドキュメントルートや仮想ホスト未紐付け

---

### 次にやること（最短ルート）
1. **公開設定/コンテンツ**
   - さくらのコントロールパネルでマルチドメインに `nouchinho.com` と `www.nouchinho.com` を追加
   - 指定の公開フォルダに `index.html` を置く（またはアプリをデプロイ）
   - アクセス制限（Basic認証・IP制限）があれば解除
2. **HTTPS（独自ドメインの証明書）**
   - さくらの「無料SSL（Let’s Encrypt）」を有効化し、自動更新をON
3. **www/無印の統一**
   - どちらかに301リダイレクト。例: `www` を無印へ統一
4. **メール（使う場合）**
   - 一般的には `MX 10 mail.nouchinho.com.` とし、`mail.nouchinho.com` の A レコードを自サーバIPへ
   - 送信到達性向上のため `SPF` `DKIM` `DMARC` を追加

---

### 具体手順（さくらインターネットの例）
1. **ドメイン追加**
   - コントロールパネル → ドメイン/SSL → ドメイン/SSL 設定 → ドメイン新規追加
   - `nouchinho.com` と `www.nouchinho.com` を対象サイトに紐付け
2. **公開フォルダに配置**
   - 指定のドキュメントルート（公開フォルダ）に `index.html` などをアップロード
3. **無料SSL（Let’s Encrypt）**
   - ドメイン/SSL から `nouchinho.com` を選択 → 無料SSLを設定 → 自動更新ON
4. **リダイレクト（任意）**
   - `.htaccess` 例（`www` → 無印に統一）:

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.nouchinho\.com$ [NC]
RewriteRule ^(.*)$ https://nouchinho.com/$1 [R=301,L]
```

---

### 再チェック用コマンド（macOS）
```bash
# 登録情報
whois nouchinho.com | sed -n '1,120p'

# DNS
dig +short nouchinho.com A
dig +short www.nouchinho.com A
dig +short nouchinho.com NS
dig +short nouchinho.com MX
dig +short nouchinho.com AAAA

# Web応答
curl -I https://nouchinho.com
curl -I http://nouchinho.com

# 証明書の概要
openssl s_client -connect nouchinho.com:443 -servername nouchinho.com -brief </dev/null
```

---

### メールDNSの例（使う場合）
- A: `mail.nouchinho.com -> 133.167.8.159`（例）
- MX: `10 mail.nouchinho.com.`
- SPF（TXT）: `v=spf1 include:spf.sakura.ne.jp ~all`（さくらのメールを使う場合の一例）
- DKIM: メールサーバ側で鍵発行後、TXTを追加
- DMARC（TXT）: `v=DMARC1; p=none; rua=mailto:postmaster@nouchinho.com` から開始

※ 実際の値は利用中のメールサービスに合わせて設定してください。

---

### 用語ミニ解説
- **Whois**: 登録者や登録/更新期限などの情報
- **NS（ネームサーバ）**: ドメインの設定（DNS）をどこで管理するか
- **A/AAAA**: ドメインをサーバのIP（IPv4/IPv6）へ結びつける
- **MX**: メールの受け取り先サーバを指定
- **SSL/TLS**: 通信を暗号化し安全にする仕組み
- **CAA**: どの認証局が証明書を発行してよいかを制限するレコード（未設定でも可）

---

### レッスン用チェックリスト
- [ ] `nouchinho.com` / `www.nouchinho.com` をサイトに紐付けた
- [ ] 公開フォルダに `index.html` などを配置した
- [ ] 無料SSL（Let’s Encrypt）を有効にし自動更新ONにした
- [ ] ブラウザで `https://nouchinho.com` が内容表示されることを確認（403でない）
- [ ] （必要なら）メール用の MX/SPF/DKIM/DMARC を設定した

備考: 現状は `403 Forbidden` のため、まずは公開フォルダへのコンテンツ配置またはアクセス制限解除が最優先です。その後に SSL・リダイレクト・メールDNS を順に整備すれば、実運用開始できます。



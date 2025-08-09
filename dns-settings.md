# DNS設定ガイド - メール認証（SPF・DKIM・DMARC）

## 現在の設定と修正内容

### 1. SPFレコード修正

**レコードタイプ**: TXT  
**ホスト名**: @ (またはドメイン名)  
**現在の値**: 
```
v=spf1 -all
```

**修正後の値（使用しているメールサービスに応じて選択）**:

#### Gmail/Google Workspace使用時:
```
v=spf1 include:_spf.google.com ~all
```

#### Microsoft 365/Outlook使用時:
```
v=spf1 include:spf.protection.outlook.com ~all
```

#### 独自メールサーバー使用時:
```
v=spf1 ip4:YOUR_SERVER_IP_ADDRESS ~all
```

#### 複数サービス併用時:
```
v=spf1 include:_spf.google.com ip4:YOUR_SERVER_IP ~all
```

### 2. DKIMレコード設定

**レコードタイプ**: TXT  
**ホスト名**: default._domainkey (またはメールプロバイダー指定のセレクター)  
**現在の値**: 
```
v=DKIM1; p=
```

**修正方法**:
1. メールサービスの管理画面にログイン
2. DKIM設定画面で公開鍵を生成
3. 提供された公開鍵をコピー
4. DNSレコードに設定

#### Gmail/Google Workspace の場合:
1. Google Admin Console → アプリ → Google Workspace → Gmail
2. メールの認証 → DKIM認証
3. 「新しいレコードを生成」をクリック
4. 表示されたDNSレコードをコピー

**修正後の値（例）**:
```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...（長い公開鍵文字列）
```

### 3. DMARCレコード修正

**レコードタイプ**: TXT  
**ホスト名**: _dmarc  
**現在の値**: 
```
v=DMARC1;p=reject;sp=reject;adkim=s;aspf=s
```

**第1段階 - 監視モード（推奨）**:
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@yourdomain.com; ruf=mailto:dmarc-forensic@yourdomain.com; sp=none; adkim=r; aspf=r; fo=1; rf=afrf; pct=100
```

### パラメータ説明:
- `p=none`: 監視モード（認証失敗してもメールは通す）
- `rua=`: 集約レポート送信先
- `ruf=`: 詳細レポート送信先
- `sp=none`: サブドメインも監視モード
- `adkim=r`: DKIM緩やかなアライメント
- `aspf=r`: SPF緩やかなアライメント
- `fo=1`: 詳細レポートの送信条件
- `rf=afrf`: レポート形式
- `pct=100`: ポリシー適用率100%

## DNS設定手順

### 主要DNSプロバイダーでの設定方法:

#### 1. お名前.com
1. ドメインNaviにログイン
2. 「DNS」→「DNSレコード設定」
3. 対象ドメインを選択
4. 「DNSレコード設定を利用する」
5. 各レコードを追加

#### 2. Route 53 (AWS)
1. Route 53コンソールにログイン
2. 対象のホストゾーンを選択
3. 「Create Record」をクリック
4. 各レコードを追加

#### 3. Cloudflare
1. Cloudflareダッシュボードにログイン
2. 対象ドメインを選択
3. 「DNS」タブを選択
4. 「Add record」で各レコードを追加

## 設定後の確認コマンド

```bash
# SPF確認
dig TXT yourdomain.com | grep spf
nslookup -type=TXT yourdomain.com

# DKIM確認
dig TXT default._domainkey.yourdomain.com
nslookup -type=TXT default._domainkey.yourdomain.com

# DMARC確認
dig TXT _dmarc.yourdomain.com
nslookup -type=TXT _dmarc.yourdomain.com
```

## 段階的移行スケジュール

| 期間 | フェーズ | DMARCポリシー | アクション |
|------|---------|---------------|-----------|
| 1-30日 | 監視 | p=none | レポート収集・分析 |
| 31-45日 | 部分隔離 | p=quarantine; pct=25 | 25%を隔離 |
| 46-60日 | 隔離拡大 | p=quarantine; pct=50→100 | 段階的に100%へ |
| 61-90日 | 完全拒否 | p=reject | 最終段階 |

## トラブルシューティング

### よくある問題と解決方法:

1. **SPF認証失敗**
   - 送信元IPアドレスがSPFレコードに含まれていない
   - 解決: SPFレコードに正しいIPまたはincludeを追加

2. **DKIM署名失敗**
   - 公開鍵が正しく設定されていない
   - 解決: メールサーバーの設定と公開鍵を再確認

3. **DMARCレポートが届かない**
   - レポート用メールアドレスが存在しない
   - 解決: メールアドレスを作成し、受信可能か確認

## 重要な注意事項

⚠️ **現在の設定では正当なメールも拒否される可能性があります**

1. まずSPFレコードを修正（正しいメールサーバーを指定）
2. DKIM公開鍵を設定
3. DMARCを監視モード（p=none）に変更
4. 30日間レポートを収集してから段階的に強化

この順序で設定することで、メール配送に影響を与えずに安全にセキュリティを強化できます。
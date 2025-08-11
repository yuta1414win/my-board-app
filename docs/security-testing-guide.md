# セキュリティテスト実行ガイド

このガイドでは、実装したセキュリティ対策の包括的なテスト手順について説明します。

## 🚀 クイックスタート

### 1. 事前準備
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 2. 基本テスト実行
```bash
# 全自動テスト実行
./scripts/run-security-tests.sh

# または個別のテスト実行
node scripts/security-test.js
```

## 📋 テスト項目一覧

| テスト項目 | 自動テスト | 手動テスト | チェックポイント |
|------------|------------|------------|------------------|
| 🚦 レート制限 | ✅ | ✅ | 1分5回制限の動作 |
| 🧹 XSS対策 | ✅ | ✅ | 15種類のペイロード防御 |
| 🔐 CSRF対策 | ✅ | ✅ | トークン検証機能 |
| 🛡️ セキュリティヘッダー | ✅ | ✅ | 必須ヘッダー設定確認 |
| 🔍 入力値検証 | ✅ | ✅ | 不正入力の拒否 |
| 📊 監査ログ | ✅ | ✅ | イベント記録確認 |

## 🔧 テストスクリプトの使用方法

### 基本的な使用法

```bash
# 全テスト実行
./scripts/run-security-tests.sh

# クイックテスト（最小限）
./scripts/run-security-tests.sh --quick

# 特定テストのみ実行
./scripts/run-security-tests.sh -t headers
./scripts/run-security-tests.sh -t xss
./scripts/run-security-tests.sh -t csrf

# 詳細ログ付きで実行
./scripts/run-security-tests.sh --verbose

# レポート出力付きで実行
./scripts/run-security-tests.sh --report
```

### 環境別テスト

```bash
# 開発環境テスト
./scripts/run-security-tests.sh --dev

# 本番環境向けテスト
./scripts/run-security-tests.sh --prod --url https://your-domain.com

# 特定URLでのテスト
./scripts/run-security-tests.sh -u http://staging.example.com
```

### Node.jsスクリプト直接実行

```bash
# 全テスト実行
node scripts/security-test.js

# 特定テスト実行
node scripts/security-test.js rate-limit
node scripts/security-test.js xss
node scripts/security-test.js csrf
node scripts/security-test.js headers
node scripts/security-test.js input
node scripts/security-test.js audit
node scripts/security-test.js overall
```

## 🧪 手動テスト手順

詳細な手動テスト手順については、[手動セキュリティテスト手順書](../scripts/manual-security-test.md)を参照してください。

### 主要な手動テストポイント

#### 1. レート制限テスト
```bash
# 10回並行リクエスト
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/posts \
    -H "Content-Type: application/json" \
    -d '{"title":"Test","content":"Rate limit test"}' &
done
wait
```

#### 2. XSS攻撃シミュレーション
```html
<!-- 投稿フォームに入力してテスト -->
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
<svg onload="alert('XSS')">
```

#### 3. CSRF攻撃テスト
```bash
# CSRFトークンなしでリクエスト
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com" \
  -d '{"title":"CSRF Test","content":"Attack"}'
```

## 📊 テスト結果の解釈

### 成功基準

| テスト項目 | 成功基準 | 判定 |
|------------|----------|------|
| レート制限 | 90%以上のリクエストをブロック | ✅ 合格 / ❌ 不合格 |
| XSS対策 | 100%のペイロードをブロック | ✅ 合格 / ❌ 不合格 |
| CSRF対策 | 不正リクエストを100%ブロック | ✅ 合格 / ❌ 不合格 |
| セキュリティヘッダー | 必須ヘッダー100%設定 | ✅ 合格 / ❌ 不合格 |
| 入力検証 | 80%以上の不正入力をブロック | ✅ 合格 / ❌ 不合格 |
| 監査ログ | 全セキュリティイベントを記録 | ✅ 合格 / ❌ 不合格 |

### テスト結果例

```bash
📊 テスト結果サマリー
✅ 成功: 6
📋 失敗: 0
📋 成功率: 100%

📋 詳細結果:
✅ セキュリティヘッダー確認テスト: OK (245ms)
✅ レート制限テスト: 3成功, 7ブロック - レート制限正常動作 (1245ms)
✅ XSS攻撃防御テスト: 15個のXSSペイロードを正常にブロック (890ms)
✅ CSRF攻撃防御テスト: CSRFトークン不正でリクエストがブロックされました (156ms)
✅ 不正入力値拒否テスト: 85.7%の不正入力をブロック (12/14) (2340ms)
✅ 監査ログ記録確認テスト: テストアクションを実行しました（ログ確認APIは利用不可） (2124ms)
✅ 総合セキュリティテスト: 基本的なセキュリティチェックをパス (567ms)
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. サーバーに接続できない
```bash
[ERROR] サーバーに接続できません: http://localhost:3001
```

**解決方法:**
- 開発サーバーが起動しているか確認: `npm run dev`
- ポート番号が正しいか確認
- ファイアウォール設定の確認

#### 2. レート制限テストが失敗する
```bash
❌ レート制限テスト: すべてのリクエストが成功 - レート制限が機能していない可能性
```

**解決方法:**
- `src/middleware.ts`の設定確認
- LRUキャッシュの初期化確認
- IPアドレス取得の動作確認

#### 3. CSRF保護が動作しない
```bash
❌ CSRF攻撃防御テスト: CSRF攻撃がブロックされませんでした (Status: 200)
```

**解決方法:**
- NextAuth設定の確認
- middleware.tsでのCSRF保護確認
- セッション管理の設定確認

### デバッグ手法

#### 1. 詳細ログの有効化
```bash
# 詳細ログ付きでテスト実行
./scripts/run-security-tests.sh --verbose

# 環境変数でデバッグモード
DEBUG=1 node scripts/security-test.js
```

#### 2. 個別テストの実行
```bash
# 問題のあるテストのみ実行
node scripts/security-test.js rate-limit
```

#### 3. ブラウザ開発者ツール
- Network タブでリクエスト/レスポンス確認
- Console タブでJavaScriptエラー確認
- Security タブでTLS設定確認

#### 4. curlでの詳細確認
```bash
# 詳細なリクエスト/レスポンス確認
curl -v -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"content"}'
```

## 📈 継続的セキュリティ監視

### 定期実行の設定

#### crontabでの自動実行
```bash
# crontab -e で編集
# 毎日午前2時にセキュリティテスト実行
0 2 * * * cd /path/to/project && ./scripts/run-security-tests.sh --report >> /var/log/security-test.log 2>&1

# 毎週月曜日に包括テスト実行  
0 3 * * 1 cd /path/to/project && ./scripts/run-security-tests.sh --prod --report
```

#### GitHub Actionsでの自動実行
```yaml
# .github/workflows/security-test.yml
name: Security Tests
on:
  schedule:
    - cron: '0 2 * * *'  # 毎日午前2時
  push:
    branches: [ main ]
    
jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run build
    - run: npm start &
    - run: ./scripts/run-security-tests.sh --report
```

### 監視メトリクス

以下のメトリクスを継続的に監視します：

- **テスト成功率**: 95%以上を維持
- **レスポンス時間**: 各テスト2秒以内
- **セキュリティイベント数**: 監査ログで追跡
- **脆弱性スコア**: 外部スキャンツールでの評価

### アラート設定

重要なセキュリティメトリクスにアラートを設定：

- テスト成功率が90%を下回った場合
- 新しい脆弱性が検出された場合
- セキュリティイベントが急増した場合
- 外部セキュリティスキャンで問題が検出された場合

## 📚 追加リソース

### 関連ドキュメント
- [SECURITY.md](../SECURITY.md) - セキュリティ実装ガイド
- [手動セキュリティテスト手順書](../scripts/manual-security-test.md)
- [設定ガイド](../docs/configuration.md)

### 外部ツール
- [Security Headers](https://securityheaders.com/) - ヘッダー確認
- [Mozilla Observatory](https://observatory.mozilla.org/) - 総合セキュリティチェック
- [OWASP ZAP](https://owasp.org/www-project-zap/) - 脆弱性スキャン

### セキュリティ学習リソース
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

---

定期的なセキュリティテストの実行により、アプリケーションのセキュリティレベルを維持し、新たな脅威に対する防御を強化していきます。
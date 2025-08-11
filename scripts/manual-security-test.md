# 手動セキュリティテスト手順書

## 概要

この手順書は、実装したセキュリティ対策を手動でテストするためのガイドです。自動テストと合わせて使用することで、包括的なセキュリティ検証を行えます。

## 事前準備

### 1. 環境設定
```bash
# 開発サーバーの起動
npm run dev

# テスト用環境変数の設定
export TEST_BASE_URL=http://localhost:3001
export NODE_ENV=development
```

### 2. 必要なツール
- ブラウザ（Chrome/Firefox推奨）
- 開発者ツール
- curl または Postman
- ブラウザ拡張（セキュリティヘッダー確認用）

## テスト項目と手順

### 🚦 1. レート制限テスト

#### 自動テスト実行
```bash
node scripts/security-test.js rate-limit
```

#### 手動確認手順
1. **ブラウザテスト**
   ```bash
   # 複数のcurlリクエストを並行実行
   for i in {1..10}; do
     curl -X POST http://localhost:3001/api/posts \
       -H "Content-Type: application/json" \
       -d '{"title":"Test","content":"Rate limit test"}' &
   done
   wait
   ```

2. **期待結果**
   - 5回目以降のリクエストで429エラー
   - `X-RateLimit-*` ヘッダーの存在確認
   - レスポンスに`Retry-After`ヘッダー

3. **チェックポイント**
   - [ ] レート制限が正常動作
   - [ ] 適切なエラーメッセージ
   - [ ] ヘッダー情報の正確性

### 🧹 2. XSS攻撃シミュレーション

#### 自動テスト実行
```bash
node scripts/security-test.js xss
```

#### 手動確認手順
1. **投稿フォームでのXSSテスト**
   
   以下のペイロードを投稿フォームに入力：
   ```html
   <script>alert('XSS')</script>
   <img src="x" onerror="alert('XSS')">
   <svg onload="alert('XSS')">
   javascript:alert('XSS')
   "><script>alert('XSS')</script>
   ```

2. **URL パラメータでのXSS**
   ```
   http://localhost:3001/posts?search=<script>alert('XSS')</script>
   ```

3. **期待結果**
   - スクリプトが実行されない
   - HTMLエンティティでエスケープされている
   - サニタイゼーション処理が動作

4. **チェックポイント**
   - [ ] すべてのXSSペイロードがブロック
   - [ ] 適切なエスケープ処理
   - [ ] エラーログに記録

### 🔐 3. CSRF攻撃防御確認

#### 自動テスト実行
```bash
node scripts/security-test.js csrf
```

#### 手動確認手順
1. **CSRFトークンなしのリクエスト**
   ```bash
   curl -X POST http://localhost:3001/api/posts \
     -H "Content-Type: application/json" \
     -H "Origin: https://malicious-site.com" \
     -d '{"title":"CSRF Test","content":"This should fail"}'
   ```

2. **異なるオリジンからのリクエスト**
   ```html
   <!-- 悪意のあるサイト上のフォーム -->
   <form action="http://localhost:3001/api/posts" method="POST">
     <input type="hidden" name="title" value="CSRF Attack">
     <input type="hidden" name="content" value="Malicious content">
     <input type="submit" value="Click me">
   </form>
   ```

3. **期待結果**
   - 403 Forbidden エラー
   - CSRFトークン関連のエラーメッセージ
   - 監査ログに記録

4. **チェックポイント**
   - [ ] CSRFトークンなしでブロック
   - [ ] 不正なオリジンでブロック
   - [ ] 適切なエラーレスポンス

### 🛡️ 4. セキュリティヘッダー確認

#### 自動テスト実行
```bash
node scripts/security-test.js headers
```

#### 手動確認手順
1. **ブラウザ開発者ツールで確認**
   - ページを開いて Network タブを確認
   - レスポンスヘッダーを確認

2. **curlでヘッダー確認**
   ```bash
   curl -I http://localhost:3001/
   ```

3. **期待結果**
   ```
   Content-Security-Policy: [適切なCSP]
   X-Frame-Options: DENY
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: [適切な設定]
   X-XSS-Protection: 1; mode=block
   ```

4. **オンラインツール活用**
   - [Security Headers](https://securityheaders.com/)でスキャン
   - [Mozilla Observatory](https://observatory.mozilla.org/)でチェック

5. **チェックポイント**
   - [ ] すべての必須ヘッダーが設定
   - [ ] CSPの内容が適切
   - [ ] 本番環境でHSTS設定

### 🔍 5. 不正入力値の拒否テスト

#### 自動テスト実行
```bash
node scripts/security-test.js input
```

#### 手動確認手順
1. **SQLインジェクション**
   ```bash
   curl -X POST http://localhost:3001/api/posts \
     -H "Content-Type: application/json" \
     -d '{"title":"'; DROP TABLE users; --","content":"test"}'
   ```

2. **コマンドインジェクション**
   ```bash
   curl -X POST http://localhost:3001/api/posts \
     -H "Content-Type: application/json" \
     -d '{"title":"; rm -rf /","content":"test"}'
   ```

3. **長大な文字列（バッファオーバーフロー）**
   ```bash
   # 10,000文字の文字列
   LONG_STRING=$(python3 -c "print('A' * 10000)")
   curl -X POST http://localhost:3001/api/posts \
     -H "Content-Type: application/json" \
     -d "{\"title\":\"$LONG_STRING\",\"content\":\"test\"}"
   ```

4. **期待結果**
   - 400 Bad Request エラー
   - バリデーションエラーメッセージ
   - サニタイゼーションの動作

5. **チェックポイント**
   - [ ] すべての不正入力をブロック
   - [ ] 適切なエラーメッセージ
   - [ ] ログに記録される

### 📊 6. 監査ログの記録確認

#### 自動テスト実行
```bash
node scripts/security-test.js audit
```

#### 手動確認手順
1. **ログイン失敗の記録**
   ```bash
   curl -X POST http://localhost:3001/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"fake@example.com","password":"wrongpass"}'
   ```

2. **レート制限違反の記録**
   ```bash
   # 複数回リクエストを送信
   for i in {1..8}; do
     curl -X POST http://localhost:3001/api/posts \
       -H "Content-Type: application/json" \
       -d '{"title":"Test","content":"content"}' 
   done
   ```

3. **監査ログの確認**
   - MongoDB Compassまたはmongoshでデータベース確認
   ```javascript
   // MongoDBで確認
   use my-board-app
   db.audit_logs.find().sort({timestamp: -1}).limit(10)
   ```

4. **期待結果**
   - ログインイベントが記録
   - セキュリティイベントが記録
   - リスクスコアが適切に計算

5. **チェックポイント**
   - [ ] すべてのセキュリティイベントが記録
   - [ ] 適切なリスクスコア
   - [ ] タイムスタンプとメタデータ

## 包括テスト実行

### 全自動テスト実行
```bash
# すべてのセキュリティテストを実行
node scripts/security-test.js

# Jest単体テストも実行
npm run test -- __tests__/security/

# 総合テスト実行
npm run test:all
```

### テスト結果の評価

#### 成功基準
- **レート制限**: 90%以上のリクエストをブロック
- **XSS対策**: 100%のペイロードをブロック
- **CSRF対策**: すべての不正リクエストをブロック
- **セキュリティヘッダー**: 必須ヘッダー100%設定
- **入力検証**: 80%以上の不正入力をブロック
- **監査ログ**: すべてのセキュリティイベントを記録

#### 失敗時の対処
1. **ログの確認**
   ```bash
   # サーバーログ
   tail -f logs/security.log
   
   # 監査ログ
   node -e "
   const { defaultAuditLogger } = require('./lib/audit-logger');
   defaultAuditLogger.search({
     startDate: new Date(Date.now() - 3600000), // 1時間前から
     limit: 50
   }).then(console.log);
   "
   ```

2. **設定の見直し**
   - middleware.ts の設定確認
   - 環境変数の確認
   - セキュリティライブラリの動作確認

## 継続的セキュリティ監視

### 定期実行の設定
```bash
# crontabでの定期実行設定例
# 毎日午前2時にセキュリティテスト実行
0 2 * * * cd /path/to/project && node scripts/security-test.js >> /var/log/security-test.log 2>&1
```

### アラート設定
```javascript
// package.json scripts追加
{
  "scripts": {
    "security:test": "node scripts/security-test.js",
    "security:watch": "nodemon scripts/security-test.js",
    "security:report": "node scripts/security-test.js > security-report-$(date +%Y%m%d).json"
  }
}
```

### セキュリティメトリクス収集
- テスト成功率の追跡
- レスポンス時間の監視
- エラー率の監視
- セキュリティイベント数の追跡

## トラブルシューティング

### よくある問題

1. **レート制限が機能しない**
   - LRUキャッシュの設定確認
   - IPアドレス取得の確認
   - middleware の設定順序確認

2. **XSS対策が不十分**
   - サニタイゼーション設定確認
   - CSPヘッダーの内容確認
   - 入力値検証の設定確認

3. **CSRF保護の誤動作**
   - トークン生成・検証の確認
   - セッション管理の確認
   - クッキー設定の確認

4. **監査ログが記録されない**
   - MongoDB接続の確認
   - ログレベルの設定確認
   - フラッシュ処理の確認

### デバッグのヒント
- `NODE_ENV=development` でより詳細なログ出力
- ブラウザ開発者ツールのNetwork/Consoleタブ活用
- curlの`-v`オプションでリクエスト詳細確認
- MongoDBの操作ログ確認

---

このテスト手順書を使用して、実装したセキュリティ対策の動作を確認し、必要に応じて調整を行ってください。
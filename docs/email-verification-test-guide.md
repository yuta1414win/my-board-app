# メール認証機能テストガイド

## 📋 テスト概要

メール認証機能の包括的なテストガイドです。手動テストと自動テストの両方をカバーしています。

## 🔧 事前準備

### 1. 環境変数の確認

`.env.local` ファイルに以下の設定が必要です：

```bash
# データベース接続
MONGODB_URI=mongodb://localhost:27017/your-database-name
# または
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# メール設定
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com

# アプリケーション設定
NEXT_PUBLIC_BASE_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_secret_key
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベース接続テスト

```bash
npm run test:mongodb
```

## 🧪 テストシナリオ

## **シナリオ1: 正常な認証フロー**

### ステップ1: テストユーザーの作成

```bash
# テストユーザー作成スクリプト実行
node scripts/create-test-user.js
```

### ステップ2: 認証メール送信の確認

1. 新規ユーザー登録を実行
2. データベースでユーザー作成を確認
3. メール送信ログの確認

### ステップ3: 認証リンクのテスト

1. 生成されたトークンをコピー
2. URL作成: `http://localhost:3001/auth/verify?token=COPIED_TOKEN`
3. ブラウザでアクセス

### 期待される結果 ✅

- ✅ 「確認完了！」メッセージ表示
- ✅ 緑色のチェックマークアイコン
- ✅ 5秒カウントダウンの開始
- ✅ ログインページへの自動リダイレクト
- ✅ データベースで `emailVerified: true` になる
- ✅ トークンが削除される (`emailVerificationToken: null`)

---

## **シナリオ2: 無効なトークン**

### テストケース2-1: 存在しないトークン

```
URL: http://localhost:3001/auth/verify?token=invalid_token_12345
```

### テストケース2-2: 形式が間違っているトークン

```
URL: http://localhost:3001/auth/verify?token=short
```

### 期待される結果 ❌

- ❌ 「確認に失敗しました」メッセージ
- ❌ 赤色のエラーアイコン
- ❌ 「無効または期限切れのトークンです」エラー
- ❌ 「確認メールを再送信」ボタン表示
- ❌ データベース状態に変更なし

---

## **シナリオ3: 期限切れトークン**

### ステップ1: 期限切れトークンの作成

```javascript
// MongoDB直接操作またはテストスクリプトで
// emailVerificationExpires を過去の日付に設定
db.users.updateOne(
  { email: 'test@example.com' },
  {
    $set: {
      emailVerificationExpires: new Date('2023-01-01'),
    },
  }
);
```

### ステップ2: 期限切れトークンでアクセス

### 期待される結果 ⚠️

- ⚠️ エラーメッセージ表示
- ⚠️ 再送信ボタンの表示
- ⚠️ データベース状態に変更なし

---

## **シナリオ4: 既に認証済みのケース**

### ステップ1: 認証済みユーザーでの再送信テスト

1. 既に `emailVerified: true` のユーザーで再送信APIを呼び出し
2. POST `/api/auth/verify` with email

### 期待される結果 ⚠️

- ⚠️ 「メールアドレスは既に確認済みです」メッセージ
- ⚠️ ステータス400でレスポンス
- ⚠️ メール送信されない

---

## **シナリオ5: エラーハンドリング**

### テストケース5-1: データベース接続エラー

1. MongoDB接続を一時的に無効化
2. 認証URLにアクセス

### テストケース5-2: メール送信エラー

1. 無効なResend APIキーを設定
2. 再送信を実行

### テストケース5-3: ネットワークエラー

1. ネットワークを無効化
2. フロントエンドで認証を実行

---

## 🔍 データベース状態確認

### MongoDB直接確認コマンド

```javascript
// ユーザーの現在状態確認
db.users.findOne(
  { email: "test@example.com" },
  {
    email: 1,
    emailVerified: 1,
    emailVerificationToken: 1,
    emailVerificationExpires: 1,
    createdAt: 1,
    updatedAt: 1
  }
)

// 認証前の状態例
{
  "_id": "...",
  "email": "test@example.com",
  "emailVerified": false,
  "emailVerificationToken": "ABC123...",
  "emailVerificationExpires": ISODate("2024-01-02T12:00:00Z"),
  "createdAt": "...",
  "updatedAt": "..."
}

// 認証後の状態例
{
  "_id": "...",
  "email": "test@example.com",
  "emailVerified": true,
  "emailVerificationToken": null,
  "emailVerificationExpires": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## 📊 チェックリスト

### UI/UX チェックポイント

- [ ] ローディング状態の表示
- [ ] 適切なアイコンと色の使用
- [ ] レスポンシブデザインの動作
- [ ] アクセシビリティ（キーボードナビゲーション）
- [ ] エラーメッセージの日本語表示
- [ ] カウントダウン機能の動作
- [ ] 再送信ダイアログの動作

### API レスポンス チェックポイント

- [ ] 適切なHTTPステータスコード
- [ ] JSON構造の統一性
- [ ] エラーコードの一貫性
- [ ] セキュリティヘッダーの存在

### データベース チェックポイント

- [ ] トークンの生成と削除
- [ ] 有効期限の設定と検証
- [ ] フィールドの適切な更新
- [ ] インデックスの効率性

### セキュリティ チェックポイント

- [ ] トークンの一意性
- [ ] 時間制限の実装
- [ ] レート制限の動作
- [ ] ログ出力の安全性

## 🤖 自動テスト実行

### Jest単体テスト

```bash
npm test -- auth
```

### E2Eテスト（Playwright）

```bash
npm run test:e2e
```

### API統合テスト

```bash
npm run test:api
```

## 🐛 よくある問題とトラブルシューティング

### 問題1: メール送信されない

**原因**: Resend APIキーが無効またはドメイン未認証
**解決**: APIキーとドメイン設定を確認

### 問題2: データベース接続エラー

**原因**: MongoDB接続文字列が不正
**解決**: MONGODB_URI環境変数を確認

### 問題3: トークンが見つからない

**原因**: データベースでトークンが削除または期限切れ
**解決**: ユーザーテーブルの状態を確認

### 問題4: フロントエンド表示が崩れる

**原因**: Material UIテーマやCSSの問題
**解決**: ブラウザの開発者ツールでスタイルを確認

## 📈 パフォーマンステスト

### レスポンス時間測定

```bash
# APIレスポンス時間測定
curl -w "@curl-format.txt" -s -o /dev/null \
  "http://localhost:3001/api/auth/verify?token=test_token"
```

### 同時アクセステスト

```bash
# Apache Bench使用例
ab -n 100 -c 10 "http://localhost:3001/auth/verify?token=test"
```

## 📝 テスト結果記録

テスト実行時は以下の情報を記録してください：

- 実行日時
- 使用環境（OS、ブラウザ、Node.jsバージョン）
- 各シナリオの結果（成功/失敗）
- エラーメッセージ（該当する場合）
- データベース状態の変更
- パフォーマンス指標

## 🎯 成功基準

すべてのテストシナリオで以下を満たすこと：

1. **機能要件**: 各シナリオが期待通りに動作する
2. **パフォーマンス**: APIレスポンス時間が500ms以下
3. **セキュリティ**: 不正なアクセスを適切に拒否する
4. **ユーザビリティ**: 直感的で分かりやすいUI/UX
5. **信頼性**: エラー状況でも適切に復旧できる

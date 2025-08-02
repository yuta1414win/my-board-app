# データベース仕様書

## 1. データベース概要

### 1.1 基本情報
- **データベース**: MongoDB
- **ODM**: Mongoose 8.17.0
- **文字エンコード**: UTF-8
- **コネクション**: 単一インスタンス（開発環境）

### 1.2 接続設定
- **接続ファイル**: `lib/mongodb.js`
- **環境変数**: `MONGODB_URI`
- **接続プール**: グローバルキャッシュ使用
- **接続オプション**: `bufferCommands: false`

### 1.3 データベース構成
- **コレクション数**: 1
- **主要コレクション**: `posts`
- **インデックス**: デフォルト（`_id`のみ）

## 2. スキーマ定義

### 2.1 Postコレクション

#### ファイル位置
- **パス**: `models/Post.js`
- **モデル名**: `Post`
- **コレクション名**: `posts`（Mongooseによる自動複数形化）

#### スキーマ構造

```javascript
const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'タイトルを入力してください'],
    maxlength: [50, 'タイトルは50文字以内にしてください'],
  },
  content: {
    type: String,
    required: [true, '本文を入力してください'],
    maxlength: [200, '本文は200文字以内にしてください'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
```

#### フィールド詳細

| フィールド名 | データ型 | 必須 | 制約 | デフォルト値 | 説明 |
|-------------|----------|------|------|-------------|------|
| _id | ObjectId | ✓ | MongoDB標準 | 自動生成 | プライマリキー |
| title | String | ✓ | 最大50文字 | なし | 投稿タイトル |
| content | String | ✓ | 最大200文字 | なし | 投稿本文 |
| createdAt | Date | - | なし | Date.now | 作成日時 |
| updatedAt | Date | - | なし | Date.now | 更新日時 |

#### バリデーション詳細

##### title フィールド
- **必須**: `required: [true, 'タイトルを入力してください']`
- **最大長**: `maxlength: [50, 'タイトルは50文字以内にしてください']`
- **型検証**: String型のみ許可
- **空文字**: 空文字列は不可（required制約により）

##### content フィールド
- **必須**: `required: [true, '本文を入力してください']`
- **最大長**: `maxlength: [200, '本文は200文字以内にしてください']`
- **型検証**: String型のみ許可
- **改行処理**: 改行文字も文字数に含まれる

##### 日時フィールド
- **createdAt**: ドキュメント作成時に自動設定
- **updatedAt**: ドキュメント更新時に自動更新（preフック使用）

#### スキーマミドルウェア

##### preフック（保存前処理）
```javascript
PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});
```

- **動作**: 保存処理前にupdatedAtを現在日時に更新
- **対象**: create, save操作
- **注意**: findByIdAndUpdateでは実行されない

## 3. インデックス設計

### 3.1 現在のインデックス

#### プライマリインデックス
- **フィールド**: `_id`
- **タイプ**: Unique, Ascending
- **説明**: MongoDBデフォルト、自動作成

### 3.2 推奨インデックス（未実装）

#### 作成日時インデックス
```javascript
// 推奨設定
PostSchema.index({ createdAt: -1 });
```
- **目的**: 投稿一覧の降順ソート高速化
- **効果**: `find().sort({ createdAt: -1 })`の性能向上

#### 複合インデックス（将来拡張）
```javascript
// ユーザー機能実装時の推奨
PostSchema.index({ userId: 1, createdAt: -1 });
```

## 4. データ操作パターン

### 4.1 CRUD操作

#### 作成（Create）
```javascript
// 新規投稿作成
const post = await Post.create({
  title: "投稿タイトル",
  content: "投稿内容"
});
```

#### 読み取り（Read）
```javascript
// 全投稿取得（新しい順）
const posts = await Post.find({}).sort({ createdAt: -1 });

// 特定投稿取得
const post = await Post.findById(id);
```

#### 更新（Update）
```javascript
// 投稿更新
const post = await Post.findByIdAndUpdate(
  id, 
  { title, content }, 
  { new: true, runValidators: true }
);
```

#### 削除（Delete）
```javascript
// 投稿削除
const result = await Post.deleteOne({ _id: id });
```

### 4.2 クエリパフォーマンス

#### 現在の実装
- **一覧取得**: `find({}).sort({ createdAt: -1 })`
- **個別取得**: `findById(id)`
- **更新**: `findByIdAndUpdate(id, data, options)`
- **削除**: `deleteOne({ _id: id })`

#### パフォーマンス特性
- **一覧取得**: インデックス未設定のためフルスキャン
- **個別操作**: `_id`インデックス使用で高速
- **ソート**: メモリソート（インデックス未使用）

## 5. データ整合性

### 5.1 制約条件

#### 必須制約
- `title`: 必須入力
- `content`: 必須入力

#### 長さ制約
- `title`: 最大50文字
- `content`: 最大200文字

#### 型制約
- 全フィールドで型チェック実施
- Mongooseレベルでの検証

### 5.2 データ整合性の保証

#### トランザクション
- **現状**: 単一ドキュメント操作のみ
- **ACID**: 単一ドキュメントレベルで保証
- **複数操作**: 現在未対応

#### リレーショナル整合性
- **外部キー**: なし（現在は単一コレクション）
- **参照整合性**: 不要（現在の仕様では）

## 6. セキュリティ考慮事項

### 6.1 実装済み対策

#### 入力検証
- Mongooseスキーマレベルでの型・長さ検証
- 必須フィールドのチェック
- 自動的な型変換

#### インジェクション対策
- MongooseのODM使用によりNoSQLインジェクション対策
- パラメータ化クエリの自動使用

### 6.2 考慮事項（未実装）

#### アクセス制御
- データベースレベルでのアクセス制御
- アプリケーションレベルでの認証・認可

#### 監査ログ
- データ変更履歴の記録
- アクセスログの保存

## 7. バックアップ・復旧

### 7.1 バックアップ戦略（推奨）

#### 定期バックアップ
```bash
# 推奨コマンド例
mongodump --uri="mongodb://localhost:27017/database_name" --out=/backup/path
```

#### Point-in-Time Recovery
- Oplogを有効化してPoint-in-Time復旧を可能にする
- レプリカセット構成の検討

### 7.2 復旧手順（推奨）

#### データ復元
```bash
# 復元コマンド例
mongorestore --uri="mongodb://localhost:27017/database_name" /backup/path
```

## 8. 監視・メンテナンス

### 8.1 監視項目（推奨）

#### パフォーマンス監視
- クエリ実行時間
- インデックス使用率
- 接続数
- メモリ使用量

#### データ監視
- コレクションサイズ
- ドキュメント数
- 成長率

### 8.2 メンテナンス作業

#### 定期メンテナンス
- インデックスの最適化
- 統計情報の更新
- 不要データの削除（現在は手動削除のみ）

## 9. 拡張計画

### 9.1 短期的な改善

#### インデックス追加
```javascript
// 実装予定
PostSchema.index({ createdAt: -1 });
```

#### バリデーション強化
```javascript
// XSS対策等の追加バリデーション
title: {
  type: String,
  required: [true, 'タイトルを入力してください'],
  maxlength: [50, 'タイトルは50文字以内にしてください'],
  validate: {
    validator: function(v) {
      return !/<[^>]*>/g.test(v); // HTMLタグ禁止
    },
    message: 'HTMLタグは使用できません'
  }
}
```

### 9.2 中長期的な拡張

#### ユーザー管理機能
```javascript
// Userスキーマ（計画）
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Postスキーマ拡張
const PostSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: Date,
  updatedAt: Date
});
```

#### カテゴリ機能
```javascript
// Categoryスキーマ（計画）
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

// Postスキーマ拡張
const PostSchema = new mongoose.Schema({
  // 既存フィールド
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  tags: [String]
});
```

#### 返信機能
```javascript
// Replyスキーマ（計画）
const ReplySchema = new mongoose.Schema({
  content: { type: String, required: true, maxlength: 500 },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
```

## 10. データサンプル

### 10.1 基本的なドキュメント例

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "title": "Next.jsで掲示板を作ってみました",
  "content": "初めてNext.jsを使って掲示板アプリを作成しました。\nReactとMongoDBの組み合わせは使いやすいですね。",
  "createdAt": ISODate("2024-01-01T12:00:00.000Z"),
  "updatedAt": ISODate("2024-01-01T12:00:00.000Z")
}
```

### 10.2 バリデーションエラーケース

#### 文字数超過
```json
{
  "title": "これは50文字を超える非常に長いタイトルの例です。この投稿は失敗します。",
  "content": "正常な内容"
}
// エラー: "タイトルは50文字以内にしてください"
```

#### 必須フィールド不足
```json
{
  "content": "タイトルがない投稿"
}
// エラー: "タイトルを入力してください"
```

## 11. 開発・テスト環境

### 11.1 ローカル開発環境

#### MongoDB設定
```javascript
// 接続URI例（開発環境）
MONGODB_URI=mongodb://localhost:27017/my-board-app
```

#### テストデータ
```javascript
// テスト用投稿データ生成
const testPosts = [
  {
    title: "テスト投稿1",
    content: "これはテスト用の投稿です。"
  },
  {
    title: "テスト投稿2", 
    content: "2番目のテスト投稿です。\n改行も含まれています。"
  }
];
```

### 11.2 本番環境考慮事項

#### セキュリティ
- MongoDB認証の有効化
- SSL/TLS接続の使用
- 適切なネットワークセキュリティ

#### パフォーマンス
- インデックスの適切な設定
- 接続プールの最適化
- 読み取り専用レプリカの活用
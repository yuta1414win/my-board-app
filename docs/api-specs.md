# API仕様書

## 1. API概要

### 1.1 基本情報
- **ベースURL**: `/api`
- **プロトコル**: HTTP/HTTPS
- **データ形式**: JSON
- **文字エンコード**: UTF-8
- **認証**: なし（現行版）

### 1.2 共通レスポンス形式

#### 成功レスポンス
```json
{
  "success": true,
  "data": {
    // レスポンスデータ
  }
}
```

#### エラーレスポンス
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

### 1.3 HTTPステータスコード

| ステータスコード | 意味 | 使用場面 |
|-----------------|------|----------|
| 200 | OK | 正常な取得・更新・削除 |
| 201 | Created | 正常な作成 |
| 400 | Bad Request | リクエストエラー、バリデーションエラー |
| 404 | Not Found | リソースが存在しない |
| 405 | Method Not Allowed | 許可されていないHTTPメソッド |
| 500 | Internal Server Error | サーバー内部エラー |

## 2. エンドポイント詳細

### 2.1 投稿一覧取得・新規作成 (`/api/posts`)

#### ファイル
- **パス**: `pages/api/posts/index.js`
- **依存関係**: `lib/mongodb.js`, `models/Post.js`

---

#### 2.1.1 投稿一覧取得

**エンドポイント**: `GET /api/posts`

##### リクエスト
```http
GET /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json
```

##### レスポンス

**成功時 (200)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "投稿タイトル",
      "content": "投稿内容です。\n改行も保持されます。",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "別の投稿",
      "content": "別の投稿内容",
      "createdAt": "2024-01-01T11:30:00.000Z",
      "updatedAt": "2024-01-01T11:45:00.000Z"
    }
  ]
}
```

**エラー時 (400)**:
```json
{
  "success": false,
  "error": "データベースエラーの詳細"
}
```

##### 仕様詳細
- 投稿は作成日時の降順（新しい順）で返される
- データベース接続エラー時は400エラー
- 空の配列が返される場合もある（投稿が0件の場合）

---

#### 2.1.2 新規投稿作成

**エンドポイント**: `POST /api/posts`

##### リクエスト
```http
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "title": "新しい投稿のタイトル",
  "content": "新しい投稿の内容です。"
}
```

##### リクエストボディ

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|----|----|------|------|
| title | String | ✓ | 1-50文字 | 投稿タイトル |
| content | String | ✓ | 1-200文字 | 投稿内容 |

##### バリデーションルール
- **title**: 必須、最大50文字、空文字列不可
- **content**: 必須、最大200文字、空文字列不可
- 両フィールドとも前後の空白は許可されるが、trim後に空文字列の場合はエラー

##### レスポンス

**成功時 (201)**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "新しい投稿のタイトル",
    "content": "新しい投稿の内容です。",
    "createdAt": "2024-01-01T13:00:00.000Z",
    "updatedAt": "2024-01-01T13:00:00.000Z"
  }
}
```

**バリデーションエラー時 (400)**:
```json
{
  "success": false,
  "error": "タイトルは50文字以内にしてください"
}
```

##### 実装詳細
- Mongooseのバリデーション機能を使用
- createdAtとupdatedAtは自動設定
- バリデーションエラーはMongooseから返されるメッセージをそのまま返却

---

### 2.2 投稿の個別操作 (`/api/posts/[id]`)

#### ファイル
- **パス**: `pages/api/posts/[id].js`
- **依存関係**: `lib/mongodb.js`, `models/Post.js`

---

#### 2.2.1 投稿詳細取得

**エンドポイント**: `GET /api/posts/:id`

##### リクエスト
```http
GET /api/posts/507f1f77bcf86cd799439011 HTTP/1.1
Host: localhost:3000
```

##### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| id | String | ✓ | MongoDB ObjectId（24文字の16進数） |

##### レスポンス

**成功時 (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "投稿タイトル",
    "content": "投稿内容です。",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**投稿が存在しない場合 (404)**:
```json
{
  "success": false,
  "error": "投稿が見つかりません"
}
```

**不正なID形式の場合 (400)**:
```json
{
  "success": false,
  "error": "Cast to ObjectId failed for value \"invalid-id\" at path \"_id\" for model \"Post\""
}
```

---

#### 2.2.2 投稿更新

**エンドポイント**: `PUT /api/posts/:id`

##### リクエスト
```http
PUT /api/posts/507f1f77bcf86cd799439011 HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "title": "更新されたタイトル",
  "content": "更新された内容です。"
}
```

##### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| id | String | ✓ | MongoDB ObjectId |

##### リクエストボディ

| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|----|----|------|------|
| title | String | ✓ | 1-50文字 | 更新後のタイトル |
| content | String | ✓ | 1-200文字 | 更新後の内容 |

##### レスポンス

**成功時 (200)**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "更新されたタイトル",
    "content": "更新された内容です。",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T13:30:00.000Z"
  }
}
```

**投稿が存在しない場合 (404)**:
```json
{
  "success": false,
  "error": "投稿が見つかりません"
}
```

**バリデーションエラー時 (400)**:
```json
{
  "success": false,
  "error": "本文は200文字以内にしてください"
}
```

##### 実装詳細
- `findByIdAndUpdate` with `new: true, runValidators: true`
- updatedAtは自動更新（Mongooseのpre saveフック）
- バリデーションは新規作成時と同じルール

---

#### 2.2.3 投稿削除

**エンドポイント**: `DELETE /api/posts/:id`

##### リクエスト
```http
DELETE /api/posts/507f1f77bcf86cd799439011 HTTP/1.1
Host: localhost:3000
```

##### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| id | String | ✓ | MongoDB ObjectId |

##### レスポンス

**成功時 (200)**:
```json
{
  "success": true,
  "data": {}
}
```

**投稿が存在しない場合 (404)**:
```json
{
  "success": false,
  "error": "投稿が見つかりません"
}
```

**不正なID形式の場合 (400)**:
```json
{
  "success": false,
  "error": "Cast to ObjectId failed for value \"invalid-id\" at path \"_id\" for model \"Post\""
}
```

##### 実装詳細
- `deleteOne({ _id: id })` を使用
- deletedCountが0の場合は404エラー
- 論理削除ではなく物理削除

---

## 3. エラーハンドリング

### 3.1 共通エラー

#### 3.1.1 メソッド不許可
すべてのエンドポイントで未対応のHTTPメソッドを使用した場合：

**レスポンス (405)**:
```json
{
  "success": false,
  "error": "メソッドが許可されていません"
}
```

#### 3.1.2 データベース接続エラー
MongoDB接続に失敗した場合：

**レスポンス (400)**:
```json
{
  "success": false,
  "error": "MONGODB_URIが定義されていません"
}
```

### 3.2 バリデーションエラー詳細

#### 3.2.1 タイトル関連
- 空文字列: `"タイトルを入力してください"`
- 50文字超過: `"タイトルは50文字以内にしてください"`

#### 3.2.2 本文関連
- 空文字列: `"本文を入力してください"`
- 200文字超過: `"本文は200文字以内にしてください"`

#### 3.2.3 ObjectId関連
- 不正な形式: `"Cast to ObjectId failed for value..."`

## 4. セキュリティ考慮事項

### 4.1 実装済み対策
- **入力検証**: Mongooseスキーマレベルでのバリデーション
- **SQLインジェクション**: MongooseのODM使用により対策済み
- **NoSQLインジェクション**: Mongooseの型安全性により対策済み

### 4.2 未実装の考慮事項
- **認証・認可**: 現在未実装（全ユーザーが全操作可能）
- **レート制限**: API呼び出し頻度の制限なし
- **入力サニタイゼーション**: HTMLタグ等の処理なし
- **CORS**: 現在設定なし

## 5. パフォーマンス考慮事項

### 5.1 現在の実装
- データベースインデックス: createdAtフィールド（暗黙的な_idインデックスのみ）
- ページネーション: 未実装
- キャッシュ: 未実装

### 5.2 推奨改善点
- 投稿一覧にページネーション追加
- createdAtフィールドへのインデックス追加
- レスポンスキャッシュの実装
- 圧縮の有効化

## 6. 使用例

### 6.1 基本的な操作フロー

#### 新規投稿から削除まで
```javascript
// 1. 新規投稿作成
const createResponse = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'テスト投稿',
    content: 'テスト内容です。'
  })
});
const newPost = await createResponse.json();
console.log('作成された投稿ID:', newPost.data._id);

// 2. 投稿一覧取得
const listResponse = await fetch('/api/posts');
const posts = await listResponse.json();
console.log('投稿数:', posts.data.length);

// 3. 特定投稿取得
const getResponse = await fetch(`/api/posts/${newPost.data._id}`);
const post = await getResponse.json();
console.log('取得した投稿:', post.data.title);

// 4. 投稿更新
const updateResponse = await fetch(`/api/posts/${newPost.data._id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '更新されたタイトル',
    content: '更新された内容です。'
  })
});
const updatedPost = await updateResponse.json();

// 5. 投稿削除
const deleteResponse = await fetch(`/api/posts/${newPost.data._id}`, {
  method: 'DELETE'
});
const deleteResult = await deleteResponse.json();
console.log('削除成功:', deleteResult.success);
```

### 6.2 エラーハンドリング例

```javascript
async function createPost(title, content) {
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.data;
  } catch (error) {
    console.error('投稿作成エラー:', error.message);
    throw error;
  }
}

// 使用例
try {
  const post = await createPost('', '内容'); // タイトル空でエラー
} catch (error) {
  console.log(error.message); // "タイトルを入力してください"
}
```

## 7. テストケース

### 7.1 POST /api/posts

#### 正常系
- [ ] 有効なタイトル・本文で201が返される
- [ ] 作成されたデータが正しく返される
- [ ] createdAt/updatedAtが設定される

#### 異常系
- [ ] タイトル未入力で400エラー
- [ ] タイトル51文字で400エラー
- [ ] 本文未入力で400エラー
- [ ] 本文201文字で400エラー
- [ ] Content-Type未指定で適切にエラーハンドリング

### 7.2 GET /api/posts

#### 正常系
- [ ] 投稿一覧が新しい順で返される
- [ ] 空配列が正常に返される（投稿0件時）

#### 異常系
- [ ] データベース接続エラー時の適切なエラーレスポンス

### 7.3 GET /api/posts/:id

#### 正常系
- [ ] 存在する投稿の詳細が返される

#### 異常系
- [ ] 存在しないIDで404エラー
- [ ] 不正なID形式で400エラー

### 7.4 PUT /api/posts/:id

#### 正常系
- [ ] 投稿が正常に更新される
- [ ] updatedAtが更新される

#### 異常系
- [ ] 存在しないIDで404エラー
- [ ] バリデーションエラーで400エラー

### 7.5 DELETE /api/posts/:id

#### 正常系
- [ ] 投稿が正常に削除される

#### 異常系
- [ ] 存在しないIDで404エラー
- [ ] 不正なID形式で400エラー
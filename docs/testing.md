# テスト仕様書

## 1. テスト概要

本プロジェクトでは、品質保証のために以下の種類のテストを実装しています：

- **単体テスト (Unit Tests)**: JestとReact Testing Libraryを使用
- **結合テスト (E2E Tests)**: Playwrightを使用

## 2. テスト構成

### 2.1 ディレクトリ構造

```
my-board-app/
├── __tests__/                 # Jestテストファイル
│   ├── components/            # コンポーネントテスト
│   │   └── BoardPage.test.js  # 掲示板コンポーネントのテスト
│   ├── api/                   # APIテスト
│   │   └── posts.test.js      # 投稿API のテスト
│   └── utils/                 # ユーティリティテスト
│       └── dateUtils.test.js  # 日付ユーティリティのテスト
├── tests/e2e/                 # Playwrightテストファイル
│   └── board.spec.js          # E2Eテスト
├── utils/                     # ユーティリティ関数
│   └── dateUtils.js           # 日付処理関数
├── jest.config.js             # Jest設定
├── jest.setup.js              # Jestセットアップ
└── playwright.config.js       # Playwright設定
```

### 2.2 テスト用依存関係

```json
{
  "devDependencies": {
    "@playwright/test": "^1.54.2",
    "@testing-library/jest-dom": "^6.6.4",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "jest": "^30.0.5",
    "jest-environment-jsdom": "^30.0.5",
    "node-mocks-http": "^1.17.2"
  }
}
```

## 3. 単体テスト (Jest)

### 3.1 実行方法

```bash
# 全ての単体テストを実行
npm test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage

# 特定のテストファイルのみ実行
npm test -- --testPathPatterns="utils"
```

### 3.2 テスト対象

#### 3.2.1 ユーティリティ関数テスト (`__tests__/utils/dateUtils.test.js`)

**テスト対象**: `utils/dateUtils.js`

**テストケース**:
- `formatDate`: 日付フォーマット関数
  - 有効な日付文字列の正しいフォーマット
  - Dateオブジェクトの正しいフォーマット
  - 無効な日付文字列のエラーハンドリング
  - null/undefinedのエラーハンドリング

- `countCharacters`: 文字数カウント関数
  - 通常文字列の文字数カウント
  - 改行文字を含む文字列の処理
  - 非文字列の処理

- `isEmpty`: 空判定関数
  - 空文字列の判定
  - 空白のみの文字列の判定
  - null/undefinedの判定
  - 非文字列の判定

- `validatePost`: 投稿データバリデーション関数
  - 有効なデータの検証
  - タイトル・本文の必須チェック
  - 文字数制限チェック
  - 複数エラーの処理
  - 境界値テスト

#### 3.2.2 APIテスト (`__tests__/api/posts.test.js`)

**テスト対象**: `pages/api/posts/index.js`, `pages/api/posts/[id].js`

**テストケース**:
- `GET /api/posts`: 投稿一覧取得
  - 正常な投稿一覧の取得
  - データベースエラーの処理

- `POST /api/posts`: 新規投稿作成
  - 有効なデータでの投稿作成
  - バリデーションエラーの処理

- `GET /api/posts/:id`: 個別投稿取得
  - 存在する投稿の取得
  - 存在しない投稿の404エラー

- `PUT /api/posts/:id`: 投稿更新
  - 正常な投稿更新
  - 存在しない投稿の404エラー

- `DELETE /api/posts/:id`: 投稿削除
  - 正常な投稿削除
  - 存在しない投稿の404エラー

#### 3.2.3 コンポーネントテスト (`__tests__/components/BoardPage.test.js`)

**テスト対象**: `src/app/board/page.js`

**テストケース**:
- 初期表示
  - ローディング状態の表示
  - 投稿0件時のメッセージ表示
  - データ取得エラーの処理

- 新規投稿
  - 有効な投稿の作成
  - 文字数カウンターの動作
  - 文字数制限のバリデーション
  - 空入力時のボタン無効化
  - 投稿失敗時のエラー表示

### 3.3 モック設定

#### 3.3.1 Next.js関連モック
```javascript
// jest.setup.js
jest.mock('next/navigation', () => ({
  useRouter: () => ({ /* モック実装 */ }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
}));
```

#### 3.3.2 MongoDB/Mongooseモック
```javascript
// APIテストでのモック
jest.mock('../../lib/mongodb', () => jest.fn(() => Promise.resolve()));
jest.mock('../../models/Post', () => ({ /* モック実装 */ }));
```

#### 3.3.3 fetchモック
```javascript
// グローバルfetchモック
global.fetch = jest.fn();
```

## 4. E2Eテスト (Playwright)

### 4.1 実行方法

```bash
# 全てのE2Eテストを実行
npm run test:e2e

# UIモードで実行（デバッグ用）
npm run test:e2e:ui

# ヘッドありモードで実行（ブラウザ表示）
npm run test:e2e:headed

# 全てのテスト（単体＋E2E）を実行
npm run test:all
```

### 4.2 テスト対象

#### 4.2.1 基本的なナビゲーション
- ホームページから掲示板への遷移

#### 4.2.2 投稿作成フロー
- 新規投稿の作成
- 文字数制限のバリデーション
- 空投稿の防止

#### 4.2.3 投稿編集フロー
- 投稿の編集
- 編集のキャンセル

#### 4.2.4 投稿削除フロー
- 投稿の削除（確認ダイアログ含む）
- 削除のキャンセル

#### 4.2.5 レスポンシブデザイン
- モバイル表示での動作確認

#### 4.2.6 アクセシビリティ
- キーボードナビゲーション
- フォームラベルの適切な設定

#### 4.2.7 エラーハンドリング
- ネットワークエラー時の動作

### 4.3 テスト環境

#### 4.3.1 ブラウザサポート
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

#### 4.3.2 自動サーバー起動
```javascript
// playwright.config.js
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
}
```

## 5. テスト実行の前提条件

### 5.1 環境変数
```bash
# テスト用MongoDB URI
MONGODB_URI=mongodb://localhost:27017/test-db
```

### 5.2 必要なサービス
- MongoDB（APIテスト用）
- Next.js開発サーバー（E2Eテスト用）

## 6. CI/CD統合

### 6.1 GitHub Actions設定例
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npx playwright install
      - run: npm run test:e2e
```

## 7. テスト結果の確認

### 7.1 カバレッジレポート
```bash
npm run test:coverage
```
- カバレッジレポートは `coverage/` ディレクトリに出力
- HTML形式で詳細な結果を確認可能

### 7.2 Playwrightレポート
```bash
npm run test:e2e
```
- テスト実行後、HTMLレポートが自動で開く
- 失敗時のスクリーンショットとビデオが保存される

## 8. トラブルシューティング

### 8.1 よくある問題

#### 8.1.1 テストがタイムアウトする
```bash
# タイムアウト時間を延長
npm test -- --testTimeout=30000
```

#### 8.1.2 E2Eテストでブラウザが起動しない
```bash
# Playwrightブラウザを再インストール
npx playwright install
```

#### 8.1.3 モックが正しく動作しない
- `jest.clearAllMocks()` がテスト間で実行されているか確認
- モックの設定順序を確認

### 8.2 デバッグ方法

#### 8.2.1 単体テスト
```javascript
// console.logを使ったデバッグ
console.log('Debug:', variable);

// debuggerブレークポイント
debugger;
```

#### 8.2.2 E2Eテスト
```javascript
// スクリーンショット取得
await page.screenshot({ path: 'debug.png' });

// ページ一時停止
await page.pause();
```

## 9. テスト品質指標

### 9.1 目標値
- **単体テストカバレッジ**: 80%以上
- **E2Eテスト成功率**: 95%以上
- **テスト実行時間**: 単体テスト5分以内、E2E10分以内

### 9.2 継続的改善
- 新機能追加時は対応するテストも追加
- テストの実行時間短縮の検討
- フレイキーテストの特定と修正
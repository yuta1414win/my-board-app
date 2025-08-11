# 会員限定ページ保護システム トラブルシューティングガイド

## 🚨 よくある問題と解決方法

### 📋 目次

1. [認証・リダイレクト関連](#認証リダイレクト関連)
2. [ページ表示・UI関連](#ページ表示ui関連)
3. [API・ネットワーク関連](#apiネットワーク関連)
4. [テスト実行関連](#テスト実行関連)
5. [環境・設定関連](#環境設定関連)
6. [パフォーマンス関連](#パフォーマンス関連)

---

## 🔒 認証・リダイレクト関連

### ❌ 問題: 保護されたページに直接アクセスできてしまう

**症状**:

- 未ログイン状態で `/dashboard` にアクセスしてもコンテンツが表示される
- ログインページにリダイレクトされない

**原因と解決方法**:

**1. ミドルウェアが動作していない**

```bash
# middleware.ts の存在確認
ls src/middleware.ts

# ファイルが存在しない場合は作成が必要
```

**解決方法**:

```typescript
// src/middleware.ts の内容確認
export async function middleware(request: NextRequest) {
  // middleware の実装が正しいか確認
}

// config の設定確認
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**2. パスのマッチングが正しくない**

```typescript
// 保護されたパスの設定確認
const protectedPaths = [
  '/board',
  '/profile',
  '/settings',
  '/dashboard', // ← 追加されているか確認
  '/posts/new', // ← 追加されているか確認
  '/posts/edit',
  '/posts/[id]/edit',
];
```

### ❌ 問題: ログイン後に元のページに戻らない

**症状**:

- ログイン成功後、`/dashboard` ではなく `/board` に遷移する
- callbackURL が無視される

**原因と解決方法**:

**1. callbackURL の設定漏れ**

```typescript
// src/app/auth/login/page.tsx を確認
const callbackUrl = searchParams.get('callbackUrl') || '/board';

// signIn の呼び出し確認
const result = await signIn('credentials', {
  email: formData.email,
  password: formData.password,
  callbackUrl, // ← これが設定されているか確認
  redirect: false,
});
```

**2. NextAuth設定の問題**

```typescript
// src/lib/auth.ts または pages/api/auth/[...nextauth].ts
export const authOptions: NextAuthOptions = {
  // ...
  pages: {
    signIn: '/auth/login', // カスタムログインページを使用
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      // リダイレクト処理を確認
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};
```

### ❌ 問題: ログイン済みなのに認証ページにアクセスできる

**症状**:

- ログイン済み状態で `/auth/login` にアクセスしても `/board` にリダイレクトされない

**原因と解決方法**:

**1. ミドルウェアでの認証ページチェック漏れ**

```typescript
// src/middleware.ts
const authPaths = ['/auth/login', '/auth/signin', '/auth/register'];

// 既にログインしている場合の処理確認
if (authPaths.some((path) => pathname.startsWith(path))) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    return NextResponse.redirect(new URL('/board', request.url)); // ← この処理があるか確認
  }
}
```

### ❌ 問題: セッション期限切れでエラーが発生する

**症状**:

- ページアクセス時に「セッションエラー」や認証エラーが表示される
- APIコールで401エラーが発生する

**解決方法**:

**1. セッション設定の確認**

```typescript
// NextAuth設定でセッションの期限を確認
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // JWTの有効期限
  },
};
```

**2. エラーハンドリングの改善**

```typescript
// useRequireAuth フックでのエラー処理
useEffect(() => {
  if (status === 'unauthenticated') {
    const currentPath = window.location.pathname;
    const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`;
    router.push(loginUrl);
  }
}, [status, router, redirectTo]);
```

---

## 📱 ページ表示・UI関連

### ❌ 問題: ローディング状態が表示されない

**症状**:

- ページ遷移時にローディング表示が出ない
- フォーム送信時にローディングアニメーションが表示されない

**解決方法**:

**1. ローディング状態の実装確認**

```typescript
// useRequireAuth フックの使用確認
const { loading, authenticated, user } = useRequireAuth();

if (loading) {
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <LinearProgress />
        <Typography variant="body2">読み込み中...</Typography>
      </Box>
    </Container>
  );
}
```

**2. Material UI コンポーネントの正しい使用**

```typescript
// LinearProgress の追加
import { LinearProgress } from '@mui/material';

// フォーム送信時のローディング
{submitting && <LinearProgress />}
```

### ❌ 問題: レスポンシブデザインが機能しない

**症状**:

- モバイル表示でレイアウトが崩れる
- タッチ操作が反応しない

**解決方法**:

**1. Material UI のブレークポイント確認**

```typescript
// Grid システムの正しい使用
<Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={3}>  {/* レスポンシブ設定 */}
    <Card>...</Card>
  </Grid>
</Grid>

// sx prop でのレスポンシブ対応
sx={{
  fontSize: { xs: '1rem', sm: '1.2rem', md: '1.5rem' },
  p: { xs: 2, sm: 3, md: 4 }
}}
```

**2. viewport meta タグの確認**

```html
<!-- pages/_document.tsx または layout.tsx -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### ❌ 問題: フォームバリデーションが動作しない

**症状**:

- 入力エラー時にエラーメッセージが表示されない
- 無効な入力でも送信できてしまう

**解決方法**:

**1. バリデーション状態の管理確認**

```typescript
const [formData, setFormData] = useState({ name: '', bio: '' });
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // バリデーション処理
  if (!formData.name.trim()) {
    setError('名前を入力してください');
    return;
  }

  if (formData.name.length > 50) {
    setError('名前は50文字以内で入力してください');
    return;
  }

  // エラーをクリア
  setError(null);
};
```

**2. エラー表示の実装**

```typescript
{error && (
  <Alert severity="error" sx={{ mb: 3 }}>
    {error}
  </Alert>
)}
```

---

## 🔌 API・ネットワーク関連

### ❌ 問題: API認証が失敗する

**症状**:

- APIコール時に401 Unauthorized エラーが発生
- ログイン済みなのに認証エラーになる

**解決方法**:

**1. サーバーサイドでの認証チェック確認**

```typescript
// API ルート (/api/user/profile/route.ts)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    // ← この条件が正しいか確認
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // ...
}
```

**2. authOptions のインポートパス確認**

```typescript
// パスが正しいか確認
import { authOptions } from '@/lib/auth'; // ← パスが正しいか
```

**3. セッション情報のデバッグ**

```typescript
// 一時的にセッション内容をログ出力
console.log('Session:', session);
console.log('User:', session?.user);
console.log('Email:', session?.user?.email);
```

### ❌ 問題: CORS エラーが発生する

**症状**:

- ブラウザのコンソールに「CORS policy」エラーが表示される
- APIリクエストが失敗する

**解決方法**:

**1. Next.js のAPI設定確認**

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};
```

**2. 開発環境での確認**

```bash
# 開発サーバーが正しいポートで起動しているか確認
npm run dev
# → http://localhost:3000 で起動することを確認
```

### ❌ 問題: ネットワークエラーの処理ができていない

**症状**:

- オフライン時にエラー表示されない
- ネットワーク遅延時の対応ができていない

**解決方法**:

**1. エラーハンドリングの強化**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  setSubmitting(true);
  setError(null);

  try {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // 成功処理
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      setError(
        'ネットワークエラーが発生しました。インターネット接続を確認してください。'
      );
    } else if (error.message.includes('401')) {
      setError('認証エラーが発生しました。再ログインしてください。');
    } else {
      setError(error.message || 'エラーが発生しました');
    }
  } finally {
    setSubmitting(false);
  }
};
```

---

## 🧪 テスト実行関連

### ❌ 問題: E2Eテストが失敗する

**症状**:

- Playwright テストでタイムアウトエラーが発生
- テスト要素が見つからないエラー

**解決方法**:

**1. 開発サーバーの起動確認**

```bash
# テスト実行前に開発サーバーが起動していることを確認
npm run dev
# → http://localhost:3000 が応答することを確認

curl http://localhost:3000
```

**2. テスト用データの準備**

```bash
# テスト用ユーザーアカウントの作成
# データベースにテストユーザーが存在することを確認
```

**3. 待機時間の調整**

```typescript
// tests/e2e/auth/member-page-protection.spec.ts
// 待機時間を増やす
await expect(page.locator('h1')).toContainText('ダッシュボード', {
  timeout: 10000, // 10秒に延長
});

// 要素が完全に読み込まれるまで待機
await page.waitForLoadState('networkidle');
```

**4. セレクターの確認**

```typescript
// より具体的なセレクターを使用
await page.locator('[data-testid="dashboard-title"]').waitFor();

// または text-based セレクターの修正
await page.locator('text=ダッシュボード').first().waitFor();
```

### ❌ 問題: APIテスト（ユニットテスト）が失敗する

**症状**:

- Jest テストでモックが正しく動作しない
- 認証関連のテストが失敗する

**解決方法**:

**1. モック設定の確認**

```typescript
// __tests__/api/auth-protected-api.test.ts
// モックの設定が正しいか確認
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// モックのクリーンアップ確認
beforeEach(() => {
  jest.clearAllMocks();
});
```

**2. TypeScript の型エラー解決**

```typescript
// 型アサーションの使用
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

// または jest.mocked を使用（新しいバージョン）
const mockGetServerSession = jest.mocked(getServerSession);
```

### ❌ 問題: テストスクリプトが実行できない

**症状**:

- `./scripts/run-member-protection-tests.sh` が実行できない
- Permission denied エラー

**解決方法**:

**1. 実行権限の付与**

```bash
chmod +x ./scripts/run-member-protection-tests.sh
```

**2. スクリプトの直接実行**

```bash
# bash で直接実行
bash ./scripts/run-member-protection-tests.sh

# または zsh で実行
zsh ./scripts/run-member-protection-tests.sh
```

**3. パッケージの依存関係確認**

```bash
# 必要なパッケージがインストールされているか確認
npm list @playwright/test
npm list jest

# 不足している場合はインストール
npm install @playwright/test --save-dev
npm install jest --save-dev
```

---

## ⚙️ 環境・設定関連

### ❌ 問題: 環境変数が読み込まれない

**症状**:

- `process.env.NEXTAUTH_SECRET` が undefined
- データベース接続エラー

**解決方法**:

**1. 環境変数ファイルの確認**

```bash
# .env.local ファイルの存在確認
ls -la .env.local

# ファイルの内容確認（秘密情報は表示されないよう注意）
cat .env.local | grep -v "SECRET\|PASSWORD\|KEY"
```

**2. 必須環境変数の設定**

```bash
# .env.local に以下の環境変数が設定されていることを確認
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
DATABASE_URL=your-database-url-here
```

**3. Next.js の再起動**

```bash
# 環境変数を追加/変更した場合は必ず再起動
npm run dev
```

### ❌ 問題: データベース接続エラー

**症状**:

- データベース関連の API でエラーが発生
- MongoDBまたは他DBへの接続が失敗

**解決方法**:

**1. データベースサーバーの起動確認**

```bash
# MongoDB の場合
mongosh --eval "db.runCommand('ping')"

# PostgreSQL の場合
pg_isready
```

**2. 接続設定の確認**

```typescript
// lib/mongodb.ts または lib/db.ts
const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URL environment variable');
}
```

**3. ファイアウォール・ネットワーク設定**

```bash
# ローカル環境でのポート確認
netstat -tuln | grep 27017  # MongoDB
netstat -tuln | grep 5432   # PostgreSQL
```

### ❌ 問題: TypeScript エラーが発生する

**症状**:

- 型チェックエラーでビルドが失敗
- IDE で型エラーが表示される

**解決方法**:

**1. 型定義ファイルの確認**

```bash
# 必要な型定義がインストールされているか確認
npm list @types/node
npm list @types/react
npm list next-auth

# 不足している場合はインストール
npm install @types/node @types/react --save-dev
```

**2. tsconfig.json の確認**

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"] // パスエイリアスの確認
    }
  }
}
```

---

## ⚡ パフォーマンス関連

### ❌ 問題: ページの読み込みが遅い

**症状**:

- ダッシュボードの表示に時間がかかる
- Lighthouse スコアが低い

**解決方法**:

**1. 画像の最適化**

```typescript
// next/image の使用
import Image from 'next/image';

<Image
  src={user?.image || ''}
  alt={user?.name || ''}
  width={100}
  height={100}
  style={{ borderRadius: '50%' }}
/>
```

**2. 動的インポートの使用**

```typescript
// 重いコンポーネントの遅延読み込み
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LinearProgress />
});
```

**3. バンドルサイズの分析**

```bash
# バンドルアナライザーのインストール
npm install @next/bundle-analyzer --save-dev

# 分析実行
ANALYZE=true npm run build
```

### ❌ 問題: メモリリークが発生する

**症状**:

- 長時間使用するとブラウザが重くなる
- メモリ使用量が増大し続ける

**解決方法**:

**1. useEffect のクリーンアップ**

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // 何かの処理
  }, 1000);

  // クリーンアップ関数
  return () => {
    clearInterval(interval);
  };
}, []);
```

**2. イベントリスナーの削除**

```typescript
useEffect(() => {
  const handleResize = () => {
    // リサイズ処理
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

---

## 🔍 デバッグ手法

### 1. ブラウザ開発者ツールの活用

**Network タブ**:

- API リクエスト/レスポンスの確認
- ステータスコードの確認
- レスポンス時間の測定

**Console タブ**:

- JavaScript エラーの確認
- ログ出力による状態確認

```typescript
console.log('Session:', session);
console.log('Form data:', formData);
```

**Application タブ**:

- Cookie の確認（セッション情報）
- Local Storage の確認
- Session Storage の確認

### 2. サーバーサイドでのデバッグ

**ログ出力**:

```typescript
// API ルートでのデバッグ
export async function POST(request: NextRequest) {
  console.log('API called:', request.method, request.url);

  const session = await getServerSession(authOptions);
  console.log('Session:', session);

  // ...
}
```

**エラーハンドリング**:

```typescript
try {
  // 処理
} catch (error) {
  console.error('Error details:', error);
  return NextResponse.json(
    { error: error.message, details: error },
    { status: 500 }
  );
}
```

### 3. テストでのデバッグ

**E2E テスト**:

```typescript
// スクリーンショットの撮影
await page.screenshot({ path: 'debug-screenshot.png' });

// ページの HTML 確認
const content = await page.content();
console.log('Page content:', content);

// 要素の存在確認
const element = await page.locator('h1');
console.log('Element count:', await element.count());
```

**API テスト**:

```typescript
// レスポンスの詳細確認
const response = await profileGET(request);
const data = await response.json();
console.log('Response status:', response.status);
console.log('Response data:', data);
```

---

## 📞 サポート・参考リソース

### 公式ドキュメント

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Material-UI Documentation](https://mui.com/)
- [Playwright Documentation](https://playwright.dev/)

### デバッグツール

- React Developer Tools
- Redux DevTools (状態管理ツール使用時)
- Network Monitor
- Performance Profiler

### コミュニティ

- [Next.js GitHub Issues](https://github.com/vercel/next.js/issues)
- [NextAuth.js Discussions](https://github.com/nextauthjs/next-auth/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/next.js)

---

## 📋 トラブルシューティング チェックリスト

### 問題が発生した場合の基本手順

**1. 環境確認**

- [ ] Node.js バージョンの確認
- [ ] パッケージの依存関係確認
- [ ] 環境変数の設定確認

**2. ログ確認**

- [ ] ブラウザコンソールエラーの確認
- [ ] ネットワークタブでのAPI通信確認
- [ ] サーバーサイドログの確認

**3. 設定確認**

- [ ] middleware.ts の設定確認
- [ ] NextAuth 設定の確認
- [ ] データベース接続の確認

**4. テスト実行**

- [ ] 関連するユニットテストの実行
- [ ] E2E テストの実行
- [ ] 手動テストでの再現確認

**5. 解決方法の適用**

- [ ] 原因の特定
- [ ] 修正の実施
- [ ] テストでの動作確認
- [ ] 他の機能への影響確認

**6. ドキュメント更新**

- [ ] 解決方法の記録
- [ ] 今後の予防策の検討
- [ ] ナレッジの共有

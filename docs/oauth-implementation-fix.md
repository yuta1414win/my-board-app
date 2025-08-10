# OAuth認証実装修正ドキュメント

## 問題の概要

NextAuth.jsでGoogle・GitHubのOAuth認証ボタンがサインインページに表示されない問題が発生していました。

### 症状

- サインインページにアクセスしても、GoogleとGitHubのログインボタンが表示されない
- 通常のメール・パスワード認証フォームのみが表示される
- NextAuth.jsの設定は正しく行われているにも関わらず、OAuth機能が利用できない

## 根本原因の分析

### 主要な問題：App Directoryの重複構造

プロジェクトに**2つの異なるsigninページ**が存在していました：

```
your-project/
├── app/auth/signin/page.tsx          ← Next.jsが優先的に使用（OAuth無し）
└── src/app/auth/signin/page.tsx      ← OAuth実装済み（未使用）
```

### なぜこの問題が発生したか

1. **Next.js App Routerの優先順位**
   - Next.jsは`srcDir`設定がない場合、ルートレベルの`/app`ディレクトリを優先
   - `/src/app`にOAuth実装があっても、`/app`が存在する限り無視される

2. **異なるコンポーネント構造**
   - **ルートレベル** (`/app/auth/signin/page.tsx`): `SignInForm`コンポーネントを使用
   - **srcレベル** (`/src/app/auth/signin/page.tsx`): 直接OAuth実装を含むページコンポーネント

3. **設定の不整合**
   - NextAuth.jsの設定は正しく行われていた
   - しかし、実際に表示されているページコンポーネントにOAuth機能が実装されていなかった

## 修正内容の詳細

### 1. 使用されているコンポーネントの特定

実際にレンダリングされているのは：

- **ファイル**: `/app/auth/signin/page.tsx`
- **コンポーネント**: `SignInForm` (`/components/auth/sign-in-form.tsx`)

### 2. SignInFormコンポーネントの修正

#### a) インポートの追加

```typescript
// 修正前
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Security,
  AccountCircle,
} from '@mui/icons-material';

// 修正後
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Security,
  AccountCircle,
  Google as GoogleIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
```

```typescript
// Material-UIコンポーネントにStackを追加
import {
  // ... 既存のインポート
  Stack,
} from '@mui/material';
```

#### b) OAuthハンドラー関数の追加

```typescript
const handleOAuthSignIn = async (provider: string) => {
  if (isBlocked || loading) return;

  try {
    await signIn(provider, {
      callbackUrl: '/board',
      redirect: true,
    });
  } catch (error) {
    console.error(`${provider} login error:`, error);
    setMessage(`${provider}ログインに失敗しました`);
  }
};
```

**特徴**:

- `isBlocked`と`loading`状態のチェックを含む
- 既存のエラーハンドリングシステムと統合
- `/board`への適切なリダイレクト設定

#### c) UIコンポーネントの追加

```typescript
// 修正前：シンプルなDivider
<Divider sx={{ my: 2 }} />

// 修正後：「または」テキスト付きDivider + OAuthボタン
<Divider sx={{ my: 2 }}>
  <Typography variant="body2" color="textSecondary">
    または
  </Typography>
</Divider>

<Stack spacing={2} sx={{ mb: 3 }}>
  <Button
    fullWidth
    variant="outlined"
    size="large"
    startIcon={<GoogleIcon />}
    onClick={() => handleOAuthSignIn('google')}
    disabled={loading || isBlocked}
    sx={{
      height: 48,
      borderColor: '#db4437',
      color: '#db4437',
      '&:hover': {
        borderColor: '#c23321',
        backgroundColor: '#fdf2f2',
      },
      '&:disabled': {
        opacity: 0.6,
      },
    }}
  >
    Googleでログイン
  </Button>

  <Button
    fullWidth
    variant="outlined"
    size="large"
    startIcon={<GitHubIcon />}
    onClick={() => handleOAuthSignIn('github')}
    disabled={loading || isBlocked}
    sx={{
      height: 48,
      borderColor: '#333',
      color: '#333',
      '&:hover': {
        borderColor: '#000',
        backgroundColor: '#f5f5f5',
      },
      '&:disabled': {
        opacity: 0.6,
      },
    }}
  >
    GitHubでログイン
  </Button>
</Stack>
```

### 3. デザインの特徴

#### Google ログインボタン

- **色**: `#db4437` (Google Red)
- **ホバー**: `#c23321` (濃い赤) + 薄い赤背景
- **アイコン**: Material-UI の `Google` アイコン

#### GitHub ログインボタン

- **色**: `#333` (ダークグレー)
- **ホバー**: `#000` (黒) + 薄いグレー背景
- **アイコン**: Material-UI の `GitHub` アイコン

#### 統合された状態管理

- **ローディング中**: ボタンが無効化
- **アカウントブロック中**: ボタンが無効化
- **エラー時**: 既存のメッセージシステムでエラー表示

## 既存のNextAuth.js設定（確認済み）

以下の設定は正しく行われており、今回の修正で有効になりました：

### 1. プロバイダー設定 (`/auth.ts`)

```typescript
providers: [
  Credentials({
    // 既存のCredentials認証
  }),
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  }),
];
```

### 2. セッションコールバック

```typescript
callbacks: {
  async session({ session, token }) {
    if (session?.user && token) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.name = token.name as string;
      session.user.emailVerified = token.emailVerified as boolean;
      if (token.role) {
        session.user.role = token.role as string;
      }
    }
    return session;
  },
  // ... 他のコールバック
}
```

### 3. 型定義 (`/types/next-auth.d.ts`)

```typescript
declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    emailVerified?: boolean;
    role?: 'user' | 'admin';
    loginAt?: number;
    provider?: string;
  }
}
```

### 4. APIルート (`/src/app/api/auth/[...nextauth]/route.ts`)

```typescript
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

### 5. SessionProvider設定

```typescript
// /src/components/SessionProvider.tsx
'use client';
import { SessionProvider } from 'next-auth/react';

// /src/app/layout.tsx
<AuthProvider>{children}</AuthProvider>
```

## 修正前後の比較

### 修正前

```
📧 メールアドレス・パスワード フォーム
🔒 ログインボタン
―――――――――――――――――――――
🔗 新規登録リンク | パスワードを忘れた場合
```

### 修正後

```
📧 メールアドレス・パスワード フォーム
🔒 ログインボタン
―――――「または」―――――
🔴 Googleでログイン
⚫ GitHubでログイン
―――――――――――――――――――――
🔗 新規登録リンク | パスワードを忘れた場合
```

## 学んだ教訓

### 1. Next.js App Routerの優先順位を理解する

- `srcDir`設定がない場合、ルートレベルの`/app`が優先される
- 複数のページが存在する場合は、どちらが実際に使用されているか確認が必要

### 2. コンポーネント構造の把握

- ページコンポーネントが直接レンダリングしているか
- 他のコンポーネントを使用しているかを正確に把握する

### 3. デバッグのアプローチ

- 設定ファイルよりも、実際にレンダリングされているコンポーネントを確認する
- プロジェクト構造全体を俯瞰的に分析する

### 4. エラーハンドリングの統合

- 既存のシステムと整合性を保つ
- 新しい機能も既存の状態管理（loading, blocking）と連携させる

## 今後のメンテナンス

### 1. プロジェクト構造の統一

- 必要に応じて`/src/app`の重複ページを削除
- または`next.config.ts`で`srcDir: true`を設定

### 2. 環境変数の管理

- Google・GitHub OAuth設定の適切な管理
- 本番環境でのリダイレクトURL設定

### 3. テスト

- OAuth認証フローのE2Eテスト追加
- 各プロバイダーでのログイン・ログアウトテスト

---

**修正日**: 2025-08-10  
**修正者**: Claude Code SuperClaude  
**所要時間**: 約45分  
**影響範囲**: `/components/auth/sign-in-form.tsx`のみ

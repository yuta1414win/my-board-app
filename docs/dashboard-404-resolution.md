# ダッシュボード404エラー解決記録

## 概要

2025年8月10日に発生したダッシュボードページの404エラー問題の解決記録。
初回実装時にダッシュボードが正常に表示されない問題が発生し、5回以上の修正試行を経て最終的に解決に至った。

## 問題の症状

- **現象**: `/dashboard` にアクセスしても404エラーが発生
- **期待値**: ダッシュボードページの正常表示
- **発生頻度**: 100%（一時的にUIが見えるも即座に404に変遷）
- **ユーザー影響**: ダッシュボード機能が完全に利用不可

## 根本原因分析

### 主要原因：Next.js App Routerの競合

1. **ディレクトリ構造の競合**

   ```
   プロジェクトルート/
   ├── app/                    # Next.js 13+ App Router (優先)
   │   ├── dashboard/          # 存在しない
   │   └── その他のページ
   └── src/
       └── app/               # 従来構造
           ├── dashboard/     # ダッシュボード実装済み
           │   └── page.tsx
           └── その他のページ
   ```

2. **Next.jsのルート解決順序**
   - Next.js 13以降では `app/` ディレクトリが `src/app/` より優先される
   - `app/dashboard/page.tsx` が存在しないため404エラー
   - `src/app/dashboard/page.tsx` が無視される

### 副次的原因

3. **モジュールパス解決エラー**
   - `@/hooks/useRequireAuth` のパス解決失敗
   - `app/` ディレクトリから `src/` 内のモジュールへのアクセス問題

4. **Next.jsキャッシュ問題**
   - `.next/` ディレクトリの古いキャッシュが残存
   - 修正後もキャッシュの影響で404継続

## 解決プロセス

### Step 1: ディレクトリ構造の統一

```bash
# ダッシュボードファイルを正しい場所にコピー
mkdir -p app/dashboard
cp src/app/dashboard/page.tsx app/dashboard/page.tsx
```

**理由**: Next.js App Routerの優先順位に従い、`app/` ディレクトリに統一

### Step 2: 依存関係の解決

```bash
# フックファイルを適切な場所に配置
mkdir -p hooks
cp src/hooks/useRequireAuth.ts hooks/useRequireAuth.ts
```

**修正内容**:

```typescript
// 修正前
import { useRequireAuth } from '@/hooks/useRequireAuth';

// 修正後
import { useRequireAuth } from '../../hooks/useRequireAuth';
```

### Step 3: キャッシュクリアと再起動

```bash
# 完全なキャッシュクリア
rm -rf .next
npm run dev
```

**効果**: 古いルート情報とモジュール解決キャッシュを完全に削除

### Step 4: ナビゲーション追加

ヘッダーコンポーネントにダッシュボードリンクを追加:

```typescript
// src/components/Header.tsx
<Button
  color="inherit"
  component={Link}
  href="/dashboard"
  sx={{ textDecoration: pathname === '/dashboard' ? 'underline' : 'none' }}
>
  ダッシュボード
</Button>
```

## 解決後の状態

### 正常動作確認

- **URL**: `http://localhost:3001/dashboard`
- **ステータス**: `200 OK`
- **コンパイル**: `✓ Compiled /dashboard in 1098ms (2927 modules)`
- **認証**: 正常動作（ミドルウェア保護有効）
- **ナビゲーション**: ヘッダーリンク動作確認済み

### アクセス方法

1. **直接URL**: `http://localhost:3001/dashboard`
2. **ナビゲーション**: ヘッダー「ダッシュボード」ボタン
3. **認証**: ログイン必須（ミドルウェア保護）

## 予防策と学習ポイント

### 開発時のベストプラクティス

1. **ディレクトリ構造の一貫性**
   - Next.js 13+では `app/` ディレクトリに統一
   - `src/app/` との混在を避ける
   - プロジェクト開始時に構造を決定

2. **モジュールパス管理**
   - tsconfig.jsonでパスエイリアスを正しく設定
   - 相対パスの一貫性を保つ
   - プロジェクト構造変更時は依存関係も同時に更新

3. **キャッシュ管理**
   - 構造変更後は必ずキャッシュクリア
   - 開発サーバー完全再起動を実施
   - `.next/` ディレクトリの削除を定期実施

### トラブルシューティング手順

1. **ファイル存在確認**

   ```bash
   find . -name "dashboard" -type d
   find . -path "*/dashboard/*" -name "*.tsx"
   ```

2. **コンパイル状況確認**
   - ブラウザDevToolsでネットワークタブ確認
   - サーバーログでコンパイル状況確認

3. **段階的修正**
   - ディレクトリ構造 → 依存関係 → キャッシュ → 再起動

## 技術詳細

### Next.js App Routerの動作

- **優先順位**: `app/` > `src/app/` > `pages/`
- **ファイルベースルーティング**: `app/dashboard/page.tsx` → `/dashboard`
- **キャッシュ戦略**: ファイル変更時の増分コンパイル

### 認証フロー

- **ミドルウェア**: `/dashboard` を保護対象に設定済み
- **セッション管理**: NextAuth.jsによるJWTベース認証
- **リダイレクト**: 未認証時は `/auth/login` へ自動転送

## 結論

今回の問題は、Next.js 13+のApp Routerにおけるディレクトリ構造の理解不足が主要因でした。
プロジェクト構造の一貫性とNext.jsの動作原理の理解が、このような問題の予防に重要であることが確認できました。

**解決までの試行回数**: 5回以上  
**最終解決時間**: 約2時間  
**主要技術**: Next.js 13+ App Router, TypeScript, NextAuth.js  
**状態**: ✅ 完全解決済み

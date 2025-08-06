# Branch Protection Setup Guide

## 概要
このプロジェクトでは、GitHub Branch Protectionを使用してmainブランチを保護し、テストが通らないとマージできないようにしています。

## 設定内容

### 1. CI/CDワークフロー
`.github/workflows/ci.yml`にて以下のテストを自動実行:
- **test (Node.js 18.x, 20.x)**: ユニットテストとE2Eテスト
- **build**: プロジェクトのビルド検証
- **security**: セキュリティ監査と依存関係チェック

### 2. ブランチ保護ルール
mainブランチに以下のルールが適用されています:

#### 必須要件
- ✅ Pull Request経由でのマージ必須
- ✅ 最低1人のレビュー承認が必要
- ✅ 新しいコミットで古いレビューが無効化
- ✅ 全ての会話が解決されている必要あり

#### ステータスチェック
以下のチェックが全て成功する必要があります:
- `test (18.x)` - Node.js 18.xでのテスト
- `test (20.x)` - Node.js 20.xでのテスト
- `build` - ビルドプロセス
- `security` - セキュリティチェック

#### 制限事項
- ❌ 強制プッシュ禁止
- ❌ ブランチ削除禁止
- ❌ 管理者も保護ルールを迂回不可（オプション）

## セットアップ手順

### 1. GitHub CLIのインストール
```bash
# macOS
brew install gh

# その他のOS
# https://cli.github.com/manual/installation
```

### 2. GitHub CLIでログイン
```bash
gh auth login
```

### 3. ブランチ保護の設定
```bash
# CI連携版のスクリプトを実行
./scripts/setup-branch-protection-ci.sh
```

### 4. ワークフローの有効化
```bash
git add .github/workflows/ci.yml
git commit -m "feat: Add CI workflow for automated testing"
git push
```

## 開発フロー

### 1. 新機能の開発
```bash
# featureブランチを作成
git checkout -b feature/your-feature

# 変更を実装
# ...

# コミット
git add .
git commit -m "feat: Add new feature"
git push -u origin feature/your-feature
```

### 2. Pull Requestの作成
```bash
# GitHub CLIを使用
gh pr create --title "Add new feature" --body "Description of changes"

# またはGitHubのWebUIから作成
```

### 3. CIテストの確認
- PRを作成すると自動的にCIが実行されます
- 全てのチェックが緑色になることを確認

### 4. レビューとマージ
- レビュアーの承認を得る
- 全ての会話を解決
- マージボタンが有効になったらマージ

## トラブルシューティング

### ステータスチェックが表示されない
初回は以下の手順で解決:
1. 一度PRを作成
2. CIが実行されるのを待つ
3. 必要に応じてブランチ保護設定を更新

### テストが失敗する場合
```bash
# ローカルでテストを実行
npm test
npm run test:e2e

# lintエラーの修正
npm run lint -- --fix
```

### 保護設定の確認
```bash
# 現在の設定を確認
gh api repos/{owner}/{repo}/branches/main/protection
```

## スクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| `setup-branch-protection-ci.sh` | CI連携を含むブランチ保護設定 |
| `setup-branch-protection.sh` | 汎用的なブランチ保護設定（3段階） |
| `setup-branch-protection-simple.sh` | シンプルなブランチ保護設定 |

## 参考リンク
- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
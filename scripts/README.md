# Git Branch Creation Script

## 概要
新機能開発を始める際に、一貫性のあるブランチ名で新しいGitブランチを作成するためのスクリプトです。

## 使用方法

```bash
# スクリプトを実行
./scripts/create-feature-branch.sh
```

## 機能

### 1. ブランチタイプの選択
- **feature**: 新機能開発
- **bugfix**: バグ修正（developベース）
- **hotfix**: 緊急修正（mainベース）
- **chore**: ビルド設定やツールの更新
- **docs**: ドキュメントのみの変更

### 2. 自動的な処理
- チケット番号の検証（例: MB-123）
- ブランチ名の自動生成
- 未コミット変更の検出とstash
- ベースブランチの自動選択と最新化
- リモートへのプッシュ（オプション）
- PR作成用URLの表示（GitHub）

### 3. ブランチ命名規則
```
<type>/<ticket-number>-<description>
例: feature/MB-123-user-authentication
```

## 実行例

```bash
$ ./scripts/create-feature-branch.sh

=== Git Feature Branch Creator ===
現在のブランチ: develop

ブランチタイプを選択してください:
1) feature  - 新機能開発
2) bugfix   - バグ修正
3) hotfix   - 緊急修正
4) chore    - 雑務（ビルド設定等）
5) docs     - ドキュメント更新
選択 (1-5): 1

チケット番号 (例: MB-123): MB-456
ブランチの簡潔な説明 (英語、ハイフン区切り): user profile page

作成するブランチ: feature/MB-456-user-profile-page
ベースブランチ: develop
このブランチを作成しますか？ (y/n): y

✅ ブランチの作成が完了しました！
```

## カスタマイズ

### チケット番号の形式を変更
スクリプトの21行目の正規表現を編集:
```bash
# デフォルト: MB-123 形式
if [[ ! $TICKET_NUMBER =~ ^[A-Z]+-[0-9]+$ ]]; then

# 数字のみに変更する場合
if [[ ! $TICKET_NUMBER =~ ^[0-9]+$ ]]; then
```

### デフォルトのベースブランチを変更
スクリプトの43-47行目を編集:
```bash
if [ "$BRANCH_TYPE" = "hotfix" ]; then
    BASE_BRANCH="main"
else
    BASE_BRANCH="develop"  # ここを変更
fi
```

## トラブルシューティング

### 権限エラーが出る場合
```bash
chmod +x scripts/create-feature-branch.sh
```

### stashの復元
```bash
# stashリストを確認
git stash list

# 最新のstashを復元
git stash pop
```
#!/bin/bash

# Git Feature Branch Creation Script
# 使用方法: ./scripts/create-feature-branch.sh

set -e  # エラーが発生したらスクリプトを停止

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 現在のブランチを確認
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${BLUE}=== Git Feature Branch Creator ===${NC}"
echo -e "現在のブランチ: ${YELLOW}${CURRENT_BRANCH}${NC}\n"

# ブランチタイプを選択
echo "ブランチタイプを選択してください:"
echo "1) feature  - 新機能開発"
echo "2) bugfix   - バグ修正"
echo "3) hotfix   - 緊急修正"
echo "4) chore    - 雑務（ビルド設定等）"
echo "5) docs     - ドキュメント更新"
read -p "選択 (1-5): " BRANCH_TYPE_NUM

case $BRANCH_TYPE_NUM in
    1) BRANCH_TYPE="feature" ;;
    2) BRANCH_TYPE="bugfix" ;;
    3) BRANCH_TYPE="hotfix" ;;
    4) BRANCH_TYPE="chore" ;;
    5) BRANCH_TYPE="docs" ;;
    *) echo -e "${RED}無効な選択です${NC}"; exit 1 ;;
esac

# チケット番号を入力
read -p "チケット番号 (例: MB-123): " TICKET_NUMBER
if [[ ! $TICKET_NUMBER =~ ^[A-Z]+-[0-9]+$ ]]; then
    echo -e "${RED}チケット番号の形式が正しくありません (例: MB-123)${NC}"
    exit 1
fi

# ブランチの説明を入力
read -p "ブランチの簡潔な説明 (英語、ハイフン区切り): " DESCRIPTION
DESCRIPTION=$(echo $DESCRIPTION | tr ' ' '-' | tr '[:upper:]' '[:lower:]')

# ブランチ名を生成
BRANCH_NAME="${BRANCH_TYPE}/${TICKET_NUMBER}-${DESCRIPTION}"

echo -e "\n作成するブランチ: ${GREEN}${BRANCH_NAME}${NC}"

# ベースブランチを選択
if [ "$BRANCH_TYPE" = "hotfix" ]; then
    BASE_BRANCH="main"
else
    BASE_BRANCH="develop"
fi

echo -e "ベースブランチ: ${YELLOW}${BASE_BRANCH}${NC}"

# 確認
read -p "このブランチを作成しますか？ (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "キャンセルしました"
    exit 0
fi

# Gitの状態を確認
echo -e "\n${BLUE}Gitの状態を確認中...${NC}"
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}未コミットの変更があります。${NC}"
    read -p "stashしますか？ (y/n): " STASH_CONFIRM
    if [ "$STASH_CONFIRM" = "y" ]; then
        git stash push -m "Auto stash before creating branch $BRANCH_NAME"
        echo -e "${GREEN}変更をstashしました${NC}"
    else
        echo -e "${RED}未コミットの変更がある状態ではブランチを作成できません${NC}"
        exit 1
    fi
fi

# ベースブランチを最新化
echo -e "\n${BLUE}${BASE_BRANCH}ブランチを最新化中...${NC}"
git checkout $BASE_BRANCH
git pull origin $BASE_BRANCH

# 新しいブランチを作成
echo -e "\n${BLUE}新しいブランチを作成中...${NC}"
git checkout -b $BRANCH_NAME

# リモートにプッシュ
read -p "リモートにプッシュしますか？ (y/n): " PUSH_CONFIRM
if [ "$PUSH_CONFIRM" = "y" ]; then
    git push -u origin $BRANCH_NAME
    echo -e "${GREEN}リモートにプッシュしました${NC}"
fi

# 完了メッセージ
echo -e "\n${GREEN}✅ ブランチの作成が完了しました！${NC}"
echo -e "現在のブランチ: ${GREEN}${BRANCH_NAME}${NC}"

# 次のステップを表示
echo -e "\n${BLUE}次のステップ:${NC}"
echo "1. 機能を実装する"
echo "2. git add . && git commit -m \"feat: 機能の説明\""
echo "3. git push origin $BRANCH_NAME"
echo "4. Pull Requestを作成する"

# PR作成用のURLを表示（GitHubの場合）
if git remote -v | grep -q github.com; then
    REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
    if [[ $REPO_URL == git@* ]]; then
        REPO_URL=$(echo $REPO_URL | sed 's/:/\//' | sed 's/git@/https:\/\//')
    fi
    echo -e "\n${BLUE}PR作成URL:${NC}"
    echo "${REPO_URL}/compare/${BASE_BRANCH}...${BRANCH_NAME}"
fi
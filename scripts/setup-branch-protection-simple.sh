#!/bin/bash

# GitHub Branch Protection Setup Script (Simplified)
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== GitHub Branch Protection Setup ===${NC}"

# リポジトリ情報を取得
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "リポジトリ: ${GREEN}${REPO}${NC}"

BRANCH_NAME="main"

echo -e "\n${BLUE}基本的なブランチ保護を設定中...${NC}"

# 段階的に設定を適用
echo "1. Pull Request必須設定..."
gh api repos/${REPO}/branches/${BRANCH_NAME}/protection \
    --method PUT \
    --field required_status_checks=null \
    --field enforce_admins=true \
    --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
    --field restrictions=null \
    --field allow_force_pushes=false \
    --field allow_deletions=false

echo -e "\n${GREEN}✅ ブランチ保護の設定が完了しました！${NC}"

# 設定確認
echo -e "\n${BLUE}現在の保護設定:${NC}"
gh api repos/${REPO}/branches/${BRANCH_NAME}/protection --jq '{
    required_pull_request_reviews: .required_pull_request_reviews,
    enforce_admins: .enforce_admins,
    allow_force_pushes: .allow_force_pushes,
    allow_deletions: .allow_deletions
}'
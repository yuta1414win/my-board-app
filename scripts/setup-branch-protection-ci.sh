#!/bin/bash

# GitHub Branch Protection Setup Script for CI Integration
# 使用方法: ./scripts/setup-branch-protection-ci.sh

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== GitHub Branch Protection with CI Integration ===${NC}"

# GitHubにログインしているか確認
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}GitHub CLIにログインしていません${NC}"
    echo "以下のコマンドでログインしてください:"
    echo "gh auth login"
    exit 1
fi

# リポジトリ情報を取得
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "リポジトリ: ${GREEN}${REPO}${NC}"

# ブランチ名を確認
read -p "保護するブランチ名 (デフォルト: main): " BRANCH_NAME
BRANCH_NAME=${BRANCH_NAME:-main}

echo -e "\n${YELLOW}${BRANCH_NAME}${NC} ブランチにCI連携保護を設定します..."

# JSON形式で保護設定を作成
cat > /tmp/branch-protection.json << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "test (18.x)",
      "test (20.x)",
      "build",
      "security"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF

# ブランチ保護を設定
echo -e "${BLUE}ブランチ保護を設定中...${NC}"
if gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    repos/${REPO}/branches/${BRANCH_NAME}/protection \
    --input /tmp/branch-protection.json; then
    
    echo -e "\n${GREEN}✅ ブランチ保護の設定が完了しました！${NC}"
    
    # 設定内容を確認
    echo -e "\n${BLUE}現在の保護設定:${NC}"
    gh api repos/${REPO}/branches/${BRANCH_NAME}/protection | jq '{
        required_status_checks: .required_status_checks,
        required_pull_request_reviews: .required_pull_request_reviews,
        enforce_admins: .enforce_admins,
        required_conversation_resolution: .required_conversation_resolution,
        allow_force_pushes: .allow_force_pushes,
        allow_deletions: .allow_deletions
    }'
    
    echo -e "\n${GREEN}設定された保護ルール:${NC}"
    echo "✅ Pull Requestが必須"
    echo "✅ 1人以上のレビュー承認が必要"
    echo "✅ 古いレビューは新しいコミットで無効化"
    echo "✅ 以下のCIテストが必須:"
    echo "   - test (Node.js 18.x)"
    echo "   - test (Node.js 20.x)"
    echo "   - build"
    echo "   - security"
    echo "✅ 会話の解決が必須"
    echo "✅ 強制プッシュ禁止"
    echo "✅ ブランチ削除禁止"
    
else
    echo -e "${RED}ブランチ保護の設定に失敗しました${NC}"
    echo "エラーの詳細は上記をご確認ください"
    exit 1
fi

# 一時ファイルを削除
rm -f /tmp/branch-protection.json

echo -e "\n${YELLOW}💡 ヒント:${NC}"
echo "1. GitHub ActionsのワークフローファイルはPushして有効化してください:"
echo "   git add .github/workflows/ci.yml"
echo "   git commit -m 'feat: Add CI workflow for automated testing'"
echo "   git push"
echo ""
echo "2. 最初のPR作成時にステータスチェックが表示されない場合は、"
echo "   一度PRを作成してからブランチ保護設定を更新してください"
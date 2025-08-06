#!/bin/bash

# GitHub Branch Protection Setup Script
# 使用方法: ./scripts/setup-branch-protection.sh

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== GitHub Branch Protection Setup ===${NC}"

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

# 保護レベルを選択
echo -e "\n保護レベルを選択してください:"
echo "1) 最小限の保護（小規模チーム向け）"
echo "2) 標準的な保護（推奨）"
echo "3) 厳格な保護（エンタープライズ向け）"
read -p "選択 (1-3): " PROTECTION_LEVEL

# ブランチ名を確認
read -p "保護するブランチ名 (デフォルト: main): " BRANCH_NAME
BRANCH_NAME=${BRANCH_NAME:-main}

echo -e "\n${YELLOW}${BRANCH_NAME}${NC} ブランチに保護を設定します..."

case $PROTECTION_LEVEL in
    1)
        echo -e "${BLUE}最小限の保護を設定中...${NC}"
        
        # 基本的な保護設定
        gh api repos/${REPO}/branches/${BRANCH_NAME}/protection \
            --method PUT \
            --field required_status_checks='{"strict":false,"contexts":["continuous-integration"]}' \
            --field enforce_admins=false \
            --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
            --field restrictions=null \
            --field allow_force_pushes=false \
            --field allow_deletions=false
        ;;
    
    2)
        echo -e "${BLUE}標準的な保護を設定中...${NC}"
        
        # 標準的な保護設定（CIワークフローと連携）
        gh api repos/${REPO}/branches/${BRANCH_NAME}/protection \
            --method PUT \
            -H "Accept: application/vnd.github+json" \
            -f required_status_checks[strict]=true \
            -f required_status_checks[contexts][]="test (18.x)" \
            -f required_status_checks[contexts][]="test (20.x)" \
            -f required_status_checks[contexts][]="build" \
            -f required_status_checks[contexts][]="security" \
            -f enforce_admins=true \
            -f required_pull_request_reviews[required_approving_review_count]=1 \
            -f required_pull_request_reviews[dismiss_stale_reviews]=true \
            -f required_pull_request_reviews[require_code_owner_reviews]=true \
            -f restrictions= \
            -f required_conversation_resolution=true \
            -f allow_force_pushes=false \
            -f allow_deletions=false
        ;;
    
    3)
        echo -e "${BLUE}厳格な保護を設定中...${NC}"
        
        # 厳格な保護設定
        gh api repos/${REPO}/branches/${BRANCH_NAME}/protection \
            --method PUT \
            --field required_status_checks='{
                "strict":true,
                "contexts":["build","unit-tests","integration-tests","security-scan","code-coverage"]
            }' \
            --field enforce_admins=true \
            --field required_pull_request_reviews='{
                "required_approving_review_count":3,
                "dismiss_stale_reviews":true,
                "require_code_owner_reviews":true,
                "dismissal_restrictions":{},
                "require_last_push_approval":true
            }' \
            --field restrictions='{
                "users":[],
                "teams":[],
                "apps":[]
            }' \
            --field required_conversation_resolution=true \
            --field required_linear_history=true \
            --field allow_force_pushes=false \
            --field allow_deletions=false \
            --field required_signatures=true
        ;;
    
    *)
        echo -e "${RED}無効な選択です${NC}"
        exit 1
        ;;
esac

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

# CODEOWNERSファイルの作成を提案
if [ ! -f .github/CODEOWNERS ]; then
    echo -e "\n${YELLOW}💡 ヒント: CODEOWNERSファイルがありません${NC}"
    echo "以下のコマンドでサンプルを作成できます:"
    echo "cat > .github/CODEOWNERS << EOF"
    echo "# Global owners"
    echo "* @your-github-username"
    echo ""
    echo "# Frontend"
    echo "/src/components/ @frontend-team"
    echo "/src/styles/ @frontend-team"
    echo ""
    echo "# Backend"
    echo "/api/ @backend-team"
    echo "EOF"
fi
#!/bin/bash

# 会員限定ページ保護システム テスト実行スクリプト

set -e  # エラー時に終了

echo "🧪 会員限定ページ保護システム テスト開始"
echo "========================================="

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 結果格納配列
declare -a test_results=()

# 関数: テスト結果を記録
log_result() {
    local test_name="$1"
    local status="$2"
    test_results+=("$test_name:$status")
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ $test_name - PASSED${NC}"
    else
        echo -e "${RED}❌ $test_name - FAILED${NC}"
    fi
}

# 関数: セクション表示
print_section() {
    echo ""
    echo -e "${BLUE}🔹 $1${NC}"
    echo "----------------------------------------"
}

# 1. 環境チェック
print_section "環境チェック"

# Node.jsのバージョン確認
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "Node.js: $NODE_VERSION"
else
    echo -e "${RED}❌ Node.js がインストールされていません${NC}"
    exit 1
fi

# NPMパッケージのインストール確認
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules が見つかりません。npm install を実行中...${NC}"
    npm install
fi

# Next.js アプリが実行中かチェック
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${YELLOW}⚠️  Next.js アプリが実行されていません${NC}"
    echo "以下のコマンドで開発サーバーを起動してください:"
    echo "npm run dev"
    echo ""
    echo "サーバー起動後、このスクリプトを再実行してください。"
    exit 1
fi

echo -e "${GREEN}✅ 環境チェック完了${NC}"

# 2. ユニットテスト実行（APIテスト）
print_section "API認証テスト実行"

if npm run test -- __tests__/api/auth-protected-api.test.ts --verbose; then
    log_result "API認証テスト" "PASS"
else
    log_result "API認証テスト" "FAIL"
fi

# 3. E2Eテスト実行
print_section "E2Eテスト実行"

echo "Playwright テストを実行します..."

if npx playwright test tests/e2e/auth/member-page-protection.spec.ts --headed; then
    log_result "E2Eテスト" "PASS"
else
    log_result "E2Eテスト" "FAIL"
fi

# 4. 手動テストガイドの表示
print_section "手動テストガイド"

echo -e "${YELLOW}📝 以下の手動テストも実行することを推奨します:${NC}"
echo ""
echo "1. 🔒 認証フローテスト:"
echo "   - 未ログイン状態で保護されたページへアクセス"
echo "   - ログイン後の元ページへの復帰"
echo "   - ログイン済み時の認証ページリダイレクト"
echo ""
echo "2. 📱 レスポンシブテスト:"
echo "   - モバイル（375px）、タブレット（768px）、デスクトップ（1024px+）"
echo ""
echo "3. 🎯 エラーハンドリングテスト:"
echo "   - ネットワークエラー（オフライン状態）"
echo "   - 存在しない投稿への編集アクセス"
echo "   - APIレスポンス遅延時のローディング状態"
echo ""
echo "4. 🔌 ブラウザ互換性テスト:"
echo "   - Chrome, Firefox, Safari, Edge"

# 5. パフォーマンステスト
print_section "パフォーマンステスト"

echo "Lighthouse を使用したパフォーマンス測定..."

# Lighthouse がインストールされているかチェック
if command -v lighthouse >/dev/null 2>&1; then
    # ダッシュボードページのパフォーマンステスト
    echo "ダッシュボードページをテスト中..."
    
    if lighthouse http://localhost:3000/dashboard \
        --chrome-flags="--headless" \
        --output json \
        --output-path ./test-reports/lighthouse-dashboard.json \
        --quiet; then
        
        # スコアを抽出して表示
        PERFORMANCE_SCORE=$(node -e "
            const report = require('./test-reports/lighthouse-dashboard.json');
            console.log(Math.round(report.lhr.categories.performance.score * 100));
        ")
        
        if [ "$PERFORMANCE_SCORE" -ge 80 ]; then
            log_result "パフォーマンステスト (スコア: ${PERFORMANCE_SCORE})" "PASS"
        else
            log_result "パフォーマンステスト (スコア: ${PERFORMANCE_SCORE})" "FAIL"
        fi
    else
        log_result "パフォーマンステスト" "FAIL"
    fi
else
    echo -e "${YELLOW}⚠️  Lighthouse がインストールされていません${NC}"
    echo "npm install -g lighthouse でインストールできます"
    log_result "パフォーマンステスト" "SKIP"
fi

# 6. セキュリティテスト
print_section "セキュリティチェック"

echo "セキュリティ関連の基本チェックを実行..."

# NPM auditを実行
if npm audit --audit-level high; then
    log_result "NPMセキュリティ監査" "PASS"
else
    log_result "NPMセキュリティ監査" "FAIL"
    echo -e "${YELLOW}⚠️  脆弱性が検出されました。npm audit fix を実行してください。${NC}"
fi

# 環境変数チェック
if [ -f ".env.local" ]; then
    # 重要な環境変数が設定されているかチェック
    if grep -q "NEXTAUTH_SECRET" .env.local && grep -q "NEXTAUTH_URL" .env.local; then
        log_result "環境変数チェック" "PASS"
    else
        log_result "環境変数チェック" "FAIL"
        echo -e "${YELLOW}⚠️  必要な環境変数が設定されていません${NC}"
    fi
else
    log_result "環境変数チェック" "FAIL"
    echo -e "${YELLOW}⚠️  .env.local ファイルが存在しません${NC}"
fi

# 7. テスト結果サマリー
print_section "テスト結果サマリー"

total_tests=0
passed_tests=0
failed_tests=0
skipped_tests=0

echo ""
echo "📊 テスト結果:"
echo "===================="

for result in "${test_results[@]}"; do
    IFS=':' read -r name status <<< "$result"
    case $status in
        "PASS")
            echo -e "${GREEN}✅ $name${NC}"
            ((passed_tests++))
            ;;
        "FAIL")
            echo -e "${RED}❌ $name${NC}"
            ((failed_tests++))
            ;;
        "SKIP")
            echo -e "${YELLOW}⏭️  $name${NC}"
            ((skipped_tests++))
            ;;
    esac
    ((total_tests++))
done

echo ""
echo "合計テスト: $total_tests"
echo -e "${GREEN}成功: $passed_tests${NC}"
echo -e "${RED}失敗: $failed_tests${NC}"
echo -e "${YELLOW}スキップ: $skipped_tests${NC}"

# テストレポートの生成
mkdir -p test-reports

cat > test-reports/member-protection-test-report.md << EOF
# 会員限定ページ保護システム テスト結果

## 実行日時
$(date '+%Y-%m-%d %H:%M:%S')

## 環境情報
- Node.js: $NODE_VERSION
- テスト対象: http://localhost:3000

## テスト結果サマリー
- 合計テスト: $total_tests
- 成功: $passed_tests
- 失敗: $failed_tests  
- スキップ: $skipped_tests

## 詳細結果

EOF

for result in "${test_results[@]}"; do
    IFS=':' read -r name status <<< "$result"
    echo "- [$status] $name" >> test-reports/member-protection-test-report.md
done

cat >> test-reports/member-protection-test-report.md << EOF

## 推奨事項

### 失敗したテストがある場合:
1. エラーログを確認してください
2. 環境設定を見直してください
3. 依存関係を確認してください

### さらなるテスト:
1. 手動テストガイドに従って手動テストを実行
2. 異なるブラウザでのクロスブラウザテスト
3. 様々なネットワーク条件でのテスト

## 次のステップ
- [ ] 手動テストの実行
- [ ] パフォーマンス最適化
- [ ] セキュリティ強化
- [ ] 本番環境でのテスト

EOF

echo ""
echo -e "${BLUE}📋 テストレポートが生成されました: test-reports/member-protection-test-report.md${NC}"

# 最終結果
if [ $failed_tests -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 すべてのテストが成功しました！${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  $failed_tests 個のテストが失敗しました。詳細を確認してください。${NC}"
    exit 1
fi
#!/bin/bash

# セキュリティテスト実行スクリプト
# 使用法: ./scripts/run-security-tests.sh [options]

set -e

# 色付きログ出力のための定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 設定
BASE_URL=${TEST_BASE_URL:-"http://localhost:3001"}
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/security_test_$TIMESTAMP.json"

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ヘルプ表示
show_help() {
    cat << EOF
セキュリティテスト実行スクリプト

使用法: $0 [OPTIONS]

OPTIONS:
    -h, --help          このヘルプを表示
    -u, --url URL       テスト対象URL (デフォルト: $BASE_URL)
    -t, --test TYPE     特定テストのみ実行 (rate-limit, xss, csrf, headers, input, audit, overall)
    -r, --report        レポートファイルに結果を出力
    -v, --verbose       詳細ログを表示
    -q, --quick         最小限のテストのみ実行
    --dev               開発環境向け設定でテスト実行
    --prod              本番環境向け設定でテスト実行

例:
    $0                                  # 全テスト実行
    $0 -t headers                       # セキュリティヘッダーテストのみ
    $0 -u https://example.com -r        # 指定URLでテスト、レポート出力
    $0 --quick                          # 最小限テスト実行

EOF
}

# 引数解析
VERBOSE=false
QUICK=false
REPORT=false
TEST_TYPE=""
ENVIRONMENT="development"

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -t|--test)
            TEST_TYPE="$2"
            shift 2
            ;;
        -r|--report)
            REPORT=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -q|--quick)
            QUICK=true
            shift
            ;;
        --dev)
            ENVIRONMENT="development"
            shift
            ;;
        --prod)
            ENVIRONMENT="production"
            shift
            ;;
        *)
            log_error "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# 事前チェック
log_info "セキュリティテスト開始..."
log_info "テスト対象: $BASE_URL"
log_info "環境: $ENVIRONMENT"

# レポートディレクトリの作成
if [ "$REPORT" = true ]; then
    mkdir -p "$REPORT_DIR"
    log_info "レポート出力: $REPORT_FILE"
fi

# サーバーの応答確認
log_info "サーバーの応答確認中..."
if ! curl -s --connect-timeout 5 "$BASE_URL" > /dev/null; then
    log_error "サーバーに接続できません: $BASE_URL"
    log_warning "サーバーが起動していることを確認してください"
    if [[ "$BASE_URL" == *"localhost"* ]]; then
        log_info "ローカル開発サーバーを起動: npm run dev"
    fi
    exit 1
fi
log_success "サーバー応答確認 OK"

# Node.jsスクリプトの実行準備
export TEST_BASE_URL="$BASE_URL"
export NODE_ENV="$ENVIRONMENT"

if [ "$VERBOSE" = true ]; then
    export VERBOSE=true
fi

# テスト実行関数
run_security_test() {
    local test_name="$1"
    local test_type="$2"
    
    log_info "実行中: $test_name"
    
    if [ -n "$test_type" ]; then
        node scripts/security-test.js "$test_type"
    else
        node scripts/security-test.js
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "$test_name 完了"
        return 0
    else
        log_error "$test_name 失敗 (終了コード: $exit_code)"
        return $exit_code
    fi
}

# Jest単体テストの実行
run_jest_tests() {
    log_info "Jest セキュリティテスト実行中..."
    
    if npm run test -- __tests__/security/ --verbose --json > jest_results.json 2>/dev/null; then
        log_success "Jest テスト完了"
        
        # 結果のサマリー表示
        if command -v jq &> /dev/null; then
            local passed=$(jq '.numPassedTests' jest_results.json)
            local failed=$(jq '.numFailedTests' jest_results.json)
            log_info "Jest結果: 成功=$passed, 失敗=$failed"
        fi
        
        rm -f jest_results.json
        return 0
    else
        log_warning "Jest テストでエラーが発生しました"
        rm -f jest_results.json
        return 1
    fi
}

# Playwrightテストの実行（E2Eセキュリティテスト）
run_playwright_tests() {
    if [ -f "playwright.config.ts" ] && command -v npx playwright &> /dev/null; then
        log_info "Playwright E2Eセキュリティテスト実行中..."
        
        if npx playwright test --grep="security" > /dev/null 2>&1; then
            log_success "Playwright テスト完了"
            return 0
        else
            log_warning "Playwright テストでエラーが発生しました"
            return 1
        fi
    else
        log_info "Playwright設定が見つかりません、スキップします"
        return 0
    fi
}

# メインテスト実行
main() {
    local overall_result=0
    local test_results=()
    
    # クイックテストの場合
    if [ "$QUICK" = true ]; then
        log_info "クイックテストモードで実行"
        
        # 最小限のテストのみ
        run_security_test "セキュリティヘッダーテスト" "headers"
        test_results+=($?)
        
        run_security_test "XSS攻撃防御テスト" "xss" 
        test_results+=($?)
        
        run_security_test "CSRF攻撃防御テスト" "csrf"
        test_results+=($?)
        
    elif [ -n "$TEST_TYPE" ]; then
        # 特定テストのみ実行
        log_info "特定テスト実行: $TEST_TYPE"
        run_security_test "$TEST_TYPE テスト" "$TEST_TYPE"
        test_results+=($?)
        
    else
        # 全テスト実行
        log_info "全セキュリティテスト実行"
        
        # Node.jsスクリプトによるテスト
        run_security_test "全セキュリティテスト" ""
        test_results+=($?)
        
        # Jest単体テスト
        run_jest_tests
        test_results+=($?)
        
        # Playwrightテスト
        run_playwright_tests
        test_results+=($?)
    fi
    
    # 結果の集計
    local passed=0
    local failed=0
    
    for result in "${test_results[@]}"; do
        if [ "$result" -eq 0 ]; then
            ((passed++))
        else
            ((failed++))
            overall_result=1
        fi
    done
    
    # 結果サマリー
    echo
    log_info "=== テスト結果サマリー ==="
    log_success "成功: $passed"
    if [ $failed -gt 0 ]; then
        log_error "失敗: $failed"
    else
        log_info "失敗: $failed"
    fi
    
    local success_rate=0
    if [ $((passed + failed)) -gt 0 ]; then
        success_rate=$((passed * 100 / (passed + failed)))
    fi
    log_info "成功率: ${success_rate}%"
    
    # レポート出力
    if [ "$REPORT" = true ]; then
        cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "target_url": "$BASE_URL",
  "test_type": "${TEST_TYPE:-all}",
  "results": {
    "passed": $passed,
    "failed": $failed,
    "success_rate": $success_rate,
    "overall_status": "$([ $overall_result -eq 0 ] && echo "success" || echo "failure")"
  },
  "execution_time": "$(date)",
  "report_file": "$REPORT_FILE"
}
EOF
        log_success "レポートを出力しました: $REPORT_FILE"
    fi
    
    # 最終結果
    if [ $overall_result -eq 0 ]; then
        log_success "すべてのセキュリティテストが成功しました"
    else
        log_error "一部のセキュリティテストが失敗しました"
    fi
    
    return $overall_result
}

# セキュリティ推奨事項の表示
show_recommendations() {
    echo
    log_info "=== セキュリティ推奨事項 ==="
    
    if [ "$ENVIRONMENT" = "development" ]; then
        log_warning "開発環境では以下の点にご注意ください:"
        echo "  • 本番環境では HTTPS を使用してください"
        echo "  • 環境変数 NODE_ENV=production を設定してください"
        echo "  • セキュリティヘッダーの強化が必要です"
    fi
    
    echo "  • 定期的にセキュリティテストを実行してください"
    echo "  • 依存関係の脆弱性をチェックしてください: npm audit"
    echo "  • 監査ログを定期的に確認してください"
    echo "  • セキュリティヘッダーをオンラインでチェック: https://securityheaders.com/"
    echo
}

# セキュリティスキャンの追加実行
run_additional_scans() {
    log_info "追加セキュリティスキャン実行中..."
    
    # npm auditの実行
    if command -v npm &> /dev/null; then
        log_info "npm audit実行中..."
        if npm audit --audit-level=moderate > npm_audit_results.txt 2>&1; then
            log_success "npm audit: 重大な脆弱性は見つかりませんでした"
        else
            log_warning "npm audit: 脆弱性が検出されました"
            if [ "$VERBOSE" = true ]; then
                cat npm_audit_results.txt
            fi
        fi
        rm -f npm_audit_results.txt
    fi
    
    # package.json の検査
    if [ -f "package.json" ]; then
        log_info "package.json セキュリティチェック..."
        
        # 古いNode.jsバージョンの警告
        if command -v node &> /dev/null; then
            local node_version=$(node --version | cut -d'v' -f2)
            local major_version=$(echo "$node_version" | cut -d'.' -f1)
            
            if [ "$major_version" -lt 18 ]; then
                log_warning "Node.js バージョンが古い可能性があります: $node_version"
                log_info "Node.js 18+ を推奨します"
            fi
        fi
    fi
}

# トラップ設定（中断時のクリーンアップ）
cleanup() {
    log_info "テストを中断しています..."
    # 一時ファイルのクリーンアップ
    rm -f jest_results.json npm_audit_results.txt
    exit 1
}

trap cleanup INT TERM

# メイン実行
main
exit_code=$?

# 追加スキャンの実行
if [ "$QUICK" != true ] && [ -z "$TEST_TYPE" ]; then
    run_additional_scans
fi

# 推奨事項の表示
show_recommendations

exit $exit_code
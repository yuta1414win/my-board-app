#!/bin/bash

# =============================================================================
# メール送信機能 統合テストスクリプト
# =============================================================================
# 全てのメール関連テストを順次実行し、総合的な動作確認を行います
#
# 使用方法: 
#   chmod +x scripts/run-all-email-tests.sh
#   ./scripts/run-all-email-tests.sh [TEST_EMAIL_ADDRESS]

set -e  # エラー時にスクリプト停止

# 色付きログ出力用の関数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}$1${NC}"
}

# テスト設定
TEST_EMAIL="${1:-test@example.com}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$PROJECT_ROOT/temp"
LOG_DIR="$PROJECT_ROOT/logs"

# テスト結果追跡
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0

# テスト結果記録関数
record_test_result() {
    local test_name="$1"
    local result="$2"
    
    TEST_RESULTS["$test_name"]="$result"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "$test_name"
    else
        log_error "$test_name"
    fi
}

# 前提条件チェック
check_prerequisites() {
    log_header "🔍 前提条件チェック"
    echo "================================"
    
    # Node.js チェック
    if ! command -v node &> /dev/null; then
        log_error "Node.js がインストールされていません"
        exit 1
    fi
    log_success "Node.js: $(node --version)"
    
    # npm チェック
    if ! command -v npm &> /dev/null; then
        log_error "npm がインストールされていません"
        exit 1
    fi
    log_success "npm: $(npm --version)"
    
    # プロジェクトディレクトリチェック
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        log_error "package.json が見つかりません: $PROJECT_ROOT"
        exit 1
    fi
    log_success "プロジェクトディレクトリ: $PROJECT_ROOT"
    
    # .env.local チェック
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        log_warning ".env.local が見つかりません。環境変数が正しく設定されていることを確認してください"
    else
        log_success ".env.local ファイルが存在します"
    fi
    
    # 必要なディレクトリを作成
    mkdir -p "$TEMP_DIR"
    mkdir -p "$LOG_DIR"
    
    echo ""
}

# Next.js サーバー起動チェック
check_server() {
    log_header "🚀 Next.js サーバーチェック"
    echo "================================"
    
    local server_url="http://localhost:3001"
    
    # サーバーが起動しているかチェック
    if curl -s "$server_url" > /dev/null 2>&1; then
        log_success "Next.js サーバーが起動中 ($server_url)"
        record_test_result "Next.js サーバー起動確認" "PASS"
    else
        log_warning "Next.js サーバーが起動していません"
        log_info "サーバーを起動中..."
        
        # バックグラウンドでサーバー起動
        cd "$PROJECT_ROOT"
        npm run dev > "$LOG_DIR/server.log" 2>&1 &
        SERVER_PID=$!
        
        # サーバー起動待機
        local attempts=0
        local max_attempts=30
        
        while [ $attempts -lt $max_attempts ]; do
            if curl -s "$server_url" > /dev/null 2>&1; then
                log_success "Next.js サーバーが起動しました ($server_url)"
                record_test_result "Next.js サーバー起動" "PASS"
                break
            fi
            
            attempts=$((attempts + 1))
            echo "サーバー起動待機中... ($attempts/$max_attempts)"
            sleep 2
        done
        
        if [ $attempts -eq $max_attempts ]; then
            log_error "サーバー起動に失敗しました"
            record_test_result "Next.js サーバー起動" "FAIL"
            return 1
        fi
    fi
    
    echo ""
}

# Jestテスト実行
run_jest_tests() {
    log_header "🧪 Jest単体テスト実行"
    echo "================================"
    
    cd "$PROJECT_ROOT"
    
    if npm test -- __tests__/lib/email.test.ts --verbose > "$LOG_DIR/jest.log" 2>&1; then
        log_success "Jest単体テスト完了"
        record_test_result "Jest単体テスト" "PASS"
        
        # 結果サマリー表示
        echo ""
        log_info "テスト結果サマリー:"
        tail -n 10 "$LOG_DIR/jest.log" | grep -E "(Tests|Time|Ran all test suites)"
    else
        log_error "Jest単体テストが失敗しました"
        record_test_result "Jest単体テスト" "FAIL"
        
        echo ""
        log_error "エラー詳細:"
        tail -n 20 "$LOG_DIR/jest.log"
    fi
    
    echo ""
}

# 統合テスト実行
run_integration_tests() {
    log_header "🔗 統合テスト実行"
    echo "================================"
    
    cd "$PROJECT_ROOT"
    
    log_info "テスト対象メールアドレス: $TEST_EMAIL"
    
    if node scripts/test-email.js "$TEST_EMAIL" > "$LOG_DIR/integration.log" 2>&1; then
        log_success "統合テスト完了"
        record_test_result "統合テスト" "PASS"
    else
        log_error "統合テストが失敗しました"
        record_test_result "統合テスト" "FAIL"
        
        echo ""
        log_error "エラー詳細:"
        tail -n 30 "$LOG_DIR/integration.log"
    fi
    
    echo ""
}

# メールテンプレート生成テスト
run_template_tests() {
    log_header "📧 メールテンプレート生成テスト"
    echo "================================"
    
    cd "$PROJECT_ROOT"
    
    if node scripts/test-email-templates.js > "$LOG_DIR/templates.log" 2>&1; then
        log_success "メールテンプレート生成完了"
        record_test_result "テンプレート生成" "PASS"
        
        # 生成されたファイルをチェック
        local template_dir="$PROJECT_ROOT/temp/email-templates"
        if [ -d "$template_dir" ]; then
            log_info "生成されたテンプレート:"
            ls -la "$template_dir"/*.html 2>/dev/null | awk '{print "  " $9}' || log_warning "HTMLファイルが見つかりません"
        fi
    else
        log_error "メールテンプレート生成が失敗しました"
        record_test_result "テンプレート生成" "FAIL"
        
        echo ""
        log_error "エラー詳細:"
        tail -n 20 "$LOG_DIR/templates.log"
    fi
    
    echo ""
}

# ログモニタリングテスト
run_monitoring_tests() {
    log_header "📊 ログモニタリングテスト"
    echo "================================"
    
    cd "$PROJECT_ROOT"
    
    # テスト用ログ生成
    log_info "テスト用ログデータを生成中..."
    if node scripts/test-email-monitoring.js test > "$LOG_DIR/monitoring.log" 2>&1; then
        log_success "テスト用ログデータ生成完了"
        
        # ログ分析実行
        log_info "ログ分析実行中..."
        if node scripts/test-email-monitoring.js analyze >> "$LOG_DIR/monitoring.log" 2>&1; then
            log_success "ログ分析完了"
            record_test_result "ログモニタリング" "PASS"
            
            # 分析結果表示
            echo ""
            log_info "ログ分析結果:"
            tail -n 15 "$LOG_DIR/monitoring.log" | grep -E "(総メール送信|成功|失敗|成功率)"
        else
            log_error "ログ分析が失敗しました"
            record_test_result "ログモニタリング" "FAIL"
        fi
    else
        log_error "テスト用ログ生成が失敗しました"
        record_test_result "ログモニタリング" "FAIL"
    fi
    
    echo ""
}

# API エンドポイントテスト
run_api_tests() {
    log_header "🌐 API エンドポイントテスト"
    echo "================================"
    
    local base_url="http://localhost:3001"
    
    # 接続テストAPI
    log_info "接続テストAPI (/api/email/test GET)"
    if curl -s "$base_url/api/email/test" | jq . > "$LOG_DIR/api_test_get.log" 2>&1; then
        local success=$(cat "$LOG_DIR/api_test_get.log" | jq -r '.success // false')
        if [ "$success" = "true" ]; then
            log_success "接続テストAPI (GET) 成功"
            record_test_result "API接続テスト(GET)" "PASS"
        else
            log_error "接続テストAPI (GET) 失敗"
            record_test_result "API接続テスト(GET)" "FAIL"
        fi
    else
        log_error "接続テストAPI (GET) 呼び出しエラー"
        record_test_result "API接続テスト(GET)" "FAIL"
    fi
    
    # テストメール送信API
    log_info "テストメール送信API (/api/email/test POST)"
    if curl -s -X POST "$base_url/api/email/test" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\"}" | jq . > "$LOG_DIR/api_test_post.log" 2>&1; then
        
        local success=$(cat "$LOG_DIR/api_test_post.log" | jq -r '.success // false')
        if [ "$success" = "true" ]; then
            log_success "テストメール送信API 成功"
            record_test_result "APIテストメール送信" "PASS"
        else
            log_warning "テストメール送信API 失敗 (設定不備の可能性)"
            record_test_result "APIテストメール送信" "FAIL"
        fi
    else
        log_error "テストメール送信API 呼び出しエラー"
        record_test_result "APIテストメール送信" "FAIL"
    fi
    
    # ウェルカムメール送信API
    log_info "ウェルカムメール送信API (/api/email/welcome POST)"
    if curl -s -X POST "$base_url/api/email/welcome" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"userName\":\"テスト太郎\"}" | jq . > "$LOG_DIR/api_welcome.log" 2>&1; then
        
        local success=$(cat "$LOG_DIR/api_welcome.log" | jq -r '.success // false')
        if [ "$success" = "true" ]; then
            log_success "ウェルカムメール送信API 成功"
            record_test_result "APIウェルカムメール送信" "PASS"
        else
            log_warning "ウェルカムメール送信API 失敗 (設定不備の可能性)"
            record_test_result "APIウェルカムメール送信" "FAIL"
        fi
    else
        log_error "ウェルカムメール送信API 呼び出しエラー"
        record_test_result "APIウェルカムメール送信" "FAIL"
    fi
    
    echo ""
}

# 環境変数チェック
run_env_check() {
    log_header "⚙️  環境変数チェック"
    echo "================================"
    
    local env_file="$PROJECT_ROOT/.env.local"
    local required_vars=(
        "EMAIL_SERVER_HOST"
        "EMAIL_SERVER_PORT" 
        "EMAIL_SERVER_USER"
        "EMAIL_SERVER_PASSWORD"
        "JWT_SECRET"
        "NEXTAUTH_URL"
    )
    
    local missing_vars=()
    local env_check_passed=true
    
    for var in "${required_vars[@]}"; do
        if [ -f "$env_file" ] && grep -q "^${var}=" "$env_file"; then
            log_success "$var: 設定済み"
        else
            log_error "$var: 未設定"
            missing_vars+=("$var")
            env_check_passed=false
        fi
    done
    
    if [ "$env_check_passed" = true ]; then
        record_test_result "環境変数チェック" "PASS"
    else
        record_test_result "環境変数チェック" "FAIL"
        log_warning "不足している環境変数があります: ${missing_vars[*]}"
    fi
    
    echo ""
}

# テスト結果サマリー
show_test_summary() {
    log_header "📊 テスト結果サマリー"
    echo "========================================"
    
    echo ""
    log_info "詳細結果:"
    for test_name in "${!TEST_RESULTS[@]}"; do
        local result="${TEST_RESULTS[$test_name]}"
        if [ "$result" = "PASS" ]; then
            echo -e "  ${GREEN}✅ $test_name${NC}"
        else
            echo -e "  ${RED}❌ $test_name${NC}"
        fi
    done
    
    echo ""
    log_header "総合結果:"
    echo "  テスト実行数: $TOTAL_TESTS"
    echo "  成功: $PASSED_TESTS"
    echo "  失敗: $((TOTAL_TESTS - PASSED_TESTS))"
    
    local success_rate=0
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    echo "  成功率: ${success_rate}%"
    
    echo ""
    if [ "$PASSED_TESTS" -eq "$TOTAL_TESTS" ]; then
        log_success "🎉 全てのテストが成功しました！メール送信機能は正常に動作しています。"
    elif [ "$success_rate" -ge 70 ]; then
        log_warning "⚠️  一部のテストが失敗しましたが、基本機能は動作しています。"
    else
        log_error "🚨 多くのテストが失敗しました。設定や実装を確認してください。"
    fi
    
    echo ""
    log_info "📁 ログファイル:"
    echo "  統合テスト: $LOG_DIR/integration.log"
    echo "  Jestテスト: $LOG_DIR/jest.log"
    echo "  テンプレート: $LOG_DIR/templates.log"
    echo "  モニタリング: $LOG_DIR/monitoring.log"
    echo "  サーバーログ: $LOG_DIR/server.log"
    
    echo ""
    log_info "🌐 生成されたファイル:"
    if [ -d "$PROJECT_ROOT/temp/email-templates" ]; then
        echo "  メールテンプレート: $PROJECT_ROOT/temp/email-templates/index.html"
    fi
    
    echo "========================================"
}

# クリーンアップ
cleanup() {
    log_info "🧹 クリーンアップ中..."
    
    # バックグラウンドで起動したサーバーを停止
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID > /dev/null 2>&1 || true
        log_info "Next.js サーバーを停止しました"
    fi
}

# メイン実行
main() {
    log_header "🧪 メール送信機能 統合テストスイート"
    log_header "=========================================="
    log_info "テスト開始時刻: $(date)"
    log_info "テスト対象メール: $TEST_EMAIL"
    echo ""
    
    # 前提条件チェック
    check_prerequisites
    
    # 環境変数チェック
    run_env_check
    
    # サーバー起動チェック
    check_server
    
    # 各種テスト実行
    run_jest_tests
    run_integration_tests
    run_template_tests
    run_monitoring_tests
    run_api_tests
    
    # 結果サマリー
    show_test_summary
    
    log_info "テスト終了時刻: $(date)"
}

# シグナルハンドリング
trap cleanup EXIT INT TERM

# スクリプト実行
main "$@"
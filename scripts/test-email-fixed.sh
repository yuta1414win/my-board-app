#!/bin/bash

# ======================================
# My Board App - メール配信テストスクリプト
# ======================================

set -e

# 色付きログ関数
log_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# 設定
BASE_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3001}"
TEST_EMAIL="${TEST_EMAIL:-your-test-email@example.com}"

echo "======================================="
echo "🧪 My Board App - メール配信テスト"
echo "======================================="
echo "🌐 Base URL: $BASE_URL"
echo "📧 Test Email: $TEST_EMAIL"
echo "⏰ $(date)"
echo "======================================="

# 1. サーバーが起動しているかチェック
log_info "サーバー接続チェック..."
if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
    log_success "サーバーが起動中です ✅"
else
    log_error "サーバーが起動していません。以下のコマンドで開発サーバーを起動してください："
    echo "  npm run dev"
    exit 1
fi

# 2. メール接続テスト
log_info "メール接続テスト実行中..."

connection_result=$(curl -s "$BASE_URL/api/test-email" || echo '{"success": false, "error": "接続失敗"}')
connection_success=$(echo "$connection_result" | jq -r '.success // false')

if [ "$connection_success" = "true" ]; then
    provider=$(echo "$connection_result" | jq -r '.details.provider // "unknown"')
    log_success "メール接続テスト成功 (プロバイダー: $provider) ✅"
    
    # 環境変数情報を表示
    echo ""
    log_info "環境設定状況:"
    echo "$connection_result" | jq '.environment' || echo "環境情報の取得に失敗"
    echo ""
else
    connection_error=$(echo "$connection_result" | jq -r '.error // "不明なエラー"')
    log_error "メール接続テスト失敗: $connection_error ❌"
    
    # 詳細情報があれば表示
    if echo "$connection_result" | jq -e '.environment' > /dev/null 2>&1; then
        echo ""
        log_warning "環境設定状況を確認してください:"
        echo "$connection_result" | jq '.environment' || echo "環境情報の取得に失敗"
        echo ""
    fi
fi

# 3. テストメール送信（接続が成功した場合のみ）
if [ "$connection_success" = "true" ]; then
    if [ "$TEST_EMAIL" != "your-test-email@example.com" ]; then
        log_info "テストメール送信中: $TEST_EMAIL"
        
        test_payload=$(jq -n \
            --arg to "$TEST_EMAIL" \
            --arg subject "My Board App - メール配信テスト" \
            --arg message "このメールは配信システムのテストです。正常に受信できました！" \
            --arg testType "simple" \
            '{
                to: $to,
                subject: $subject,
                message: $message,
                testType: $testType
            }')
        
        send_result=$(curl -s -X POST "$BASE_URL/api/test-email" \
            -H "Content-Type: application/json" \
            -d "$test_payload" || echo '{"success": false, "error": "送信失敗"}')
        
        send_success=$(echo "$send_result" | jq -r '.success // false')
        
        if [ "$send_success" = "true" ]; then
            message_id=$(echo "$send_result" | jq -r '.details.messageId // "不明"')
            provider=$(echo "$send_result" | jq -r '.details.provider // "不明"')
            log_success "テストメール送信成功 ✅"
            echo "  📧 送信先: $TEST_EMAIL"
            echo "  🔗 メッセージID: $message_id"
            echo "  🚀 プロバイダー: $provider"
        else
            send_error=$(echo "$send_result" | jq -r '.error // "不明なエラー"')
            log_error "テストメール送信失敗: $send_error ❌"
            
            # 詳細情報があれば表示
            if echo "$send_result" | jq -e '.details' > /dev/null 2>&1; then
                echo ""
                log_warning "送信詳細:"
                echo "$send_result" | jq '.details' || echo "詳細情報の取得に失敗"
            fi
        fi
    else
        log_warning "テストメールアドレスが設定されていません"
        echo "  以下の環境変数を設定してください："
        echo "  export TEST_EMAIL=\"your-email@example.com\""
    fi
fi

# 4. 認証メールテスト（接続が成功した場合のみ）
if [ "$connection_success" = "true" ] && [ "$TEST_EMAIL" != "your-test-email@example.com" ]; then
    log_info "認証メールテスト送信中: $TEST_EMAIL"
    
    verification_payload=$(jq -n \
        --arg to "$TEST_EMAIL" \
        --arg testType "verification" \
        '{
            to: $to,
            testType: $testType
        }')
    
    verification_result=$(curl -s -X POST "$BASE_URL/api/test-email" \
        -H "Content-Type: application/json" \
        -d "$verification_payload" || echo '{"success": false, "error": "送信失敗"}')
    
    verification_success=$(echo "$verification_result" | jq -r '.success // false')
    
    if [ "$verification_success" = "true" ]; then
        log_success "認証メールテスト送信成功 ✅"
        echo "  📧 送信先: $TEST_EMAIL"
        echo "  🔗 認証リンクが含まれています"
    else
        verification_error=$(echo "$verification_result" | jq -r '.error // "不明なエラー"')
        log_error "認証メールテスト送信失敗: $verification_error ❌"
    fi
fi

echo ""
echo "======================================="
echo "🏁 テスト完了"
echo "======================================="

# 5. まとめ
if [ "$connection_success" = "true" ]; then
    log_success "✅ メール配信システムは正常に動作しています"
    echo ""
    echo "📝 次のステップ:"
    echo "  1. $TEST_EMAIL でメールを確認"
    echo "  2. 本番環境でのVercelの環境変数設定"
    echo "  3. DNS設定（SPF/DKIM/DMARC）の確認"
else
    log_error "❌ メール配信システムに問題があります"
    echo ""
    echo "🔧 修正が必要な項目:"
    echo "  1. .env.local で環境変数を設定"
    echo "  2. RESEND_API_KEY または Gmail設定を確認"
    echo "  3. NEXTAUTH_URL が正しく設定されているか確認"
fi

echo ""
echo "📚 詳細ログは開発者コンソールを確認してください"
echo "🌐 ブラウザで $BASE_URL にアクセスしてテストしてください"
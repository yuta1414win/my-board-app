#!/bin/bash

# メール認証機能の包括的テストスクリプト

set -e  # エラーで停止

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}🚀 メール認証機能 - 包括的テスト実行${NC}"
echo "======================================"

# 環境変数チェック
echo -e "\n${BLUE}📋 環境変数チェック${NC}"
if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}❌ MONGODB_URI環境変数が設定されていません${NC}"
    echo "   .env.localファイルを確認してください"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_BASE_URL" ]; then
    export NEXT_PUBLIC_BASE_URL="http://localhost:3001"
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_BASE_URLを${NEXT_PUBLIC_BASE_URL}に設定しました${NC}"
fi

echo -e "${GREEN}✅ 環境変数チェック完了${NC}"

# 依存関係チェック
echo -e "\n${BLUE}📦 依存関係チェック${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.jsがインストールされていません${NC}"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.jsonが見つかりません${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 依存関係チェック完了${NC}"

# Next.jsアプリケーションの起動チェック
echo -e "\n${BLUE}🌐 アプリケーション接続チェック${NC}"
if ! curl -s "$NEXT_PUBLIC_BASE_URL" > /dev/null; then
    echo -e "${YELLOW}⚠️  アプリケーションが起動していないようです${NC}"
    echo "   以下のコマンドで起動してください: npm run dev"
    echo "   テストは続行しますが、一部失敗する可能性があります"
else
    echo -e "${GREEN}✅ アプリケーション接続確認完了${NC}"
fi

# データベース接続チェック
echo -e "\n${BLUE}🗄️  データベース接続チェック${NC}"
if [ -f "scripts/test-mongodb.js" ]; then
    node scripts/test-mongodb.js
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ データベース接続確認完了${NC}"
    else
        echo -e "${RED}❌ データベース接続失敗${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  test-mongodb.jsが見つかりません。接続テストをスキップします${NC}"
fi

# テスト実行
echo -e "\n${BOLD}🧪 テスト実行開始${NC}"
echo "======================================"

# 1. 単体テスト（Jest）
echo -e "\n${BLUE}1️⃣  APIユニットテスト（Jest）${NC}"
if npm test -- --testPathPattern="auth" --silent; then
    echo -e "${GREEN}✅ ユニットテスト合格${NC}"
else
    echo -e "${RED}❌ ユニットテスト失敗${NC}"
fi

# 2. API統合テスト（自動テストスクリプト）
echo -e "\n${BLUE}2️⃣  API統合テスト${NC}"
if node scripts/test-email-verification.js; then
    echo -e "${GREEN}✅ API統合テスト合格${NC}"
else
    echo -e "${RED}❌ API統合テスト失敗${NC}"
fi

# 3. E2Eテスト（Playwright）
echo -e "\n${BLUE}3️⃣  E2Eテスト（Playwright）${NC}"
if npx playwright test tests/e2e/email-verification.spec.ts; then
    echo -e "${GREEN}✅ E2Eテスト合格${NC}"
else
    echo -e "${RED}❌ E2Eテスト失敗${NC}"
fi

# パフォーマンステスト（オプション）
echo -e "\n${BLUE}4️⃣  パフォーマンステスト（オプション）${NC}"
if command -v curl &> /dev/null; then
    echo "APIレスポンス時間測定..."
    
    # 簡単なレスポンス時間測定
    for i in {1..3}; do
        echo -n "テスト $i: "
        curl -w "%{time_total}s\n" -s -o /dev/null "$NEXT_PUBLIC_BASE_URL/api/auth/verify?token=test"
    done
    
    echo -e "${GREEN}✅ パフォーマンステスト完了${NC}"
else
    echo -e "${YELLOW}⚠️  curlが見つかりません。パフォーマンステストをスキップします${NC}"
fi

# テスト結果サマリー
echo -e "\n${BOLD}📊 テスト結果サマリー${NC}"
echo "======================================"

# ログファイルの存在チェック
if [ -f "test-results.log" ]; then
    echo "詳細なテスト結果は test-results.log を確認してください"
fi

# 手動テストの案内
echo -e "\n${YELLOW}📝 手動テストの実行${NC}"
echo "以下のURLでブラウザテストを実行してください:"
echo "🌐 デモページ: $NEXT_PUBLIC_BASE_URL/auth/verify/demo"
echo ""
echo "手動テストチェックリスト:"
echo "□ 各テストシナリオボタンの動作"
echo "□ レスポンシブデザインの確認"
echo "□ キーボードナビゲーション"
echo "□ 再送信ダイアログの動作"
echo "□ エラーメッセージの表示"

# 追加のテストツール情報
echo -e "\n${BLUE}🔧 追加のテストツール${NC}"
echo "以下のコマンドで個別テストを実行できます:"
echo "📋 テストガイド表示: cat docs/email-verification-test-guide.md"
echo "🧪 API単体テスト: node scripts/test-email-verification.js"
echo "🎭 E2E詳細テスト: npx playwright test --ui"
echo "📊 カバレッジ測定: npm run test:coverage"

echo -e "\n${BOLD}✅ テスト実行完了！${NC}"

# 最後のメッセージ
echo -e "\n${GREEN}🎉 メール認証機能のテストが完了しました${NC}"
echo "問題がある場合は、docs/email-verification-test-guide.md を参照してください"
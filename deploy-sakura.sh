#!/bin/bash

# さくらレンタルサーバーへのNext.jsデプロイスクリプト

echo "🚀 Next.jsアプリをさくらレンタルサーバーにデプロイします..."

# 1. プロダクションビルド
echo "📦 プロダクションビルドを作成中..."
npm run build

# 2. スタンドアロンビルドのための設定確認
if [ ! -d ".next/standalone" ]; then
  echo "⚠️ スタンドアロンビルドが見つかりません。next.config.jsの設定を確認してください。"
  echo "output: 'standalone' の設定が必要です。"
  exit 1
fi

# 3. デプロイ用ディレクトリの準備
echo "📁 デプロイ用ディレクトリを準備中..."
rm -rf deploy-package
mkdir -p deploy-package

# 4. 必要なファイルをコピー
cp -r .next/standalone/* deploy-package/
cp -r .next/static deploy-package/.next/
cp -r public deploy-package/ 2>/dev/null || true

# 5. package.jsonの生成（最小限のもの）
cat > deploy-package/package.json <<EOF
{
  "name": "my-board-app",
  "version": "0.1.0",
  "scripts": {
    "start": "NODE_ENV=production node server.js"
  }
}
EOF

# 6. .htaccessの生成（Node.jsアプリケーション用）
cat > deploy-package/.htaccess <<EOF
# Node.js アプリケーション用設定
RewriteEngine On

# www から無印へリダイレクト
RewriteCond %{HTTP_HOST} ^www\.nouchinho\.com$ [NC]
RewriteRule ^(.*)$ https://nouchinho.com/$1 [R=301,L]

# HTTPSへリダイレクト
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]

# Node.jsアプリケーションへのプロキシ設定
# さくらのレンタルサーバーではNode.jsアプリケーションの実行方法が異なる場合があります
# 以下は参考例です
EOF

# 7. デプロイパッケージの圧縮
echo "📦 デプロイパッケージを圧縮中..."
cd deploy-package
tar -czf ../deploy-sakura.tar.gz .
cd ..

echo "✅ デプロイパッケージの準備が完了しました！"
echo ""
echo "📋 次の手順："
echo "1. deploy-sakura.tar.gz をさくらのレンタルサーバーにアップロード"
echo "2. SSHでサーバーにログイン"
echo "3. 公開フォルダで tar -xzf deploy-sakura.tar.gz を実行"
echo "4. npm install --production を実行"
echo "5. Node.jsアプリケーションの起動設定を行う"
echo ""
echo "⚠️ 注意: さくらのレンタルサーバーでNode.jsアプリケーションを実行する場合、"
echo "    サーバーの仕様に応じた追加設定が必要な場合があります。"
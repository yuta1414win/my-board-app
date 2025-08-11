#!/bin/bash

# さくらレンタルサーバー用静的エクスポートスクリプト
# Node.jsが使えない場合の代替案

echo "🚀 Next.jsアプリを静的サイトとしてエクスポートします..."

# 1. next.config.tsを一時的に静的エクスポート用に変更
echo "📝 設定ファイルを準備中..."
cat > next.config.export.ts <<EOF
import type { NextConfig } from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: false,
});

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '',
  assetPrefix: '',
  trailingSlash: true,
};

export default withBundleAnalyzer(nextConfig);
EOF

# 2. 元の設定をバックアップ
cp next.config.ts next.config.ts.backup

# 3. エクスポート用設定に置き換え
cp next.config.export.ts next.config.ts

# 4. ビルドとエクスポート
echo "📦 静的ファイルをエクスポート中..."
npm run build

# 5. 元の設定に戻す
mv next.config.ts.backup next.config.ts
rm next.config.export.ts

# 6. デプロイ用ディレクトリの準備
echo "📁 デプロイ用ディレクトリを準備中..."
rm -rf deploy-static
mkdir -p deploy-static

# 7. エクスポートされたファイルをコピー
if [ -d "out" ]; then
  cp -r out/* deploy-static/
else
  echo "⚠️ エクスポートされたファイルが見つかりません。"
  echo "next.config.tsでoutput: 'export'の設定を確認してください。"
  exit 1
fi

# 8. .htaccessの生成
cat > deploy-static/.htaccess <<EOF
# さくらレンタルサーバー用.htaccess設定

# エラーページ設定
ErrorDocument 404 /404.html

# HTTPSへリダイレクト
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}/\$1 [R=301,L]

# www から無印へリダイレクト
RewriteCond %{HTTP_HOST} ^www\.nouchinho\.com$ [NC]
RewriteRule ^(.*)$ https://nouchinho.com/\$1 [R=301,L]

# インデックスファイルの優先順位
DirectoryIndex index.html

# キャッシュ設定
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 1 hour"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
</IfModule>

# 圧縮設定
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>

# セキュリティヘッダー
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
EOF

# 9. APIルート用のPHPブリッジ（オプション）
echo "📝 API用のPHPブリッジを生成中..."
cat > deploy-static/api-bridge.php <<'EOF'
<?php
// さくらレンタルサーバー用APIブリッジ
// 静的エクスポートではAPIルートが使えないため、必要に応じてPHPで実装

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://nouchinho.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエストへの対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ここにAPIロジックを実装
// 例: データベース接続、認証処理など

echo json_encode(['message' => 'API Bridge is working']);
?>
EOF

# 10. デプロイパッケージの圧縮
echo "📦 デプロイパッケージを圧縮中..."
cd deploy-static
tar -czf ../deploy-static-sakura.tar.gz .
cd ..

echo "✅ 静的サイトのエクスポートが完了しました！"
echo ""
echo "📋 次の手順："
echo "1. deploy-static-sakura.tar.gz をさくらのレンタルサーバーにアップロード"
echo "2. FTPまたはSSHでサーバーにログイン"
echo "3. 公開フォルダ（例: ~/www/）に移動"
echo "4. tar -xzf deploy-static-sakura.tar.gz を実行"
echo "5. https://nouchinho.com でサイトを確認"
echo ""
echo "⚠️ 注意事項："
echo "- 静的エクスポートではAPIルートやサーバーサイドレンダリングは使用できません"
echo "- 動的機能が必要な場合は、PHPやさくらのVPSへの移行を検討してください"
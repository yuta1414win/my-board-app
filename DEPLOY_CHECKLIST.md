# 🚀 本番デプロイ前チェックリスト

## 📋 事前準備 (Pre-Deploy)

### ✅ 必須設定

- [ ] **MongoDB Atlas本番クラスター準備**
  - [ ] 本番用クラスター作成 (M2/M5推奨)
  - [ ] 強力なユーザー認証設定
  - [ ] Network Access: Vercel IP許可
  - [ ] 自動バックアップ有効化
  - [ ] 接続文字列取得

- [ ] **メール送信サービス設定**
  - [ ] Resend アカウント作成
  - [ ] API キー取得
  - [ ] ドメイン認証設定
  - [ ] DKIM設定完了
  - [ ] SPFレコード設定

- [ ] **Sentry エラー監視設定**
  - [ ] Sentry プロジェクト作成
  - [ ] DSN取得
  - [ ] 組織・プロジェクト名確認

- [ ] **セキュリティ設定**
  ```bash
  # 強力なシークレット生成
  openssl rand -base64 48  # NEXTAUTH_SECRET用
  openssl rand -hex 64     # JWT_SECRET用
  openssl rand -hex 32     # ENCRYPTION_KEY用
  ```

### ✅ コード準備

- [ ] **全テスト通過確認**
  ```bash
  npm run test:all  # Jest + Playwright
  ```

- [ ] **ESLint/TypeScript エラー解決**
  ```bash
  npm run lint
  npx tsc --noEmit
  ```

- [ ] **セキュリティスキャン実行**
  ```bash
  npm audit --audit-level high
  ```

- [ ] **デプロイ前チェック実行**
  ```bash
  npm run deploy:check
  ```

## 🔧 Vercel設定

### ✅ プロジェクト設定

- [ ] **Vercelプロジェクト作成**
  ```bash
  vercel login
  vercel link
  ```

- [ ] **環境変数設定** (Vercel Dashboard)
  
  **必須変数:**
  - [ ] `NEXTAUTH_SECRET` (48文字以上)
  - [ ] `NEXTAUTH_URL` (https://yourdomain.com)
  - [ ] `MONGODB_URI` (Atlas接続文字列)
  - [ ] `RESEND_API_KEY`
  - [ ] `EMAIL_FROM`
  - [ ] `JWT_SECRET` (64文字)
  - [ ] `ENCRYPTION_KEY` (32文字)
  - [ ] `NODE_ENV=production`

  **オプション変数:**
  - [ ] `NEXT_PUBLIC_SENTRY_DSN`
  - [ ] `SENTRY_ORG`
  - [ ] `SENTRY_PROJECT`
  - [ ] `SENTRY_AUTH_TOKEN`
  - [ ] `APP_URL`
  - [ ] `RATE_LIMIT_MAX_REQUESTS=3`
  - [ ] `RATE_LIMIT_WINDOW_MS=3600000`

### ✅ ドメイン設定

- [ ] **カスタムドメイン追加**
  - [ ] Vercel Dashboard でドメイン追加
  - [ ] DNS設定 (A/CNAME レコード)
  - [ ] SSL証明書自動発行確認

- [ ] **DNS設定確認**
  ```bash
  dig yourdomain.com
  nslookup yourdomain.com
  ```

## 🚀 デプロイ実行

### ✅ 初回デプロイ

- [ ] **プレビューデプロイでテスト**
  ```bash
  vercel  # プレビューデプロイ
  ```

- [ ] **プレビュー環境テスト**
  - [ ] ヘルスチェック (`/health`)
  - [ ] 認証フロー動作確認
  - [ ] 投稿機能テスト
  - [ ] メール送信テスト

- [ ] **本番デプロイ実行**
  ```bash
  npm run deploy:prod
  # または
  vercel --prod
  ```

## ✅ デプロイ後検証

### 🔍 機能テスト

- [ ] **基本機能確認**
  - [ ] ホームページ表示
  - [ ] ユーザー登録
  - [ ] メール認証
  - [ ] ログイン/ログアウト
  - [ ] 投稿作成・編集・削除
  - [ ] レスポンシブデザイン

- [ ] **セキュリティ確認**
  - [ ] HTTPS強制リダイレクト
  - [ ] セキュリティヘッダー確認
  - [ ] 認証なしアクセス制限
  - [ ] レート制限動作

- [ ] **パフォーマンステスト**
  - [ ] ページ読み込み速度 (<3秒)
  - [ ] Lighthouse スコア確認
  - [ ] Core Web Vitals

### 📊 監視・分析設定

- [ ] **Vercel Analytics有効化**
- [ ] **Sentry エラー監視動作確認**
- [ ] **Uptime監視設定** (UptimeRobot/Pingdom)
  - [ ] `/health` エンドポイント監視
  - [ ] アラート設定 (Email/Slack)

### 🔄 運用準備

- [ ] **バックアップ確認**
  - [ ] MongoDB Atlas自動バックアップ
  - [ ] Vercel Deployment履歴

- [ ] **ロールバック手順確認**
  - [ ] Vercel Deploymentからロールバック
  - [ ] データベース復旧手順

- [ ] **ドキュメント更新**
  - [ ] 本番URL更新
  - [ ] 運用手順書作成
  - [ ] 障害対応手順

## 🚨 緊急時対応

### ⚠️ よくある問題

- **メール送信失敗**
  - Resend API制限確認
  - DKIM設定再確認
  - DNS プロパゲーション確認

- **MongoDB接続エラー**
  - IP許可リスト確認
  - 接続文字列確認
  - ネットワークアクセス設定

- **認証エラー**
  - NEXTAUTH_SECRET確認
  - NEXTAUTH_URL確認
  - セッション設定確認

### 📞 緊急連絡先

- **MongoDB Atlas**: サポートチケット
- **Vercel**: GitHub Issues/サポート
- **Resend**: サポートドキュメント
- **Sentry**: エラー詳細画面

---

## 💡 デプロイ成功後

### 🎉 成功確認項目

- [ ] 本番URLでサイト正常表示
- [ ] 全機能動作確認完了
- [ ] 監視システム稼働確認
- [ ] バックアップ動作確認
- [ ] チーム通知完了

### 📝 次のステップ

1. ユーザー受け入れテスト実施
2. ドキュメント最終更新
3. 運用監視開始
4. パフォーマンス継続監視
5. セキュリティアップデート計画

---

**🚀 デプロイ実行コマンド**

```bash
# 最終チェック
npm run deploy:check

# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod

# デプロイ状況確認
vercel ls
vercel inspect <deployment-url>
```
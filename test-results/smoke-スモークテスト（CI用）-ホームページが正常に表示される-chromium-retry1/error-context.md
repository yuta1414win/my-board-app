# Page snapshot

```yaml
- banner:
  - text: 掲示板アプリ
  - button
  - button "ログイン"
  - button "新規登録"
- heading "掲示板アプリへようこそ" [level=1]
- paragraph: 会員制の掲示板システムです
- paragraph: このアプリでは、登録した会員同士で投稿を共有できます。 投稿の作成、編集、削除が可能で、リアルタイムでコミュニケーションを楽しめます。
- link "新規登録":
  - /url: /auth/register
- link "ログイン":
  - /url: /auth/signin
- heading "主な機能" [level=6]
- list:
  - listitem: メールアドレス認証による安全な会員登録
  - listitem: 投稿の作成・編集・削除
  - listitem: 投稿者名と投稿日時の表示
  - listitem: ページネーション機能
  - listitem: レスポンシブデザイン
  - listitem: ダークモード対応
- alert
```
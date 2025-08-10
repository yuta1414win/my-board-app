# Page snapshot

```yaml
- banner:
  - text: 掲示板アプリ
  - button
  - button "ログイン"
  - button "新規登録"
- heading "新規登録" [level=1]
- paragraph: アカウントを作成してボードにアクセス
- text: 名前
- textbox "名前"
- text: メールアドレス
- textbox "メールアドレス"
- text: パスワード
- textbox "パスワード"
- button "toggle password visibility"
- text: パスワード確認
- textbox "パスワード確認"
- button "toggle confirm password visibility"
- button "登録する"
- separator
- paragraph: 既にアカウントをお持ちですか？
- link "ログインする":
  - /url: /auth/signin
- text: 登録後、メールアドレスの確認が必要です。24時間以内に確認メール内のリンクをクリックしてください。
- alert
```
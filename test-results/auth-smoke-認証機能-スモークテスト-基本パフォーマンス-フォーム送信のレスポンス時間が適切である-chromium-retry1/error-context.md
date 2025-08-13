# Page snapshot

```yaml
- banner:
  - text: 掲示板アプリ
  - button
  - button "ログイン"
  - button "新規登録"
- heading "ログイン" [level=1]
- paragraph: アカウントにログインしてボードにアクセス
- text: メールアドレス
- textbox "メールアドレス": test@example.com
- text: パスワード
- textbox "パスワード": wrongpassword
- button "toggle password visibility"
- button "ログイン"
- separator:
  - paragraph: または
- button "Googleでログイン"
- button "GitHubでログイン"
- separator
- link "新規登録":
  - /url: /auth/register
- link "パスワードを忘れた場合":
  - /url: /auth/forgot-password
- text: セキュリティのため、5回連続でログインに失敗するとアカウントが5分間ロックされます。
- alert
```
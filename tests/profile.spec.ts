import { test, expect } from '@playwright/test';

test.describe('プロフィール機能のテスト', () => {
  // テスト用のユーザーデータ
  const testUser = {
    email: 'test@example.com',
    password: 'TestPass123!',
    name: 'テストユーザー',
    bio: 'これはテスト用の自己紹介文です。',
    quickComment: 'よろしくお願いします！',
  };

  test.beforeEach(async ({ page }) => {
    // 各テストの前にホームページにアクセス
    await page.goto('http://localhost:3001');
  });

  test('1. 未ログイン時のプロフィールアクセス制御', async ({ page }) => {
    // プロフィールページに直接アクセス
    await page.goto('http://localhost:3001/profile');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*auth\/signin/);

    // パスワード変更ページに直接アクセス
    await page.goto('http://localhost:3001/profile/change-credentials');

    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*auth\/signin/);
  });

  test('2. プロフィール表示の確認', async ({ page }) => {
    // ログイン処理（既存のテストユーザーでログイン）
    await page.goto('http://localhost:3001/auth/signin');

    // ログインフォームの存在を確認
    await expect(page.locator('form')).toBeVisible();

    // 仮のログイン処理（実際のログイン実装に合わせて調整）
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // ログイン後、プロフィールページにアクセス
    await page.goto('http://localhost:3001/profile');

    // プロフィールページの要素を確認
    await expect(page.locator('h1')).toContainText('プロフィール');
    await expect(page.locator('text=基本情報')).toBeVisible();
    await expect(page.locator('text=編集')).toBeVisible();
    await expect(page.locator('text=アカウント情報')).toBeVisible();
    await expect(page.locator('text=セキュリティ設定')).toBeVisible();
    await expect(page.locator('text=パスワード変更')).toBeVisible();

    // アバター（頭文字）の表示確認
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('3. プロフィール編集機能のテスト', async ({ page }) => {
    // ログイン後の状態を前提（beforeEachでセットアップ）
    await page.goto('http://localhost:3001/profile');

    // 編集ボタンをクリック
    await page.click('text=編集');

    // 編集フォームが表示されることを確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('textarea[name="bio"]')).toBeVisible();
    await expect(page.locator('input[name="quickComment"]')).toBeVisible();
    await expect(page.locator('text=保存')).toBeVisible();
    await expect(page.locator('text=キャンセル')).toBeVisible();

    // 名前を変更
    await page.fill('input[name="name"]', '更新テストユーザー');

    // 自己紹介を変更
    await page.fill('textarea[name="bio"]', '更新されたテスト用自己紹介です。');

    // 一言コメントを追加
    await page.fill('input[name="quickComment"]', '更新しました！');

    // 保存ボタンをクリック
    await page.click('text=保存');

    // 成功メッセージの表示を確認
    await expect(page.locator('text=プロフィールを更新しました')).toBeVisible();

    // 更新された内容が表示されることを確認
    await expect(page.locator('text=更新テストユーザー')).toBeVisible();
    await expect(
      page.locator('text=更新されたテスト用自己紹介です。')
    ).toBeVisible();
  });

  test('4. 文字数制限のテスト', async ({ page }) => {
    await page.goto('http://localhost:3001/profile');

    // 編集ボタンをクリック
    await page.click('text=編集');

    // 名前の文字数制限テスト（50文字）
    const longName = 'あ'.repeat(51);
    await page.fill('input[name="name"]', longName);

    // 文字数カウンターの確認
    await expect(page.locator('text=50/50文字')).toBeVisible();

    // エラーメッセージの確認
    await expect(
      page.locator('text=名前は50文字以内で入力してください')
    ).toBeVisible();

    // 自己紹介の文字数制限テスト（200文字）
    const longBio = 'あ'.repeat(201);
    await page.fill('textarea[name="bio"]', longBio);

    // エラーメッセージの確認
    await expect(
      page.locator('text=自己紹介は200文字以内で入力してください')
    ).toBeVisible();

    // 一言コメントの文字数制限テスト（50文字）
    const longComment = 'あ'.repeat(51);
    await page.fill('input[name="quickComment"]', longComment);

    // エラーメッセージの確認
    await expect(
      page.locator('text=一言コメントは50文字以内で入力してください')
    ).toBeVisible();

    // 名前を空にしてエラーテスト
    await page.fill('input[name="name"]', '');

    // 必須エラーメッセージの確認
    await expect(page.locator('text=名前は必須です')).toBeVisible();

    // 保存ボタンが無効化されることを確認
    await expect(page.locator('button:has-text("保存")')).toBeDisabled();
  });

  test('5. パスワード変更機能のテスト', async ({ page }) => {
    await page.goto('http://localhost:3001/profile');

    // パスワード変更ボタンをクリック
    await page.click('text=パスワード変更');

    // パスワード変更ページの表示確認
    await expect(page).toHaveURL(/.*profile\/change-credentials/);
    await expect(page.locator('h1')).toContainText('パスワード変更');

    // フォームの存在確認
    await expect(page.locator('input[name="currentPassword"]')).toBeVisible();
    await expect(page.locator('input[name="newPassword"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

    // パスワード表示/非表示ボタンのテスト
    const toggleButton = page
      .locator('button[aria-label="toggle password visibility"]')
      .first();
    await toggleButton.click();

    // 弱いパスワードのテスト
    await page.fill('input[name="currentPassword"]', testUser.password);
    await page.fill('input[name="newPassword"]', '123');

    // パスワード強度の確認
    await expect(page.locator('text=弱い')).toBeVisible();
    await expect(
      page.locator('button:has-text("パスワード変更")')
    ).toBeDisabled();

    // 強いパスワードのテスト
    await page.fill('input[name="newPassword"]', 'NewStrongPass123!');

    // パスワード強度の確認
    await expect(page.locator('text=強い')).toBeVisible();

    // パスワード確認の不一致テスト
    await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');

    // エラーメッセージの確認
    await expect(page.locator('text=パスワードが一致しません')).toBeVisible();
    await expect(
      page.locator('button:has-text("パスワード変更")')
    ).toBeDisabled();

    // 正しいパスワード確認
    await page.fill('input[name="confirmPassword"]', 'NewStrongPass123!');

    // 保存ボタンが有効になることを確認
    await expect(
      page.locator('button:has-text("パスワード変更")')
    ).toBeEnabled();
  });

  test('6. キャンセル機能のテスト', async ({ page }) => {
    await page.goto('http://localhost:3001/profile');

    // 編集ボタンをクリック
    await page.click('text=編集');

    // フォームに変更を加える
    await page.fill('input[name="name"]', '変更テスト');
    await page.fill('textarea[name="bio"]', '変更されたテスト');

    // キャンセルボタンをクリック
    await page.click('text=キャンセル');

    // 編集モードが終了することを確認
    await expect(page.locator('input[name="name"]')).not.toBeVisible();
    await expect(page.locator('text=編集')).toBeVisible();

    // 変更が保存されていないことを確認（元の値が表示される）
    await expect(page.locator('text=変更テスト')).not.toBeVisible();
  });

  test('7. レスポンシブデザインのテスト', async ({ page }) => {
    await page.goto('http://localhost:3001/profile');

    // デスクトップサイズでのレイアウト確認
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('[data-testid="profile-layout"]')).toBeVisible();

    // モバイルサイズでのレイアウト確認
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="profile-layout"]')).toBeVisible();

    // タブレットサイズでのレイアウト確認
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="profile-layout"]')).toBeVisible();
  });

  test('8. 戻るボタンのテスト', async ({ page }) => {
    await page.goto('http://localhost:3001/profile');

    // パスワード変更ページに移動
    await page.click('text=パスワード変更');

    // 戻るボタンをクリック
    await page.click('button[aria-label="go back"]');

    // プロフィールページに戻ることを確認
    await expect(page).toHaveURL(/.*profile$/);
  });
});

import { test, expect } from '@playwright/test';

test.describe('ログイン機能テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // 各テスト前にホームページにアクセス
    await page.goto('http://localhost:3001');
  });

  test('1. ログインページの表示確認', async ({ page }) => {
    // ヘッダーのログインボタンをクリック
    await page.click('text=ログイン');
    
    // URLが/auth/loginに変わることを確認
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // 必要な要素が表示されることを確認
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("ログイン")')).toBeVisible();
    await expect(page.locator('button:has-text("Googleでログイン")')).toBeVisible();
    await expect(page.locator('button:has-text("GitHubでログイン")')).toBeVisible();
    await expect(page.locator('text=新規登録はこちら')).toBeVisible();
  });

  test('2. 正常なログインフロー', async ({ page }) => {
    // ログインページへ移動
    await page.goto('http://localhost:3001/auth/login');
    
    // 正常な認証情報を入力
    await page.fill('input[name="email"]', 'test-verified@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // /boardにリダイレクトされることを確認
    await page.waitForURL('**/board', { timeout: 10000 });
    
    // ヘッダーにユーザー情報が表示されることを確認
    await expect(page.locator('text=テスト太郎')).toBeVisible();
  });

  test('3. 間違ったパスワードでのログイン', async ({ page }) => {
    // ログインページへ移動
    await page.goto('http://localhost:3001/auth/login');
    
    // 間違ったパスワードを入力
    await page.fill('input[name="email"]', 'test-verified@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=メールアドレスまたはパスワードが正しくありません')).toBeVisible();
    
    // URLが変わらないことを確認
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test('4. メール未認証ユーザーのログイン', async ({ page }) => {
    // ログインページへ移動
    await page.goto('http://localhost:3001/auth/login');
    
    // 未認証ユーザーの認証情報を入力
    await page.fill('input[name="email"]', 'test-unverified@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // ログインボタンをクリック
    await page.click('button[type="submit"]');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=メールアドレスが確認されていません')).toBeVisible();
  });

  test('5. ログアウト機能', async ({ page }) => {
    // まずログイン
    await page.goto('http://localhost:3001/auth/login');
    await page.fill('input[name="email"]', 'test-verified@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/board');
    
    // ユーザーアイコンをクリック
    await page.click('[aria-label="アカウントメニュー"]');
    
    // ドロップダウンメニューが表示されることを確認
    await expect(page.locator('text=ログアウト')).toBeVisible();
    
    // ログアウトをクリック
    await page.click('text=ログアウト');
    
    // ホームページにリダイレクトされることを確認
    await page.waitForURL('http://localhost:3001/');
    
    // ログインボタンが再表示されることを確認
    await expect(page.locator('text=ログイン').first()).toBeVisible();
  });

  test('6. 保護されたページへのアクセス', async ({ page }) => {
    // 未ログイン状態で/boardに直接アクセス
    await page.goto('http://localhost:3001/board');
    
    // ログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/.*\/auth\/login\?callbackUrl=%2Fboard/);
    
    // ログイン
    await page.fill('input[name="email"]', 'test-verified@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // 元のページ(/board)にリダイレクトされることを確認
    await page.waitForURL('**/board');
  });

  test('7. セッション維持の確認', async ({ page, context }) => {
    // ログイン
    await page.goto('http://localhost:3001/auth/login');
    await page.fill('input[name="email"]', 'test-verified@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/board');
    
    // ページをリロード
    await page.reload();
    
    // まだログイン状態であることを確認
    await expect(page.locator('text=テスト太郎')).toBeVisible();
    
    // 新しいタブを開く
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:3001');
    
    // 新しいタブでもログイン状態であることを確認
    await expect(newPage.locator('text=テスト太郎')).toBeVisible();
    
    await newPage.close();
  });

  test('8. フォームバリデーション', async ({ page }) => {
    await page.goto('http://localhost:3001/auth/login');
    
    // 空の状態でログインボタンが無効化されていることを確認
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeDisabled();
    
    // メールアドレスのみ入力
    await page.fill('input[name="email"]', 'test@example.com');
    await expect(loginButton).toBeDisabled();
    
    // パスワードも入力
    await page.fill('input[name="password"]', 'password');
    await expect(loginButton).toBeEnabled();
    
    // パスワード表示切り替えボタンの動作確認
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    await page.click('[aria-label="パスワードの表示切り替え"]');
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('9. ヘッダー表示の切り替え', async ({ page }) => {
    // 未ログイン状態でホームページにアクセス
    await page.goto('http://localhost:3001');
    
    // ログインボタンが表示されることを確認
    await expect(page.locator('header').locator('text=ログイン')).toBeVisible();
    await expect(page.locator('header').locator('text=新規登録')).toBeVisible();
    
    // ログイン
    await page.click('text=ログイン');
    await page.fill('input[name="email"]', 'test-verified@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/board');
    
    // ログイン後はユーザー名が表示されることを確認
    await expect(page.locator('text=テスト太郎')).toBeVisible();
    
    // ログインボタンが表示されないことを確認
    await expect(page.locator('header').locator('text=ログイン')).not.toBeVisible();
  });
});
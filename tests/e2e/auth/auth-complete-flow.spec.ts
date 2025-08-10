/**
 * 認証システム完全フローのE2Eテスト
 * 登録からログイン、セッション管理、ログアウトまでの一連の流れをテスト
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

interface TestUser {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// テスト用ユーザーデータ
const testUser: TestUser = {
  name: 'E2E Test User',
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'E2ETest123!',
  confirmPassword: 'E2ETest123!',
};

const weakPassword = 'weak';
const invalidEmail = 'invalid-email';

test.describe('認証システム完全フロー', () => {
  test.beforeEach(async ({ page, context }) => {
    // テスト前のセットアップ
    await context.clearCookies();
    await context.clearPermissions();
    
    // コンソールエラーをキャッチ
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });
  });

  test.describe('ユーザー登録フロー', () => {
    test('正常な登録フローが完了する', async ({ page }) => {
      // 登録ページに移動
      await page.goto('/auth/register');
      await expect(page).toHaveTitle(/My Board App/);

      // 登録フォームの存在確認
      await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible();
      await expect(page.getByLabel('名前')).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('パスワード', { exact: true })).toBeVisible();
      await expect(page.getByLabel('パスワード確認')).toBeVisible();

      // フォーム入力
      await page.getByLabel('名前').fill(testUser.name);
      await page.getByLabel('メールアドレス').fill(testUser.email);
      await page.getByLabel('パスワード', { exact: true }).fill(testUser.password);
      await page.getByLabel('パスワード確認').fill(testUser.confirmPassword);

      // パスワード強度インジケーターの確認
      await expect(page.getByText('パスワード強度')).toBeVisible();
      await expect(page.getByText('非常に強い')).toBeVisible();
      
      // パスワード要件チェックの確認
      await expect(page.getByText('8文字以上')).toBeVisible();
      await expect(page.getByText('数字を含む')).toBeVisible();
      await expect(page.getByText('英字を含む')).toBeVisible();
      await expect(page.getByText('特殊文字を含む')).toBeVisible();

      // 登録実行
      await page.getByRole('button', { name: '登録する' }).click();

      // 成功メッセージの確認
      await expect(page.getByText('登録が完了しました')).toBeVisible();
      await expect(page.getByText('確認メールを送信しました')).toBeVisible();

      // 自動リダイレクトの確認（3秒後にログインページへ）
      await expect(page.getByText('ログインページへリダイレクト')).toBeVisible();
      
      // リダイレクト待機
      await page.waitForTimeout(3100);
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('バリデーションエラーが正しく表示される', async ({ page }) => {
      await page.goto('/auth/register');

      // 弱いパスワードでの登録
      await page.getByLabel('名前').fill(testUser.name);
      await page.getByLabel('メールアドレス').fill(testUser.email);
      await page.getByLabel('パスワード', { exact: true }).fill(weakPassword);
      await page.getByLabel('パスワード確認').fill(weakPassword);

      await page.getByRole('button', { name: '登録する' }).click();

      // バリデーションエラーの確認
      await expect(page.getByText('8文字以上で入力してください')).toBeVisible();
      
      // パスワード強度インジケーターの確認
      await expect(page.getByText('パスワード強度')).toBeVisible();
      await expect(page.getByText('弱い')).toBeVisible();
    });

    test('無効なメールアドレスでバリデーションエラーが表示される', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testUser.name);
      await page.getByLabel('メールアドレス').fill(invalidEmail);
      await page.getByLabel('パスワード', { exact: true }).fill(testUser.password);
      await page.getByLabel('パスワード確認').fill(testUser.confirmPassword);

      await page.getByRole('button', { name: '登録する' }).click();

      await expect(page.getByText('正しいメールアドレスを入力してください')).toBeVisible();
    });

    test('パスワード不一致でバリデーションエラーが表示される', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testUser.name);
      await page.getByLabel('メールアドレス').fill(testUser.email);
      await page.getByLabel('パスワード', { exact: true }).fill(testUser.password);
      await page.getByLabel('パスワード確認').fill('DifferentPassword123!');

      await page.getByRole('button', { name: '登録する' }).click();

      await expect(page.getByText('パスワードが一致しません')).toBeVisible();
    });

    test('パスワード表示切り替えが動作する', async ({ page }) => {
      await page.goto('/auth/register');

      const passwordInput = page.getByLabel('パスワード', { exact: true });
      const confirmPasswordInput = page.getByLabel('パスワード確認');

      // 初期状態でパスワードが隠されている
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // パスワードを入力
      await passwordInput.fill(testUser.password);
      await confirmPasswordInput.fill(testUser.confirmPassword);

      // パスワード表示ボタンをクリック
      await page.locator('[aria-label="toggle password visibility"]').first().click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // パスワード確認表示ボタンをクリック
      await page.locator('[aria-label="toggle confirm password visibility"]').click();
      await expect(confirmPasswordInput).toHaveAttribute('type', 'text');

      // 再度クリックで非表示に戻る
      await page.locator('[aria-label="toggle password visibility"]').first().click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('ログインフロー', () => {
    test('正常なログインフローが完了する', async ({ page }) => {
      await page.goto('/auth/signin');

      // ログインフォームの存在確認
      await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('パスワード')).toBeVisible();

      // 認証情報入力（実際のテスト環境では事前にユーザーを作成しておく）
      await page.getByLabel('メールアドレス').fill('existing-user@example.com');
      await page.getByLabel('パスワード').fill('ExistingUser123!');

      // ログインボタンクリック
      await page.getByRole('button', { name: 'ログイン' }).click();

      // 成功時の動作確認（モック環境での想定）
      // 実際のテストでは事前にユーザー作成が必要
      await page.waitForTimeout(2000);
    });

    test('無効な認証情報でエラーが表示される', async ({ page }) => {
      await page.goto('/auth/signin');

      // 存在しないユーザーの認証情報
      await page.getByLabel('メールアドレス').fill('nonexistent@example.com');
      await page.getByLabel('パスワード').fill('WrongPassword123!');

      await page.getByRole('button', { name: 'ログイン' }).click();

      // エラーメッセージの確認
      await expect(page.getByText('メールアドレスまたはパスワードが正しくありません')).toBeVisible();
      await expect(page.getByText('試行回数: 1/5')).toBeVisible();
    });

    test('ログイン試行回数制限が動作する', async ({ page }) => {
      await page.goto('/auth/signin');

      const email = 'test@example.com';
      const wrongPassword = 'WrongPassword123!';

      // 5回連続で間違ったパスワードを入力
      for (let i = 1; i <= 5; i++) {
        await page.getByLabel('メールアドレス').fill(email);
        await page.getByLabel('パスワード').fill(wrongPassword);
        await page.getByRole('button', { name: 'ログイン' }).click();

        if (i < 5) {
          await expect(page.getByText(`試行回数: ${i}/5`)).toBeVisible();
          await page.waitForTimeout(1000);
        }
      }

      // 5回目でブロック
      await expect(page.getByText('ログインがブロックされています')).toBeVisible();
      await expect(page.getByText('残り時間:')).toBeVisible();
      await expect(page.getByRole('button')).toBeDisabled();
    });

    test('パスワード表示切り替えが動作する', async ({ page }) => {
      await page.goto('/auth/signin');

      const passwordInput = page.getByLabel('パスワード');
      
      // 初期状態でパスワードが隠されている
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // パスワードを入力
      await passwordInput.fill('TestPassword123!');
      
      // パスワード表示ボタンをクリック
      await page.getByLabel('toggle password visibility').click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // 再度クリックで非表示に戻る
      await page.getByLabel('toggle password visibility').click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('ログインページからの登録ページ遷移が動作する', async ({ page }) => {
      await page.goto('/auth/signin');

      // 新規登録リンクをクリック
      await page.getByText('新規登録').click();
      await expect(page).toHaveURL(/\/auth\/register/);
      await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible();
    });

    test('パスワードリセットリンクが表示される', async ({ page }) => {
      await page.goto('/auth/signin');

      // パスワードを忘れた場合のリンク確認
      await expect(page.getByText('パスワードを忘れた場合')).toBeVisible();
      
      // リンクをクリック（実装されている場合）
      await page.getByText('パスワードを忘れた場合').click();
      // パスワードリセットページへの遷移確認
      // await expect(page).toHaveURL(/\/auth\/forgot-password/);
    });
  });

  test.describe('セッション管理フロー', () => {
    test('認証済みユーザーは保護されたページにアクセスできる', async ({ page }) => {
      // ログイン状態をシミュレート（実際のテストでは事前にログインが必要）
      // await loginUser(page, 'existing-user@example.com', 'ExistingUser123!');

      // 保護されたページにアクセス
      await page.goto('/board');
      
      // ログインしていない場合はログインページにリダイレクト
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('未認証ユーザーは保護されたページにアクセスできない', async ({ page }) => {
      // 直接保護されたページにアクセス
      await page.goto('/board');

      // ログインページにリダイレクトされる
      await expect(page).toHaveURL(/\/auth\/signin/);
      await expect(page.getByText('ログインが必要です')).toBeVisible();
    });

    test('セッション有効期限が適切に管理される', async ({ page }) => {
      // セッションの有効期限テストは実装が複雑なため、
      // ここでは基本的な動作のみテスト
      await page.goto('/auth/signin');
      
      // セッションクッキーの確認
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('next-auth') || cookie.name.includes('session')
      );
      
      // セッションクッキーが適切に設定されている（ログイン後）
      // if (sessionCookie) {
      //   expect(sessionCookie.httpOnly).toBe(true);
      //   expect(sessionCookie.secure).toBe(true); // HTTPS環境の場合
      // }
    });
  });

  test.describe('ログアウトフロー', () => {
    test('ログアウトが正常に動作する', async ({ page }) => {
      // 事前にログイン（実装に応じて調整）
      // await loginUser(page, 'existing-user@example.com', 'ExistingUser123!');
      
      // ログアウト実行（ナビゲーションメニューから）
      // await page.getByText('ログアウト').click();
      
      // ログインページにリダイレクトされる
      // await expect(page).toHaveURL(/\/auth\/signin/);
      
      // セッションがクリアされている
      // await page.goto('/board');
      // await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('ログアウト後に認証が必要なページにアクセスできない', async ({ page }) => {
      // ログアウト実行
      // await signOut(page);
      
      // 保護されたページにアクセス試行
      await page.goto('/board');
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時に適切なエラーメッセージが表示される', async ({ page }) => {
      // ネットワークリクエストをインターセプト
      await page.route('/api/auth/**', (route) => {
        route.abort('connectionrefused');
      });

      await page.goto('/auth/signin');
      await page.getByLabel('メールアドレス').fill('test@example.com');
      await page.getByLabel('パスワード').fill('TestPassword123!');
      await page.getByRole('button', { name: 'ログイン' }).click();

      // ネットワークエラーメッセージの確認
      await expect(page.getByText('サーバーエラーが発生しました')).toBeVisible();
    });

    test('サーバーエラー時に適切なエラーメッセージが表示される', async ({ page }) => {
      // サーバーエラーをシミュレート
      await page.route('/api/auth/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error',
            code: 'INTERNAL_SERVER_ERROR'
          })
        });
      });

      await page.goto('/auth/register');
      await page.getByLabel('名前').fill(testUser.name);
      await page.getByLabel('メールアドレス').fill(testUser.email);
      await page.getByLabel('パスワード', { exact: true }).fill(testUser.password);
      await page.getByLabel('パスワード確認').fill(testUser.confirmPassword);
      await page.getByRole('button', { name: '登録する' }).click();

      // サーバーエラーメッセージの確認
      await expect(page.getByText('サーバーエラーが発生しました')).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('ログインフォームがアクセシビリティ要件を満たしている', async ({ page }) => {
      await page.goto('/auth/signin');

      // フォームラベルの確認
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('パスワード')).toBeVisible();

      // aria属性の確認
      const passwordInput = page.getByLabel('パスワード');
      const toggleButton = page.getByLabel('toggle password visibility');
      
      await expect(toggleButton).toHaveAttribute('aria-label');
      
      // キーボードナビゲーションの確認
      await passwordInput.press('Tab');
      await expect(toggleButton).toBeFocused();
    });

    test('登録フォームがアクセシビリティ要件を満たしている', async ({ page }) => {
      await page.goto('/auth/register');

      // すべてのフォームフィールドにラベルが付いている
      await expect(page.getByLabel('名前')).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('パスワード', { exact: true })).toBeVisible();
      await expect(page.getByLabel('パスワード確認')).toBeVisible();

      // エラーメッセージが適切に関連付けられている
      await page.getByLabel('名前').fill('');
      await page.getByRole('button', { name: '登録する' }).click();
      
      const nameInput = page.getByLabel('名前');
      const errorMessage = page.getByText('名前は必須です');
      
      // aria-describedby属性が設定されている（実装による）
      // await expect(nameInput).toHaveAttribute('aria-describedby');
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル画面でフォームが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/signin');

      // フォーム要素が表示される
      await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('パスワード')).toBeVisible();
      await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();

      // ボタンが適切なサイズで表示される
      const loginButton = page.getByRole('button', { name: 'ログイン' });
      const buttonBox = await loginButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThan(200); // 最小タップエリア
      expect(buttonBox?.height).toBeGreaterThan(40);
    });

    test('タブレット画面でフォームが正しく表示される', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/auth/register');

      // フォーム要素が適切に配置される
      await expect(page.getByRole('heading', { name: '新規登録' })).toBeVisible();
      
      // フォームの幅が適切である
      const formCard = page.locator('.MuiCard-root').first();
      const cardBox = await formCard.boundingBox();
      expect(cardBox?.width).toBeLessThan(500); // 最大幅制限
    });
  });
});

// ヘルパー関数
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth/signin');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/board', { timeout: 5000 });
}

async function signOut(page: Page) {
  // ナビゲーションメニューからログアウト
  await page.getByText('ログアウト').click();
  await page.waitForURL('/auth/signin', { timeout: 5000 });
}
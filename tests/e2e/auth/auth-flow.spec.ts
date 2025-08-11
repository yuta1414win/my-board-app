/**
 * 認証機能のE2Eテスト
 * ユーザー登録、ログイン、セッション管理、ログアウトの統合テスト
 */

import { test, expect, type Page } from '@playwright/test';

// テストユーザーデータ
const testUser = {
  name: 'E2E Test User',
  email: `e2e-test-${Date.now()}@example.com`, // 一意性を確保
  password: 'TestPassword123!',
};

const existingUser = {
  name: 'Existing User',
  email: 'existing@example.com',
  password: 'ExistingPassword123!',
};

// ページオブジェクト風のヘルパー関数
class AuthPages {
  constructor(private page: Page) {}

  async navigateToRegister() {
    await this.page.goto('/auth/register');
    await expect(this.page).toHaveTitle(/登録|Register|My Board App/);
  }

  async navigateToSignIn() {
    await this.page.goto('/auth/signin');
    await expect(this.page).toHaveTitle(/ログイン|Sign In|My Board App/);
  }

  async navigateToBoard() {
    await this.page.goto('/board');
  }

  async fillRegistrationForm(userData: typeof testUser) {
    await this.page.getByLabel(/名前|Name/).fill(userData.name);
    await this.page.getByLabel(/メールアドレス|Email/).fill(userData.email);
    await this.page
      .getByLabel(/パスワード|Password/)
      .first()
      .fill(userData.password);
  }

  async submitRegistration() {
    await this.page.getByRole('button', { name: /登録|Register/ }).click();
  }

  async fillSignInForm(email: string, password: string) {
    await this.page.getByLabel(/メールアドレス|Email/).fill(email);
    await this.page.getByLabel(/パスワード|Password/).fill(password);
  }

  async submitSignIn() {
    await this.page
      .locator('form')
      .getByRole('button', { name: /^(ログイン|Sign In)$/ })
      .click();
  }

  async signOut() {
    // ナビゲーションまたはプロフィールメニューからログアウト
    const signOutButton = this.page.getByRole('button', {
      name: /ログアウト|Sign Out|Logout/,
    });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    } else {
      // ドロップダウンメニューやハンバーガーメニューの場合
      await this.page
        .getByRole('button', { name: /メニュー|Menu|Profile/ })
        .click();
      await this.page
        .getByRole('menuitem', { name: /ログアウト|Sign Out/ })
        .click();
    }
  }

  async expectToBeOnSignInPage() {
    await expect(this.page).toHaveURL(/\/auth\/signin/);
    await expect(
      this.page.getByRole('heading', { name: /ログイン|Sign In/ })
    ).toBeVisible();
  }

  async expectToBeOnRegisterPage() {
    await expect(this.page).toHaveURL(/\/auth\/register/);
    await expect(
      this.page.getByRole('heading', { name: /登録|Register/ })
    ).toBeVisible();
  }

  async expectToBeOnBoardPage() {
    await expect(this.page).toHaveURL(/\/board/);
    await expect(
      this.page.getByRole('heading', { name: /掲示板|Board/ })
    ).toBeVisible();
  }

  async expectSuccessMessage(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      // 成功を示すアラートやメッセージを探す
      const successAlert = this.page
        .locator('[role="alert"], .success, .alert-success')
        .first();
      await expect(successAlert).toBeVisible();
    }
  }

  async expectErrorMessage(message?: string) {
    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    } else {
      // エラーを示すアラートやメッセージを探す
      const errorAlert = this.page
        .locator('[role="alert"], .error, .alert-error')
        .first();
      await expect(errorAlert).toBeVisible();
    }
  }

  async expectValidationError(field: string, message?: string) {
    const fieldElement = this.page.getByLabel(new RegExp(field, 'i'));
    await expect(fieldElement).toHaveAttribute('aria-invalid', 'true');

    if (message) {
      await expect(this.page.getByText(message)).toBeVisible();
    }
  }
}

test.describe('認証フロー E2E テスト', () => {
  let authPages: AuthPages;

  test.beforeEach(async ({ page }) => {
    authPages = new AuthPages(page);
  });

  test.describe('ユーザー登録フロー', () => {
    test('新規ユーザー登録が成功する', async ({ page }) => {
      // Arrange & Act
      await authPages.navigateToRegister();
      await authPages.fillRegistrationForm(testUser);
      await authPages.submitRegistration();

      // Assert
      await authPages.expectSuccessMessage('登録が完了しました');

      // メール確認メッセージが表示される
      await expect(page.getByText(/確認メール.*送信/)).toBeVisible();

      // ログインページへのリンクが表示される
      const signInLink = page.getByRole('link', { name: /^(ログイン|Sign In)$/ });
      await expect(signInLink).toBeVisible();
    });

    test('無効なデータで登録が失敗する', async ({ page }) => {
      await authPages.navigateToRegister();

      // 弱いパスワードでテスト
      await authPages.fillRegistrationForm({
        ...testUser,
        password: '123', // 弱いパスワード
      });
      await authPages.submitRegistration();

      // バリデーションエラーが表示される
      await authPages.expectValidationError('パスワード', '8文字以上');
    });

    test('必須フィールドの検証が動作する', async ({ page }) => {
      await authPages.navigateToRegister();

      // 空のフォームで送信
      await authPages.submitRegistration();

      // 複数の必須フィールドエラーが表示される
      await authPages.expectValidationError('名前');
      await authPages.expectValidationError('メールアドレス');
      await authPages.expectValidationError('パスワード');
    });

    test('既存のメールアドレスで登録エラーが表示される', async ({ page }) => {
      await authPages.navigateToRegister();
      await authPages.fillRegistrationForm({
        ...testUser,
        email: existingUser.email, // 既存のメール
      });
      await authPages.submitRegistration();

      await authPages.expectErrorMessage('既に登録されています');
    });
  });

  test.describe('ログインフロー', () => {
    test.beforeAll(async () => {
      // テスト用ユーザーを事前に作成（実際のテストでは、APIやデータベースシードを使用）
      // ここでは、既存のユーザーが存在すると仮定
    });

    test('正しい認証情報でログインが成功する', async ({ page }) => {
      // Arrange & Act
      await authPages.navigateToSignIn();
      await authPages.fillSignInForm(existingUser.email, existingUser.password);
      await authPages.submitSignIn();

      // Assert
      await authPages.expectToBeOnBoardPage();

      // ユーザー情報が表示される
      await expect(page.getByText(existingUser.name)).toBeVisible();
    });

    test('間違ったパスワードでログインが失敗する', async ({ page }) => {
      await authPages.navigateToSignIn();
      await authPages.fillSignInForm(existingUser.email, 'WrongPassword123!');
      await authPages.submitSignIn();

      // エラーメッセージが表示される
      await authPages.expectErrorMessage(
        'メールアドレスまたはパスワードが正しくありません'
      );

      // サインインページに留まる
      await authPages.expectToBeOnSignInPage();
    });

    test('存在しないメールアドレスでログインが失敗する', async ({ page }) => {
      await authPages.navigateToSignIn();
      await authPages.fillSignInForm('nonexistent@example.com', 'Password123!');
      await authPages.submitSignIn();

      await authPages.expectErrorMessage();
      await authPages.expectToBeOnSignInPage();
    });

    test('未認証ユーザーのログインが失敗する', async ({ page }) => {
      // 未認証ユーザーでログイン試行
      await authPages.navigateToSignIn();
      await authPages.fillSignInForm(testUser.email, testUser.password); // 登録したが未認証
      await authPages.submitSignIn();

      // メール認証エラーが表示される
      await authPages.expectErrorMessage('メールアドレスが確認されていません');
      await authPages.expectToBeOnSignInPage();
    });

    test('ログイン失敗回数制限が動作する', async ({ page }) => {
      await authPages.navigateToSignIn();

      // 複数回ログイン失敗を試行
      for (let i = 1; i <= 5; i++) {
        await authPages.fillSignInForm(existingUser.email, 'WrongPassword');
        await authPages.submitSignIn();

        if (i < 5) {
          // 試行回数が表示される
          await expect(
            page.getByText(new RegExp(`試行回数.*${i}/5`))
          ).toBeVisible();
        }

        // 次の試行のためにフォームをクリア
        await page.getByLabel(/パスワード/).clear();
      }

      // 5回目で アカウントロックメッセージが表示される
      await authPages.expectErrorMessage('ログイン試行回数が上限を超えました');

      // ログインボタンが無効化される
      const loginButton = page
        .locator('form')
        .getByRole('button', { name: /^(ログイン)$/ });
      await expect(loginButton).toBeDisabled();
    });
  });

  test.describe('セッション管理テスト', () => {
    test.beforeEach(async ({ page }) => {
      // 各テストの前にログイン状態にする
      await authPages.navigateToSignIn();
      await authPages.fillSignInForm(existingUser.email, existingUser.password);
      await authPages.submitSignIn();
      await authPages.expectToBeOnBoardPage();
    });

    test('ログイン後にセッションが維持される', async ({ page }) => {
      // ページをリロードしてもログイン状態が維持される
      await page.reload();
      await authPages.expectToBeOnBoardPage();
      await expect(page.getByText(existingUser.name)).toBeVisible();
    });

    test('新しいタブでもセッションが共有される', async ({ context, page }) => {
      // 新しいタブを開く
      const newTab = await context.newPage();
      const newAuthPages = new AuthPages(newTab);

      // 保護されたページに直接アクセス
      await newAuthPages.navigateToBoard();

      // セッションが共有されているため、ログイン状態でアクセスできる
      await newAuthPages.expectToBeOnBoardPage();
      await expect(newTab.getByText(existingUser.name)).toBeVisible();

      await newTab.close();
    });

    test('ブラウザを閉じて再開してもセッションが維持される', async ({
      browser,
    }) => {
      // 新しいブラウザコンテキストを作成（ストレージは保持）
      const persistentContext = await browser.newContext({
        storageState: 'tests/e2e/auth-state.json', // セッション状態を保存
      });

      const newPage = await persistentContext.newPage();
      const newAuthPages = new AuthPages(newPage);

      await newAuthPages.navigateToBoard();
      await newAuthPages.expectToBeOnBoardPage();

      await persistentContext.close();
    });

    test('未認証ユーザーは保護されたページにアクセスできない', async ({
      context,
    }) => {
      // 新しい匿名セッション
      const anonymousContext = await context.browser()!.newContext();
      const anonymousPage = await anonymousContext.newPage();
      const anonymousAuthPages = new AuthPages(anonymousPage);

      // 保護されたページへ直接アクセス
      await anonymousPage.goto('/board');

      // ログインページにリダイレクトされる
      await anonymousAuthPages.expectToBeOnSignInPage();

      // コールバックURLが設定されている
      await expect(anonymousPage).toHaveURL(/callbackUrl.*board/);

      await anonymousContext.close();
    });
  });

  test.describe('ログアウトフロー', () => {
    test.beforeEach(async ({ page }) => {
      // ログイン状態にする
      await authPages.navigateToSignIn();
      await authPages.fillSignInForm(existingUser.email, existingUser.password);
      await authPages.submitSignIn();
      await authPages.expectToBeOnBoardPage();
    });

    test('ログアウトが正常に動作する', async ({ page }) => {
      // Act
      await authPages.signOut();

      // Assert
      // ログインページにリダイレクトされる
      await authPages.expectToBeOnSignInPage();

      // ログアウトメッセージが表示される（オプション）
      const logoutMessage = page.getByText(/ログアウトしました|Signed out/);
      if (await logoutMessage.isVisible({ timeout: 1000 })) {
        await expect(logoutMessage).toBeVisible();
      }
    });

    test('ログアウト後に保護されたページにアクセスできない', async ({
      page,
    }) => {
      await authPages.signOut();

      // 保護されたページへ直接アクセス
      await authPages.navigateToBoard();

      // ログインページにリダイレクトされる
      await authPages.expectToBeOnSignInPage();
    });

    test('ログアウト後に他のタブのセッションも無効化される', async ({
      context,
      page,
    }) => {
      // 新しいタブを開いてログイン状態を確認
      const secondTab = await context.newPage();
      const secondAuthPages = new AuthPages(secondTab);

      await secondAuthPages.navigateToBoard();
      await secondAuthPages.expectToBeOnBoardPage();

      // 最初のタブでログアウト
      await authPages.signOut();

      // 2番目のタブでページを更新
      await secondTab.reload();

      // 2番目のタブもログインページにリダイレクトされる
      await secondAuthPages.expectToBeOnSignInPage();

      await secondTab.close();
    });
  });

  test.describe('レスポンシブデザインテスト', () => {
    test('モバイル表示での認証フローが動作する', async ({ page }) => {
      // モバイルビューポートに設定
      await page.setViewportSize({ width: 375, height: 667 });

      // 登録フロー
      await authPages.navigateToRegister();
      await authPages.fillRegistrationForm(testUser);
      await authPages.submitRegistration();
      await authPages.expectSuccessMessage();

      // ログインフロー
      await authPages.navigateToSignIn();
      await authPages.fillSignInForm(existingUser.email, existingUser.password);
      await authPages.submitSignIn();
      await authPages.expectToBeOnBoardPage();

      // モバイルメニューからログアウト
      const mobileMenuButton = page.getByRole('button', {
        name: /menu|メニュー/i,
      });
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
      }
      await authPages.signOut();
      await authPages.expectToBeOnSignInPage();
    });

    test('タブレット表示での認証フローが動作する', async ({ page }) => {
      // タブレットビューポートに設定
      await page.setViewportSize({ width: 768, height: 1024 });

      await authPages.navigateToSignIn();
      await authPages.fillSignInForm(existingUser.email, existingUser.password);
      await authPages.submitSignIn();
      await authPages.expectToBeOnBoardPage();
    });
  });

  test.describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーションが動作する', async ({ page }) => {
      await authPages.navigateToSignIn();

      // Tabキーでフォーカス移動
      await page.keyboard.press('Tab'); // メールフィールド
      await expect(page.getByLabel(/メールアドレス/)).toBeFocused();

      await page.keyboard.press('Tab'); // パスワードフィールド
      await expect(page.getByLabel(/パスワード/)).toBeFocused();

      await page.keyboard.press('Tab'); // パスワード表示切替ボタン
      await page.keyboard.press('Tab'); // ログインボタン
      await expect(
        page.locator('form').getByRole('button', { name: /^(ログイン)$/ })
      ).toBeFocused();

      // Enterキーでフォーム送信
      await authPages.fillSignInForm(existingUser.email, existingUser.password);
      await page
        .locator('form')
        .getByRole('button', { name: /^(ログイン)$/ })
        .focus();
      await page.keyboard.press('Enter');

      await authPages.expectToBeOnBoardPage();
    });

    test('スクリーンリーダー向けのラベルが適切に設定されている', async ({
      page,
    }) => {
      await authPages.navigateToRegister();

      // ARIAラベルの確認
      await expect(page.getByLabel(/名前/)).toBeVisible();
      await expect(page.getByLabel(/メールアドレス/)).toBeVisible();
      await expect(page.getByLabel(/パスワード/)).toBeVisible();

      // 必須フィールドの表示
      const requiredFields = page.locator('[required], [aria-required="true"]');
      expect(await requiredFields.count()).toBeGreaterThan(0);
    });

    test('フォームエラーメッセージがスクリーンリーダーに適切に伝わる', async ({
      page,
    }) => {
      await authPages.navigateToSignIn();
      await authPages.submitSignIn(); // 空のフォーム送信

      // aria-invalid属性の確認
      const emailField = page.getByLabel(/メールアドレス/);
      await expect(emailField).toHaveAttribute('aria-invalid', 'true');

      // エラーメッセージとフィールドの関連付け確認
      const errorMessage = page.getByText(/必須です|入力してください/);
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('認証フローのページ読み込み速度が適切である', async ({ page }) => {
      // ページ読み込み開始
      const startTime = Date.now();

      await authPages.navigateToSignIn();

      // ページが完全に読み込まれるまでの時間
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 3秒以内に読み込まれることを確認
      expect(loadTime).toBeLessThan(3000);
    });

    test('大量のフォーム送信でパフォーマンスが劣化しない', async ({ page }) => {
      await authPages.navigateToSignIn();

      const times: number[] = [];

      // 複数回フォーム送信をテスト
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();

        await authPages.fillSignInForm('test@example.com', 'wrongpassword');
        await authPages.submitSignIn();
        await authPages.expectErrorMessage();

        const endTime = Date.now();
        times.push(endTime - startTime);

        // フォームをリセット
        await page.getByLabel(/メールアドレス/).clear();
        await page.getByLabel(/パスワード/).clear();
      }

      // すべてのレスポンス時間が5秒以内
      times.forEach((time) => {
        expect(time).toBeLessThan(5000);
      });

      // レスポンス時間の悪化が20%以内
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);
      const performanceDegradation = (maxTime - times[0]) / times[0];
      expect(performanceDegradation).toBeLessThan(0.2); // 20%以内
    });
  });
});

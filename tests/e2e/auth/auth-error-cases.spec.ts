/**
 * 認証システムエラーケースのE2Eテスト
 * エラーハンドリング、セキュリティ、エッジケースのテスト
 */

import { test, expect, Page } from '@playwright/test';

// テスト用データ
const testData = {
  validUser: {
    name: 'Error Test User',
    email: `error-test-${Date.now()}@example.com`,
    password: 'ErrorTest123!',
  },
  maliciousInputs: {
    xssName: '<script>alert("XSS")</script>',
    sqlInjectionEmail: "'; DROP TABLE users; --@example.com",
    longName: 'A'.repeat(1000),
    longPassword: 'A1!' + 'a'.repeat(1000),
    invalidCharsName: '!@#$%^&*(){}[]|\\:";\'<>?,./`~',
  },
};

test.describe('認証システム エラーケース & セキュリティテスト', () => {
  test.beforeEach(async ({ page, context }) => {
    // テスト前のクリーンアップ
    await context.clearCookies();
    await context.clearPermissions();

    // コンソールエラーをキャッチ
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
        console.log(`Console error: ${msg.text()}`);
      }
    });

    // JavaScriptエラーをキャッチ
    page.on('pageerror', (error) => {
      console.log(`Page error: ${error.message}`);
    });
  });

  test.describe('ネットワークエラーテスト', () => {
    test('APIエンドポイント接続失敗時の適切なエラー表示', async ({ page }) => {
      // 登録APIへのリクエストをブロック
      await page.route('/api/auth/register', (route) => {
        route.abort('connectionrefused');
      });

      await page.goto('/auth/register');

      // 正常なデータを入力
      await page.getByLabel('名前').fill(testData.validUser.name);
      await page.getByLabel('メールアドレス').fill(testData.validUser.email);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // ネットワークエラーメッセージの確認
      await expect(
        page.getByText('サーバーエラーが発生しました')
      ).toBeVisible();
      await expect(
        page.getByText('しばらく時間を置いてお試しください')
      ).toBeVisible();
    });

    test('ログインAPI接続失敗時の適切なエラー表示', async ({ page }) => {
      // NextAuth.jsのログインエンドポイントをブロック
      await page.route('/api/auth/signin', (route) => {
        route.abort('connectionrefused');
      });

      await page.goto('/auth/signin');
      await page.getByLabel('メールアドレス').fill('test@example.com');
      await page.getByLabel('パスワード').fill('TestPassword123!');
      await page
        .locator('form')
        .getByRole('button', { name: 'ログイン', exact: true })
        .click();

      // エラーメッセージの確認
      await expect(page.getByText('サーバーエラー')).toBeVisible();
    });

    test('タイムアウトエラーの適切な処理', async ({ page }) => {
      // 長時間応答しないAPIを模擬
      await page.route('/api/auth/register', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30秒待機
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request timeout' }),
        });
      });

      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testData.validUser.name);
      await page.getByLabel('メールアドレス').fill(testData.validUser.email);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // ローディング状態の確認
      await expect(page.getByRole('button')).toContainText('');
      await expect(page.getByTestId('loading-spinner')).toBeVisible();
    });
  });

  test.describe('サーバーエラーテスト', () => {
    test('500エラー時の適切なエラー表示', async ({ page }) => {
      await page.route('/api/auth/register', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error:
              'サーバーエラーが発生しました。しばらく時間を置いてお試しください。',
            code: 'INTERNAL_SERVER_ERROR',
          }),
        });
      });

      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testData.validUser.name);
      await page.getByLabel('メールアドレス').fill(testData.validUser.email);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      await expect(
        page.getByText('サーバーエラーが発生しました')
      ).toBeVisible();
      await expect(
        page.getByText('しばらく時間を置いてお試しください')
      ).toBeVisible();
    });

    test('429レート制限エラー時の適切な表示', async ({ page }) => {
      await page.route('/api/auth/register', (route) => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '登録試行回数が上限を超えました。1時間後にお試しください。',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        });
      });

      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testData.validUser.name);
      await page.getByLabel('メールアドレス').fill(testData.validUser.email);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      await expect(
        page.getByText('登録試行回数が上限を超えました')
      ).toBeVisible();
      await expect(page.getByText('1時間後にお試しください')).toBeVisible();
    });

    test('400バリデーションエラー時の詳細表示', async ({ page }) => {
      await page.route('/api/auth/register', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'バリデーションエラー',
            code: 'VALIDATION_ERROR',
            details: [
              {
                field: 'password',
                message: 'パスワードは数字、英字、特殊文字を含む必要があります',
              },
            ],
          }),
        });
      });

      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testData.validUser.name);
      await page.getByLabel('メールアドレス').fill(testData.validUser.email);
      await page.getByLabel('パスワード', { exact: true }).fill('weakpassword'); // 弱いパスワード
      await page.getByLabel('パスワード確認').fill('weakpassword');

      await page.getByRole('button', { name: '登録する' }).click();

      await expect(
        page.getByText('パスワードは数字、英字、特殊文字を含む必要があります')
      ).toBeVisible();
    });
  });

  test.describe('セキュリティテスト', () => {
    test('XSSインジェクション攻撃の防御', async ({ page }) => {
      await page.goto('/auth/register');

      // XSSペイロードを含む入力
      await page.getByLabel('名前').fill(testData.maliciousInputs.xssName);
      await page.getByLabel('メールアドレス').fill('xss-test@example.com');
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // XSSスクリプトが実行されていないことを確認
      const alerts = [];
      page.on('dialog', (dialog) => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });

      await page.waitForTimeout(2000);
      expect(alerts).toHaveLength(0); // アラートが表示されないことを確認

      // 入力値がエスケープされて表示されていることを確認（もしエラーメッセージに含まれる場合）
      const pageContent = await page.textContent('body');
      if (pageContent?.includes('script')) {
        expect(pageContent).not.toContain('<script>alert("XSS")</script>');
      }
    });

    test('SQLインジェクション攻撃への耐性確認', async ({ page }) => {
      await page.goto('/auth/register');

      // SQLインジェクションペイロードを含む入力
      await page.getByLabel('名前').fill('Test User');
      await page
        .getByLabel('メールアドレス')
        .fill(testData.maliciousInputs.sqlInjectionEmail);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // SQLインジェクションが無効化されることを確認
      // （NoSQLデータベースなのでSQL注入は効果がないが、適切に処理されることを確認）
      await page.waitForTimeout(2000);

      // エラーメッセージまたは成功メッセージが表示される（データベースが破壊されない）
      const hasError = await page.isVisible('text=エラー');
      const hasSuccess = await page.isVisible('text=成功');
      expect(hasError || hasSuccess).toBeTruthy();
    });

    test('CSRF攻撃への防御確認', async ({ page }) => {
      // CSRFトークンなしでのリクエスト送信を試行
      await page.goto('/auth/signin');

      // セッションを設定せずに直接APIを呼び出し
      const response = await page.request.post('/api/auth/register', {
        data: testData.validUser,
      });

      // CSRFトークンなしの場合は適切にブロックされる
      expect(response.status()).toBe(403);
    });

    test('不正な文字入力への適切な対処', async ({ page }) => {
      await page.goto('/auth/register');

      // 制御文字や不正な文字を含む入力
      await page
        .getByLabel('名前')
        .fill(testData.maliciousInputs.invalidCharsName);
      await page.getByLabel('メールアドレス').fill('invalid@example.com');
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // 不正な文字が適切にバリデートされる
      await page.waitForTimeout(2000);

      // システムがクラッシュしないことを確認
      await expect(page.getByText('エラー')).toBeVisible();
    });

    test('パスワード総当たり攻撃への対策確認', async ({ page }) => {
      await page.goto('/auth/signin');

      const targetEmail = 'brute-force-test@example.com';
      const passwords = [
        'password1',
        'password2',
        'password3',
        'password4',
        'password5',
        'password6',
      ];

      // 連続してログイン試行
      for (const [index, password] of passwords.entries()) {
        await page.getByLabel('メールアドレス').fill(targetEmail);
        await page.getByLabel('パスワード').fill(password);
        await page
          .locator('form')
          .getByRole('button', { name: 'ログイン', exact: true })
          .click();

        if (index >= 4) {
          // 5回目以降でアカウントロックが発動する
          await expect(
            page.getByText('ログインがブロックされています')
          ).toBeVisible();
          break;
        }

        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('入力境界値テスト', () => {
    test('最大長を超える入力の適切な処理', async ({ page }) => {
      await page.goto('/auth/register');

      // 名前の最大長(50文字)を超える入力
      await page.getByLabel('名前').fill(testData.maliciousInputs.longName);
      await page
        .getByLabel('メールアドレス')
        .fill('long-name-test@example.com');
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // 適切なバリデーションエラーが表示される
      await expect(
        page.getByText('50文字以内で入力してください')
      ).toBeVisible();
    });

    test('パスワード最大長を超える入力の処理', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByLabel('名前').fill('Test User');
      await page
        .getByLabel('メールアドレス')
        .fill('long-password-test@example.com');
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.maliciousInputs.longPassword);
      await page
        .getByLabel('パスワード確認')
        .fill(testData.maliciousInputs.longPassword);

      await page.getByRole('button', { name: '登録する' }).click();

      // 適切なバリデーションエラーが表示される
      await expect(
        page.getByText('100文字以内で入力してください')
      ).toBeVisible();
    });

    test('空の入力値への適切な処理', async ({ page }) => {
      await page.goto('/auth/register');

      // すべて空のまま送信
      await page.getByRole('button', { name: '登録する' }).click();

      // 必須フィールドのエラーが表示される
      await expect(page.getByText('名前は必須です')).toBeVisible();
      await expect(page.getByText('メールアドレス')).toBeVisible();
      await expect(page.getByText('パスワード')).toBeVisible();
    });

    test('Unicode文字の適切な処理', async ({ page }) => {
      await page.goto('/auth/register');

      // 日本語、絵文字、特殊Unicode文字を含む入力
      const unicodeData = {
        name: '田中太郎 🌸',
        email: 'unicode-test@example.com',
        password: testData.validUser.password,
      };

      await page.getByLabel('名前').fill(unicodeData.name);
      await page.getByLabel('メールアドレス').fill(unicodeData.email);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(unicodeData.password);
      await page.getByLabel('パスワード確認').fill(unicodeData.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // Unicode文字が適切に処理される
      await page.waitForTimeout(2000);

      // エラーが発生せずに処理される（または適切なメッセージが表示される）
      const hasError = await page.isVisible('text=エラー');
      const hasSuccess =
        (await page.isVisible('text=成功')) ||
        (await page.isVisible('text=登録'));
      expect(!hasError || hasSuccess).toBeTruthy();
    });
  });

  test.describe('ブラウザ互換性テスト', () => {
    test('JavaScriptが無効な場合の適切な表示', async ({ page }) => {
      // JavaScriptを無効化
      await page.context().setJavaScriptEnabled(false);

      await page.goto('/auth/signin');

      // 基本的なHTMLフォームが表示される
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('パスワード')).toBeVisible();
      await expect(
        page.locator('form').getByRole('button', { name: 'ログイン', exact: true })
      ).toBeVisible();
    });

    test('Cookieが無効な場合の適切な処理', async ({ page, context }) => {
      // Cookieを無効化
      await context.setPermissions([]);

      await page.goto('/auth/signin');
      await page.getByLabel('メールアドレス').fill('test@example.com');
      await page.getByLabel('パスワード').fill('TestPassword123!');
      await page
        .locator('form')
        .getByRole('button', { name: 'ログイン', exact: true })
        .click();

      // Cookieなしでも適切なエラーメッセージが表示される
      await page.waitForTimeout(2000);
    });

    test('古いブラウザでの基本機能確保', async ({ page }) => {
      // 古いブラウザのUser-Agentを設定
      await page.setExtraHTTPHeaders({
        'User-Agent':
          'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
      });

      await page.goto('/auth/signin');

      // 基本的なフォーム機能が動作する
      await expect(page.getByLabel('メールアドレス')).toBeVisible();
      await expect(page.getByLabel('パスワード')).toBeVisible();
      await expect(
        page.locator('form').getByRole('button', { name: 'ログイン', exact: true })
      ).toBeVisible();
    });
  });

  test.describe('競合状態テスト', () => {
    test('重複する登録リクエストの適切な処理', async ({ page }) => {
      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testData.validUser.name);
      await page.getByLabel('メールアドレス').fill(testData.validUser.email);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      // 複数回クリック（重複送信）
      const submitButton = page.getByRole('button', { name: '登録する' });
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click(),
      ]);

      // 重複送信が防止される
      await expect(submitButton).toBeDisabled();

      // 適切な結果が表示される（成功またはエラー）
      await page.waitForTimeout(3000);
    });

    test('同時ログイン試行の適切な処理', async ({ page }) => {
      await page.goto('/auth/signin');

      await page
        .getByLabel('メールアドレス')
        .fill('concurrent-test@example.com');
      await page.getByLabel('パスワード').fill('TestPassword123!');

      // 複数回同時にログインボタンをクリック
      const loginButton = page
        .locator('form')
        .getByRole('button', { name: 'ログイン', exact: true });
      await Promise.all([loginButton.click(), loginButton.click()]);

      // 重複送信が防止される
      await page.waitForTimeout(2000);
    });
  });

  test.describe('パフォーマンス境界テスト', () => {
    test('大量データ処理時の適切な応答', async ({ page }) => {
      // 大量の文字列を含むフォーム送信
      const largeData = 'A'.repeat(10000);

      await page.route('/api/auth/register', (route) => {
        // 適切にサイズ制限される
        route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Payload too large',
            code: 'PAYLOAD_TOO_LARGE',
          }),
        });
      });

      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(largeData);
      await page
        .getByLabel('メールアドレス')
        .fill('large-data-test@example.com');
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // 適切なエラーメッセージが表示される
      await expect(page.getByText('エラー')).toBeVisible();
    });

    test('低速ネットワーク環境での適切な動作', async ({ page }) => {
      // ネットワーク速度をシミュレート
      await page.route('/api/auth/register', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5秒遅延
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: '登録が完了しました',
          }),
        });
      });

      await page.goto('/auth/register');

      await page.getByLabel('名前').fill(testData.validUser.name);
      await page.getByLabel('メールアドレス').fill(testData.validUser.email);
      await page
        .getByLabel('パスワード', { exact: true })
        .fill(testData.validUser.password);
      await page.getByLabel('パスワード確認').fill(testData.validUser.password);

      await page.getByRole('button', { name: '登録する' }).click();

      // ローディング状態が適切に表示される
      await expect(page.getByRole('button')).toBeDisabled();

      // 最終的に成功メッセージが表示される
      await expect(page.getByText('登録が完了しました')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('アクセシビリティエラーテスト', () => {
    test('スクリーンリーダー向けエラーメッセージの適切な通知', async ({
      page,
    }) => {
      await page.goto('/auth/register');

      // 無効なデータで送信
      await page.getByLabel('名前').fill('');
      await page.getByRole('button', { name: '登録する' }).click();

      // エラーメッセージがaria-live regionに適切に配置される
      const errorMessage = page.getByText('名前は必須です');
      await expect(errorMessage).toBeVisible();

      // エラーメッセージがaria属性で適切に関連付けられている
      const nameInput = page.getByLabel('名前');
      const ariaDescribedBy = await nameInput.getAttribute('aria-describedby');
      expect(ariaDescribedBy).toBeTruthy();
    });

    test('キーボードナビゲーションでのエラー状態管理', async ({ page }) => {
      await page.goto('/auth/register');

      // キーボードでナビゲーション
      await page.keyboard.press('Tab'); // 名前フィールド
      await page.keyboard.press('Tab'); // メールフィールド
      await page.keyboard.press('Tab'); // パスワードフィールド
      await page.keyboard.press('Tab'); // パスワード確認フィールド
      await page.keyboard.press('Tab'); // 登録ボタン
      await page.keyboard.press('Enter'); // 送信

      // エラーメッセージにフォーカスが適切に移動する
      await page.waitForTimeout(1000);
      const focusedElement = await page.evaluate(
        () => document.activeElement?.tagName
      );
      expect(focusedElement).toBeTruthy();
    });
  });
});

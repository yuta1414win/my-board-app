import { test, expect } from '@playwright/test';

/**
 * CI用スモークテスト - コア機能のみを高速実行
 * 実行時間目標: 3分以内
 */

test.describe('スモークテスト（CI用）', () => {
  test('ホームページが正常に表示される', async ({ page }) => {
    await page.goto('/');

    // 基本要素の存在確認
    await expect(page).toHaveTitle(/掲示板アプリ/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // ナビゲーションの確認（AppBarのbannerロールで確認）
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test('掲示板ページへのナビゲーション', async ({ page }) => {
    await page.goto('/');

    // セッション有無でCTAが変わるため分岐
    const boardCta = page.getByRole('link', { name: '掲示板を開く' });
    if (await boardCta.isVisible().catch(() => false)) {
      await boardCta.click();
      await page.waitForURL('**/board');
      await expect(page.getByRole('heading')).toContainText(/掲示板|Board/);
    } else {
      // 未ログインの場合はログイン→成功後/boardへ
      await page.getByRole('link', { name: 'ログイン', exact: true }).click();
      await expect(page).toHaveURL(/\/auth\/signin/);
      await page.getByLabel(/メールアドレス/).fill('existing@example.com');
      await page.getByLabel(/パスワード/).fill('ExistingPassword123!');
      await page
        .locator('form')
        .getByRole('button', { name: 'ログイン', exact: true })
        .click();
      await expect(page).toHaveURL(/\/board/);
    }
  });

  test('投稿フォームの表示確認', async ({ page }) => {
    // 認証が必要なのでログインしてから/boardへ
    await page.goto('/auth/signin');
    await page.getByLabel(/メールアドレス/).fill('existing@example.com');
    await page.getByLabel(/パスワード/).fill('ExistingPassword123!');
    await page
      .locator('form')
      .getByRole('button', { name: 'ログイン', exact: true })
      .click();
    await expect(page).toHaveURL(/\/board/);

    // 新規投稿ページに遷移して投稿フォームを確認（実装に準拠）
    await page.getByRole('button', { name: '新規投稿' }).click();
    await page.waitForURL('**/posts/new');
    await expect(page.getByRole('heading', { name: /新しい投稿|新規投稿/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /投稿|投稿する/ })).toBeVisible();
  });

  test('基本的なフォームバリデーション', async ({ page }) => {
    await page.goto('/auth/signin');
    // ログインフォームのバリデーション（空送信でURL不変）
    const submit = page
      .locator('form')
      .getByRole('button', { name: 'ログイン', exact: true });
    await submit.click();
    const current = page.url();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(current);
  });

  test('レスポンシブデザインの基本確認', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
  });
});

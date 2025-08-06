import { test, expect } from '@playwright/test';

test.describe('基本的なE2Eテスト', () => {
  test('ホームページが正しく表示される', async ({ page }) => {
    // ホームページにアクセス
    await page.goto('/');

    // ページタイトルの確認
    await expect(page).toHaveTitle(/My Board App/i);

    // 基本的な要素が存在することを確認
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('ナビゲーションが機能する', async ({ page }) => {
    await page.goto('/');

    // ナビゲーションリンクの存在確認（存在する場合）
    const navLinks = page.locator('nav a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      // 最初のリンクをクリック
      await navLinks.first().click();

      // ページ遷移を待つ
      await page.waitForLoadState('networkidle');

      // URLが変更されたことを確認
      expect(page.url()).not.toBe('/');
    }
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    await page.goto('/');

    // デスクトップビュー
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();

    // タブレットビュー
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // モバイルビュー
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('ページのパフォーマンス', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // ページロード時間が5秒以内であることを確認
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('アクセシビリティテスト', () => {
  test('キーボードナビゲーションが機能する', async ({ page }) => {
    await page.goto('/');

    // Tabキーでフォーカス可能な要素を取得
    const focusableElements = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const count = await focusableElements.count();

    if (count > 0) {
      // Tabキーを押してフォーカスを移動
      await page.keyboard.press('Tab');

      // アクティブな要素が存在することを確認
      const activeElement = page.locator(':focus');
      await expect(activeElement).toBeVisible();
    }
  });

  test('適切なARIA属性が設定されている', async ({ page }) => {
    await page.goto('/');

    // メインコンテンツにrole属性があるか確認
    const main = page.locator('main, [role="main"]');
    const mainCount = await main.count();
    expect(mainCount).toBeGreaterThan(0);

    // ナビゲーションにrole属性があるか確認
    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();

    // ナビゲーションは必須ではないが、存在する場合は適切な構造を持つべき
    if (navCount > 0) {
      await expect(nav.first()).toBeVisible();
    }
  });
});

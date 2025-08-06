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
    await expect(page.locator('h1')).toBeVisible();
    
    // ナビゲーションの確認
    await expect(page.locator('nav')).toBeVisible();
  });

  test('掲示板ページへのナビゲーション', async ({ page }) => {
    await page.goto('/');
    
    // 掲示板リンクをクリック
    await page.click('a[href*="board"]');
    await page.waitForURL('**/board');
    
    // 掲示板ページの基本要素
    await expect(page.locator('h1')).toContainText('掲示板');
  });

  test('投稿フォームの表示確認', async ({ page }) => {
    await page.goto('/board');
    
    // 投稿フォームの存在確認
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="content"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('基本的なフォームバリデーション', async ({ page }) => {
    await page.goto('/board');
    
    // 空のフォーム送信を試行
    await page.click('button[type="submit"]');
    
    // バリデーションメッセージの確認（簡易）
    await expect(page.locator('input[name="title"]:invalid')).toBeVisible();
  });

  test('レスポンシブデザインの基本確認', async ({ page }) => {
    // モバイルサイズでテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // ページが表示される
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

});
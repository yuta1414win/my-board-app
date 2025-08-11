import { test, expect } from '@playwright/test';

test.describe('スモークテスト - 基本機能確認', () => {
  test('ホームページが正常に表示される', async ({ page }) => {
    await page.goto('/');
    
    // ページが正常にロードされることを確認
    await expect(page).toHaveTitle(/My Board App/);
    
    // 基本的なナビゲーション要素が存在することを確認
    await expect(page.locator('nav')).toBeVisible();
  });

  test('登録ページが正常に表示される', async ({ page }) => {
    await page.goto('/auth/register');
    
    // ページが正常にロードされることを確認
    await page.waitForLoadState('networkidle');
    
    // 登録フォームの基本要素が存在することを確認
    await expect(page.locator('form')).toBeVisible();
  });

  test('ログインページが正常に表示される', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // ページが正常にロードされることを確認  
    await page.waitForLoadState('networkidle');
    
    // ログインフォームの基本要素が存在することを確認
    await expect(page.locator('form')).toBeVisible();
  });

  test('掲示板ページが正常に表示される', async ({ page }) => {
    await page.goto('/board');
    
    // ページが正常にロードされることを確認
    await page.waitForLoadState('networkidle');
    
    // 掲示板コンテンツが存在することを確認
    await expect(page.locator('main')).toBeVisible();
  });

  test('APIヘルスチェックが正常に動作する', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
  });
});
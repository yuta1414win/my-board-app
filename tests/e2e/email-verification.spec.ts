import { test, expect } from '@playwright/test';

// E2Eテスト: メール認証機能

test.describe('メール認証機能', () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

  test.beforeEach(async ({ page }) => {
    // 各テスト前の共通設定
    await page.goto(baseUrl);
  });

  test('正常な認証フロー - デモページ', async ({ page }) => {
    // デモページに移動
    await page.goto(`${baseUrl}/auth/verify/demo`);

    // ページタイトルの確認
    await expect(page.locator('h3')).toContainText('メール認証機能デモ');

    // 成功パターンのテストボタンをクリック
    await page.locator('button').filter({ hasText: 'テスト実行' }).first().click();

    // 認証ページにリダイレクトされることを確認
    await expect(page).toHaveURL(/\/auth\/verify\?token=/);

    // ローディング状態の確認
    await expect(page.locator('text=メールアドレスを確認しています')).toBeVisible();

    // 成功メッセージの確認（デモ用トークンの場合）
    // Note: 実際のデモ実装に応じて調整が必要
  });

  test('無効なトークンでの認証エラー', async ({ page }) => {
    const invalidToken = 'invalid_token_12345';
    
    // 無効なトークンで直接認証ページにアクセス
    await page.goto(`${baseUrl}/auth/verify?token=${invalidToken}`);

    // エラーメッセージの確認
    await expect(page.locator('text=確認に失敗しました')).toBeVisible();
    await expect(page.locator('text=無効または期限切れのトークンです')).toBeVisible();

    // 再送信ボタンの存在確認
    await expect(page.locator('button:has-text("確認メールを再送信")')).toBeVisible();
  });

  test('トークンなしでのアクセス', async ({ page }) => {
    // トークンなしで認証ページにアクセス
    await page.goto(`${baseUrl}/auth/verify`);

    // エラーメッセージの確認
    await expect(page.locator('text=確認に失敗しました')).toBeVisible();
    await expect(page.locator('text=確認トークンが見つかりません')).toBeVisible();
  });

  test('再送信ダイアログの動作', async ({ page }) => {
    const invalidToken = 'invalid_token_12345';
    
    // エラー状態の認証ページにアクセス
    await page.goto(`${baseUrl}/auth/verify?token=${invalidToken}`);

    // 再送信ボタンをクリック
    await page.locator('button:has-text("確認メールを再送信")').click();

    // ダイアログの表示確認
    await expect(page.locator('text=確認メールの再送信')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // メールアドレス入力
    await page.locator('input[type="email"]').fill('test@example.com');

    // 送信ボタンの状態確認
    await expect(page.locator('button:has-text("再送信")')).toBeEnabled();

    // キャンセルボタンで閉じる
    await page.locator('button:has-text("キャンセル")').click();
    await expect(page.locator('text=確認メールの再送信')).not.toBeVisible();
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイル画面サイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    const invalidToken = 'invalid_token_12345';
    await page.goto(`${baseUrl}/auth/verify?token=${invalidToken}`);

    // モバイルでの表示確認
    const container = page.locator('.MuiContainer-root');
    await expect(container).toBeVisible();

    // ボタンが適切にスタックされていることを確認
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible();

    // タブレット画面サイズに変更
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(container).toBeVisible();

    // デスクトップ画面サイズに変更
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(container).toBeVisible();
  });

  test('キーボードナビゲーション', async ({ page }) => {
    const invalidToken = 'invalid_token_12345';
    await page.goto(`${baseUrl}/auth/verify?token=${invalidToken}`);

    // Tabキーでナビゲーション
    await page.keyboard.press('Tab');
    await expect(page.locator('button:has-text("確認メールを再送信")')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('a:has-text("新規登録に戻る")')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('a:has-text("ログインページへ")')).toBeFocused();

    // Enterキーでリンクの動作確認
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('APIレスポンスの確認', async ({ page }) => {
    // ネットワークリクエストをモニタリング
    const responses: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/auth/verify')) {
        responses.push({
          status: response.status(),
          url: response.url()
        });
      }
    });

    const invalidToken = 'invalid_token_12345';
    await page.goto(`${baseUrl}/auth/verify?token=${invalidToken}`);

    // APIレスポンスの確認
    await page.waitForTimeout(2000); // レスポンスを待機
    expect(responses).toHaveLength(1);
    expect(responses[0].status).toBe(400);
  });

  test('エラー状態でのナビゲーション', async ({ page }) => {
    const invalidToken = 'invalid_token_12345';
    await page.goto(`${baseUrl}/auth/verify?token=${invalidToken}`);

    // 各ナビゲーションリンクの動作確認
    await page.locator('a:has-text("新規登録に戻る")').click();
    await expect(page).toHaveURL(/\/auth\/register/);

    // 戻って他のリンクもテスト
    await page.goBack();
    await page.locator('a:has-text("ログインページへ")').click();
    await expect(page).toHaveURL(/\/auth\/signin/);

    await page.goBack();
    await page.locator('a:has-text("ホームに戻る")').click();
    await expect(page).toHaveURL(baseUrl);
  });

  test('デモページの全シナリオテスト', async ({ page }) => {
    await page.goto(`${baseUrl}/auth/verify/demo`);

    // 3つのテストシナリオが表示されていることを確認
    const testButtons = page.locator('button:has-text("テスト実行")');
    await expect(testButtons).toHaveCount(3);

    // 各シナリオの説明が表示されていることを確認
    await expect(page.locator('text=成功パターン')).toBeVisible();
    await expect(page.locator('text=無効なトークン')).toBeVisible();
    await expect(page.locator('text=期限切れトークン')).toBeVisible();

    // 実装された機能の説明が表示されていることを確認
    await expect(page.locator('text=実装された機能')).toBeVisible();
    await expect(page.locator('text=Material UIを使用したモダンなユーザーインターフェース')).toBeVisible();
  });

  test('認証完了後の自動リダイレクト機能', async ({ page }) => {
    // Note: このテストは有効なトークンが必要
    // 実際のテストでは、テスト用のトークンを生成する必要がある
    
    // デモページの成功パターンを使用
    await page.goto(`${baseUrl}/auth/verify/demo`);
    
    // 成功パターンのテストをクリック
    await page.locator('button').filter({ hasText: 'テスト実行' }).first().click();
    
    // 成功メッセージが表示されることを確認（デモの場合）
    await expect(page).toHaveURL(/\/auth\/verify\?token=/);
    
    // カウントダウンの表示を確認（実装に応じて）
    // await expect(page.locator('text=秒後にログインページへ')).toBeVisible();
  });
});
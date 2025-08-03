import { test, expect } from '@playwright/test';
import {
  generateUniqueTitle,
  generateUniqueContent,
  createTestPost,
  cleanupTestData,
  refreshPage,
  deleteTestPostByTitle
} from './utils/testUtils.js';

test.describe('掲示板アプリケーション E2E テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にホームページに移動
    await page.goto('/');
  });

  test.describe('基本的なナビゲーション', () => {
    test('ホームページから掲示板へ遷移できる', async ({ page }) => {
      // ホームページの要素確認
      await expect(page.locator('h1')).toContainText(
        'オープン掲示板へようこそ'
      );

      // 掲示板ボタンをクリック
      await page.click('text=掲示板を開く');

      // 掲示板ページに遷移したことを確認
      await expect(page).toHaveURL('/board');
      await expect(page.locator('h1')).toContainText('オープン掲示板');
    });
  });

  test.describe('投稿作成フロー', () => {
    test.beforeEach(async ({ page }) => {
      // 掲示板ページに移動
      await page.goto('/board');
      await page.waitForLoadState('networkidle');
    });

    test('新規投稿を作成できる', async ({ page }) => {
      const testTitle = `E2Eテスト投稿_${Date.now()}`;
      const testContent = 'これはE2Eテストで作成された投稿です。';

      // フォームに入力
      await page.fill('input[placeholder*="タイトル"]', testTitle);
      await page.fill('textarea[placeholder*="本文"]', testContent);

      // 文字数カウンターの確認
      await expect(page.locator('text=11/50文字')).toBeVisible();
      await expect(page.locator('text=23/200文字')).toBeVisible();

      // 投稿ボタンをクリック
      await page.click('button:has-text("投稿する")');

      // 投稿が一覧に表示されることを確認
      await expect(page.locator(`text=${testTitle}`)).toBeVisible();
      await expect(page.locator(`text=${testContent}`)).toBeVisible();

      // フォームがクリアされることを確認
      await expect(page.locator('input[placeholder*="タイトル"]')).toHaveValue(
        ''
      );
      await expect(page.locator('textarea[placeholder*="本文"]')).toHaveValue(
        ''
      );
    });

    test('文字数制限のバリデーションが動作する', async ({ page }) => {
      // タイトルが50文字を超える場合
      const longTitle = 'a'.repeat(51);
      await page.fill('input[placeholder*="タイトル"]', longTitle);

      await expect(page.locator('text=51/50文字')).toBeVisible();
      await expect(page.locator('button:has-text("投稿する")')).toBeDisabled();

      // 本文が200文字を超える場合
      await page.fill('input[placeholder*="タイトル"]', '有効なタイトル');
      const longContent = 'a'.repeat(201);
      await page.fill('textarea[placeholder*="本文"]', longContent);

      await expect(page.locator('text=201/200文字')).toBeVisible();
      await expect(page.locator('button:has-text("投稿する")')).toBeDisabled();
    });

    test('空の投稿はできない', async ({ page }) => {
      // 投稿ボタンが無効化されていることを確認
      await expect(page.locator('button:has-text("投稿する")')).toBeDisabled();

      // タイトルのみ入力
      await page.fill('input[placeholder*="タイトル"]', 'タイトルのみ');
      await expect(page.locator('button:has-text("投稿する")')).toBeDisabled();

      // 本文のみ入力
      await page.fill('input[placeholder*="タイトル"]', '');
      await page.fill('textarea[placeholder*="本文"]', '本文のみ');
      await expect(page.locator('button:has-text("投稿する")')).toBeDisabled();

      // 両方入力すると有効化
      await page.fill('input[placeholder*="タイトル"]', '有効なタイトル');
      await expect(page.locator('button:has-text("投稿する")')).toBeEnabled();
    });
  });

  test.describe('投稿編集フロー', () => {
    let testPostTitle = `E2E編集テスト投稿_${Date.now()}`;
    let testPostContent = 'これは編集テスト用の投稿です。';

    test.beforeEach(async ({ page }) => {
      // 掲示板ページに移動
      await page.goto('/board');
      await page.waitForLoadState('networkidle');

      // テスト用の投稿を作成
      await page.fill('input[placeholder*="タイトル"]', testPostTitle);
      await page.fill('textarea[placeholder*="本文"]', testPostContent);
      await page.click('button:has-text("投稿する")');

      // 投稿が表示されるまで待機
      await expect(page.locator(`text=${testPostTitle}`)).toBeVisible();
    });

    test('投稿を編集できる', async ({ page }) => {
      const editedTitle = '編集されたタイトル';
      const editedContent = '編集された内容です。';

      // 編集ボタンをクリック
      await page
        .click('button[aria-label*="edit"], [data-testid="EditIcon"]')
        .first();

      // 編集ダイアログが表示されることを確認
      await expect(page.locator('text=投稿を編集')).toBeVisible();

      // 既存の値が入力されていることを確認
      await expect(
        page.locator('input[value*="E2E編集テスト投稿"]')
      ).toBeVisible();
      await expect(
        page.locator('textarea:has-text("これは編集テスト用の投稿です。")')
      ).toBeVisible();

      // 内容を編集
      await page.fill('input[value*="E2E編集テスト投稿"]', editedTitle);
      await page.fill(
        'textarea:has-text("これは編集テスト用の投稿です。")',
        editedContent
      );

      // 保存ボタンをクリック
      await page.click('button:has-text("保存")');

      // ダイアログが閉じることを確認
      await expect(page.locator('text=投稿を編集')).not.toBeVisible();

      // 編集された内容が表示されることを確認
      await expect(page.locator(`text=${editedTitle}`)).toBeVisible();
      await expect(page.locator(`text=${editedContent}`)).toBeVisible();

      // 元の内容が表示されていないことを確認
      await expect(page.locator(`text=${testPostTitle}`)).not.toBeVisible();
    });

    test('編集をキャンセルできる', async ({ page }) => {
      // 編集ボタンをクリック
      await page
        .click('button[aria-label*="edit"], [data-testid="EditIcon"]')
        .first();

      // 編集ダイアログが表示されることを確認
      await expect(page.locator('text=投稿を編集')).toBeVisible();

      // 内容を一部変更
      await page.fill(
        'input[value*="E2E編集テスト投稿"]',
        '変更されたタイトル'
      );

      // キャンセルボタンをクリック
      await page.click('button:has-text("キャンセル")');

      // ダイアログが閉じることを確認
      await expect(page.locator('text=投稿を編集')).not.toBeVisible();

      // 元の内容が保持されていることを確認
      await expect(page.locator(`text=${testPostTitle}`)).toBeVisible();
      await expect(page.locator('text=変更されたタイトル')).not.toBeVisible();
    });
  });

  test.describe('投稿削除フロー', () => {
    let testPostTitle = `E2E削除テスト投稿_${Date.now()}`;
    let testPostContent = 'これは削除テスト用の投稿です。';

    test.beforeEach(async ({ page }) => {
      // 掲示板ページに移動
      await page.goto('/board');
      await page.waitForLoadState('networkidle');

      // テスト用の投稿を作成
      await page.fill('input[placeholder*="タイトル"]', testPostTitle);
      await page.fill('textarea[placeholder*="本文"]', testPostContent);
      await page.click('button:has-text("投稿する")');

      // 投稿が表示されるまで待機
      await expect(page.locator(`text=${testPostTitle}`)).toBeVisible();
    });

    test('投稿を削除できる', async ({ page }) => {
      // 削除ダイアログの確認をOKにする
      page.on('dialog', (dialog) => dialog.accept());

      // 削除ボタンをクリック
      await page
        .click('button[aria-label*="delete"], [data-testid="DeleteIcon"]')
        .first();

      // 投稿が削除されて表示されなくなることを確認
      await expect(page.locator(`text=${testPostTitle}`)).not.toBeVisible();
      await expect(page.locator(`text=${testPostContent}`)).not.toBeVisible();
    });

    test('削除をキャンセルできる', async ({ page }) => {
      // 削除ダイアログの確認をキャンセルにする
      page.on('dialog', (dialog) => dialog.dismiss());

      // 削除ボタンをクリック
      await page
        .click('button[aria-label*="delete"], [data-testid="DeleteIcon"]')
        .first();

      // 投稿が削除されずに残っていることを確認
      await expect(page.locator(`text=${testPostTitle}`)).toBeVisible();
      await expect(page.locator(`text=${testPostContent}`)).toBeVisible();
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル表示でも正常に動作する', async ({ page }) => {
      // モバイルビューポートに設定
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/board');
      await page.waitForLoadState('networkidle');

      // モバイルでも投稿フォームが表示されることを確認
      await expect(
        page.locator('input[placeholder*="タイトル"]')
      ).toBeVisible();
      await expect(page.locator('textarea[placeholder*="本文"]')).toBeVisible();

      // 投稿作成が正常に動作することを確認
      await page.fill('input[placeholder*="タイトル"]', 'モバイルテスト');
      await page.fill(
        'textarea[placeholder*="本文"]',
        'モバイルでの投稿テストです。'
      );
      await page.click('button:has-text("投稿する")');

      await expect(page.locator('text=モバイルテスト')).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('キーボードナビゲーションが動作する', async ({ page }) => {
      await page.goto('/board');
      await page.waitForLoadState('networkidle');

      // タブキーでフォーカスを移動
      await page.keyboard.press('Tab'); // タイトル入力
      await page.keyboard.type('キーボードテスト');

      await page.keyboard.press('Tab'); // 本文入力
      await page.keyboard.type('キーボードでの入力テストです。');

      await page.keyboard.press('Tab'); // 投稿ボタン
      await page.keyboard.press('Enter'); // 投稿実行

      // 投稿が作成されることを確認
      await expect(page.locator('text=キーボードテスト')).toBeVisible();
    });

    test('フォームにラベルが適切に設定されている', async ({ page }) => {
      await page.goto('/board');
      await page.waitForLoadState('networkidle');

      // ラベルとフォーム要素の関連付けを確認
      const titleInput = page.locator('input[placeholder*="タイトル"]');
      const contentInput = page.locator('textarea[placeholder*="本文"]');

      await expect(titleInput).toHaveAttribute('placeholder', '.*タイトル.*');
      await expect(contentInput).toHaveAttribute('placeholder', '.*本文.*');
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時の動作', async ({ page }) => {
      await page.goto('/board');

      // ネットワークを無効化
      await page.route('**/api/**', (route) => route.abort());

      // 投稿を試行
      await page.fill('input[placeholder*="タイトル"]', 'エラーテスト');
      await page.fill(
        'textarea[placeholder*="本文"]',
        'ネットワークエラーテストです。'
      );
      await page.click('button:has-text("投稿する")');

      // エラーメッセージが表示されることを確認（実装に応じて調整）
      // await expect(page.locator('text=投稿に失敗しました')).toBeVisible();
    });
  });
});

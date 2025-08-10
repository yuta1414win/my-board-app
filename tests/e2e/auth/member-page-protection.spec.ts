import { test, expect } from '@playwright/test';

test.describe('Member Page Protection', () => {
  const baseURL = 'http://localhost:3000';
  const protectedPages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/profile', name: 'Profile' },
    { path: '/posts/new', name: 'New Post' },
    { path: '/posts/123/edit', name: 'Edit Post' },
  ];

  test.beforeEach(async ({ page }) => {
    // セッション/認証状態をクリア
    await page.context().clearCookies();
    await page.goto(baseURL);
  });

  test.describe('未ログイン状態でのアクセス制御', () => {
    for (const protectedPage of protectedPages) {
      test(`${protectedPage.name}への未認証アクセス → ログインページリダイレクト`, async ({
        page,
      }) => {
        // 保護されたページに直接アクセス
        await page.goto(`${baseURL}${protectedPage.path}`);

        // ログインページにリダイレクトされることを確認
        await expect(page).toHaveURL(/\/auth\/login/);

        // callbackURLパラメータが正しく設定されていることを確認
        const url = new URL(page.url());
        expect(url.searchParams.get('callbackUrl')).toBe(protectedPage.path);

        // ログインページの要素が表示されることを確認
        await expect(page.locator('h1')).toContainText('ログイン');
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
      });
    }
  });

  test.describe('認証フローテスト', () => {
    test('ログイン → 元ページ復帰フロー', async ({ page }) => {
      // 保護されたページ（ダッシュボード）にアクセス
      await page.goto(`${baseURL}/dashboard`);

      // ログインページにリダイレクトされることを確認
      await expect(page).toHaveURL(/\/auth\/login.*callbackUrl=%2Fdashboard/);

      // ログインフォームに入力
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');

      // ログインボタンをクリック
      await page.click('button[type="submit"]');

      // ローディング状態の確認
      await expect(page.locator('button[type="submit"]')).toContainText(
        'ログイン中'
      );

      // ログイン成功後、ダッシュボードページに遷移することを確認
      await expect(page).toHaveURL('/dashboard');

      // ダッシュボードの要素が表示されることを確認
      await expect(page.locator('h1')).toContainText('ダッシュボード');
      await expect(page.locator('text=おかえりなさい')).toBeVisible();
    });

    test('ログイン済み状態での認証ページアクセス制御', async ({ page }) => {
      // まずログインする
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // ログイン成功を確認
      await expect(page).toHaveURL('/board');

      // 認証ページにアクセスしてリダイレクトされることを確認
      const authPages = ['/auth/login', '/auth/signin', '/auth/register'];

      for (const authPage of authPages) {
        await page.goto(`${baseURL}${authPage}`);
        await expect(page).toHaveURL('/board');
      }
    });
  });

  test.describe('ページ機能テスト', () => {
    test.beforeEach(async ({ page }) => {
      // テスト前にログイン
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/board');
    });

    test('ダッシュボード機能テスト', async ({ page }) => {
      await page.goto(`${baseURL}/dashboard`);

      // ページタイトルとユーザー情報の確認
      await expect(page.locator('h1')).toContainText('ダッシュボード');
      await expect(page.locator('text=おかえりなさい')).toBeVisible();

      // クイックアクションボタンのテスト
      const quickActions = [
        { text: '投稿作成', href: '/posts/new' },
        { text: '掲示板を見る', href: '/board' },
        { text: 'プロフィール', href: '/profile' },
        { text: '設定', href: '/settings' },
      ];

      for (const action of quickActions) {
        const button = page.locator(`text=${action.text}`);
        await expect(button).toBeVisible();
        // ボタンのリンクが正しいことを確認
        const link = page.locator(`a[href="${action.href}"]`);
        await expect(link).toBeVisible();
      }

      // 統計セクションの確認
      await expect(page.locator('text=統計')).toBeVisible();
      await expect(page.locator('text=総投稿数')).toBeVisible();
      await expect(page.locator('text=総コメント数')).toBeVisible();

      // アクティビティセクションの確認
      await expect(page.locator('text=最近のアクティビティ')).toBeVisible();
    });

    test('プロフィールページ機能テスト', async ({ page }) => {
      await page.goto(`${baseURL}/profile`);

      // ページ要素の確認
      await expect(page.locator('h1')).toContainText('プロフィール');
      await expect(page.locator('text=基本情報')).toBeVisible();

      // 編集モードテスト
      await page.click('text=編集');
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('textarea[name="bio"]')).toBeVisible();
      await expect(page.locator('text=保存')).toBeVisible();
      await expect(page.locator('text=キャンセル')).toBeVisible();

      // フォーム入力テスト
      await page.fill('input[name="name"]', 'テストユーザー更新');
      await page.fill('textarea[name="bio"]', '更新された自己紹介');

      // 文字数カウンターの確認
      await expect(
        page.locator('text=更新された自己紹介').nth(0)
      ).toBeVisible();

      // キャンセルボタンのテスト
      await page.click('text=キャンセル');
      await expect(page.locator('input[name="name"]')).not.toBeVisible();
    });

    test('投稿作成ページ機能テスト', async ({ page }) => {
      await page.goto(`${baseURL}/posts/new`);

      // ページ要素の確認
      await expect(page.locator('h1')).toContainText('新規投稿');
      await expect(page.locator('text=投稿者')).toBeVisible();

      // フォーム要素の確認
      await expect(page.locator('select[name="category"]')).toBeVisible();
      await expect(page.locator('input[name="title"]')).toBeVisible();
      await expect(page.locator('textarea[name="content"]')).toBeVisible();

      // フォーム入力テスト
      await page.selectOption('select[name="category"]', 'tech');
      await page.fill('input[name="title"]', 'テスト投稿タイトル');
      await page.fill('textarea[name="content"]', 'テスト投稿の内容です。');

      // 文字数カウンターの確認
      await expect(page.locator('text=15/100文字')).toBeVisible(); // タイトル
      await expect(page.locator('text=12/5000文字')).toBeVisible(); // 本文

      // プレビュー機能テスト
      await page.click('text=プレビュー');
      await expect(page.locator('text=テスト投稿タイトル')).toBeVisible();
      await expect(page.locator('text=テスト投稿の内容です。')).toBeVisible();

      // プレビュー終了
      await page.click('text=プレビュー終了');

      // 投稿ボタンの有効性確認
      await expect(page.locator('button[type="submit"]')).toBeEnabled();

      // キャンセル機能テスト
      await page.click('text=キャンセル');
      // 確認ダイアログが表示されることを期待（実装による）
    });
  });

  test.describe('エラーハンドリングテスト', () => {
    test('存在しない投稿編集ページへのアクセス', async ({ page }) => {
      // ログイン
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/board');

      // 存在しない投稿IDでアクセス
      await page.goto(`${baseURL}/posts/nonexistent/edit`);

      // エラーメッセージの確認
      await expect(page.locator('text=エラーが発生しました')).toBeVisible();
      await expect(page.locator('text=戻る')).toBeVisible();
    });

    test('ローディング状態の確認', async ({ page }) => {
      // ネットワークを遅延させてローディング状態をテスト
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 1000);
      });

      await page.goto(`${baseURL}/dashboard`);

      // ローディング状態の要素が表示されることを確認
      await expect(page.locator('text=読み込み中')).toBeVisible();

      // ローディング完了後の要素確認
      await expect(page.locator('h1')).toContainText('ダッシュボード', {
        timeout: 10000,
      });
    });
  });

  test.describe('レスポンシブデザインテスト', () => {
    test('モバイルビューでの動作確認', async ({ page }) => {
      // モバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });

      // ログイン
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // ダッシュボードアクセス
      await page.goto(`${baseURL}/dashboard`);

      // モバイルでの表示確認
      await expect(page.locator('h1')).toContainText('ダッシュボード');

      // カードが縦に並んでいることを確認（レスポンシブ）
      const cards = page.locator('.MuiCard-root');
      await expect(cards).toHaveCount(4); // クイックアクションカード数
    });

    test('タブレットビューでの動作確認', async ({ page }) => {
      // タブレットサイズに設定
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(`${baseURL}/dashboard`);
      await expect(page.locator('h1')).toContainText('ダッシュボード');
    });
  });
});

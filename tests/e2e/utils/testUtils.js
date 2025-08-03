/**
 * E2Eテスト用ユーティリティ関数
 */

/**
 * 一意なテストタイトルを生成する
 * @param {string} prefix - タイトルのプレフィックス
 * @returns {string} 一意なタイトル
 */
export function generateUniqueTitle(prefix = 'E2Eテスト投稿') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 一意なテスト投稿コンテンツを生成する
 * @param {string} prefix - コンテンツのプレフィックス
 * @returns {string} 一意なコンテンツ
 */
export function generateUniqueContent(
  prefix = 'これはE2Eテストで作成された投稿です'
) {
  const timestamp = Date.now();
  return `${prefix} - ID: ${timestamp}`;
}

/**
 * テスト用の投稿データを作成する
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} title - 投稿タイトル
 * @param {string} content - 投稿コンテンツ
 * @returns {Promise<void>}
 */
export async function createTestPost(page, title, content) {
  await page.fill('input[placeholder*="タイトル"]', title);
  await page.fill('textarea[placeholder*="本文"]', content);
  await page.click('button:has-text("投稿する")');

  // 投稿が作成されるまで待機
  await page.waitForTimeout(1000);
}

/**
 * データベース内のテストデータをクリーンアップする
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @returns {Promise<void>}
 */
export async function cleanupTestData(page) {
  try {
    // APIエンドポイントを使ってテストデータを削除
    await page.evaluate(async () => {
      try {
        const response = await fetch('/api/posts/cleanup-test-data', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(
            'テストデータクリーンアップに失敗しました:',
            response.status
          );
        }
      } catch (error) {
        console.warn('テストデータクリーンアップエラー:', error);
      }
    });
  } catch (error) {
    console.warn('クリーンアップ処理でエラーが発生しました:', error);
  }
}

/**
 * ページをリロードしてフレッシュな状態にする
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @returns {Promise<void>}
 */
export async function refreshPage(page) {
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * テスト用の投稿を特定の要素から削除する
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} title - 削除する投稿のタイトル
 * @returns {Promise<void>}
 */
export async function deleteTestPostByTitle(page, title) {
  try {
    // タイトルが含まれるカード要素を特定
    const postCard = page.locator(
      `[data-testid="post-card"]:has-text("${title}")`
    );

    if ((await postCard.count()) > 0) {
      // 削除ボタンをクリック
      const deleteButton = postCard.locator(
        'button[aria-label*="delete"], [data-testid="DeleteIcon"]'
      );

      if ((await deleteButton.count()) > 0) {
        // 削除確認ダイアログを自動承認
        page.on('dialog', (dialog) => dialog.accept());
        await deleteButton.first().click();

        // 削除完了まで待機
        await page.waitForTimeout(1000);
      }
    }
  } catch (error) {
    console.warn(`投稿の削除に失敗しました (title: ${title}):`, error);
  }
}

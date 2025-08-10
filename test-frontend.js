#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testRegistrationForm() {
  let browser;

  try {
    console.log('🚀 フロントエンド登録フォームテスト開始...\n');

    // ヘッドレスブラウザ起動
    browser = await puppeteer.launch({
      headless: false, // 画面を見えるようにする
      slowMo: 1000, // 操作を遅くして確認しやすくする
    });

    const page = await browser.newPage();

    // 登録ページにアクセス
    console.log('📄 登録ページにアクセス...');
    await page.goto('http://localhost:3001/auth/register');
    await page.waitForSelector('form');

    // フォーム要素が存在するか確認
    console.log('🔍 フォーム要素の存在確認...');
    const nameInput = await page.$('input[name="name"]');
    const emailInput = await page.$('input[name="email"]');
    const passwordInput = await page.$('input[name="password"]');
    const confirmPasswordInput = await page.$('input[name="confirmPassword"]');
    const submitButton = await page.$('button[type="submit"]');

    if (
      !nameInput ||
      !emailInput ||
      !passwordInput ||
      !confirmPasswordInput ||
      !submitButton
    ) {
      console.log('❌ 必要なフォーム要素が見つかりません');
      return;
    }

    console.log('✅ フォーム要素の確認完了\n');

    // テスト1: パスワード強度表示のテスト
    console.log('📋 テスト1: パスワード強度表示');

    // 弱いパスワードを入力
    await page.type('input[name="password"]', '123');
    await page.waitForTimeout(500);

    // 強度表示を確認
    const weakStrength = await page.$eval(
      '.text-red-500',
      (el) => el.textContent
    );
    console.log(`  弱いパスワード: "${weakStrength}"`);

    // パスワードを強くする
    await page.evaluate(() => {
      document.querySelector('input[name="password"]').value = '';
    });
    await page.type('input[name="password"]', 'Test123!@#');
    await page.waitForTimeout(500);

    const strongStrength = await page.$eval(
      '.text-green-500',
      (el) => el.textContent
    );
    console.log(`  強いパスワード: "${strongStrength}"\n`);

    // テスト2: バリデーションエラー表示のテスト
    console.log('📋 テスト2: バリデーションエラー表示');

    // 異なるパスワード確認を入力
    await page.type('input[name="confirmPassword"]', 'Different123!');
    await page.waitForTimeout(500);

    // エラーメッセージを確認
    const errorMessage = await page.$eval(
      '.text-red-600',
      (el) => el.textContent
    );
    console.log(`  エラーメッセージ: "${errorMessage}"\n`);

    // テスト3: 正常な登録フロー
    console.log('📋 テスト3: 正常な登録フロー');

    // フォームをクリア
    await page.evaluate(() => {
      document.querySelector('input[name="name"]').value = '';
      document.querySelector('input[name="email"]').value = '';
      document.querySelector('input[name="password"]').value = '';
      document.querySelector('input[name="confirmPassword"]').value = '';
    });

    // 正しい情報を入力
    const testEmail = `frontend-test-${Date.now()}@example.com`;
    await page.type('input[name="name"]', 'フロントエンドテストユーザー');
    await page.type('input[name="email"]', testEmail);
    await page.type('input[name="password"]', 'Test123!@#');
    await page.type('input[name="confirmPassword"]', 'Test123!@#');

    console.log(`  テスト用メール: ${testEmail}`);

    // 送信ボタンをクリック
    await page.click('button[type="submit"]');

    // 結果を待機
    await page.waitForTimeout(3000);

    // 成功メッセージまたはエラーメッセージを確認
    const alert = await page.$('.px-4.py-3.rounded-md');
    if (alert) {
      const alertText = await page.evaluate((el) => el.textContent, alert);
      const alertClass = await page.evaluate((el) => el.className, alert);

      if (alertClass.includes('bg-green-50')) {
        console.log(`  ✅ 登録成功: "${alertText}"`);
      } else if (alertClass.includes('bg-red-50')) {
        console.log(`  ❌ 登録エラー: "${alertText}"`);
      }
    }

    console.log('\n✅ フロントエンド統合テスト完了');
  } catch (error) {
    console.error('❌ フロントエンドテストエラー:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Puppeteerが利用可能か確認
(async () => {
  try {
    await testRegistrationForm();
  } catch (error) {
    console.log(
      '❌ Puppeteerが利用できません。手動でテストを実行してください:'
    );
    console.log('  1. http://localhost:3001/auth/register にアクセス');
    console.log('  2. フォームに情報を入力');
    console.log('  3. パスワード強度表示を確認');
    console.log('  4. バリデーションエラーを確認');
    console.log('  5. 正常な登録を実行');
  }
})();

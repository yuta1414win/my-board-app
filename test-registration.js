#!/usr/bin/env node

const { randomBytes } = require('crypto');

// テスト用のユニークなメールアドレス生成
const generateTestEmail = () => {
  const randomString = randomBytes(8).toString('hex');
  return `test-${randomString}@example.com`;
};

// APIテスト関数
async function testAPI(url, method, body) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

// メイン テスト実行
async function runTests() {
  console.log('🚀 登録フローAPIテスト開始\n');

  const baseUrl = 'http://localhost:3001';

  // テスト1: 正常な登録フロー
  console.log('📋 テスト1: 正常な登録フロー');
  const testEmail = generateTestEmail();
  const registerData = {
    name: 'テスト太郎',
    email: testEmail,
    password: 'Test123!@#',
    confirmPassword: 'Test123!@#',
  };

  const registerResult = await testAPI(
    `${baseUrl}/api/auth/register`,
    'POST',
    registerData
  );

  console.log(`  ✅ ステータス: ${registerResult.status}`);
  console.log(`  ✅ 成功: ${registerResult.ok}`);
  console.log(
    `  ✅ レスポンス: ${JSON.stringify(registerResult.data, null, 2)}\n`
  );

  if (!registerResult.ok) {
    console.log('❌ 登録テスト失敗');
    return;
  }

  // テスト2: 重複メールアドレスチェック
  console.log('📋 テスト2: 重複メールアドレスチェック');
  const duplicateResult = await testAPI(
    `${baseUrl}/api/auth/register`,
    'POST',
    registerData
  );

  console.log(`  ✅ ステータス: ${duplicateResult.status} (409期待)`);
  console.log(`  ✅ エラー: ${duplicateResult.data.error}\n`);

  if (duplicateResult.status !== 409) {
    console.log('❌ 重複チェックテスト失敗');
  }

  // テスト3: バリデーションエラー（弱いパスワード）
  console.log('📋 テスト3: パスワードバリデーションエラー');
  const weakPasswordData = {
    name: 'テストユーザー',
    email: generateTestEmail(),
    password: '123',
    confirmPassword: '123',
  };

  const weakPasswordResult = await testAPI(
    `${baseUrl}/api/auth/register`,
    'POST',
    weakPasswordData
  );

  console.log(`  ✅ ステータス: ${weakPasswordResult.status} (400期待)`);
  console.log(`  ✅ エラー: ${weakPasswordResult.data.error}\n`);

  if (weakPasswordResult.status !== 400) {
    console.log('❌ パスワードバリデーションテスト失敗');
  }

  // テスト4: 必須項目未入力
  console.log('📋 テスト4: 必須項目未入力チェック');
  const incompleteData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  const incompleteResult = await testAPI(
    `${baseUrl}/api/auth/register`,
    'POST',
    incompleteData
  );

  console.log(`  ✅ ステータス: ${incompleteResult.status} (400期待)`);
  console.log(`  ✅ エラー: ${incompleteResult.data.error}\n`);

  if (incompleteResult.status !== 400) {
    console.log('❌ 必須項目チェックテスト失敗');
  }

  // テスト5: 無効なメールアドレス形式
  console.log('📋 テスト5: 無効なメールアドレス形式');
  const invalidEmailData = {
    name: 'テストユーザー',
    email: 'invalid-email',
    password: 'Test123!@#',
    confirmPassword: 'Test123!@#',
  };

  const invalidEmailResult = await testAPI(
    `${baseUrl}/api/auth/register`,
    'POST',
    invalidEmailData
  );

  console.log(`  ✅ ステータス: ${invalidEmailResult.status} (400期待)`);
  console.log(`  ✅ エラー: ${invalidEmailResult.data.error}\n`);

  if (invalidEmailResult.status !== 400) {
    console.log('❌ メールアドレス形式チェックテスト失敗');
  }

  console.log('✅ 全APIテスト完了！');
}

// エラーハンドリング付きで実行
runTests().catch((error) => {
  console.error('❌ テスト実行中にエラーが発生しました:', error);
  process.exit(1);
});

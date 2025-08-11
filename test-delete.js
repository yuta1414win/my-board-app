// 削除機能のテスト
async function testDeleteFunction() {
  const baseUrl = 'http://localhost:3000';

  console.log('=== 削除機能テスト開始 ===\n');

  // ステップ1: ログイン
  console.log('1. ログイン中...');
  const loginResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
    credentials: 'include',
  });
  const { csrfToken } = await loginResponse.json();

  const signInResponse = await fetch(
    `${baseUrl}/api/auth/callback/credentials`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        csrfToken,
        email: 'test@example.com',
        password: 'password123',
      }),
      credentials: 'include',
      redirect: 'manual',
    }
  );

  const cookies = signInResponse.headers.get('set-cookie');
  console.log('ログイン完了\n');

  // ステップ2: セッション情報取得
  console.log('2. セッション情報取得中...');
  const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
    headers: {
      Cookie: cookies,
    },
  });
  const session = await sessionResponse.json();
  console.log('セッション:', {
    userId: session.user?.id,
    userName: session.user?.name,
    userEmail: session.user?.email,
  });
  console.log('\n');

  // ステップ3: テスト投稿作成
  console.log('3. テスト投稿作成中...');
  const createResponse = await fetch(`${baseUrl}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify({
      title: '削除テスト投稿',
      content: 'この投稿は削除テストのために作成されました。',
    }),
  });

  const createResult = await createResponse.json();
  console.log('作成結果:', {
    success: createResult.success,
    postId: createResult.post?._id,
    postAuthor: createResult.post?.author,
  });
  console.log('\n');

  if (!createResult.success) {
    console.error('投稿作成失敗:', createResult.error);
    return;
  }

  const postId = createResult.post._id;

  // ステップ4: 投稿削除
  console.log('4. 投稿削除中...');
  console.log('削除対象ID:', postId);

  const deleteResponse = await fetch(`${baseUrl}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      Cookie: cookies,
    },
  });

  console.log('削除レスポンスステータス:', deleteResponse.status);
  const deleteResult = await deleteResponse.json();
  console.log('削除結果:', deleteResult);
  console.log('\n');

  // ステップ5: 削除確認
  console.log('5. 削除確認中...');
  const checkResponse = await fetch(`${baseUrl}/api/posts/${postId}`, {
    headers: {
      Cookie: cookies,
    },
  });

  if (checkResponse.status === 404) {
    console.log('✅ 削除成功: 投稿が見つかりません（期待通り）');
  } else {
    console.log('❌ 削除失敗: 投稿がまだ存在します');
    const checkResult = await checkResponse.json();
    console.log('残存投稿:', checkResult);
  }

  console.log('\n=== テスト完了 ===');
}

// テスト実行
testDeleteFunction().catch(console.error);

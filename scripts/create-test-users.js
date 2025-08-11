#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

async function createTestUsers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔄 MongoDB に接続中...');
    await client.connect();

    const db = client.db();
    const users = db.collection('users');

    // テストユーザーデータ配列
    const testUsers = [
      {
        name: 'テスト太郎',
        email: 'test-verified@example.com',
        password: 'TestPassword123!',
        emailVerified: true, // メール認証済み
        description: '正常ログインテスト用（メール認証済み）',
      },
      {
        name: '未認証花子',
        email: 'test-unverified@example.com',
        password: 'TestPassword123!',
        emailVerified: false, // メール未認証
        description: 'メール未認証テスト用',
      },
      {
        name: '管理者山田',
        email: 'admin@example.com',
        password: 'AdminPassword123!',
        emailVerified: true,
        role: 'admin',
        description: '管理者権限テスト用',
      },
    ];

    console.log('\n📋 テストユーザー作成開始...\n');

    for (const userData of testUsers) {
      const { password, description, ...userDoc } = userData;

      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(password, 10);

      // ユーザードキュメントを準備
      const user = {
        ...userDoc,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      // 既存ユーザーチェック
      const existingUser = await users.findOne({ email: user.email });

      if (existingUser) {
        // 既存ユーザーを更新
        await users.updateOne(
          { email: user.email },
          {
            $set: {
              ...user,
              createdAt: existingUser.createdAt, // 作成日は保持
            },
          }
        );
        console.log(`✅ 更新: ${user.email}`);
      } else {
        // 新規ユーザーを作成
        await users.insertOne(user);
        console.log(`✅ 作成: ${user.email}`);
      }

      console.log(`   - 名前: ${user.name}`);
      console.log(`   - パスワード: ${password}`);
      console.log(
        `   - メール認証: ${user.emailVerified ? '✅ 認証済み' : '❌ 未認証'}`
      );
      console.log(`   - 用途: ${description}`);
      console.log('');
    }

    console.log('='.repeat(50));
    console.log('\n🎉 テストユーザーの準備が完了しました！\n');
    console.log('📝 テスト用ログイン情報:');
    console.log('='.repeat(50));

    for (const userData of testUsers) {
      console.log(`\n【${userData.description}】`);
      console.log(`  メール: ${userData.email}`);
      console.log(`  パスワード: ${userData.password}`);
    }

    console.log('\n='.repeat(50));
    console.log('\n💡 ヒント:');
    console.log('  - 正常ログインテストには test-verified@example.com を使用');
    console.log(
      '  - メール未認証テストには test-unverified@example.com を使用'
    );
    console.log('  - パスワードエラーテストには間違ったパスワードを入力');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB接続を閉じました');
  }
}

// スクリプトを実行
createTestUsers();

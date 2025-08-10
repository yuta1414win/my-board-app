#!/usr/bin/env node

const mongoose = require('mongoose');

async function testDatabaseConnection() {
  try {
    console.log('🔍 データベース接続テスト開始...\n');

    // .env.local から環境変数を読み込み
    require('dotenv').config({ path: '.env.local' });

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.log('❌ MONGODB_URI が設定されていません');
      return;
    }

    console.log('📡 MongoDB接続中...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB接続成功\n');

    // ユーザーコレクションの確認
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📊 コレクション一覧:');
    collections.forEach((collection) => {
      console.log(`  - ${collection.name}`);
    });
    console.log('');

    // usersコレクションがある場合、件数を確認
    const usersCollection = collections.find((c) => c.name === 'users');
    if (usersCollection) {
      const userCount = await db.collection('users').countDocuments();
      console.log(`👥 ユーザー総数: ${userCount}件\n`);

      // 最近のユーザーを表示（機密情報除く）
      const recentUsers = await db
        .collection('users')
        .find(
          {},
          {
            projection: {
              name: 1,
              email: 1,
              emailVerified: 1,
              createdAt: 1,
              _id: 0,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      if (recentUsers.length > 0) {
        console.log('👤 最近のユーザー（最大5件）:');
        recentUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.name} (${user.email})`);
          console.log(
            `     認証: ${user.emailVerified ? '済' : '未'}, 作成: ${new Date(user.createdAt).toLocaleString('ja-JP')}`
          );
        });
        console.log('');
      }
    }

    // テストユーザー検索
    console.log('🔍 テストユーザー検索...');
    const testUsers = await db
      .collection('users')
      .find(
        { email: /test.*@example\.com/ },
        {
          projection: { name: 1, email: 1, emailVerified: 1, createdAt: 1 },
        }
      )
      .toArray();

    if (testUsers.length > 0) {
      console.log(`📝 テストユーザー: ${testUsers.length}件`);
      testUsers.forEach((user, index) => {
        console.log(
          `  ${index + 1}. ${user.name} (${user.email}) - 認証: ${user.emailVerified ? '済' : '未'}`
        );
      });
    } else {
      console.log('📝 テストユーザーは見つかりませんでした');
    }

    console.log('\n✅ データベーステスト完了');
  } catch (error) {
    console.error('❌ データベーステストエラー:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 データベース接続を閉じました');
  }
}

testDatabaseConnection();

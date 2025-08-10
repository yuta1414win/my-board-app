#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

async function createTestUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    const users = db.collection('users');
    
    // テストユーザーデータ
    const testUser = {
      name: 'Smoke Test User',
      email: 'existing@example.com',
      password: 'ExistingPassword123!',
      emailVerified: true, // 認証済み状態
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // 既存ユーザーチェック
    const existingUser = await users.findOne({ email: testUser.email });
    if (existingUser) {
      console.log('⚠️ Test user already exists, updating...');
      
      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      
      await users.updateOne(
        { email: testUser.email },
        {
          $set: {
            name: testUser.name,
            password: hashedPassword,
            emailVerified: true,
            updatedAt: new Date(),
          }
        }
      );
      console.log('✅ Test user updated successfully!');
    } else {
      console.log('🔄 Creating new test user...');
      
      // パスワードハッシュ化
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      testUser.password = hashedPassword;
      
      await users.insertOne(testUser);
      console.log('✅ Test user created successfully!');
    }
    
    console.log('📋 Test user info:');
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Password: ExistingPassword123!`);
    console.log(`  Name: ${testUser.name}`);
    console.log(`  Email Verified: true`);
    
  } catch (error) {
    console.error('❌ Error creating test user:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createTestUser();
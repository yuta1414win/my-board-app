#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log('📡 Connecting to:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connection successful!');
    
    // テストコレクション作成
    const testCollection = mongoose.connection.db.collection('test');
    await testCollection.insertOne({ test: 'Hello MongoDB!', timestamp: new Date() });
    console.log('✅ Test document inserted successfully!');
    
    // テストドキュメント削除
    await testCollection.deleteOne({ test: 'Hello MongoDB!' });
    console.log('✅ Test document deleted successfully!');
    
    console.log('🎉 MongoDB is ready for the application!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Suggestions:');
      console.log('1. Make sure MongoDB is running locally (brew services start mongodb-community)');
      console.log('2. Or use MongoDB Atlas cloud service');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n💡 Check your username and password in the connection string');
    } else if (error.message.includes('network')) {
      console.log('\n💡 Check your network connection and firewall settings');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();
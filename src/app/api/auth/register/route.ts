import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { MongoClient } from 'mongodb';

export async function POST(request: Request) {
  let client: MongoClient | null = null;
  
  try {
    const { email, password, name } = await request.json();

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '全ての項目を入力してください', success: false },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: '名前は50文字以内で入力してください', success: false },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください', success: false },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください', success: false },
        { status: 400 }
      );
    }

    // MongoDB接続
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is not defined');
      return NextResponse.json(
        { error: 'データベース設定エラー', success: false },
        { status: 500 }
      );
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db();
    const users = db.collection('users');

    // 既存ユーザーのチェック
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています', success: false },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await hash(password, 12);

    // ユーザーを作成
    const newUser = {
      name,
      email,
      password: hashedPassword,
      emailVerified: true, // テスト環境では認証済みとして作成
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(newUser);

    if (result.insertedId) {
      return NextResponse.json({
        message: '登録が完了しました',
        success: true,
      });
    } else {
      throw new Error('ユーザー作成に失敗しました');
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '登録処理中にエラーが発生しました', success: false },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
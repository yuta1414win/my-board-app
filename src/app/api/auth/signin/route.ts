import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { MongoClient } from 'mongodb';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  let client: MongoClient | null = null;

  try {
    const { email, password } = await request.json();

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'メールアドレスとパスワードを入力してください',
          success: false,
        },
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

    // ユーザーを検索
    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json(
        {
          error: 'メールアドレスまたはパスワードが間違っています',
          success: false,
        },
        { status: 401 }
      );
    }

    // パスワード検証
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: 'メールアドレスまたはパスワードが間違っています',
          success: false,
        },
        { status: 401 }
      );
    }

    // JWTトークンを生成
    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
    const secret = new TextEncoder().encode(JWT_SECRET);

    const token = await new SignJWT({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // レスポンスを作成
    const response = NextResponse.json({
      message: 'ログインに成功しました',
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    });

    // httpOnlyクッキーにJWTを設定
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24時間
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました', success: false },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

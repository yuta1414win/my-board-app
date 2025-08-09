import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { generateEmailVerificationToken, sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // バリデーション
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '全ての項目を入力してください' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 既存ユーザーチェック
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // ユーザー作成
    const user = await User.create({
      name,
      email,
      password,
      emailVerified: false,
    });

    // メール確認トークン生成
    const verificationToken = generateEmailVerificationToken(user._id.toString());
    
    // メール確認トークンを保存
    user.emailVerificationToken = verificationToken;
    await user.save();

    // 確認メール送信
    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json({
      message: '登録が完了しました。メールアドレスに確認メールを送信しました。',
      success: true,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
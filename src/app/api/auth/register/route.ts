import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import {
  checkPasswordStrength,
  validateEmail,
  generateVerificationToken,
} from '@/lib/validation';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, confirmPassword } = await request.json();

    // 入力検証
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    // 名前の検証
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: '名前は2文字以上50文字以内で入力してください' },
        { status: 400 }
      );
    }

    // メールアドレスの検証
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // パスワードの一致確認
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'パスワードが一致しません' },
        { status: 400 }
      );
    }

    // パスワード強度チェック
    const passwordStrength = checkPasswordStrength(password);
    if (!passwordStrength.isValid) {
      const missingRequirements = [];
      if (!passwordStrength.requirements.minLength) {
        missingRequirements.push('8文字以上');
      }
      if (!passwordStrength.requirements.hasUpperCase) {
        missingRequirements.push('大文字');
      }
      if (!passwordStrength.requirements.hasLowerCase) {
        missingRequirements.push('小文字');
      }
      if (!passwordStrength.requirements.hasNumber) {
        missingRequirements.push('数字');
      }
      if (!passwordStrength.requirements.hasSpecialChar) {
        missingRequirements.push('特殊文字');
      }

      return NextResponse.json(
        {
          error: `パスワードは次の要件を満たす必要があります: ${missingRequirements.join('、')}`,
          requirements: passwordStrength.requirements,
        },
        { status: 400 }
      );
    }

    // データベース接続
    await dbConnect();

    // メールアドレスの重複チェック
    const existingUser = await UserModel.findByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12);

    // 確認トークンの生成
    const verificationToken = generateVerificationToken();

    // ユーザーの作成
    const insertedId = await UserModel.createUser({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
      role: 'user',
      isActive: true,
    });

    // 確認メールの送信
    const emailResult = await sendVerificationEmail(
      email.toLowerCase(),
      verificationToken
    );

    if (!emailResult.success) {
      // メール送信失敗時でもユーザーは作成されているため、エラーをログに記録
      console.error('Failed to send verification email:', emailResult.error);

      return NextResponse.json(
        {
          success: true,
          message:
            'アカウントが作成されました。確認メールの送信に失敗しました。サポートにお問い合わせください。',
          userId: insertedId.toString(),
          emailSent: false,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          'アカウントが作成されました。メールアドレスに送信された確認リンクをクリックしてください。',
        userId: insertedId.toString(),
        emailSent: true,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);

    if (error instanceof Error) {
      // MongoDBのエラー処理
      if (error.message.includes('E11000')) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に登録されています' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          'アカウント作成中にエラーが発生しました。しばらく待ってから再度お試しください。',
      },
      { status: 500 }
    );
  }
}

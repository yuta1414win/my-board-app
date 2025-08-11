import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UserModel } from '@/models/User';
import { validatePasswordChange } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // バリデーション
    const validation = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: '入力データが無効です',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // パスワード変更処理
    const result = await UserModel.changePassword(currentUser.id, {
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'パスワードの変更に失敗しました' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'パスワードが正常に変更されました' });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'パスワードの変更に失敗しました' },
      { status: 500 }
    );
  }
}

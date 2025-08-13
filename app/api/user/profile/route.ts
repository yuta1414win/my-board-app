import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UserModel } from '@/models/User';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // データベースからユーザー情報を取得
    const user = await UserModel.findOne({ _id: currentUser.id });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const userProfile = UserModel.documentToProfile(user);
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, quickComment } = body;

    // バリデーション
    const { validateProfile } = await import('@/lib/validation');
    const validation = validateProfile({ name, bio, quickComment });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: '入力データが無効です',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // データベース更新
    const updateData = {
      name: name?.trim(),
      bio: bio?.trim() || undefined,
      quickComment: quickComment?.trim() || undefined,
    };

    // undefinedのキーを削除
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const success = await UserModel.updateProfile(currentUser.id, updateData);

    if (!success) {
      return NextResponse.json(
        { error: 'プロフィールの更新に失敗しました' },
        { status: 500 }
      );
    }

    // 更新後のデータを取得
    const updatedUser = await UserModel.findOne({ _id: currentUser.id });
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const updatedProfile = UserModel.documentToProfile(updatedUser);
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}

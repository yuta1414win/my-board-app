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
    const user = await UserModel.findById(currentUser.id);
    
    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
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
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio } = body;

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '名前は必須です' }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: '名前は50文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: '自己紹介は500文字以内で入力してください' },
        { status: 400 }
      );
    }

    // ここで実際のデータベース更新処理
    // 現在は成功レスポンスのみ返す
    const updatedProfile = {
      id: session.user.id,
      name: name.trim(),
      email: session.user.email,
      image: session.user.image,
      bio: bio?.trim() || '',
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}

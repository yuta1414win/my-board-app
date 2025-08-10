import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // ここで実際のデータベースからユーザー情報を取得
    // 現在はセッション情報をそのまま返す
    const userProfile = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      bio: session.user.bio || '',
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
    };

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, bio } = body;

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '名前は必須です' },
        { status: 400 }
      );
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
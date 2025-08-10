import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import dbConnect from '../../../../lib/mongodb';
import Post from '../../../../models/Post';
import { ObjectId } from 'mongodb';

// GET関数を追加
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    await dbConnect();

    const post = await Post.findById(params.id).lean();
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { title, content } = await request.json();

    // バリデーション
    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です' },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        { error: 'タイトルは100文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: '内容は1000文字以内で入力してください' },
        { status: 400 }
      );
    }

    await dbConnect();

    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 投稿者チェック
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      params.id,
      {
        title: title.trim(),
        content: content.trim(),
        updatedAt: new Date(),
      },
      { new: true }
    );

    return NextResponse.json({
      post: updatedPost,
      message: '投稿が更新されました',
      success: true,
    });
  } catch (error: any) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    await dbConnect();

    const post = await Post.findById(params.id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 投稿者チェック
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    await Post.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: '投稿が削除されました',
      success: true,
    });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

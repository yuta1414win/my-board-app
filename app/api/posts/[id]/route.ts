import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import dbConnect from '../../../../lib/mongodb';
import Post from '../../../../models/Post';
import mongoose from 'mongoose';
import {
  checkPostPermissions,
  canEditPost,
  canDeletePost,
  PERMISSION_MESSAGES,
  PermissionError,
} from '../../../../lib/permissions';

// GET関数を追加
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: PERMISSION_MESSAGES.NOT_AUTHENTICATED,
          code: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // ObjectIdの形式チェック
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: '無効な投稿IDです', code: 'INVALID_POST_ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    const post = await Post.findById(id).lean();
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません', code: 'POST_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 権限チェック
    const permissions = checkPostPermissions(session, post);
    if (!permissions.canView) {
      return NextResponse.json(
        {
          error: PERMISSION_MESSAGES.NOT_AUTHORIZED,
          code: 'PERMISSION_DENIED',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      post,
      permissions: {
        canEdit: permissions.canEdit,
        canDelete: permissions.canDelete,
        isOwner: permissions.isOwner,
        isAdmin: permissions.isAdmin,
      },
    });
  } catch (error: unknown) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: PERMISSION_MESSAGES.NOT_AUTHENTICATED,
          code: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // ObjectIdの形式チェック
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: '無効な投稿IDです', code: 'INVALID_POST_ID' },
        { status: 400 }
      );
    }

    const { title, content } = await request.json();

    // バリデーション
    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        {
          error: 'タイトルは100文字以内で入力してください',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        {
          error: '内容は1000文字以内で入力してください',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません', code: 'POST_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 権限チェック - 新しいヘルパー関数を使用
    if (!canEditPost(session, post)) {
      return NextResponse.json(
        {
          error: PERMISSION_MESSAGES.NOT_POST_OWNER,
          code: 'PERMISSION_DENIED',
          action: 'edit',
          postId: id,
        },
        { status: 403 }
      );
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
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
  } catch (error: unknown) {
    console.error('Update post error:', error);
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: PERMISSION_MESSAGES.NOT_AUTHENTICATED,
          code: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // ObjectIdの形式チェック
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: '無効な投稿IDです', code: 'INVALID_POST_ID' },
        { status: 400 }
      );
    }

    await dbConnect();

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません', code: 'POST_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 権限チェック - 新しいヘルパー関数を使用
    if (!canDeletePost(session, post)) {
      return NextResponse.json(
        {
          error: PERMISSION_MESSAGES.NOT_POST_OWNER,
          code: 'PERMISSION_DENIED',
          action: 'delete',
          postId: id,
        },
        { status: 403 }
      );
    }

    // 削除実行
    const result = await Post.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json(
        { error: '削除に失敗しました', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '投稿が削除されました',
      success: true,
    });
  } catch (error: unknown) {
    console.error('Delete post error:', error);
    if (error instanceof PermissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

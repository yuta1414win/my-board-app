import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET() {
  try {
    // セッション情報を取得
    const session = await auth();

    if (!session) {
      return NextResponse.json({
        message: 'No active session',
        session: null,
      });
    }

    // データベースに接続
    await dbConnect();

    // セッションのユーザーIDでユーザーを検索
    let userBySession = null;
    let searchMethod = null;
    let idFormat = 'unknown';

    if (session.user?.id) {
      const id = session.user.id;

      // ID形式を判定
      if (id.match(/^[0-9a-f]{24}$/i)) {
        idFormat = 'ObjectID';
      } else if (
        id.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        idFormat = 'UUID';
      }

      // findOneで検索
      try {
        userBySession = await User.findOne({ _id: id });
        searchMethod = 'findOne';
      } catch (error) {
        console.error('findOne failed:', error);
      }
    }

    // メールアドレスでも検索
    let userByEmail = null;
    if (session.user?.email) {
      userByEmail = await User.findOne({ email: session.user.email });
    }

    // 全ユーザーの_id形式を確認（最初の5件のみ）
    const allUsers = await User.find({}).limit(5).select('_id email');
    const idFormats = allUsers.map((u) => {
      const id = (u as any)._id.toString();
      if (id.match(/^[0-9a-f]{24}$/i)) {
        return { email: u.email, idFormat: 'ObjectID', id };
      } else if (
        id.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        )
      ) {
        return { email: u.email, idFormat: 'UUID', id };
      }
      return { email: u.email, idFormat: 'Other', id };
    });

    return NextResponse.json({
      session: {
        userId: session.user?.id,
        userIdFormat: idFormat,
        email: session.user?.email,
        name: session.user?.name,
      },
      database: {
        userBySessionId: userBySession
          ? {
              found: true,
              id: userBySession._id,
              email: userBySession.email,
              searchMethod,
            }
          : {
              found: false,
              searchMethod,
            },
        userByEmail: userByEmail
          ? {
              found: true,
              id: userByEmail._id,
              email: userByEmail.email,
            }
          : {
              found: false,
            },
      },
      dbIdFormats: idFormats,
      analysis: {
        sessionIdFormat: idFormat,
        dbHasUser: !!userByEmail,
        idMismatch:
          session.user?.id &&
          userByEmail &&
          session.user.id !== (userByEmail as any)._id.toString(),
      },
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // NextAuth.jsのセッションクッキーを削除
    const cookieStore = await cookies();

    // NextAuth.jsのデフォルトクッキー名
    const authCookieNames = [
      'authjs.session-token',
      'authjs.csrf-token',
      'authjs.callback-url',
      '__Secure-authjs.session-token', // production
      '__Host-authjs.csrf-token', // production
    ];

    // すべての認証関連クッキーを削除
    authCookieNames.forEach((cookieName) => {
      cookieStore.delete(cookieName);
    });

    // ログアウト成功レスポンス
    return NextResponse.json(
      {
        success: true,
        message: 'ログアウトしました',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'ログアウト処理でエラーが発生しました',
      },
      { status: 500 }
    );
  }
}

// GETメソッドも対応（ブラウザから直接アクセスされた場合）
export async function GET(request: NextRequest) {
  // NextAuth.jsのsignOutを使用するため、リダイレクト
  return NextResponse.redirect(new URL('/api/auth/signout', request.url));
}

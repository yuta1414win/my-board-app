import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // レスポンスを作成
    const response = NextResponse.json({
      message: 'ログアウトしました',
      success: true,
    });

    // 認証クッキーを削除
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 即座に削除
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signout error:', error);
    return NextResponse.json(
      { error: 'ログアウト処理中にエラーが発生しました', success: false },
      { status: 500 }
    );
  }
}

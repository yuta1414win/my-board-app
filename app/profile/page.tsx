import { getCurrentUser } from '@/lib/auth';
import { UserModel } from '@/models/User';
import { redirect } from 'next/navigation';
import ProfileClient from '@/components/profile/ProfileClient';

// 動的レンダリングを強制（cookiesを使用するため）
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/signin');
  }

  // データベースからユーザー情報を取得を試行
  let user = await UserModel.findById(currentUser.id);

  // OAuthユーザーの場合、セッション情報を使用してプロフィールを作成
  if (!user && currentUser.email) {
    // emailでMongoDBユーザーを検索
    user = await UserModel.findByEmail(currentUser.email);

    // それでも見つからない場合、セッション情報から仮想プロフィールを作成
    if (!user) {
      const virtualProfile = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        bio: undefined,
        quickComment: undefined,
        avatar: undefined,
        emailVerified: true, // OAuthは認証済み
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return <ProfileClient initialUser={virtualProfile} />;
    }
  }

  if (!user) {
    redirect('/auth/signin');
  }

  const userProfile = UserModel.documentToProfile(user);

  return <ProfileClient initialUser={userProfile} />;
}

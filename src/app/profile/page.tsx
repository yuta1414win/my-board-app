import { getCurrentUser } from '@/lib/auth';
import { UserModel } from '@/models/User';
import { redirect } from 'next/navigation';
import ProfileClient from '@/components/profile/ProfileClient';

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/signin');
  }

  // データベースからユーザー情報を取得
  const user = await UserModel.findById(currentUser.id);

  if (!user) {
    redirect('/auth/signin');
  }

  const userProfile = UserModel.documentToProfile(user);

  return <ProfileClient initialUser={userProfile} />;
}
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChangeCredentialsClient from '@/components/profile/ChangeCredentialsClient';

// 動的レンダリングを強制（cookiesを使用するため）
export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/signin');
  }

  return <ChangeCredentialsClient />;
}

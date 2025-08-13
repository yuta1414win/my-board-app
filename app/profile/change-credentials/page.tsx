import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChangeCredentialsClient from '@/components/profile/ChangeCredentialsClient';

export default async function ChangePasswordPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/signin');
  }

  return <ChangeCredentialsClient />;
}

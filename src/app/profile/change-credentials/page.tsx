import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChangePasswordClient from '@/components/profile/ChangePasswordClient';

export default async function ChangePasswordPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/signin');
  }

  return <ChangePasswordClient />;
}
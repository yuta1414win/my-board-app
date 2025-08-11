import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { Box } from '@mui/material';
import SignUpForm from '../../../components/auth/sign-up-form';

// 動的レンダリングを強制（cookiesを使用するため）
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const session = await auth();

  if (session) {
    redirect('/board');
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
      }}
    >
      <SignUpForm />
    </Box>
  );
}

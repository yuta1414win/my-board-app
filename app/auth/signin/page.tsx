import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { Box } from '@mui/material';
import SignInForm from '../../../components/auth/sign-in-form';

export default async function SignInPage() {
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
      <SignInForm />
    </Box>
  );
}

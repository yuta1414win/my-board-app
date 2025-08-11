'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, CircularProgress, Box } from '@mui/material';
import { Login, Logout, PersonAdd } from '@mui/icons-material';

interface AuthButtonProps {
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  fullWidth?: boolean;
}

export default function AuthButton({
  variant = 'contained',
  size = 'medium',
  showIcon = true,
  fullWidth = false,
}: AuthButtonProps) {
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // ローディング中
  if (status === 'loading') {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  // ログイン済み
  if (session) {
    return (
      <Button
        variant={variant}
        size={size}
        color="error"
        onClick={handleLogout}
        fullWidth={fullWidth}
        startIcon={showIcon ? <Logout /> : undefined}
      >
        ログアウト
      </Button>
    );
  }

  // 未ログイン
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant={variant}
        size={size}
        color="primary"
        component={Link}
        href="/auth/login"
        fullWidth={fullWidth}
        startIcon={showIcon ? <Login /> : undefined}
      >
        ログイン
      </Button>
      <Button
        variant="outlined"
        size={size}
        color="primary"
        component={Link}
        href="/auth/register"
        fullWidth={fullWidth}
        startIcon={showIcon ? <PersonAdd /> : undefined}
      >
        新規登録
      </Button>
    </Box>
  );
}

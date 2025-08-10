'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Container,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  Dashboard,
  Person,
  Settings,
} from '@mui/icons-material';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await signOut({ callbackUrl: '/' });
  };

  const handleProfile = () => {
    handleClose();
    router.push('/profile');
  };

  const handleSettings = () => {
    handleClose();
    router.push('/settings');
  };

  // 認証関連のページでは表示しない
  const authPages = [
    '/auth/login',
    '/auth/signin',
    '/auth/register',
    '/auth/verify-email',
  ];
  if (authPages.includes(pathname)) {
    return null;
  }

  return (
    <AppBar position="sticky" sx={{ backgroundColor: '#1976d2' }}>
      <Container maxWidth="lg">
        <Toolbar>
          {/* ロゴ・アプリ名 */}
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Dashboard sx={{ mr: 1 }} />
            掲示板アプリ
          </Typography>

          {/* ナビゲーションリンク */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, mr: 2 }}>
            <Button
              color="inherit"
              component={Link}
              href="/dashboard"
              sx={{
                textDecoration: pathname === '/dashboard' ? 'underline' : 'none',
              }}
            >
              ダッシュボード
            </Button>
            <Button
              color="inherit"
              component={Link}
              href="/board"
              sx={{
                textDecoration: pathname === '/board' ? 'underline' : 'none',
              }}
            >
              掲示板
            </Button>
          </Box>

          {/* 認証状態による表示切り替え */}
          {status === 'loading' ? (
            <Skeleton variant="circular" width={40} height={40} />
          ) : session ? (
            // ログイン済み
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
              >
                {session.user?.name || session.user?.email}
              </Typography>
              <IconButton
                size="large"
                aria-label="アカウントメニュー"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                {session.user?.image ? (
                  <Avatar
                    src={session.user.image}
                    alt={session.user.name || ''}
                    sx={{ width: 32, height: 32 }}
                  />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    ログイン中
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {session.user?.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleProfile}>
                  <Person sx={{ mr: 1, fontSize: 20 }} />
                  プロフィール
                </MenuItem>
                <MenuItem onClick={handleSettings}>
                  <Settings sx={{ mr: 1, fontSize: 20 }} />
                  設定
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 1, fontSize: 20 }} />
                  ログアウト
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            // 未ログイン
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                variant="outlined"
                component={Link}
                href="/auth/login"
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                ログイン
              </Button>
              <Button
                color="inherit"
                variant="contained"
                component={Link}
                href="/auth/register"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              >
                新規登録
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

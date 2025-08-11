'use client';

import React from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import {
  Dashboard as DashboardIcon,
  PostAdd as PostAddIcon,
  Person as PersonIcon,
  Forum as ForumIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function DashboardPage() {
  const { loading, authenticated, user, error } = useRequireAuth();

  // ローディング表示
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <LinearProgress />
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              読み込み中...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            エラーが発生しました
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  // 認証されていない場合（通常はミドルウェアでリダイレクトされる）
  if (!authenticated) {
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダーセクション */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <DashboardIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 'bold', color: 'primary.main' }}
            >
              ダッシュボード
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <Avatar
              src={user?.image || ''}
              alt={user?.name || ''}
              sx={{ width: 48, height: 48 }}
            >
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                おかえりなさい、{user?.name || 'ユーザー'}さん
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Chip
              label="メンバー"
              color="primary"
              size="small"
              sx={{ ml: 'auto' }}
            />
          </Stack>
        </Box>

        {/* クイックアクションカード */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                <PostAddIcon
                  sx={{ fontSize: 48, color: 'success.main', mb: 1 }}
                />
                <Typography variant="h6" gutterBottom>
                  新規投稿
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  新しい投稿を作成する
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                <Link href="/posts/new" passHref>
                  <Button variant="contained" color="success" size="small">
                    投稿作成
                  </Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                <ForumIcon
                  sx={{ fontSize: 48, color: 'primary.main', mb: 1 }}
                />
                <Typography variant="h6" gutterBottom>
                  掲示板
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  投稿を閲覧・コメント
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                <Link href="/board" passHref>
                  <Button variant="contained" size="small">
                    掲示板を見る
                  </Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                <PersonIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  プロフィール
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  プロフィールを編集
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                <Link href="/profile" passHref>
                  <Button variant="contained" color="info" size="small">
                    プロフィール
                  </Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                <SettingsIcon
                  sx={{ fontSize: 48, color: 'warning.main', mb: 1 }}
                />
                <Typography variant="h6" gutterBottom>
                  設定
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  アカウント設定
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                <Link href="/settings" passHref>
                  <Button variant="contained" color="warning" size="small">
                    設定
                  </Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        {/* 統計・アクティビティセクション */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: 'medium' }}
              >
                最近のアクティビティ
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    2024年1月15日
                  </Typography>
                  <Typography variant="body1">
                    掲示板に投稿しました: 「新年の挨拶」
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    2024年1月14日
                  </Typography>
                  <Typography variant="body1">
                    プロフィールを更新しました
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    2024年1月13日
                  </Typography>
                  <Typography variant="body1">
                    アカウントに登録しました
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                  統計
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      総投稿数
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      12
                    </Typography>
                  </Stack>
                </Box>

                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      総コメント数
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      28
                    </Typography>
                  </Stack>
                </Box>

                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" color="text.secondary">
                      メンバー歴
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      5日
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            <Paper elevation={2} sx={{ p: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 2 }}
              >
                <NotificationsIcon color="warning" />
                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                  通知
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  新しい通知はありません
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

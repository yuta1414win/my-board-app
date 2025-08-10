'use client';

import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Stack,
  Divider,
  LinearProgress,
  Alert,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Lock as LockIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { UserProfile } from '@/models/User';
import ProfileEditForm from './ProfileEditForm';
import QuickCommentBubble from './QuickCommentBubble';
import Link from 'next/link';

interface ProfileClientProps {
  initialUser: UserProfile;
}

export default function ProfileClient({ initialUser }: ProfileClientProps) {
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [editMode, setEditMode] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const formatJoinDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '不明';
    }
  };

  const handleProfileUpdate = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setEditMode(false);
    setUpdateMessage({
      type: 'success',
      text: 'プロフィールを更新しました',
    });

    // メッセージを3秒後に非表示
    setTimeout(() => {
      setUpdateMessage(null);
    }, 3000);
  };

  const handleEditError = (error: string) => {
    setUpdateMessage({
      type: 'error',
      text: error,
    });

    // メッセージを5秒後に非表示
    setTimeout(() => {
      setUpdateMessage(null);
    }, 5000);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* ヘッダー */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <PersonIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold', color: 'primary.main' }}
          >
            プロフィール
          </Typography>
        </Stack>

        {/* メッセージ表示 */}
        <Fade in={!!updateMessage}>
          <div>
            {updateMessage && (
              <Alert
                severity={updateMessage.type}
                sx={{ mb: 3 }}
                onClose={() => setUpdateMessage(null)}
              >
                {updateMessage.text}
              </Alert>
            )}
          </div>
        </Fade>

        <Grid container spacing={3} data-testid="profile-layout">
          {/* プロフィール情報カード */}
          <Grid item xs={12} md={8}>
            <Card elevation={2}>
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 3 }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                    基本情報
                  </Typography>
                  {!editMode && (
                    <Button
                      startIcon={<EditIcon />}
                      variant="outlined"
                      onClick={() => setEditMode(true)}
                    >
                      編集
                    </Button>
                  )}
                </Stack>

                {editMode ? (
                  <ProfileEditForm
                    user={user}
                    onUpdate={handleProfileUpdate}
                    onError={handleEditError}
                    onCancel={() => setEditMode(false)}
                  />
                ) : (
                  <Stack spacing={3}>
                    {/* 名前 */}
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        名前
                      </Typography>
                      <Typography variant="body1" sx={{ minHeight: 24 }}>
                        {user.name || '未設定'}
                      </Typography>
                    </Box>

                    {/* 自己紹介 */}
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        自己紹介
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ minHeight: 50, whiteSpace: 'pre-wrap' }}
                      >
                        {user.bio || '自己紹介が設定されていません。'}
                      </Typography>
                    </Box>

                    {/* 一言コメント */}
                    {user.quickComment && (
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          一言コメント
                        </Typography>
                        <QuickCommentBubble comment={user.quickComment} />
                      </Box>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* サイドバー */}
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              {/* アバターカード */}
              <Card elevation={2}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', mb: 2 }}>
                    <Avatar
                      src={user.avatar || ''}
                      alt={user.name || ''}
                      data-testid="user-avatar"
                      sx={{
                        width: 100,
                        height: 100,
                        mx: 'auto',
                        fontSize: '2rem',
                        bgcolor: 'primary.main',
                      }}
                    >
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {user.name || 'ユーザー'}
                  </Typography>
                  <Chip label="メンバー" color="primary" size="small" />
                </CardContent>
              </Card>

              {/* アカウント情報 */}
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: 'medium' }}
                >
                  アカウント情報
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        メールアドレス
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5, ml: 3 }}>
                      {user.email}
                    </Typography>
                  </Box>

                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        登録日
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5, ml: 3 }}>
                      {formatJoinDate(user.createdAt)}
                    </Typography>
                  </Box>

                  {/* メール確認状態 */}
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      メール確認状態
                    </Typography>
                    <Chip
                      label={user.emailVerified ? '確認済み' : '未確認'}
                      color={user.emailVerified ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                </Stack>
              </Paper>

              {/* セキュリティ設定 */}
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: 'medium' }}
                >
                  セキュリティ設定
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Button
                  component={Link}
                  href="/profile/change-credentials"
                  startIcon={<LockIcon />}
                  variant="outlined"
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  パスワード変更
                </Button>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
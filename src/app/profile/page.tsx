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
  TextField,
  Stack,
  Divider,
  LinearProgress,
  Alert,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ProfilePage() {
  const { loading, authenticated, user, error } = useRequireAuth();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // ユーザー情報が取得できたら初期値を設定
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // ローディング表示
  if (loading) {
    return (
      <Container maxWidth="md">
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
      <Container maxWidth="md">
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

  // 認証されていない場合
  if (!authenticated) {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setUpdateLoading(true);
    setUpdateMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setUpdateMessage({
          type: 'success',
          text: 'プロフィールを更新しました',
        });
        setEditMode(false);
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        text: 'プロフィールの更新に失敗しました',
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
      });
    }
    setEditMode(false);
    setUpdateMessage(null);
  };

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
        {updateMessage && (
          <Alert
            severity={updateMessage.type}
            sx={{ mb: 3 }}
            onClose={() => setUpdateMessage(null)}
          >
            {updateMessage.text}
          </Alert>
        )}

        <Grid container spacing={3}>
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
                  {!editMode ? (
                    <Button
                      startIcon={<EditIcon />}
                      variant="outlined"
                      onClick={() => setEditMode(true)}
                    >
                      編集
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Button
                        startIcon={<SaveIcon />}
                        variant="contained"
                        onClick={handleSave}
                        disabled={updateLoading}
                      >
                        保存
                      </Button>
                      <Button
                        startIcon={<CancelIcon />}
                        variant="outlined"
                        onClick={handleCancel}
                        disabled={updateLoading}
                      >
                        キャンセル
                      </Button>
                    </Stack>
                  )}
                </Stack>

                {updateLoading && <LinearProgress sx={{ mb: 2 }} />}

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
                    {editMode ? (
                      <TextField
                        fullWidth
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="表示名を入力してください"
                        disabled={updateLoading}
                      />
                    ) : (
                      <Typography variant="body1" sx={{ minHeight: 24 }}>
                        {user?.name || '未設定'}
                      </Typography>
                    )}
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
                    {editMode ? (
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        placeholder="自己紹介を入力してください"
                        disabled={updateLoading}
                      />
                    ) : (
                      <Typography
                        variant="body1"
                        sx={{ minHeight: 50, whiteSpace: 'pre-wrap' }}
                      >
                        {user?.bio || '自己紹介が設定されていません。'}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* サイドバー */}
          <Grid item xs={12} md={4}>
            {/* アバター */}
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box
                  sx={{ position: 'relative', display: 'inline-block', mb: 2 }}
                >
                  <Avatar
                    src={user?.image || ''}
                    alt={user?.name || ''}
                    sx={{ width: 100, height: 100 }}
                  >
                    {user?.name?.charAt(0) || 'U'}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: -5,
                      right: -5,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: 32,
                      height: 32,
                    }}
                    disabled
                  >
                    <PhotoCameraIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="h6" gutterBottom>
                  {user?.name || 'ユーザー'}
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
                    {user?.email}
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
                    {user?.createdAt ? formatJoinDate(user.createdAt) : '不明'}
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
                    label={user?.emailVerified ? '確認済み' : '未確認'}
                    color={user?.emailVerified ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

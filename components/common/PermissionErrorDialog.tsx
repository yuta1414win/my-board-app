'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  ErrorOutline,
  Security,
  AdminPanelSettings,
  Person,
} from '@mui/icons-material';

interface PermissionErrorDialogProps {
  open: boolean;
  onClose: () => void;
  error: {
    message: string;
    code?: string;
    action?: string;
    isAdmin?: boolean;
    isOwner?: boolean;
  } | null;
  title?: string;
}

export default function PermissionErrorDialog({
  open,
  onClose,
  error,
  title = '権限エラー',
}: PermissionErrorDialogProps) {
  if (!error) return null;

  const getErrorIcon = () => {
    if (error.isAdmin) {
      return (
        <AdminPanelSettings sx={{ fontSize: 48, color: 'warning.main' }} />
      );
    }
    if (error.isOwner) {
      return <Person sx={{ fontSize: 48, color: 'info.main' }} />;
    }
    return <Security sx={{ fontSize: 48, color: 'error.main' }} />;
  };

  const getErrorTitle = () => {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        return 'アクセス権限がありません';
      case 'NOT_AUTHENTICATED':
        return '認証が必要です';
      case 'NOT_POST_OWNER':
        return '投稿者権限が必要です';
      case 'NOT_ADMIN':
        return '管理者権限が必要です';
      default:
        return title;
    }
  };

  const getErrorDescription = () => {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        return error.isAdmin
          ? '管理者権限でのみ実行可能な操作です'
          : '自分が作成した投稿のみ操作可能です';
      case 'NOT_AUTHENTICATED':
        return 'この操作を実行するにはログインが必要です';
      case 'NOT_POST_OWNER':
        return '投稿の編集・削除は作成者のみが可能です';
      case 'NOT_ADMIN':
        return 'システム管理者のみが実行可能な操作です';
      default:
        return error.message;
    }
  };

  const getSeverity = () => {
    switch (error.code) {
      case 'NOT_AUTHENTICATED':
        return 'warning' as const;
      case 'NOT_ADMIN':
        return 'info' as const;
      default:
        return 'error' as const;
    }
  };

  const getActionText = () => {
    if (error.action) {
      switch (error.action) {
        case 'edit':
          return '編集';
        case 'delete':
          return '削除';
        case 'create':
          return '作成';
        case 'view':
          return '表示';
        default:
          return error.action;
      }
    }
    return '操作';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          {getErrorIcon()}
          <Typography variant="h6" component="span">
            {getErrorTitle()}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center' }}>
        <Alert severity={getSeverity()} sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            {getErrorDescription()}
          </Typography>
          {error.action && (
            <Typography variant="body2" color="text.secondary">
              実行しようとした操作: {getActionText()}
            </Typography>
          )}
        </Alert>

        {error.code === 'NOT_AUTHENTICATED' && (
          <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
            ログインページに移動してログインを行ってください
          </Typography>
        )}

        {error.code === 'PERMISSION_DENIED' && !error.isAdmin && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            他のユーザーの投稿を操作することはできません
          </Typography>
        )}

        {error.code === 'NOT_ADMIN' && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            管理者権限が必要な操作です。権限の付与について管理者にお問い合わせください
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          onClick={onClose}
          variant="contained"
          size="large"
          sx={{ minWidth: 120 }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  PostAdd,
  Security,
  Settings,
  Edit,
  Delete,
  Block,
  CheckCircle,
} from '@mui/icons-material';
import { usePermissions } from '../../hooks/usePermissions';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPanel() {
  const { data: session } = useSession();
  const { userPermissions } = usePermissions();
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: '', message: '', action: () => {} });

  // 管理者権限チェック
  if (!userPermissions.isAuthenticated || !userPermissions.isAdmin) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <Typography variant="h6" gutterBottom>
          アクセス拒否
        </Typography>
        管理者権限が必要です。このページにアクセスする権限がありません。
      </Alert>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const showConfirmDialog = (title: string, message: string, action: () => void) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      action,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  const handleConfirmAction = () => {
    confirmDialog.action();
    closeConfirmDialog();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminPanelSettings color="primary" />
          管理者パネル
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            管理者として、ユーザーの投稿管理や設定変更が可能です。
            操作は慎重に行ってください。
          </Typography>
        </Alert>
      </Box>

      {/* タブ */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              icon={<PostAdd />} 
              label="投稿管理" 
              id="admin-tab-0"
              aria-controls="admin-tabpanel-0"
            />
            <Tab 
              icon={<People />} 
              label="ユーザー管理" 
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            />
            <Tab 
              icon={<Security />} 
              label="セキュリティ" 
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
            <Tab 
              icon={<Settings />} 
              label="システム設定" 
              id="admin-tab-3"
              aria-controls="admin-tabpanel-3"
            />
          </Tabs>
        </Box>

        {/* 投稿管理タブ */}
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h6" gutterBottom>
            投稿管理
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            すべての投稿の編集・削除が可能です。
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            管理者として他のユーザーの投稿を操作する際は、適切な理由があることを確認してください。
          </Alert>

          {/* 投稿管理の統計情報例 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  総投稿数
                </Typography>
                <Typography variant="h5">
                  --
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  今日の投稿
                </Typography>
                <Typography variant="h5">
                  --
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  報告された投稿
                </Typography>
                <Typography variant="h5">
                  --
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Typography variant="body2" color="text.secondary">
            投稿一覧での管理者操作が利用可能です。投稿一覧ページで「管理者」ラベル付きの編集・削除オプションが表示されます。
          </Typography>
        </TabPanel>

        {/* ユーザー管理タブ */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>
            ユーザー管理
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            ユーザーアカウントの管理と権限設定を行います。
          </Typography>

          {/* 将来の実装用のプレースホルダー */}
          <Alert severity="info">
            ユーザー管理機能は今後のアップデートで実装予定です。
          </Alert>

          <Box sx={{ mt: 2 }}>
            <List>
              <ListItem>
                <ListItemText 
                  primary="ユーザー一覧" 
                  secondary="すべてのユーザーアカウントの表示と管理"
                />
                <ListItemSecondaryAction>
                  <Chip label="準備中" color="default" size="small" />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="権限管理" 
                  secondary="ユーザーの役割と権限の変更"
                />
                <ListItemSecondaryAction>
                  <Chip label="準備中" color="default" size="small" />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="アカウント制御" 
                  secondary="ユーザーアカウントの有効化・無効化"
                />
                <ListItemSecondaryAction>
                  <Chip label="準備中" color="default" size="small" />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Box>
        </TabPanel>

        {/* セキュリティタブ */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            セキュリティ設定
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            システムのセキュリティ関連設定を管理します。
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            セキュリティ機能は今後のアップデートで拡張予定です。
          </Alert>

          <List>
            <ListItem>
              <ListItemText 
                primary="ログイン制限" 
                secondary="不正なログイン試行の監視と制限"
              />
              <ListItemSecondaryAction>
                <Chip label="有効" color="success" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="パスワード暗号化" 
                secondary="bcrypt による安全なパスワード保存"
              />
              <ListItemSecondaryAction>
                <Chip label="有効" color="success" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="セッション管理" 
                secondary="安全なセッション管理と自動タイムアウト"
              />
              <ListItemSecondaryAction>
                <Chip label="有効" color="success" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>

        {/* システム設定タブ */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>
            システム設定
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            アプリケーション全体の設定を管理します。
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            システム設定機能は今後のアップデートで実装予定です。
          </Alert>

          <List>
            <ListItem>
              <ListItemText 
                primary="サイト設定" 
                secondary="サイト名、説明、連絡先等の基本情報"
              />
              <ListItemSecondaryAction>
                <Chip label="準備中" color="default" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="メール設定" 
                secondary="メール送信設定とテンプレート管理"
              />
              <ListItemSecondaryAction>
                <Chip label="準備中" color="default" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="データベース管理" 
                secondary="データベースのバックアップと最適化"
              />
              <ListItemSecondaryAction>
                <Chip label="準備中" color="default" size="small" />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>
      </Card>

      {/* 確認ダイアログ */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>キャンセル</Button>
          <Button onClick={handleConfirmAction} variant="contained" color="error">
            実行
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
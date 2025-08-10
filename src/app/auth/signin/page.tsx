'use client';

import { Button, Typography, Container, Box } from '@mui/material';

export default function SignInPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          テスト版ログインページ
        </Typography>
        <Typography variant="body1" gutterBottom>
          このページが表示されていれば、基本的なコンポーネントは動作しています
        </Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2 }}>
          テストボタン
        </Button>
      </Box>
    </Container>
  );
}
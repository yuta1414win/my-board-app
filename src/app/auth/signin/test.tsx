'use client';

import { Button, Typography } from '@mui/material';

export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <Typography variant="h4">テストページ</Typography>
      <Button variant="contained" color="primary">
        テストボタン
      </Button>
    </div>
  );
}
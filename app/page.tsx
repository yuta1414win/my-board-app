import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth();
  
  if (session) {
    redirect('/board');
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        textAlign: 'center',
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%', p: 2 }}>
        <CardContent>
          <Typography variant="h3" component="h1" gutterBottom>
            掲示板アプリへようこそ
          </Typography>
          
          <Typography variant="h6" color="text.secondary" paragraph>
            会員制の掲示板システムです
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            このアプリでは、登録した会員同士で投稿を共有できます。
            投稿の作成、編集、削除が可能で、リアルタイムでコミュニケーションを楽しめます。
          </Typography>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              component={Link}
              href="/auth/register"
              variant="contained"
              size="large"
              sx={{ minWidth: 140 }}
            >
              新規登録
            </Button>
            
            <Button
              component={Link}
              href="/auth/signin"
              variant="outlined"
              size="large"
              sx={{ minWidth: 140 }}
            >
              ログイン
            </Button>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              主な機能
            </Typography>
            <Box component="ul" sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
              <li>メールアドレス認証による安全な会員登録</li>
              <li>投稿の作成・編集・削除</li>
              <li>投稿者名と投稿日時の表示</li>
              <li>ページネーション機能</li>
              <li>レスポンシブデザイン</li>
              <li>ダークモード対応</li>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
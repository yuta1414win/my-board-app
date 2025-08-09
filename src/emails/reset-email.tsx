import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ResetEmailProps {
  userName: string;
  resetUrl: string;
}

export default function ResetEmail({ userName, resetUrl }: ResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>パスワードをリセット</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>パスワードのリセット</Heading>
          <Text style={text}>{userName} 様</Text>
          <Text style={text}>
            パスワードリセットのリクエストを受け付けました。
            以下のボタンをクリックして、新しいパスワードを設定してください。
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              パスワードをリセット
            </Button>
          </Section>
          <Text style={text}>
            ボタンが機能しない場合は、以下のURLをコピーしてブラウザに貼り付けてください：
          </Text>
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
          <Text style={text}>このリンクは1時間有効です。</Text>
          <Text style={footer}>
            パスワードリセットをリクエストしていない場合は、このメールを無視してください。
            パスワードは変更されません。
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  textAlign: 'left' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '14px',
  margin: '0 auto',
};

const link = {
  color: '#5469d4',
  fontSize: '14px',
  textDecoration: 'underline',
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
};

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';

interface NotificationEmailProps {
  userName: string;
  subject: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

export default function NotificationEmail({
  userName,
  subject,
  message,
  actionUrl,
  actionText,
}: NotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{subject}</Heading>
          <Text style={text}>{userName} 様</Text>
          <Text style={text}>{message}</Text>
          {actionUrl && (
            <>
              <Text style={text}>詳細はこちらをご確認ください：</Text>
              <Link href={actionUrl} style={link}>
                {actionText || '詳細を見る'}
              </Link>
            </>
          )}
          <Text style={footer}>このメールは会員制掲示板からの通知です。</Text>
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

const link = {
  color: '#5469d4',
  fontSize: '16px',
  textDecoration: 'underline',
  display: 'inline-block',
  margin: '16px 0',
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
};

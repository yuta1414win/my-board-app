'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from 'next-auth';

interface UseRequireAuthOptions {
  redirectTo?: string;
  requireEmailVerification?: boolean;
  requiredRole?: string;
}

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  user: any; // TODO: 適切な User 型に置き換える
  error?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}): AuthState {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string>();

  const {
    redirectTo = '/auth/login',
    requireEmailVerification = false,
    requiredRole,
  } = options;

  useEffect(() => {
    if (status === 'loading') return;

    // 認証されていない場合
    if (status === 'unauthenticated') {
      const currentPath = window.location.pathname;
      const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`;
      router.push(loginUrl);
      return;
    }

    // 認証されている場合の追加チェック
    if (session?.user) {
      // メール確認が必要な場合
      if (requireEmailVerification && !session.user.emailVerified) {
        setError('メールアドレスの確認が必要です');
        router.push('/auth/verify-email');
        return;
      }

      // 特定のロールが必要な場合
      if (requiredRole && session.user.role !== requiredRole) {
        setError('このページにアクセスする権限がありません');
        router.push('/dashboard');
        return;
      }

      // エラーをクリア
      if (error) {
        setError(undefined);
      }
    }
  }, [
    status,
    session,
    router,
    redirectTo,
    requireEmailVerification,
    requiredRole,
    error,
  ]);

  return {
    loading: status === 'loading',
    authenticated: status === 'authenticated' && !!session?.user,
    user: session?.user,
    error,
  };
}

// より簡単な使用のためのヘルパーフック
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    loading: status === 'loading',
    authenticated: status === 'authenticated',
    unauthenticated: status === 'unauthenticated',
  };
}

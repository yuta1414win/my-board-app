'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

export interface PermissionCheck {
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  canCreate: boolean;
}

export interface UserPermissions {
  canViewPosts: boolean;
  canCreatePosts: boolean;
  canManageUsers: boolean;
  canManageAllPosts: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

export interface UsePermissionsReturn {
  userPermissions: UserPermissions;
  checkPostPermissions: (post: { author: string } | null) => PermissionCheck;
  isPostOwner: (post: { author: string }) => boolean;
  canEditPost: (post: { author: string }) => boolean;
  canDeletePost: (post: { author: string }) => boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();

  const userPermissions = useMemo<UserPermissions>(() => {
    if (status === 'loading') {
      return {
        canViewPosts: false,
        canCreatePosts: false,
        canManageUsers: false,
        canManageAllPosts: false,
        isAdmin: false,
        isAuthenticated: false,
      };
    }

    if (!session?.user) {
      return {
        canViewPosts: false,
        canCreatePosts: false,
        canManageUsers: false,
        canManageAllPosts: false,
        isAdmin: false,
        isAuthenticated: false,
      };
    }

    const isAdmin = session.user.role === 'admin';

    return {
      canViewPosts: true,
      canCreatePosts: true,
      canManageUsers: isAdmin,
      canManageAllPosts: isAdmin,
      isAdmin,
      isAuthenticated: true,
    };
  }, [session, status]);

  const isPostOwner = (post: { author: string }): boolean => {
    if (!session?.user?.id) return false;
    return String(post.author) === String(session.user.id);
  };

  const canEditPost = (post: { author: string }): boolean => {
    return isPostOwner(post) || userPermissions.isAdmin;
  };

  const canDeletePost = (post: { author: string }): boolean => {
    return isPostOwner(post) || userPermissions.isAdmin;
  };

  const checkPostPermissions = (
    post: { author: string } | null
  ): PermissionCheck => {
    if (!session?.user || status !== 'authenticated') {
      return {
        canEdit: false,
        canDelete: false,
        canView: false,
        isAdmin: false,
        isOwner: false,
        canCreate: false,
      };
    }

    if (!post) {
      return {
        canEdit: false,
        canDelete: false,
        canView: userPermissions.canViewPosts,
        isAdmin: userPermissions.isAdmin,
        isOwner: false,
        canCreate: userPermissions.canCreatePosts,
      };
    }

    const isOwner = isPostOwner(post);
    const isAdmin = userPermissions.isAdmin;

    return {
      canEdit: isOwner || isAdmin,
      canDelete: isOwner || isAdmin,
      canView: userPermissions.canViewPosts,
      isAdmin,
      isOwner,
      canCreate: userPermissions.canCreatePosts,
    };
  };

  return {
    userPermissions,
    checkPostPermissions,
    isPostOwner,
    canEditPost,
    canDeletePost,
  };
}

// 権限エラー情報の生成
export function createPermissionError(
  code: string,
  message: string,
  action?: string,
  isAdmin?: boolean,
  isOwner?: boolean
) {
  return {
    message,
    code,
    action,
    isAdmin: isAdmin || false,
    isOwner: isOwner || false,
  };
}

// よく使用される権限エラー
export const PERMISSION_ERRORS = {
  NOT_AUTHENTICATED: createPermissionError(
    'NOT_AUTHENTICATED',
    '認証が必要です'
  ),
  NOT_POST_OWNER: createPermissionError(
    'NOT_POST_OWNER',
    'この投稿を変更する権限がありません'
  ),
  NOT_ADMIN: createPermissionError('NOT_ADMIN', '管理者権限が必要です'),
  PERMISSION_DENIED: createPermissionError(
    'PERMISSION_DENIED',
    'アクセスが拒否されました'
  ),
} as const;

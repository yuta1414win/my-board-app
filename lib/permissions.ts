import { Session } from 'next-auth';
import { IPost } from '../models/Post';
import { IUser } from '../models/User';

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
}

// 投稿の権限チェック
export function checkPostPermissions(
  session: Session | null,
  post: IPost | null
): PermissionCheck {
  if (!session?.user) {
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
      canView: true, // 認証済みユーザーは投稿リストを見れる
      isAdmin: session.user.role === 'admin',
      isOwner: false,
      canCreate: true, // 認証済みユーザーは投稿作成可能
    };
  }

  const isOwner = String(post.author) === String(session.user.id);
  const isAdmin = session.user.role === 'admin';

  return {
    canEdit: isOwner || isAdmin,
    canDelete: isOwner || isAdmin,
    canView: true, // 認証済みユーザーは投稿を閲覧可能
    isAdmin,
    isOwner,
    canCreate: true,
  };
}

// ユーザーの全般的な権限チェック
export function checkUserPermissions(session: Session | null): UserPermissions {
  if (!session?.user) {
    return {
      canViewPosts: false,
      canCreatePosts: false,
      canManageUsers: false,
      canManageAllPosts: false,
      isAdmin: false,
    };
  }

  const isAdmin = session.user.role === 'admin';

  return {
    canViewPosts: true,
    canCreatePosts: true,
    canManageUsers: isAdmin,
    canManageAllPosts: isAdmin,
    isAdmin,
  };
}

// 権限エラーレスポンス生成
export function createPermissionError(
  action: string,
  resource: string = '投稿'
): { error: string; code: 'PERMISSION_DENIED' } {
  return {
    error: `この${resource}を${action}する権限がありません`,
    code: 'PERMISSION_DENIED',
  };
}

// セッションから安全にユーザーIDを取得
export function getUserIdFromSession(session: Session | null): string | null {
  if (!session?.user?.id) {
    return null;
  }
  return String(session.user.id);
}

// 管理者権限の確認
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === 'admin';
}

// 投稿者権限の確認
export function isPostOwner(
  session: Session | null,
  post: IPost | { author: string }
): boolean {
  if (!session?.user?.id) {
    return false;
  }
  return String(post.author) === String(session.user.id);
}

// 権限チェックのヘルパー関数
export function canEditPost(session: Session | null, post: IPost): boolean {
  return isPostOwner(session, post) || isAdmin(session);
}

export function canDeletePost(session: Session | null, post: IPost): boolean {
  return isPostOwner(session, post) || isAdmin(session);
}

// 権限エラーメッセージの定数
export const PERMISSION_MESSAGES = {
  NOT_AUTHENTICATED: '認証が必要です',
  NOT_AUTHORIZED: '権限がありません',
  NOT_POST_OWNER: 'この投稿を変更する権限がありません',
  NOT_ADMIN: '管理者権限が必要です',
  INVALID_SESSION: '無効なセッションです',
} as const;

// APIレスポンス用の権限エラー
export class PermissionError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number = 403, code: string = 'PERMISSION_DENIED') {
    super(message);
    this.name = 'PermissionError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// 権限チェック結果のタイプガード
export function hasPermission(
  permissions: PermissionCheck,
  action: 'edit' | 'delete' | 'view' | 'create'
): boolean {
  switch (action) {
    case 'edit':
      return permissions.canEdit;
    case 'delete':
      return permissions.canDelete;
    case 'view':
      return permissions.canView;
    case 'create':
      return permissions.canCreate;
    default:
      return false;
  }
}
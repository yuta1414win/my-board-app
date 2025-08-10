export interface PasswordStrength {
  score: number;
  message: string;
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const requirements = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  let score = 0;
  let metRequirements = 0;

  if (requirements.minLength) {
    score += 20;
    metRequirements++;
  }
  if (requirements.hasUpperCase) {
    score += 20;
    metRequirements++;
  }
  if (requirements.hasLowerCase) {
    score += 20;
    metRequirements++;
  }
  if (requirements.hasNumber) {
    score += 20;
    metRequirements++;
  }
  if (requirements.hasSpecialChar) {
    score += 20;
    metRequirements++;
  }

  let message = '';
  if (score < 40) {
    message = '弱い';
  } else if (score < 60) {
    message = 'やや弱い';
  } else if (score < 80) {
    message = '普通';
  } else if (score < 100) {
    message = '強い';
  } else {
    message = '非常に強い';
  }

  return {
    score,
    message,
    isValid: metRequirements >= 4,
    requirements,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateVerificationToken(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// プロフィール用のバリデーション
export interface ProfileValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    bio?: string;
    quickComment?: string;
  };
}

export function validateProfile(data: {
  name?: string;
  bio?: string;
  quickComment?: string;
}): ProfileValidationResult {
  const errors: ProfileValidationResult['errors'] = {};

  // 名前のバリデーション
  if (data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.name = '名前は必須です';
    } else if (data.name.length > 50) {
      errors.name = '名前は50文字以内で入力してください';
    }
  }

  // 自己紹介のバリデーション
  if (data.bio !== undefined && data.bio && data.bio.length > 200) {
    errors.bio = '自己紹介は200文字以内で入力してください';
  }

  // 一言コメントのバリデーション
  if (
    data.quickComment !== undefined &&
    data.quickComment &&
    data.quickComment.length > 50
  ) {
    errors.quickComment = '一言コメントは50文字以内で入力してください';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// パスワード変更用のバリデーション
export interface PasswordChangeValidationResult {
  isValid: boolean;
  errors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
}

export function validatePasswordChange(data: {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}): PasswordChangeValidationResult {
  const errors: PasswordChangeValidationResult['errors'] = {};

  // 現在のパスワード
  if (!data.currentPassword || data.currentPassword.trim().length === 0) {
    errors.currentPassword = '現在のパスワードは必須です';
  }

  // 新しいパスワード
  if (!data.newPassword || data.newPassword.trim().length === 0) {
    errors.newPassword = '新しいパスワードは必須です';
  } else {
    const strength = checkPasswordStrength(data.newPassword);
    if (!strength.isValid) {
      errors.newPassword =
        'パスワードは8文字以上で、大文字、小文字、数字、特殊文字のうち4つ以上を含む必要があります';
    }
  }

  // パスワード確認
  if (!data.confirmPassword || data.confirmPassword.trim().length === 0) {
    errors.confirmPassword = 'パスワード確認は必須です';
  } else if (data.newPassword && data.confirmPassword !== data.newPassword) {
    errors.confirmPassword = 'パスワードが一致しません';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
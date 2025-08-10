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

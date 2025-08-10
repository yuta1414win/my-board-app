import { 
  validateProfile, 
  validatePasswordChange, 
  checkPasswordStrength 
} from '../src/lib/validation';

describe('プロフィールバリデーションテスト', () => {
  describe('validateProfile', () => {
    test('有効なプロフィールデータ', () => {
      const data = {
        name: 'テストユーザー',
        bio: 'これは有効な自己紹介です。',
        quickComment: 'よろしくお願いします！'
      };
      
      const result = validateProfile(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('名前が空の場合のエラー', () => {
      const data = {
        name: '',
        bio: 'テスト',
        quickComment: 'テスト'
      };
      
      const result = validateProfile(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('名前は必須です');
    });

    test('名前が50文字を超える場合のエラー', () => {
      const data = {
        name: 'あ'.repeat(51),
        bio: 'テスト',
        quickComment: 'テスト'
      };
      
      const result = validateProfile(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('名前は50文字以内で入力してください');
    });

    test('自己紹介が200文字を超える場合のエラー', () => {
      const data = {
        name: 'テストユーザー',
        bio: 'あ'.repeat(201),
        quickComment: 'テスト'
      };
      
      const result = validateProfile(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.bio).toBe('自己紹介は200文字以内で入力してください');
    });

    test('一言コメントが50文字を超える場合のエラー', () => {
      const data = {
        name: 'テストユーザー',
        bio: 'テスト',
        quickComment: 'あ'.repeat(51)
      };
      
      const result = validateProfile(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.quickComment).toBe('一言コメントは50文字以内で入力してください');
    });
  });

  describe('validatePasswordChange', () => {
    test('有効なパスワード変更データ', () => {
      const data = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      };
      
      const result = validatePasswordChange(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('現在のパスワードが空の場合のエラー', () => {
      const data = {
        currentPassword: '',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!'
      };
      
      const result = validatePasswordChange(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.currentPassword).toBe('現在のパスワードは必須です');
    });

    test('新しいパスワードが弱い場合のエラー', () => {
      const data = {
        currentPassword: 'OldPass123!',
        newPassword: '123',
        confirmPassword: '123'
      };
      
      const result = validatePasswordChange(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.newPassword).toBe('パスワードは8文字以上で、大文字、小文字、数字、特殊文字のうち4つ以上を含む必要があります');
    });

    test('パスワード確認が一致しない場合のエラー', () => {
      const data = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass123!'
      };
      
      const result = validatePasswordChange(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('パスワードが一致しません');
    });
  });

  describe('checkPasswordStrength', () => {
    test('強いパスワードの強度チェック', () => {
      const result = checkPasswordStrength('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
      expect(result.message).toBe('非常に強い');
    });

    test('弱いパスワードの強度チェック', () => {
      const result = checkPasswordStrength('123');
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(40);
      expect(result.message).toBe('弱い');
    });

    test('中程度のパスワードの強度チェック', () => {
      const result = checkPasswordStrength('Password123');
      expect(result.isValid).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.hasUpperCase).toBe(true);
      expect(result.requirements.hasLowerCase).toBe(true);
      expect(result.requirements.hasNumber).toBe(true);
      expect(result.requirements.hasSpecialChar).toBe(false);
    });
  });
});
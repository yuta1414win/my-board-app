import {
  formatDate,
  countCharacters,
  isEmpty,
  validatePost,
} from '../../utils/dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    beforeAll(() => {
      // タイムゾーンを固定してテストの一貫性を保つ
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('有効な日付文字列を正しくフォーマットする', () => {
      const dateString = '2024-01-01T12:00:00.000Z';
      const result = formatDate(dateString);
      expect(result).toMatch(/2024\/1\/1 \d{2}:\d{2}/);
    });

    test('Dateオブジェクトを正しくフォーマットする', () => {
      const date = new Date('2024-01-01T12:00:00.000Z');
      const result = formatDate(date);
      expect(result).toMatch(/2024\/1\/1 \d{2}:\d{2}/);
    });

    test('無効な日付文字列の場合エラーメッセージを返す', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('無効な日付');
    });

    test('nullまたはundefinedの場合エラーメッセージを返す', () => {
      expect(formatDate(null)).toBe('無効な日付');
      expect(formatDate(undefined)).toBe('無効な日付');
      expect(formatDate('')).toBe('無効な日付');
    });
  });

  describe('countCharacters', () => {
    test('文字数を正しくカウントする', () => {
      expect(countCharacters('hello')).toBe(5);
      expect(countCharacters('')).toBe(0);
      expect(countCharacters('こんにちは')).toBe(5);
    });

    test('改行文字も含めてカウントする', () => {
      expect(countCharacters('hello\nworld')).toBe(11);
      expect(countCharacters('line1\nline2\nline3')).toBe(17);
    });

    test('非文字列の場合は0を返す', () => {
      expect(countCharacters(null)).toBe(0);
      expect(countCharacters(undefined)).toBe(0);
      expect(countCharacters(123)).toBe(0);
      expect(countCharacters({})).toBe(0);
    });
  });

  describe('isEmpty', () => {
    test('空文字列の場合trueを返す', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true); // 空白のみ
      expect(isEmpty('\t\n')).toBe(true); // タブと改行のみ
    });

    test('値がある場合falseを返す', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty('a')).toBe(false);
      expect(isEmpty(' a ')).toBe(false); // 空白に囲まれた文字
    });

    test('nullまたはundefinedの場合trueを返す', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    test('非文字列の場合trueを返す', () => {
      expect(isEmpty(123)).toBe(true);
      expect(isEmpty({})).toBe(true);
      expect(isEmpty([])).toBe(true);
    });
  });

  describe('validatePost', () => {
    test('有効な投稿データの場合、isValid: trueを返す', () => {
      const postData = {
        title: '有効なタイトル',
        content: '有効な本文です。',
      };
      const result = validatePost(postData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('タイトルが空の場合、エラーを返す', () => {
      const postData = {
        title: '',
        content: '有効な本文です。',
      };
      const result = validatePost(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('タイトルを入力してください');
    });

    test('タイトルが50文字を超える場合、エラーを返す', () => {
      const postData = {
        title: 'a'.repeat(51), // 51文字
        content: '有効な本文です。',
      };
      const result = validatePost(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('タイトルは50文字以内にしてください');
    });

    test('本文が空の場合、エラーを返す', () => {
      const postData = {
        title: '有効なタイトル',
        content: '',
      };
      const result = validatePost(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors.content).toBe('本文を入力してください');
    });

    test('本文が200文字を超える場合、エラーを返す', () => {
      const postData = {
        title: '有効なタイトル',
        content: 'a'.repeat(201), // 201文字
      };
      const result = validatePost(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors.content).toBe('本文は200文字以内にしてください');
    });

    test('複数のエラーがある場合、すべてのエラーを返す', () => {
      const postData = {
        title: '',
        content: '',
      };
      const result = validatePost(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe('タイトルを入力してください');
      expect(result.errors.content).toBe('本文を入力してください');
    });

    test('postDataがnullまたはundefinedの場合、エラーを返す', () => {
      const resultNull = validatePost(null);
      expect(resultNull.isValid).toBe(false);
      expect(resultNull.errors.general).toBe('投稿データが必要です');

      const resultUndefined = validatePost(undefined);
      expect(resultUndefined.isValid).toBe(false);
      expect(resultUndefined.errors.general).toBe('投稿データが必要です');
    });

    test('境界値（50文字、200文字）は有効とする', () => {
      const postData = {
        title: 'a'.repeat(50), // 50文字（境界値）
        content: 'b'.repeat(200), // 200文字（境界値）
      };
      const result = validatePost(postData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });
});

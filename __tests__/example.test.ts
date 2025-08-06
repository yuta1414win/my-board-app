/**
 * 基本的なテストファイル
 * このファイルはテスト環境が正しく設定されていることを確認します
 */

describe('Basic Test Suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings correctly', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('World');
    expect(greeting).toHaveLength(13);
  });

  it('should handle arrays correctly', () => {
    const array = [1, 2, 3, 4, 5];
    expect(array).toHaveLength(5);
    expect(array).toContain(3);
  });

  it('should handle objects correctly', () => {
    const user = {
      name: 'Test User',
      email: 'test@example.com',
      isActive: true,
    };

    expect(user).toHaveProperty('name');
    expect(user.isActive).toBe(true);
  });
});

describe('Async Test Suite', () => {
  it('should handle promises', async () => {
    const asyncFunction = () => Promise.resolve('success');
    const result = await asyncFunction();
    expect(result).toBe('success');
  });

  it('should handle async/await', async () => {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const start = Date.now();
    await delay(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(100);
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BoardPage from '../../src/app/board/page';

// fetchのモック
global.fetch = jest.fn();

describe('BoardPage', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初期表示', () => {
    test('ローディング状態を表示する', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      render(<BoardPage />);
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test('投稿が0件の場合、メッセージを表示する', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      render(<BoardPage />);

      await waitFor(() => {
        expect(screen.getByText('まだ投稿がありません')).toBeInTheDocument();
      });
    });

    test('データ取得エラーの場合、エラーメッセージを表示する', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<BoardPage />);

      await waitFor(() => {
        expect(
          screen.getByText('投稿の取得に失敗しました')
        ).toBeInTheDocument();
      });
    });
  });

  describe('新規投稿', () => {
    beforeEach(async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });
      render(<BoardPage />);
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test('有効な投稿を作成できる', async () => {
      const user = userEvent.setup();
      
      // 新規投稿作成のレスポンスをモック
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            _id: '3',
            title: '新しい投稿',
            content: '新しい内容',
            createdAt: '2024-01-01T13:00:00.000Z',
            updatedAt: '2024-01-01T13:00:00.000Z',
          },
        }),
      });
      
      // 投稿一覧再取得のレスポンスをモック
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      const titleInput = screen.getByLabelText('タイトル');
      const contentInput = screen.getByLabelText('本文');
      const submitButton = screen.getByRole('button', { name: '投稿する' });

      await user.type(titleInput, '新しい投稿');
      await user.type(contentInput, '新しい内容');
      
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '新しい投稿',
            content: '新しい内容',
          }),
        });
      });

      // フォームがクリアされることを確認
      expect(titleInput.value).toBe('');
      expect(contentInput.value).toBe('');
    });

    test('文字数カウンターが正しく動作する', async () => {
      const user = userEvent.setup();
      const titleInput = screen.getByLabelText('タイトル');

      await user.type(titleInput, 'テスト');
      
      expect(screen.getByText('3/50文字')).toBeInTheDocument();
    });

    test('文字数制限を超えた場合、エラー表示とボタン無効化', async () => {
      const user = userEvent.setup();
      const titleInput = screen.getByLabelText('タイトル');
      const submitButton = screen.getByRole('button', { name: '投稿する' });

      // 51文字入力
      await user.type(titleInput, 'a'.repeat(51));
      
      expect(screen.getByText('51/50文字')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    test('空入力の場合、ボタンが無効化される', () => {
      const submitButton = screen.getByRole('button', { name: '投稿する' });
      expect(submitButton).toBeDisabled();
    });

    test('投稿失敗時にエラーメッセージを表示する', async () => {
      const user = userEvent.setup();
      
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'タイトルを入力してください',
        }),
      });

      const titleInput = screen.getByLabelText('タイトル');
      const contentInput = screen.getByLabelText('本文');
      const submitButton = screen.getByRole('button', { name: '投稿する' });

      await user.type(titleInput, '有効なタイトル');
      await user.type(contentInput, '有効な内容');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('タイトルを入力してください')).toBeInTheDocument();
      });
    });
  });
});
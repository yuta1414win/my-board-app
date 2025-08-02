import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BoardPage from '../../src/app/board/page';

// Material-UIテーマプロバイダーのモック
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: () => ({
    palette: {
      primary: { main: '#1976d2' },
      error: { main: '#d32f2f' },
    },
  }),
}));

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

    test('投稿一覧を正常に表示する', async () => {
      const mockPosts = [
        {
          _id: '1',
          title: 'テスト投稿1',
          content: 'テスト内容1',
          createdAt: '2024-01-01T12:00:00.000Z',
          updatedAt: '2024-01-01T12:00:00.000Z',
        },
        {
          _id: '2',
          title: 'テスト投稿2',
          content: 'テスト内容2\n改行あり',
          createdAt: '2024-01-01T11:00:00.000Z',
          updatedAt: '2024-01-01T11:30:00.000Z',
        },
      ];

      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockPosts }),
      });

      render(<BoardPage />);

      await waitFor(() => {
        expect(screen.getByText('テスト投稿1')).toBeInTheDocument();
        expect(screen.getByText('テスト投稿2')).toBeInTheDocument();
        expect(screen.getByText('テスト内容1')).toBeInTheDocument();
        expect(screen.getByText('テスト内容2\n改行あり')).toBeInTheDocument();
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
        expect(screen.getByText('投稿の取得に失敗しました')).toBeInTheDocument();
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

  describe('投稿編集', () => {
    const mockPosts = [
      {
        _id: '1',
        title: '編集対象投稿',
        content: '編集対象内容',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      },
    ];

    beforeEach(async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockPosts }),
      });
      render(<BoardPage />);
      await waitFor(() => {
        expect(screen.getByText('編集対象投稿')).toBeInTheDocument();
      });
    });

    test('編集ダイアログを開くことができる', async () => {
      const user = userEvent.setup();
      const editButton = screen.getByRole('button', { name: '' }); // EditIconボタン

      await user.click(editButton);

      expect(screen.getByText('投稿を編集')).toBeInTheDocument();
      expect(screen.getByDisplayValue('編集対象投稿')).toBeInTheDocument();
      expect(screen.getByDisplayValue('編集対象内容')).toBeInTheDocument();
    });

    test('投稿を正常に編集できる', async () => {
      const user = userEvent.setup();
      
      // 編集ダイアログを開く
      const editButton = screen.getByRole('button', { name: '' });
      await user.click(editButton);

      // 編集レスポンスをモック
      fetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            _id: '1',
            title: '編集されたタイトル',
            content: '編集された内容',
            createdAt: '2024-01-01T12:00:00.000Z',
            updatedAt: '2024-01-01T13:00:00.000Z',
          },
        }),
      });
      
      // 投稿一覧再取得のレスポンスをモック
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      const titleInput = screen.getByDisplayValue('編集対象投稿');
      const contentInput = screen.getByDisplayValue('編集対象内容');
      const saveButton = screen.getByRole('button', { name: '保存' });

      await user.clear(titleInput);
      await user.type(titleInput, '編集されたタイトル');
      await user.clear(contentInput);
      await user.type(contentInput, '編集された内容');
      
      await user.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/posts/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '編集されたタイトル',
            content: '編集された内容',
          }),
        });
      });

      // ダイアログが閉じることを確認
      expect(screen.queryByText('投稿を編集')).not.toBeInTheDocument();
    });

    test('編集をキャンセルできる', async () => {
      const user = userEvent.setup();
      
      const editButton = screen.getByRole('button', { name: '' });
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      await user.click(cancelButton);

      expect(screen.queryByText('投稿を編集')).not.toBeInTheDocument();
    });
  });

  describe('投稿削除', () => {
    const mockPosts = [
      {
        _id: '1',
        title: '削除対象投稿',
        content: '削除対象内容',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
      },
    ];

    beforeEach(async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockPosts }),
      });
      render(<BoardPage />);
      await waitFor(() => {
        expect(screen.getByText('削除対象投稿')).toBeInTheDocument();
      });
    });

    test('削除確認ダイアログを表示し、削除を実行できる', async () => {
      const user = userEvent.setup();
      
      // window.confirmをモック
      window.confirm = jest.fn(() => true);
      
      // 削除レスポンスをモック
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: {} }),
      });
      
      // 投稿一覧再取得のレスポンスをモック
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('[data-testid="DeleteIcon"]')
      );

      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('本当に削除しますか？');
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/posts/1', {
          method: 'DELETE',
        });
      });
    });

    test('削除をキャンセルできる', async () => {
      const user = userEvent.setup();
      
      // window.confirmをモック（falseを返す）
      window.confirm = jest.fn(() => false);

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('[data-testid="DeleteIcon"]')
      );

      await user.click(deleteButton);

      expect(window.confirm).toHaveBeenCalledWith('本当に削除しますか？');
      
      // DELETEリクエストが送信されていないことを確認
      expect(fetch).not.toHaveBeenCalledWith('/api/posts/1', {
        method: 'DELETE',
      });
    });
  });
});
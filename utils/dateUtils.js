/**
 * 日付を日本語フォーマットで表示する
 * @param {string|Date} dateString - 日付文字列またはDateオブジェクト
 * @returns {string} フォーマットされた日付文字列
 */
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  
  // 無効な日付の場合
  if (isNaN(date.getTime())) {
    return '無効な日付';
  }
  
  const dateStr = date.toLocaleDateString('ja-JP');
  const timeStr = date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `${dateStr} ${timeStr}`;
};

/**
 * 文字数をカウントする（改行文字も含む）
 * @param {string} text - カウント対象のテキスト
 * @returns {number} 文字数
 */
export const countCharacters = (text) => {
  if (typeof text !== 'string') {
    return 0;
  }
  return text.length;
};

/**
 * テキストが空文字列または空白のみかチェックする
 * @param {string} text - チェック対象のテキスト
 * @returns {boolean} 空またはNull/undefinedの場合true
 */
export const isEmpty = (text) => {
  return !text || typeof text !== 'string' || text.trim().length === 0;
};

/**
 * 投稿データのバリデーション
 * @param {Object} postData - 投稿データ
 * @param {string} postData.title - タイトル
 * @param {string} postData.content - 本文
 * @returns {Object} バリデーション結果
 */
export const validatePost = (postData) => {
  const errors = {};
  
  if (!postData) {
    return { isValid: false, errors: { general: '投稿データが必要です' } };
  }
  
  // タイトルのバリデーション
  if (isEmpty(postData.title)) {
    errors.title = 'タイトルを入力してください';
  } else if (countCharacters(postData.title) > 50) {
    errors.title = 'タイトルは50文字以内にしてください';
  }
  
  // 本文のバリデーション
  if (isEmpty(postData.content)) {
    errors.content = '本文を入力してください';
  } else if (countCharacters(postData.content) > 200) {
    errors.content = '本文は200文字以内にしてください';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
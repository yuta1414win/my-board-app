import { z } from 'zod';
import CryptoJS from 'crypto-js';

// HTMLエンティティエスケープマッピング
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// 危険なHTMLタグとスクリプトパターン
const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>[\s\S]*?<\/embed>/gi,
  /<applet[\s\S]*?>[\s\S]*?<\/applet>/gi,
  /<meta[\s\S]*?>/gi,
  /<link[\s\S]*?>/gi,
  /<style[\s\S]*?>[\s\S]*?<\/style>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi, // onclick, onload, etc.
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /@import/gi,
];

// 許可されたHTMLタグ（限定的なリッチテキスト用）
const ALLOWED_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
];

// 入力検証のタイプ
export enum SanitizationType {
  STRICT = 'strict', // 完全エスケープ
  BASIC_HTML = 'basic_html', // 基本的なHTMLタグのみ許可
  PLAIN_TEXT = 'plain_text', // プレーンテキストのみ
  EMAIL = 'email', // メールアドレス
  URL = 'url', // URL
  FILENAME = 'filename', // ファイル名
  USERNAME = 'username', // ユーザー名
  POST_CONTENT = 'post_content', // 投稿内容
}

// サニタイゼーション設定
interface SanitizeConfig {
  type: SanitizationType;
  maxLength?: number;
  allowedTags?: string[];
  removeScripts?: boolean;
  encodeHTML?: boolean;
}

// エラータイプ
export class SanitizationError extends Error {
  constructor(
    message: string,
    public field: string,
    public originalValue: string
  ) {
    super(message);
    this.name = 'SanitizationError';
  }
}

// メインのサニタイゼーションクラス
export class InputSanitizer {
  // HTMLエンティティエスケープ
  static escapeHTML(input: string): string {
    return input.replace(/[&<>"'`=\/]/g, (match) => HTML_ENTITIES[match]);
  }

  // HTMLエンティティデコード
  static unescapeHTML(input: string): string {
    const reverseEntities = Object.fromEntries(
      Object.entries(HTML_ENTITIES).map(([key, value]) => [value, key])
    );

    let result = input;
    Object.entries(reverseEntities).forEach(([entity, char]) => {
      result = result.replace(new RegExp(entity, 'g'), char);
    });

    return result;
  }

  // 危険なパターンの除去
  static removeDangerousPatterns(input: string): string {
    let sanitized = input;

    DANGEROUS_PATTERNS.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  // 基本的なHTMLタグのみ許可
  static sanitizeBasicHTML(input: string): string {
    // 危険なパターンを除去
    let sanitized = this.removeDangerousPatterns(input);

    // 許可されていないタグを除去
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    sanitized = sanitized.replace(tagPattern, (match, tagName) => {
      if (ALLOWED_HTML_TAGS.includes(tagName.toLowerCase())) {
        // 許可されたタグの場合、属性を除去
        return `<${tagName}>`;
      }
      return ''; // 許可されていないタグは除去
    });

    return sanitized.trim();
  }

  // プレーンテキスト化
  static toPlainText(input: string): string {
    return input
      .replace(/<[^>]*>/g, '') // HTMLタグ除去
      .replace(/&[a-zA-Z0-9#]+;/g, ' ') // HTMLエンティティ除去
      .replace(/\s+/g, ' ') // 連続する空白を1つに
      .trim();
  }

  // ファイル名のサニタイゼーション
  static sanitizeFilename(input: string): string {
    return input
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // 危険な文字除去
      .replace(/^\.+/, '') // 先頭のドット除去
      .replace(/\.+$/, '') // 末尾のドット除去
      .replace(/\s+/g, '_') // 空白をアンダースコアに
      .substring(0, 255); // 長さ制限
  }

  // ユーザー名のサニタイゼーション
  static sanitizeUsername(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9_-]/g, '') // 英数字、アンダースコア、ハイフンのみ
      .toLowerCase()
      .substring(0, 50); // 長さ制限
  }

  // 汎用サニタイゼーション
  static sanitize(input: string, config: SanitizeConfig): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let result = input;

    // 長さ制限
    if (config.maxLength && result.length > config.maxLength) {
      throw new SanitizationError(
        `Input too long: ${result.length} > ${config.maxLength}`,
        'length',
        input
      );
    }

    // タイプ別の処理
    switch (config.type) {
      case SanitizationType.STRICT:
        result = this.escapeHTML(result);
        break;

      case SanitizationType.BASIC_HTML:
        result = this.sanitizeBasicHTML(result);
        break;

      case SanitizationType.PLAIN_TEXT:
        result = this.toPlainText(result);
        break;

      case SanitizationType.EMAIL:
        // メールアドレスの形式チェック
        const emailSchema = z.string().email();
        try {
          result = emailSchema.parse(result.toLowerCase().trim());
        } catch {
          throw new SanitizationError('Invalid email format', 'email', input);
        }
        break;

      case SanitizationType.URL:
        // URLの形式チェック
        const urlSchema = z.string().url();
        try {
          result = urlSchema.parse(result.trim());
          // プロトコル制限
          if (!result.startsWith('http://') && !result.startsWith('https://')) {
            throw new Error('Invalid protocol');
          }
        } catch {
          throw new SanitizationError('Invalid URL format', 'url', input);
        }
        break;

      case SanitizationType.FILENAME:
        result = this.sanitizeFilename(result);
        break;

      case SanitizationType.USERNAME:
        result = this.sanitizeUsername(result);
        break;

      case SanitizationType.POST_CONTENT:
        // 投稿内容：基本的なHTMLは許可、危険なスクリプトは除去
        result = this.removeDangerousPatterns(result);
        if (config.encodeHTML !== false) {
          result = this.escapeHTML(result);
        }
        break;

      default:
        result = this.escapeHTML(result);
    }

    // 最終的なスクリプト除去チェック
    if (config.removeScripts !== false) {
      result = this.removeDangerousPatterns(result);
    }

    return result;
  }

  // バッチサニタイゼーション
  static sanitizeBatch(
    inputs: Record<string, string>,
    configs: Record<string, SanitizeConfig>
  ): Record<string, string> {
    const results: Record<string, string> = {};
    const errors: SanitizationError[] = [];

    Object.entries(inputs).forEach(([field, value]) => {
      try {
        const config = configs[field] || { type: SanitizationType.STRICT };
        results[field] = this.sanitize(value, config);
      } catch (error) {
        if (error instanceof SanitizationError) {
          error.field = field;
          errors.push(error);
        } else {
          errors.push(
            new SanitizationError(
              error instanceof Error ? error.message : 'Unknown error',
              field,
              value
            )
          );
        }
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Sanitization failed: ${errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
      );
    }

    return results;
  }

  // CSRFトークン生成
  static generateCSRFToken(): string {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  }

  // CSRFトークン検証
  static verifyCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken || token.length !== expectedToken.length) {
      return false;
    }

    // タイミング攻撃を防ぐため、固定時間での比較
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }

    return result === 0;
  }
}

// 事前定義された設定
export const SANITIZE_CONFIGS = {
  username: {
    type: SanitizationType.USERNAME,
    maxLength: 50,
  },
  email: {
    type: SanitizationType.EMAIL,
    maxLength: 254,
  },
  password: {
    type: SanitizationType.STRICT,
    maxLength: 128,
  },
  postTitle: {
    type: SanitizationType.PLAIN_TEXT,
    maxLength: 200,
  },
  postContent: {
    type: SanitizationType.POST_CONTENT,
    maxLength: 10000,
    encodeHTML: true,
  },
  fileName: {
    type: SanitizationType.FILENAME,
    maxLength: 255,
  },
  url: {
    type: SanitizationType.URL,
    maxLength: 2048,
  },
} as const;

// Express/Next.js用のミドルウェアヘルパー
export function createSanitizationMiddleware(
  configs: Record<string, SanitizeConfig>
) {
  return (data: Record<string, any>) => {
    const sanitizedData = { ...data };

    Object.entries(configs).forEach(([field, config]) => {
      if (sanitizedData[field] && typeof sanitizedData[field] === 'string') {
        sanitizedData[field] = InputSanitizer.sanitize(
          sanitizedData[field],
          config
        );
      }
    });

    return sanitizedData;
  };
}

export default InputSanitizer;

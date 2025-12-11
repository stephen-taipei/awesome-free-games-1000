/**
 * i18n 國際化模組
 * 支援多國語言切換
 */

export type Locale = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'pt' | 'ru' | 'it' | 'th' | 'vi' | 'id' | 'ar' | 'hi';

export interface Translations {
  [key: string]: string | Translations;
}

class I18n {
  private locale: Locale = 'zh-TW';
  private translations: Map<Locale, Translations> = new Map();
  private listeners: Set<(locale: Locale) => void> = new Set();

  constructor() {
    // 從 localStorage 或瀏覽器語言讀取預設語言
    const savedLocale = localStorage.getItem('gameLocale') as Locale;
    const browserLang = navigator.language;

    if (savedLocale && this.isValidLocale(savedLocale)) {
      this.locale = savedLocale;
    } else if (browserLang.startsWith('zh-TW') || browserLang.startsWith('zh-Hant')) {
      this.locale = 'zh-TW';
    } else if (browserLang.startsWith('zh')) {
      this.locale = 'zh-CN';
    } else if (browserLang.startsWith('ja')) {
      this.locale = 'ja';
    } else if (browserLang.startsWith('ko')) {
      this.locale = 'ko';
    } else {
      this.locale = 'en';
    }
  }

  private isValidLocale(locale: string): locale is Locale {
    const validLocales: Locale[] = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'it', 'th', 'vi', 'id', 'ar', 'hi'];
    return validLocales.includes(locale as Locale);
  }

  /**
   * 載入語言檔案
   */
  async loadTranslations(locale: Locale, translations: Translations): Promise<void> {
    this.translations.set(locale, translations);
  }

  /**
   * 設定當前語言
   */
  setLocale(locale: Locale): void {
    if (this.isValidLocale(locale)) {
      this.locale = locale;
      localStorage.setItem('gameLocale', locale);
      this.listeners.forEach(listener => listener(locale));
    }
  }

  /**
   * 取得當前語言
   */
  getLocale(): Locale {
    return this.locale;
  }

  /**
   * 取得翻譯文字
   * @param key 翻譯鍵，支援巢狀 key，如 'game.title'
   * @param params 替換參數，如 { score: 100 }
   */
  t(key: string, params?: Record<string, string | number>): string {
    const translations = this.translations.get(this.locale);
    if (!translations) {
      return key;
    }

    // 優先嘗試直接匹配 (支援 flat keys)
    let value: string | Translations | undefined = translations[key];

    // 如果直接匹配失敗，嘗試巢狀匹配 (支援 nested keys)
    if (typeof value !== 'string') {
      const keys = key.split('.');
      value = translations;

      for (const k of keys) {
        if (typeof value === 'object' && value !== null) {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // 替換參數 {{param}}
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{{${paramKey}}}`;
      });
    }

    return value;
  }

  /**
   * 監聽語言變更
   */
  onLocaleChange(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const i18n = new I18n();
export default i18n;

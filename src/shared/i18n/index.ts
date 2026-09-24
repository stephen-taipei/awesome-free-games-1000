/** Shared translations: resilient storage, literal/nested keys and locale fallback. */
export type Locale = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'pt' | 'ru' | 'it' | 'th' | 'vi' | 'id' | 'ar' | 'hi';
export type TranslationValue = string | readonly string[] | Translations;
export interface Translations { [key: string]: TranslationValue; }
export const LOCALES: readonly Locale[] = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'pt', 'ru', 'it', 'th', 'vi', 'id', 'ar', 'hi'];
export function detectLocale(language: string): Locale {
  const tag = language.toLowerCase();
  if (/^zh(?:-|$)/.test(tag)) return /(?:hant|tw|hk|mo)/.test(tag) ? 'zh-TW' : 'zh-CN';
  return LOCALES.find(locale => locale.toLowerCase() === tag.split('-')[0]) || 'en';
}
export class I18n {
  private locale: Locale;
  private translations = new Map<Locale, Translations>();
  private listeners = new Set<(locale: Locale) => void>();
  constructor() {
    this.locale = detectLocale(typeof navigator === 'undefined' ? 'en' : navigator.language);
    try {
      const saved = localStorage.getItem('gameLocale');
      if (LOCALES.includes(saved as Locale)) this.locale = saved as Locale;
    } catch { /* Storage may be unavailable in privacy mode or sandboxed embeds. */ }
    this.syncDocument();
  }
  async loadTranslations(locale: Locale, translations: Translations): Promise<void> {
    if (!LOCALES.includes(locale)) return;
    this.translations.set(locale, translations);
    this.syncDocument();
  }
  getLocale(): Locale {
    if (!this.translations.size || this.translations.has(this.locale)) return this.locale;
    if (this.translations.has('en')) return 'en';
    if (this.translations.has('zh-TW')) return 'zh-TW';
    return this.translations.keys().next().value as Locale;
  }
  private syncDocument(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = this.getLocale();
    document.documentElement.dir = this.getLocale() === 'ar' ? 'rtl' : 'ltr';
  }
  setLocale(locale: Locale): void {
    if (!LOCALES.includes(locale)) return;
    this.locale = locale;
    try { localStorage.setItem('gameLocale', locale); } catch { /* Session-only preference. */ }
    this.syncDocument();
    this.listeners.forEach(listener => listener(this.getLocale()));
  }
  private lookup(translations: Translations | undefined, key: string): string | undefined {
    if (!translations) return;
    if (Object.prototype.hasOwnProperty.call(translations, key) && typeof translations[key] === 'string') return translations[key] as string;
    let value: TranslationValue | undefined = translations;
    for (const part of key.split('.')) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.prototype.hasOwnProperty.call(value, part)) return;
      value = (value as Translations)[part];
    }
    return typeof value === 'string' ? value : undefined;
  }
  t(key: string, params?: Record<string, string | number>): string {
    const locales = [...new Set([this.locale, 'en', 'zh-TW', this.getLocale()])];
    let value: string | undefined;
    for (const locale of locales) {
      value = this.lookup(this.translations.get(locale as Locale), key);
      if (value !== undefined) break;
    }
    if (value === undefined) return key;
    return value.replace(/\{\{(\w+)\}\}/g, (match, name) => params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match);
  }
  onLocaleChange(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}
export const i18n = new I18n();
export default i18n;

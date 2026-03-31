import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';
import ja from './locales/ja.json';

export type Locale = 'en' | 'zh-TW' | 'ja';

type Translations = Record<string, string>;

const locales: Record<Locale, Translations> = {
  'en': en,
  'zh-TW': zhTW,
  'ja': ja,
};

const STORAGE_KEY = 'osop-editor-lang';

function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && locales[stored]) return stored;

  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) return 'zh-TW';
  if (browserLang.startsWith('ja')) return 'ja';
  return 'en';
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = locales[locale]?.[key] || locales['en']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}

export const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh-TW', label: '繁中' },
  { value: 'ja', label: 'JA' },
];

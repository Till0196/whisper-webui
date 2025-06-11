import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../constants/translations';

// 型定義
export type Language = 'ja' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
}

// コンテキストの作成
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// カスタムフック
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// 言語の初期化
const getInitialLanguage = (): Language => {
  // ローカルストレージから保存された言語設定を取得
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage === 'ja' || savedLanguage === 'en') {
    return savedLanguage;
  }

  // ブラウザの言語設定を取得
  const browserLanguage = navigator.language.toLowerCase();
  return browserLanguage.startsWith('ja') ? 'ja' : 'en';
};

// プロバイダーコンポーネント
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 言語設定の初期化
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  // 言語設定の変更をローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // 翻訳関数
  const t = (key: string, options?: { [key: string]: string | number }): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value === undefined) return key;
      value = value[k];
    }
    
    if (typeof value !== 'string') return key;
    
    if (options) {
      return Object.entries(options).reduce((str, [key, val]) => {
        return str.replace(new RegExp(`%{${key}}`, 'g'), String(val));
      }, value);
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}; 
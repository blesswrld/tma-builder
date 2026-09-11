import React, { createContext, useContext, useEffect } from "react";
import { SupportedLanguage, SUPPORTED_LANGUAGES, LanguageInfo, translations } from "../i18n/translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string) => string;
  languages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ru",
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => translations.ru[key] || defaultText || key,
  languages: SUPPORTED_LANGUAGES,
  currentLanguageInfo: SUPPORTED_LANGUAGES[0],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("lang", "ru");
      localStorage.removeItem("app_language");
    }
  }, []);

  const t = (key: string, defaultText?: string): string => {
    if (!key) return "";
    if (translations.ru && translations.ru[key]) {
      return translations.ru[key];
    }
    return defaultText !== undefined ? defaultText : key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language: "ru",
        setLanguage: () => {},
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageInfo: SUPPORTED_LANGUAGES[0],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

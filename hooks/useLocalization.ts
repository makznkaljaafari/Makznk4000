


import { useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { arTranslations } from './locales/ar';
import { enTranslations } from './locales/en';

// FIX: Changed the type to Record<string, any> to avoid type errors with complex translation objects.
const translations: Record<string, Record<string, any>> = {
  ar: arTranslations,
  en: enTranslations,
};

export const useLocalization = () => {
  const { language, toggleLanguage } = useAppContext();

  const t = useCallback(
    (key: string, replacements?: { [key: string]: string | number }) => {
      let translation = translations[language]?.[key] || key;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          translation = translation.replace(`{${k}}`, String(v));
        });
      }
      return translation;
    },
    [language]
  );
  
  const lang = language;

  return { t, lang, toggleLanguage };
};
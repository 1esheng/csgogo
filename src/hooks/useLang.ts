import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { setLang, translate, pick, type Lang } from '@/i18n';

/** 订阅设置里的语言，保证 t() 与当前语言同步。 */
export function useLang(): Lang {
  const lang = useGameStore((s) => s.settings.language ?? 'zh');
  useEffect(() => { setLang(lang); }, [lang]);
  setLang(lang);
  return lang;
}

export function useT() {
  const lang = useLang();
  return {
    lang,
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    pick: (zh: string, en: string) => (lang === 'en' ? en : zh),
  };
}

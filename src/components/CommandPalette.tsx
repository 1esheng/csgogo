import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { NAV_ITEMS } from '@/app/nav';
import { useT } from '@/hooks/useLang';

/** Ctrl/Cmd+K 命令面板：跳转页面，回车直达。 */
export function CommandPalette() {
  const { t, tr } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setActive(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_ITEMS.filter((item) => {
      if (!q) return true;
      const label = t(item.labelKey).toLowerCase();
      return label.includes(q) || item.path.toLowerCase().includes(q);
    });
  }, [query, t]);

  if (!open) return null;

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <div
      className='fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[12vh]'
      onClick={() => setOpen(false)}
    >
      <div
        className='w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center gap-2 border-b border-white/[0.07] px-3 py-2.5'>
          <Search size={16} className='shrink-0 text-txt-muted' />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(items.length - 1, i + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              }
              if (e.key === 'Enter' && items[active]) go(items[active].path);
            }}
            placeholder={tr('搜索页面')}
            className='w-full bg-transparent text-[14px] text-txt outline-none placeholder:text-txt-muted/70'
            aria-label={tr('搜索页面')}
          />
          <kbd className='rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-txt-muted'>esc</kbd>
        </div>
        <ul className='max-h-72 overflow-y-auto py-1'>
          {items.length === 0 ? (
            <li className='px-3 py-2 text-[13px] text-txt-muted'>{tr('没有匹配的页面')}</li>
          ) : (
            items.map((item, i) => (
              <li key={item.path}>
                <button
                  type='button'
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.path)}
                  className={
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] ' +
                    (i === active ? 'bg-white/[0.07] text-txt' : 'text-txt-muted hover:bg-white/[0.04]')
                  }
                >
                  <item.icon size={16} className='shrink-0 opacity-80' />
                  <span className='truncate'>{t(item.labelKey)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

import React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useT } from '@/hooks/useLang';

export function Panel({
  children, className, padded = true,
}: { children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={clsx('surface', padded && 'p-5', className)}>{children}</div>
  );
}

export function SectionTitle({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className='mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2'>
      <div className='min-w-0'>
        <h2 className='type-title-sm font-display font-semibold tracking-tight text-txt'>{title}</h2>
        {subtitle ? <p className='type-note mt-1 text-txt-muted'>{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle';

export function Button({
  children, onClick, variant = 'primary', size = 'md', disabled, className, title, type = 'button',
  ...rest
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
  [key: string]: unknown;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-ink-900 hover:bg-accent/90 font-semibold',
    ghost: 'bg-white/5 text-txt hover:bg-white/10',
    outline: 'border border-white/15 text-txt hover:border-accent/60 hover:text-accent',
    danger: 'bg-danger/90 text-white hover:bg-danger',
    subtle: 'text-txt-muted hover:text-txt',
  };
  // Every size clears the 32px touch floor; md and lg clear 36px.
  const sizes = {
    sm: 'min-h-8 px-3 py-1.5 type-note',
    md: 'min-h-9 px-4 py-2 type-body',
    lg: 'min-h-10 px-5 py-2.5 text-base',
  };
  return (
    <button
      {...rest}
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={clsx(
        'focus-ring t-press inline-flex items-center justify-center gap-2 rounded-xl leading-tight active:scale-[0.985]',
        variants[variant], sizes[size],
        disabled && 'cursor-not-allowed opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children, tone = 'neutral', className,
}: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'danger' | 'success' | 'muted'; className?: string }) {
  const tones = {
    neutral: 'bg-white/8 text-txt border-white/10',
    accent: 'bg-accent/15 text-accent border-accent/30',
    danger: 'bg-danger/15 text-danger border-danger/30',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    muted: 'bg-white/5 text-txt-muted border-white/10',
  };
  return (
    <span className={clsx('type-data inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-semibold tracking-normal', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Progress({
  value, max = 100, tone = 'accent', height = 'h-2', label,
}: { value: number; max?: number; tone?: 'accent' | 'danger' | 'success' | 'blue'; height?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const tones = {
    accent: 'bg-accent',
    danger: 'bg-danger',
    success: 'bg-emerald-500',
    blue: 'bg-sky-500',
  };
  return (
    <div className='w-full'>
      {label ? (
        <div className='type-data mb-1 flex items-baseline justify-between gap-2 text-txt-muted'>
          <span className='truncate'>{label}</span>
          <span className='shrink-0 tabular-nums'>{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div className={clsx('w-full overflow-hidden rounded-full bg-white/8', height)}>
        <div className={clsx('t-width h-full rounded-full', tones[tone])} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

export function StatTile({
  label, value, hint, icon, tone = 'default',
}: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode; tone?: 'default' | 'accent' | 'danger' }) {
  return (
    <div className='surface-raised flex items-center justify-between gap-3 p-4'>
      <div className='min-w-0'>
        <div className='label-xs truncate'>{label}</div>
        <div className={clsx('stat-number mt-1', tone === 'accent' && 'text-accent', tone === 'danger' && 'text-danger')}>{value}</div>
        {hint ? <div className='type-note mt-1 text-txt-muted'>{hint}</div> : null}
      </div>
      {icon ? <div className='shrink-0 text-txt-muted'>{icon}</div> : null}
    </div>
  );
}

export function Tabs({
  tabs, active, onChange, label,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = tabs.findIndex((tab) => tab.id === active);

  const select = (index: number) => {
    const nextIndex = (index + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (!next) return;
    onChange(next.id);
    refs.current[nextIndex]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      select((activeIndex < 0 ? 0 : activeIndex) + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select((activeIndex < 0 ? 0 : activeIndex) - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      select(tabs.length - 1);
    }
  };

  return (
    <div
      role='tablist'
      aria-label={label}
      aria-orientation='horizontal'
      onKeyDown={onKeyDown}
      className='flex flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-ink-900/60 p-1'
    >
      {tabs.map((tab, index) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type='button'
            role='tab'
            aria-selected={selected}
            tabIndex={selected || (activeIndex < 0 && index === 0) ? 0 : -1}
            ref={(node) => { refs.current[index] = node; }}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'focus-ring t-colors type-body min-h-8 rounded-lg px-3 py-1.5 font-semibold leading-tight',
              selected ? 'bg-accent text-ink-900' : 'text-txt-muted hover:text-txt',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Only the top-most open dialog answers Escape and traps Tab, so a nested dialog stays sane. */
const modalStack: symbol[] = [];

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');
}

function ModalPanel({
  onClose, title, wide, children,
}: { onClose: () => void; title?: string; wide?: boolean; children: React.ReactNode }) {
  const { tr } = useT();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  const titleId = React.useId();

  closeRef.current = onClose;

  React.useEffect(() => {
    const token = Symbol('modal');
    modalStack.push(token);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;
      const panel = panelRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = focusableIn(panel);
      const activeEl = document.activeElement;
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = activeEl instanceof HTMLElement && panel.contains(activeEl);
      if (event.shiftKey) {
        if (!inside || activeEl === panel || activeEl === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const index = modalStack.indexOf(token);
      if (index >= 0) modalStack.splice(index, 1);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  return (
    <div
      ref={panelRef}
      role='dialog'
      aria-modal='true'
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : tr('对话框')}
      tabIndex={-1}
      className={clsx('motion-panel focus-ring surface-raised max-h-[92vh] w-full overflow-y-auto p-6', wide ? 'max-w-5xl' : 'max-w-2xl')}
      onClick={(event) => event.stopPropagation()}
    >
      <div className='mb-4 flex items-start justify-between gap-3'>
        {title ? (
          <h3 id={titleId} className='type-title-sm min-w-0 flex-1 font-display font-semibold tracking-tight text-txt'>{title}</h3>
        ) : <span />}
        <button
          type='button'
          onClick={onClose}
          aria-label={tr('关闭')}
          className='focus-ring t-colors -m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-txt-muted hover:text-txt'
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </div>
  );
}

export function Modal({
  open, onClose, children, title, wide,
}: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string; wide?: boolean }) {
  if (!open) return null;
  const content = (
    <div className='motion-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm' onClick={onClose}>
      <ModalPanel onClose={onClose} title={title} wide={wide}>{children}</ModalPanel>
    </div>
  );
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] p-10 text-center'>
      <div className='type-body font-display font-semibold tracking-tight text-txt'>{title}</div>
      {hint ? <div className='type-note max-w-md text-txt-muted'>{hint}</div> : null}
      {action}
    </div>
  );
}

export function Select<T extends string>({
  value, onChange, options, label, className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <label className={clsx('block', className)}>
      {label ? <span className='label-xs mb-1 block'>{label}</span> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className='focus-ring t-colors type-body min-h-9 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-txt'
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export function Input({
  value, onChange, placeholder, label, className, maxLength,
}: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string; maxLength?: number }) {
  return (
    <label className={clsx('block', className)}>
      {label ? <span className='label-xs mb-1 block'>{label}</span> : null}
      <input
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className='focus-ring t-colors type-body min-h-9 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-txt placeholder:text-txt-muted'
      />
    </label>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={clsx('h-px w-full bg-white/[0.08]', className)} />;
}

export function KeyValue({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
      {items.map((item) => (
        <div key={item.label} className='min-w-0'>
          <dt className='label-xs'>{item.label}</dt>
          <dd className='type-body mt-0.5 truncate font-semibold text-txt'>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

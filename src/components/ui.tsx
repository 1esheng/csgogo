import React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';

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
      <div>
        <h2 className='font-display text-lg font-semibold tracking-tight text-txt'>{title}</h2>
        {subtitle ? <p className='mt-1 text-[15px] text-txt-muted'>{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle';

export function Button({
  children, onClick, variant = 'primary', size = 'md', disabled, className, title, type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-ink-900 hover:bg-accent/90 font-semibold',
    ghost: 'bg-white/5 text-txt hover:bg-white/10',
    outline: 'border border-white/15 text-txt hover:border-accent/60 hover:text-accent',
    danger: 'bg-danger/90 text-white hover:bg-danger',
    subtle: 'text-txt-muted hover:text-txt',
  };
  const sizes = { sm: 'px-3 py-1.5 text-[13px]', md: 'px-4 py-2 text-[15px]', lg: 'px-5 py-2.5 text-base' };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'focus-ring t-press inline-flex items-center justify-center gap-2 rounded-xl active:scale-[0.985]',
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
    muted: 'bg-white/5 text-txt-muted border-white/5',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-semibold tracking-normal', tones[tone], className)}>
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
      {label ? <div className='mb-1 flex justify-between text-[12px] text-txt-muted'><span>{label}</span><span>{Math.round(pct)}%</span></div> : null}
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
      <div>
        <div className='label-xs'>{label}</div>
        <div className={clsx('stat-number mt-1', tone === 'accent' && 'text-accent', tone === 'danger' && 'text-danger')}>{value}</div>
        {hint ? <div className='mt-1 text-[13px] text-txt-muted'>{hint}</div> : null}
      </div>
      {icon ? <div className='text-txt-muted'>{icon}</div> : null}
    </div>
  );
}

export function Tabs({
  tabs, active, onChange,
}: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className='flex flex-wrap gap-1 rounded-xl border border-white/5 bg-ink-900/60 p-1'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'focus-ring t-colors rounded-lg px-3 py-1.5 text-[13px] font-semibold',
            active === tab.id ? 'bg-accent text-ink-900' : 'text-txt-muted hover:text-txt',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open, onClose, children, title, wide,
}: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string; wide?: boolean }) {
  if (!open) return null;
  const content = (
    <div className='motion-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm' onClick={onClose}>
      <div
        role='dialog'
        aria-modal='true'
        tabIndex={-1}
        className={clsx('motion-panel focus-ring surface-raised max-h-[92vh] w-full overflow-y-auto p-6', wide ? 'max-w-5xl' : 'max-w-2xl')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='font-display text-base font-semibold tracking-tight'>{title}</h3>
          <button onClick={onClose} className='focus-ring rounded-lg p-1 text-txt-muted hover:text-txt' aria-label='Close'>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className='flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-10 text-center'>
      <div className='font-display text-[15px] font-semibold tracking-tight text-txt'>{title}</div>
      {hint ? <div className='max-w-md text-[15px] text-txt-muted'>{hint}</div> : null}
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
        className='focus-ring t-colors w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-[15px] text-txt'
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
        className='focus-ring t-colors w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-[15px] text-txt placeholder:text-txt-muted'
      />
    </label>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={clsx('h-px w-full bg-white/8', className)} />;
}

export function KeyValue({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
      {items.map((item) => (
        <div key={item.label}>
          <dt className='label-xs'>{item.label}</dt>
          <dd className='mt-0.5 text-[15px] font-semibold text-txt'>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
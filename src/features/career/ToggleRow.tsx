import clsx from 'clsx';

export function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <div className='flex items-start justify-between gap-4 rounded-xl border border-white/5 bg-ink-700/40 px-3 py-2.5 transition-colors hover:border-white/15'>
      <div className='min-w-0'>
        <div className='text-[15px] font-semibold text-txt'>{label}</div>
        {hint ? <div className='mt-0.5 text-[13px] leading-snug text-txt-muted'>{hint}</div> : null}
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'focus-ring relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-150',
          checked ? 'bg-accent' : 'bg-ink-600',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

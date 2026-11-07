import clsx from 'clsx';

/**
 * 开关行。轨道与圆点全部内联定位：
 * 之前圆点同时用 absolute 与 translate 任意值类，脱开盒子后圆点会停在错误位置/跑出椭圆。
 */
export function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void }) {
  const W = 44;
  const H = 24;
  const K = 18;
  const PAD = 3;
  return (
    <div className='flex min-w-0 items-start justify-between gap-4 rounded-xl border border-white/5 bg-ink-700/40 px-3 py-2.5 transition-colors hover:border-white/15'>
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
        className='focus-ring relative mt-0.5 shrink-0'
        style={{
          width: W,
          height: H,
          borderRadius: H / 2,
          background: checked ? '#F5A623' : '#252E3D',
          border: '1px solid rgba(255,255,255,0.10)',
          transition: 'background 150ms ease',
        }}
      >
        <span
          className={clsx('block rounded-full bg-white')}
          style={{
            position: 'absolute',
            top: PAD,
            left: PAD,
            width: K,
            height: K,
            boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
            transform: 'translateX(' + (checked ? W - K - PAD * 2 : 0) + 'px)',
            transition: 'transform 150ms cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </button>
    </div>
  );
}

import { useMemo } from 'react';
import { useT } from '@/hooks/useLang';
import { ClipboardCopy, Coins, Cpu } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { MAPS } from '@/data/maps';
import { Button, Panel, SectionTitle } from '@/components/ui';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-3 border-b border-white/5 py-1 text-[13px] last:border-0'>
      <span className='text-txt-muted'>{label}</span>
      <span className='font-semibold text-txt'>{value}</span>
    </div>
  );
}

/** 诊断信息 + 显式的测试工具（测试工具会修改存档）。 */
export function DevPanel() {
  const { tr } = useT();
  const pack = useGameStore((s) => s.pack);
  const squad = useGameStore((s) => s.squad);
  const leaders = useGameStore((s) => s.leaders);
  const matches = useGameStore((s) => s.matches);
  const pity = useGameStore((s) => s.pity);
  const toast = useGameStore((s) => s.toast);
  const grantTestCoins = useGameStore((s) => s.grantTestCoins);
  const club = useGameStore((s) => s.club);

  const counters = useMemo(() => pity(), [pity, pack]);
  const last = matches[0] ?? null;

  return (
    <Panel>
      <SectionTitle
        title={tr('开发者面板')}
        subtitle={tr('诊断信息只读；下方「测试工具」会真的修改存档，仅用于自测。')}
        right={<Cpu size={16} className='text-txt-muted' />}
      />
      <div className='grid gap-x-6 gap-y-0 sm:grid-cols-2'>
        <div>
          <div className='label-xs mb-1'>{tr('卡包')}</div>
          <Row label={tr('累计抽取')} value={pack.totalPulls} />
          <Row label={tr('距 SR 已抽')} value={pack.sinceSR + ' / ' + counters.srIn} />
          <Row label={tr('距 SSR 已抽')} value={pack.sinceSSR + ' / ' + counters.ssrIn} />
          <Row label={tr('SR 保底进度')} value={Math.round(counters.srProgress * 100) + '%'} />
          <Row label={tr('SSR 保底进度')} value={Math.round(counters.ssrProgress * 100) + '%'} />
        </div>
        <div>
          <div className='label-xs mb-1'>{tr('阵容')}</div>
          <Row label={tr('默契')} value={squad.synergy} />
          <Row label={tr('共同出战')} value={squad.matchesTogether} />
          <Row label={tr('已评分对手')} value={leaders.filter((l) => !l.isPlayer).length} />
          <Row label={tr('已评分俱乐部总数')} value={leaders.length} />
          <Row label={tr('已存比赛摘要')} value={matches.length} />
        </div>
      </div>
      <div className='mt-3 rounded-xl border border-accent/25 bg-accent/5 p-3'>
        <div className='label-xs mb-1 text-accent'>{tr('测试工具（会修改存档）')}</div>
        <div className='mb-2 flex flex-wrap items-center gap-2 text-[13px] text-txt-muted'>
          <Coins size={13} className='text-accent' />
          {tr('当前金币')} <span className='font-semibold text-txt'>{club.coins.toLocaleString()}</span> {tr('· 用来反复测试抽卡与合成')}
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button size='sm' onClick={() => grantTestCoins(100000)}>{tr('+10 万金币')}</Button>
          <Button size='sm' variant='ghost' onClick={() => grantTestCoins(10000)}>{tr('+1 万金币')}</Button>
          <Button size='sm' variant='outline' onClick={() => grantTestCoins(50000)}>{tr('+5 万金币')}</Button>
        </div>
        <div className='mt-2 text-[12px] text-txt-muted'>{tr('正式游玩请忽略此区块；金币流水里会记为「调试：测试金币」。')}</div>
      </div>
      <div className='mt-3 rounded-xl border border-white/5 bg-ink-900/40 p-3'>
        <div className='label-xs mb-1'>{tr('最近一场比赛种子')}</div>
        {last ? (
          <div className='flex flex-wrap items-center gap-2'>
            <code className='rounded-md bg-white/5 px-2 py-1 font-mono text-[13px] text-accent'>{last.seed}</code>
            <span className='text-[13px] text-txt-muted'>
              {MAPS[last.mapId]?.name ?? last.mapId} · {last.scoreFor}:{last.scoreAgainst}{tr(' 对阵 ')}{last.opponentName}
            </span>
            <Button
              className='ml-auto'
              size='sm'
              variant='subtle'
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(String(last.seed));
                  toast(tr('种子已复制。'), 'success');
                } catch {
                  toast(tr('当前浏览器环境无法使用剪贴板。'), 'error');
                }
              }}
            >
              <ClipboardCopy size={13} /> {tr('复制')}
            </Button>
          </div>
        ) : (
          <p className='text-[13px] text-txt-muted'>{tr('尚未完成任何比赛。')}</p>
        )}
        <p className='mt-2 text-[12px] leading-relaxed text-txt-muted'>
          {tr('种子可复现整场模拟：在种子、地图与阵容固定的情况下，引擎的结果是确定的。')}
        </p>
      </div>
    </Panel>
  );
}
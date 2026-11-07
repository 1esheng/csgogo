import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { AlertTriangle, Download, Lock, Unlock, Upload } from 'lucide-react';
import { useT } from '@/hooks/useLang';
import { useGameStore } from '@/stores/gameStore';
import { Badge, Button, Divider, KeyValue, Modal } from '@/components/ui';
import { GAME_VERSION, LEVEL_CONFIG } from '@/data/config';
import {
  SAVE_FILE_NAME, debugInfo, downloadText, readTextFile, verifyCheatPassword,
} from '@/features/cheats/cheats';

type Pending = { text: string; run: () => void } | null;

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='rounded-xl border border-white/[0.08] bg-white/[0.02] p-3'>
      <div className='label-xs mb-2 text-accent'>{title}</div>
      <div className='flex flex-wrap gap-2'>{children}</div>
    </section>
  );
}

function ToggleButton({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  const { tr } = useT();
  return (
    <Button size='sm' variant={on ? 'primary' : 'outline'} onClick={onToggle}>
      {label}
      <Badge tone={on ? 'accent' : 'muted'}>{on ? tr('开') : tr('关')}</Badge>
    </Button>
  );
}

/** 设置页底部的修改器入口：口令门禁 + 面板。密码只记在本次挂载里，不进存档。 */
export function CheatPanel() {
  const { tr } = useT();
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [draft, setDraft] = useState('');
  const [wrong, setWrong] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const club = useGameStore((s) => s.club);
  const cards = useGameStore((s) => s.cards);
  const coaches = useGameStore((s) => s.coaches);
  const career = useGameStore((s) => s.career);
  const flags = useGameStore((s) => s.cheatFlags);
  const toast = useGameStore((s) => s.toast);

  const say = (text: string, kind: 'success' | 'info' | 'error' = 'success') => toast(tr(text), kind);
  const confirmThen = (text: string, run: () => void) => setPending({ text: tr(text), run });

  const close = () => {
    setOpen(false);
    setUnlocked(false);
    setDraft('');
    setWrong(false);
    setPending(null);
  };

  const submitPassword = () => {
    if (!verifyCheatPassword(draft)) {
      setWrong(true);
      return;
    }
    setUnlocked(true);
    setWrong(false);
    setDraft('');
    say('修改器已解锁');
  };

  const handleExport = async () => {
    const json = await useGameStore.getState().exportSave();
    if (downloadText(SAVE_FILE_NAME, json)) say('已导出存档文件');
    else say('当前环境无法下载文件', 'error');
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await useGameStore.getState().importSave(await readTextFile(file));
      if (result.ok) say('存档已导入');
      else say(result.error ?? '导入被拒绝', 'error');
    } catch {
      say('无法读取该文件', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const info = debugInfo({ club, cards, coaches, career }, GAME_VERSION);
  const totalCards = Object.keys(useGameStore.getState().templates()).length;

  const panelBody = (
    <div className='space-y-3'>
      <p className='text-[12px] leading-relaxed text-txt-muted'>{tr('以下操作会直接改写本地存档，仅用于单机自娱。')}</p>

      <div className='grid gap-3 sm:grid-cols-2'>
        <Group title={tr('经济')}>
          <Button size='sm' variant='outline' onClick={() => useGameStore.getState().grantTestCoins(10000)}>{tr('+10,000 金币')}</Button>
          <Button size='sm' variant='outline' onClick={() => useGameStore.getState().grantTestCoins(100000)}>{tr('+100,000 金币')}</Button>
          <Button
            size='sm'
            variant='danger'
            onClick={() => confirmThen('确认把金币清零？此操作无法撤销。', () => {
              useGameStore.getState().cheatSetCoins(0);
              say('金币已清零');
            })}
          >
            {tr('金币清零')}
          </Button>
        </Group>

        <Group title={tr('卡牌')}>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              const added = useGameStore.getState().cheatGrantAllCards();
              say('已解锁全部选手卡', added > 0 ? 'success' : 'info');
            }}
          >
            {tr('解锁全部选手卡') + ' (' + totalCards + ')'}
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              const touched = useGameStore.getState().cheatTuneCards({ level: LEVEL_CONFIG.maxLevel });
              say('所有卡牌已满级', touched > 0 ? 'success' : 'info');
            }}
          >
            {tr('全部满级')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              const touched = useGameStore.getState().cheatTuneCards({ stars: 5 });
              say('所有卡牌已满星', touched > 0 ? 'success' : 'info');
            }}
          >
            {tr('全部满星')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              const touched = useGameStore.getState().cheatTuneCards({ starsBump: 1 });
              say('一键升星完成', touched > 0 ? 'success' : 'info');
            }}
          >
            {tr('一键升星')}
          </Button>
        </Group>

        <Group title={tr('抽卡')}>
          <ToggleButton
            label={tr('必出 UR（一次性）')}
            on={flags.guaranteeUR}
            onToggle={() => {
              useGameStore.getState().setCheatFlags({ guaranteeUR: !flags.guaranteeUR });
              say(flags.guaranteeUR ? '必出 UR 已关闭' : '必出 UR 已开启（下次十连生效）');
            }}
          />
          <ToggleButton
            label={tr('免费开包')}
            on={flags.freePacks}
            onToggle={() => {
              useGameStore.getState().setCheatFlags({ freePacks: !flags.freePacks });
              say(flags.freePacks ? '免费开包已关闭' : '免费开包已开启');
            }}
          />
        </Group>

        <Group title={tr('教练')}>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              const added = useGameStore.getState().cheatGrantAllCoaches();
              say('已解锁全部教练', added > 0 ? 'success' : 'info');
            }}
          >
            {tr('解锁全部教练')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              if (coaches.length === 0) { say('先解锁一位教练。', 'error'); return; }
              useGameStore.getState().cheatCoachXp({ add: 10000 });
              say('主教练经验已增加');
            }}
          >
            {tr('主教练经验 +10,000')}
          </Button>
          <Button
            size='sm'
            variant='danger'
            onClick={() => confirmThen('确认清空所有教练的执教经验？', () => {
              useGameStore.getState().cheatCoachXp({ reset: true });
              say('教练经验已清零');
            })}
          >
            {tr('教练经验清零')}
          </Button>
        </Group>

        <Group title={tr('球队')}>
          <ToggleButton
            label={tr('全队属性 +10')}
            on={flags.teamBoost}
            onToggle={() => {
              useGameStore.getState().setCheatFlags({ teamBoost: !flags.teamBoost });
              say(flags.teamBoost ? '全队属性 +10 已关闭' : '全队属性 +10 已开启');
            }}
          />
          <Button size='sm' variant='outline' onClick={() => useGameStore.getState().autoFillSquad()}>{tr('自动补齐首发')}</Button>
        </Group>

        <Group title={tr('生涯')}>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              const result = useGameStore.getState().cheatWinFixture();
              say(result.ok ? '已判胜一场' : (result.error ?? '当前没有进行中的赛事。'), result.ok ? 'success' : 'error');
            }}
          >
            {tr('直接判胜')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              useGameStore.getState().cheatAdvanceTier();
              say('已解锁下一档联赛');
            }}
          >
            {tr('解锁下一档联赛')}
          </Button>
          <Button
            size='sm'
            variant='danger'
            onClick={() => confirmThen('确认重置生涯进度？段位、积分与奖杯都会清空。', () => {
              useGameStore.getState().cheatResetCareer();
              say('生涯进度已重置');
            })}
          >
            {tr('重置生涯进度')}
          </Button>
        </Group>

        <Group title={tr('存档')}>
          <Button size='sm' variant='outline' onClick={() => { void handleExport(); }}>
            <Download size={13} /> {tr('导出存档 JSON')}
          </Button>
          <Button size='sm' variant='outline' onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> {tr('导入存档 JSON')}
          </Button>
          <input ref={fileRef} type='file' accept='.json,application/json' className='hidden' onChange={handleImport} />
          <Button
            size='sm'
            variant='danger'
            onClick={() => confirmThen('确认清空全部进度？这会删除存档并回到初始引导。', () => {
              void useGameStore.getState().resetGame();
              say('进度已清空', 'info');
            })}
          >
            {tr('清空全部进度')}
          </Button>
        </Group>
      </div>

      <Divider />

      <div>
        <div className='label-xs mb-2'>{tr('调试信息')}</div>
        <KeyValue
          items={[
            { label: tr('金币'), value: info.coins.toLocaleString() },
            { label: tr('卡牌数量'), value: info.cards },
            { label: tr('教练数量'), value: info.coaches },
            { label: tr('赛事档位'), value: info.tier },
            { label: tr('存档版本'), value: info.version },
          ]}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className='flex justify-center'>
        <Button variant='subtle' size='sm' onClick={() => setOpen(true)}>
          <Lock size={13} /> {tr('修改器')}
        </Button>
      </div>

      <Modal open={open} onClose={close} title={unlocked ? tr('修改器') : tr('输入密码')} wide={unlocked}>
        {unlocked ? panelBody : (
          <div className='space-y-3'>
            <label className='block'>
              <span className='label-xs mb-1 block'>{tr('密码')}</span>
              <input
                type='password'
                value={draft}
                aria-label={tr('密码')}
                autoComplete='off'
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (wrong) setWrong(false);
                }}
                onKeyDown={(event) => { if (event.key === 'Enter') submitPassword(); }}
                className='focus-ring t-colors type-body min-h-9 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-txt placeholder:text-txt-muted'
              />
            </label>
            {wrong ? (
              <p role='alert' className='text-[12px] font-semibold text-danger'>{tr('密码错误')}</p>
            ) : null}
            <Button onClick={submitPassword}>{tr('确认')}</Button>
            <p className='flex items-start gap-2 text-[12px] leading-relaxed text-txt-muted'>
              <Unlock size={13} className='mt-0.5 shrink-0 text-accent' />
              <span>{tr('只影响本机存档，不影响其他玩家。')}</span>
            </p>
          </div>
        )}
      </Modal>

      <Modal open={pending !== null} onClose={() => setPending(null)} title={tr('确认操作')}>
        <div className='space-y-4'>
          <div className='flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] text-danger'>
            <AlertTriangle size={16} className='mt-0.5 shrink-0' />
            <span>{pending?.text}</span>
          </div>
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setPending(null)}>{tr('取消')}</Button>
            <Button
              variant='danger'
              size='sm'
              onClick={() => {
                const action = pending;
                setPending(null);
                action?.run();
              }}
            >
              {tr('确认')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

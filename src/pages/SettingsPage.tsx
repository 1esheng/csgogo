import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Database, Gauge, HardDrive, Info, ShieldCheck, Sliders } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { useT } from '@/hooks/useLang';
import { listBackups, restoreBackup, type BackupInfo } from '@/db/db';
import { ENABLE_DEV_PANEL } from '@/data/devFlags';
import { GAME_VERSION } from '@/data/config';
import { Badge, Button, Divider, Input, Panel, SectionTitle } from "@/components/ui";
import { CLUB_BADGES, CLUB_COLORS, CLUB_PRICES, badgeIcon } from "@/data/clubCosmetics";
import { ToggleRow } from '@/features/career/ToggleRow';
import { SaveTools } from '@/features/career/SaveTools';
import { DevPanel } from '@/features/career/DevPanel';

const SPEEDS: (1 | 2 | 4)[] = [1, 2, 4];

export function SettingsPage() {
  const { tr } = useT();
  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const cards = useGameStore((s) => s.cards);
  const matches = useGameStore((s) => s.matches);
  const tournaments = useGameStore((s) => s.tournaments);
  const prospects = useGameStore((s) => s.prospects);
  const club = useGameStore((s) => s.club);
  const renameClub = useGameStore((s) => s.renameClub);
  const setClubLook = useGameStore((s) => s.setClubLook);
  const toast = useGameStore((s) => s.toast);
  const reloadFromDisk = useGameStore((s) => s.init);
  const [backups, setBackups] = React.useState<BackupInfo[]>([]);
  React.useEffect(() => { void listBackups().then(setBackups); }, []);
  const [nameDraft, setNameDraft] = useState(club.name);
  const [badgeDraft, setBadgeDraft] = useState<{ badge?: string; color?: string }>({ badge: club.badge, color: club.color });

  const meta = useMemo(
    () => [
      { label: '选手卡', value: cards.length },
      { label: '比赛摘要', value: matches.length },
      { label: '赛事', value: tournaments.length },
      { label: '新秀', value: prospects.length },
    ],
    [cards.length, matches.length, tournaments.length, prospects.length],
  );

  return (
    <div className='space-y-5'>
      <SectionTitle
        title={tr('设置')}
        subtitle={tr('偏好设置与本地存档。')}
        right={<Badge tone='accent'>v{GAME_VERSION}</Badge>}
      />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]'>
      <Panel>
        <SectionTitle
          title={tr('战队形象')}
          subtitle={tr('改名或更换徽章会消耗金币，立即写入本地存档。')}
          right={<Badge tone='accent'>{tr('金币')} {club.coins.toLocaleString()}</Badge>}
        />
        <div className='flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-ink-900/50 p-3'>
          <span
            className='grid h-14 w-14 shrink-0 place-items-center rounded-2xl'
            style={{ background: (club.color ?? '#F5A623') + '22', border: '1px solid ' + (club.color ?? '#F5A623') + '66' }}
          >
            {React.createElement(badgeIcon(club.badge).icon, { size: 24, style: { color: club.color ?? '#F5A623' } })}
          </span>
          <div className='min-w-0'>
            <div className='font-display text-lg font-semibold text-txt'>{club.name}</div>
            <div className='text-[11px] text-txt-muted'>{tr('当前徽章：')}{tr(badgeIcon(club.badge).label)} · {tr('主色')} {club.color ?? '#F5A623'}</div>
          </div>
        </div>

        <div className='mt-4'>
          <div className='label-xs mb-2'>{tr('更改战队名称')}（{CLUB_PRICES.rename} {tr('金币')}）</div>
          <div className='flex flex-wrap gap-2'>
            <Input className='max-w-xs' value={nameDraft} maxLength={12} onChange={setNameDraft} placeholder={tr('2-12 个字符')} />
            <Button
              disabled={club.coins < CLUB_PRICES.rename || nameDraft.trim() === club.name || nameDraft.trim().length < 2}
              onClick={() => {
                const res = renameClub(nameDraft);
                if (!res.ok && res.error) toast(res.error, 'error');
              }}
            >
              {tr('改名')}
            </Button>
          </div>
          <p className='mt-1 text-[11px] text-txt-muted'>{tr('改名')} {CLUB_PRICES.rename} {tr('金币，长度 2-12 个字符。')}</p>
        </div>

        <div className='mt-4'>
          <div className='label-xs mb-2'>{tr('选择徽章')}（{CLUB_PRICES.badge} {tr('金币')}）</div>
          <div className='flex flex-wrap gap-2'>
            {CLUB_BADGES.map((b) => {
              const active = b.id === (badgeDraft.badge ?? club.badge);
              return (
                <button
                  key={b.id}
                  type='button'
                  title={tr(b.label)}
                  onClick={() => setBadgeDraft((d) => ({ ...d, badge: b.id }))}
                  className={clsx(
                    'grid h-11 w-11 place-items-center rounded-xl border transition-all duration-150 active:scale-95',
                    active ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 bg-white/[0.03] text-txt-muted hover:border-white/25',
                  )}
                >
                  {React.createElement(b.icon, { size: 18 })}
                </button>
              );
            })}
          </div>
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <span className='label-xs'>{tr('主色')}</span>
            {CLUB_COLORS.map((c) => (
              <button
                key={c}
                type='button'
                aria-label={c}
                onClick={() => setBadgeDraft((d) => ({ ...d, color: c }))}
                className={clsx('h-7 w-7 rounded-full border-2 transition-transform duration-150 active:scale-90', (badgeDraft.color ?? club.color) === c ? 'border-white' : 'border-transparent')}
                style={{ background: c }}
              />
            ))}
          </div>
          <Button
            className='mt-3'
            variant='outline'
            disabled={club.coins < CLUB_PRICES.badge}
            onClick={() => {
              const res = setClubLook(badgeDraft.badge ?? club.badge ?? 'shield', badgeDraft.color ?? club.color ?? '#F5A623');
              if (!res.ok && res.error) toast(res.error, 'error');
            }}
          >
            {tr('应用徽章')}（{CLUB_PRICES.badge} {tr('金币')}）
          </Button>
        </div>
      </Panel>
        <div className='space-y-4'>
          <Panel>
            <SectionTitle title={tr('偏好设置')} subtitle={tr('保存在存档中，立即生效。')} right={<Sliders size={16} className='text-txt-muted' />} />
            <div className='mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2'>
              <span className='text-xs font-semibold text-txt'>{tr('界面语言 / Language')}</span>
              <div className='ml-auto flex gap-1 rounded-lg border border-white/10 p-0.5'>
                {([['zh', '中文'], ['en', 'English']] as const).map(([code, label]) => (
                  <button
                    key={code}
                    type='button'
                    onClick={() => updateSettings({ language: code })}
                    className={'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ' + ((settings.language ?? 'zh') === code ? 'bg-accent text-ink-950' : 'text-txt-muted hover:text-txt')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className='space-y-2'>
              <ToggleRow
                label={tr('自动保存')}
                hint={tr('每次状态变更后把存档写入 IndexedDB。')}
                checked={settings.autoSave}
                onChange={(autoSave) => updateSettings({ autoSave })}
              />
              <ToggleRow
                label={tr('跳过卡包动画')}
                hint={tr('立即显示开包结果，不再逐张翻开。')}
                checked={settings.packSkipAnimation}
                onChange={(packSkipAnimation) => updateSettings({ packSkipAnimation })}
              />
              <ToggleRow
                label={tr('紧凑卡片')}
                hint={tr('在选手收藏与开包界面使用更紧凑的选手卡。')}
                checked={settings.compactCards}
                onChange={(compactCards) => updateSettings({ compactCards })}
              />
              <ToggleRow
                label={tr('音效')}
                hint={tr('仅保存该偏好——当前版本尚未实现音频。')}
                checked={settings.soundEnabled}
                onChange={(soundEnabled) => updateSettings({ soundEnabled })}
              />
            </div>

            <Divider className='my-4' />

            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='min-w-0'>
                <div className='flex items-center gap-2 text-sm font-semibold text-txt'>
                  <Gauge size={14} className='text-txt-muted' /> {tr('回合速度')}
                </div>
                <div className='mt-0.5 text-xs text-txt-muted'>{tr('训练赛推进回合的速度。')}</div>
              </div>
              <div className='flex gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1'>
                {SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    type='button'
                    onClick={() => updateSettings({ matchSpeed: speed })}
                    className={
                      'focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ' +
                      (settings.matchSpeed === speed ? 'bg-accent text-ink-900' : 'text-txt-muted hover:text-txt')
                    }
                  >
                    {speed}×
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {ENABLE_DEV_PANEL && settings.showDevPanel ? <DevPanel /> : null}
        </div>

        <div className='space-y-4'>
          <Panel>
            <SectionTitle title={tr('存档管理')} subtitle={tr('俱乐部') + ' ' + club.name} right={<HardDrive size={16} className='text-txt-muted' />} />
            <SaveTools />
            <Divider className='my-4' />
            <div className='grid grid-cols-2 gap-3'>
              {meta.map((item) => (
                <div key={item.label}>
                  <div className='label-xs'>{tr(item.label)}</div>
                  <div className='mt-0.5 font-display text-lg font-semibold text-txt'>{item.value}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle title={tr('数据持久化')} right={<Database size={16} className='text-txt-muted' />} />
            <div className='space-y-2 text-xs leading-relaxed text-txt-muted'>
              <p className='flex items-start gap-2'>
                <Database size={13} className='mt-0.5 shrink-0 text-accent' />
                <span>
                  {tr('存档通过 Dexie 存放在浏览器的 IndexedDB 中，完全位于本机。刷新页面或重启开发服务器都不会丢失，也不会')} {tr('上传到任何地方。')}
                </span>
              </p>
              <p className='flex items-start gap-2'>
                <HardDrive size={13} className='mt-0.5 shrink-0 text-accent' />
                <span>{tr('完整回放单独保留最近 20 场；存档文件中只有摘要。')}</span>
              </p>
              <p className='flex items-start gap-2'>
                <AlertTriangle size={13} className='mt-0.5 shrink-0 text-accent' />
                <span>{tr('清除本站点的数据会永久删除该俱乐部——请先导出存档。')}</span>
              </p>
            </div>
          </Panel>

          <Panel>
            <div className='flex items-start gap-2 text-[11px] leading-relaxed text-txt-muted'>
              <ShieldCheck size={14} className='mt-0.5 shrink-0 text-accent' />
              <span>
                {tr('本作中的全部评分——选手 OVR、俱乐部 Elo、奖金池——都是原创的游戏平衡数值，并非 HLTV 数据，也不取自现实')} {tr('比赛表现。')}
              </span>
            </div>
          </Panel>

          <Panel>
            <div className='flex items-start gap-2 text-[11px] leading-relaxed text-txt-muted'>
              <Info size={14} className='mt-0.5 shrink-0' />
              <span>
                {tr('构建版本')} {GAME_VERSION}{tr('。存档带有版本号；不兼容的存档会在导入时被拒绝，而不会悄悄损坏俱乐部数据。')}
              </span>
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <SectionTitle
          title={tr('存档备份')}
          subtitle={tr('每次保存都会保留上一版存档（最多 5 份），误覆盖或存档损坏时可以在这里恢复。')}
        />
        {backups.length === 0 ? (
          <p className='text-xs text-txt-muted'>{tr('还没有备份——保存一次后这里就会出现记录。')}</p>
        ) : (
          <div className='space-y-1.5'>
            {backups.map((b) => (
              <div key={b.id} className='flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-xs'>
                <span className='font-semibold text-txt'>{b.clubName}</span>
                <span className='text-txt-muted'>{new Date(b.savedAt).toLocaleString('zh-CN')}</span>
                <span className='text-txt-muted'>{b.cards} {tr('张卡')} · {b.coins.toLocaleString()} {tr('金币')}</span>
                <Button
                  size='sm'
                  variant='outline'
                  className='ml-auto'
                  onClick={async () => {
                    const restored = await restoreBackup(b.id);
                    if (!restored) { toast(tr('这份备份无法读取。'), 'error'); return; }
                    await reloadFromDisk();
                    toast(tr('已恢复备份存档。'), 'success');
                  }}
                >
                  {tr('恢复')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
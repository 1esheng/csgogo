import { CalendarDays, Clock, Flag, Users, X } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { RATING_CONFIG } from '@/data/config';
import { AI_TEAMS } from '@/data/aiTeams';
import { REGISTRATION_LEAD_DAYS, eventField, monthDayLabel, seasonEvents } from '@/game/calendar';
import { canEnterTier, tierSpec } from '@/game/career';
import { Badge, Button, Panel, SectionTitle } from '@/components/ui';

const TEAMS = AI_TEAMS.map((t) => ({ id: t.id, name: t.name }));

/** 赛季日程：可以同时报名多站；报名前能看到参赛队伍；到比赛日才能开赛。 */
export function SeasonCalendar() {
  const club = useGameStore((s) => s.club);
  const career = useGameStore((s) => s.career);
  const leaders = useGameStore((s) => s.leaders);
  const tournaments = useGameStore((s) => s.tournaments);
  const registerEvent = useGameStore((s) => s.registerEvent);
  const unregisterEvent = useGameStore((s) => s.unregisterEvent);
  const advanceDays = useGameStore((s) => s.advanceDays);
  const startEvent = useGameStore((s) => s.startEvent);
  const toast = useGameStore((s) => s.toast);

  const rating = leaders.find((l) => l.id === 'player')?.rating ?? RATING_CONFIG.start;
  const events = seasonEvents(club.season);
  const active = tournaments.find((t) => t.status === 'active') ?? null;
  const registered = career.registeredEventIds ?? [];
  const upcoming = events.filter((e) => e.day >= club.day).slice(0, 10);
  const nextRegistered = events
    .filter((e) => registered.includes(e.id))
    .sort((a, b) => a.day - b.day)[0] ?? null;

  const jump = () => {
    const target = nextRegistered ?? upcoming[0];
    if (!target) return;
    advanceDays(Math.max(1, target.day - club.day));
  };

  return (
    <Panel>
      <SectionTitle
        title='赛季日程'
        subtitle={club.season + ' 赛季 · ' + monthDayLabel(club.day) + ' · 可同时报名多站；到比赛日再开赛'}
        right={
          <div className='flex flex-wrap items-center gap-2'>
            <Button size='sm' variant='ghost' onClick={() => advanceDays(1)}>
              <Clock size={13} /> 推进 1 天
            </Button>
            <Button size='sm' variant='outline' onClick={jump} disabled={upcoming.length === 0}>
              <CalendarDays size={13} /> 跳到下一场
            </Button>
          </div>
        }
      />

      <div className='space-y-2'>
        {upcoming.map((event) => {
          const spec = tierSpec(event.tier);
          const reachable = canEnterTier(rating, event.tier);
          const isRegistered = registered.includes(event.id);
          const open = club.day <= event.closeDay && reachable && !isRegistered;
          const ready = isRegistered && club.day >= event.day;
          const field = eventField(event, TEAMS, spec.teams ?? 8);
          return (
            <div key={event.id} className='rounded-xl border border-white/8 bg-white/[0.02] p-2.5'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='w-16 shrink-0 text-[11px] font-semibold text-txt-muted'>{monthDayLabel(event.day)}</span>
                <span className='min-w-0 flex-1 truncate text-sm font-semibold text-txt'>{event.name}</span>
                <Badge tone='muted'>{spec.name}</Badge>
                <Badge tone='accent'>奖金 {spec.prize.toLocaleString()}</Badge>
                <Badge tone={reachable ? 'muted' : 'neutral'}>{spec.teams ?? 8} 队</Badge>
                {isRegistered ? <Badge tone='accent'>已报名</Badge> : null}
                {!reachable ? <Badge tone='neutral'>需 {spec.ratingFloor} 分</Badge> : null}
                {open ? (
                  <Button size='sm' onClick={() => {
                    const res = registerEvent(event.id);
                    if (!res.ok && res.error) toast(res.error, 'error');
                  }}>报名</Button>
                ) : null}
                {isRegistered && !ready ? (
                  <Button size='sm' variant='ghost' onClick={() => unregisterEvent(event.id)}>
                    <X size={13} /> 取消报名
                  </Button>
                ) : null}
                {ready ? (
                  <Button size='sm' disabled={Boolean(active)} onClick={() => {
                    const res = startEvent(event.id);
                    if (!res.ok && res.error) toast(res.error, 'error');
                  }}>
                    <Flag size={13} /> {active ? '赛事进行中' : '开始比赛'}
                  </Button>
                ) : null}
              </div>
              <div className='mt-1.5 flex items-start gap-1.5 text-[11px] text-txt-muted'>
                <Users size={11} className='mt-0.5 shrink-0' />
                <span className='min-w-0'>参赛：{field.join(' · ')}</span>
              </div>
            </div>
          );
        })}
        {upcoming.length === 0 ? (
          <p className='text-xs text-txt-muted'>本赛季的赛事都结束了——明年 1 月开始新赛季。</p>
        ) : null}
      </div>
      <p className='mt-2 text-[11px] text-txt-muted'>
        报名截止日 = 比赛日提前 {REGISTRATION_LEAD_DAYS} 天；同一天可能撞车，只能打完一站再打下一站。每场比赛推进 1 天。
      </p>
    </Panel>
  );
}
import { useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AvailabilityDay, BusyLevel } from '../../lib/api';
import { fullDateFromIso, toIso, type DateOpt } from '../../lib/format';
import { useApp } from '../../store/AppStore';
import { useT, _t } from '../../i18n';
import { MONO, StepLabel } from './bookingUi';

/* 3 · WHEN: how busy a slot already is (from /api/bookings/availability) */
const LEVELS: BusyLevel[] = ['quiet', 'busy', 'very-busy', 'full', 'closed'];
const LEVEL_COLOR: Record<BusyLevel, string> = { quiet: '#33FF74', busy: '#FFFC33', 'very-busy': '#FF9F33', full: '#FF3358', closed: '#9A8FB0' };
const LEVEL_LABEL: Record<BusyLevel, string> = { quiet: _t('QUIET'), busy: _t('BUSY'), 'very-busy': _t('VERY BUSY'), full: _t('FULLY BOOKED'), closed: _t('CLOSED') };
const CLOSURE_LABEL: Record<'closed' | 'maintenance' | 'private', string> = { closed: _t('CLOSED'), maintenance: _t('MAINTENANCE'), private: _t('PRIVATE EVENT') };
const LEVEL_WORD: Record<BusyLevel, string> = { quiet: _t('quiet'), busy: _t('busy'), 'very-busy': _t('very busy'), full: _t('fully booked'), closed: _t('closed') };

/** A slot nobody can book any more. */
export const isOut = (l?: BusyLevel) => l === 'full' || l === 'closed';

const levelDot = (l: BusyLevel): CSSProperties => ({ width: '7px', height: '7px', borderRadius: '999px', background: LEVEL_COLOR[l], display: 'inline-block' });

function LoadDots({ load, on }: { load?: AvailabilityDay; on: boolean }) {
  const t = useT();
  if (!load) return <div style={{ height: '6px', marginTop: '5px' }} />;
  const dot = (l: BusyLevel): CSSProperties => ({
    ...levelDot(l), boxShadow: on ? '0 0 0 1.5px rgba(255,255,255,.7)' : '0 0 0 1px rgba(52,0,87,.15)',
  });
  return (
    <div
      data-testid="load-dots"
      title={t('Morning: {morning} · Afternoon: {afternoon}', { morning: t(LEVEL_WORD[load.morning.level]), afternoon: t(LEVEL_WORD[load.afternoon.level]) })}
      style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '5px', height: '6px', alignItems: 'center' }}
    >
      <span style={dot(load.morning.level)} />
      <span style={dot(load.afternoon.level)} />
    </div>
  );
}

const chipFocus = 'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-valle-violet';
const chipOn = 'border-valle-purple bg-valle-purple text-white';
const chipOff = 'border-valle-lilac bg-white text-valle-purple hover:border-valle-purple/50 hover:bg-[#F4EEFF]';

/* 3 · WHEN: date chip */
function DateChip({ o, on, onClick, load }: { o: DateOpt; on: boolean; onClick: () => void; load?: AvailabilityDay }) {
  const full = !!load && isOut(load.morning.level) && isOut(load.afternoon.level);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      data-full={full || undefined}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      className={cn('cursor-pointer rounded-[14px] border-[1.5px] px-1.5 py-3 text-center font-sans', chipFocus, on ? chipOn : chipOff, full && 'opacity-45')}
    >
      <div className={cn('font-mono text-[10px] font-semibold tracking-[.08em]', !on && 'opacity-75')}>{o.dow}</div>
      <div className="mt-0.5 font-display text-[22px] font-black italic">{o.dd}</div>
      <div className={cn('font-mono text-[10px] font-semibold', !on && 'opacity-75')}>{o.mm}</div>
      <LoadDots load={load} on={on} />
    </motion.button>
  );
}

/* 3 · WHEN: slot chip */
function SlotChip({ label, sub, on, onClick, level, closure }: { label: string; sub: string; on: boolean; onClick: () => void; level?: BusyLevel; closure?: { kind: 'closed' | 'maintenance' | 'private'; reason: string } }) {
  const t = useT();
  const full = isOut(level);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={full}
      data-testid={level === 'closed' ? 'slot-closed' : full ? 'slot-full' : undefined}
      whileHover={full ? undefined : { y: -1 }}
      whileTap={full ? undefined : { scale: 0.97 }}
      className={cn('rounded-[14px] border-[1.5px] px-5 py-[13px] text-start font-sans', chipFocus,
        on ? chipOn : full ? 'cursor-not-allowed border-valle-lilac bg-[#F7F3FF] text-valle-purple opacity-60' : cn('cursor-pointer', chipOff))}
    >
      <div className="text-[15px] font-bold">{label}</div>
      <div className={cn('mt-0.5 font-mono text-[10.5px]', !on && 'opacity-75')}>{sub}</div>
      {level && (
        <div data-testid="slot-level" className={cn('mt-[7px] inline-flex items-center gap-[5px] font-mono text-[10px] font-bold tracking-[.08em]', on ? 'text-white' : 'text-valle-purple')}>
          <span className="inline-block size-[7px] rounded-full" style={{ background: LEVEL_COLOR[level] }} />
          {closure ? t(CLOSURE_LABEL[closure.kind]) + (closure.reason ? ' · ' + closure.reason : '') : t(LEVEL_LABEL[level])}
        </div>
      )}
    </motion.button>
  );
}

/** "Pick a date" calendar for any day past the two weeks of chips. */
function DatePicker({ todayIso }: { todayIso: string }) {
  const t = useT();
  const { customDate, setCustomDate } = useApp();
  const [open, setOpen] = useState(false);
  const at = (iso: string, time: string) => new Date(iso + 'T' + time);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="date-picker"
          className={cn('inline-flex cursor-pointer items-center gap-2 rounded-[14px] border-[1.5px] px-3.5 py-2.5 font-sans text-sm font-semibold', chipFocus, customDate ? chipOn : chipOff)}
        >
          <CalendarDays size={16} strokeWidth={2.4} aria-hidden />
          {customDate ? (fullDateFromIso(customDate) || customDate) : t('Pick a date')}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-2xl border-valle-lilac bg-white p-2 text-valle-purple shadow-[0_24px_48px_-20px_rgba(52,0,87,.45)]">
        <Calendar
          mode="single"
          selected={customDate ? at(customDate, '12:00:00') : undefined}
          onSelect={(d) => {
            if (!d) return;
            setCustomDate(toIso(d)); setOpen(false);
          }}
          disabled={{ before: at(todayIso, '00:00:00') }}
          defaultMonth={at(customDate || todayIso, '12:00:00')}
          className="[--cell-size:2.4rem] [&_.rdp-day_button[aria-selected=true]]:!bg-valle-violet [&_.rdp-day_button[aria-selected=true]]:!text-white"
        />
      </PopoverContent>
    </Popover>
  );
}

/** 3 · WHEN: two weeks of date chips, any other date, the arrival slot and how busy each is. */
export function WhenStep({ dOpts, todayIso, avail, selectedLoad, dealDateMsg, activityFullMsg, holdUntil }: {
  dOpts: DateOpt[];
  todayIso: string;
  avail: Record<string, AvailabilityDay>;
  selectedLoad?: AvailabilityDay;
  dealDateMsg: string;
  activityFullMsg: string;
  /** "until" time of the places held for the party, when there is a hold to show. */
  holdUntil?: string;
}) {
  const t = useT();
  const { dateIdx, setDateIdx, customDate, setCustomDate, slot, setSlot } = useApp();
  return (
    <div style={{ marginTop: '34px' }}>
      <StepLabel>{t('3 · WHEN ARE YOU COMING?')}</StepLabel>
      {dealDateMsg && <div role="alert" data-testid="deal-date-warning" style={{ marginTop: '12px', background: '#FFE2E7', borderRadius: '12px', padding: '11px 14px', fontSize: '13.5px', fontWeight: 600, color: '#B8163A' }}>{dealDateMsg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(86px,1fr))', gap: '8px', marginTop: '12px' }}>
        {dOpts.map((o) => (
          <DateChip
            key={o.i}
            o={o}
            on={!customDate && dateIdx === o.i}
            onClick={() => { setDateIdx(o.i); setCustomDate(''); }}
            load={avail[o.iso]}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 600, letterSpacing: '.08em', color: 'rgba(52,0,87,.7)' }}>{t('ANOTHER MONTH? PICK ANY DATE →')}</span>
        <DatePicker todayIso={todayIso} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
        <SlotChip label={t('Morning')} sub={t('ARRIVE 09:00–12:00')} on={slot === 0} onClick={() => setSlot(0)} level={selectedLoad?.morning.level} closure={selectedLoad?.morning.closure} />
        <SlotChip label={t('Afternoon')} sub={t('ARRIVE 12:00–15:30')} on={slot === 1} onClick={() => setSlot(1)} level={selectedLoad?.afternoon.level} closure={selectedLoad?.afternoon.closure} />
      </div>
      {activityFullMsg && (
        <div role="alert" data-testid="activity-full" style={{ marginTop: '10px', background: '#FFE2E7', border: '1.5px solid #FF3358', borderRadius: '12px', padding: '10px 14px', fontSize: '13.5px', fontWeight: 600, color: '#340057' }}>
          {activityFullMsg}
        </div>
      )}
      {holdUntil && (
        <div data-testid="hold-note" style={{ marginTop: '10px', fontFamily: MONO, fontSize: '10px', letterSpacing: '.08em', color: '#1E9E4A', fontWeight: 700 }}>
          {t('YOUR PLACES ARE HELD UNTIL {time}', { time: holdUntil })}
        </div>
      )}
      {Object.keys(avail).length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px', fontFamily: MONO, fontSize: '9.5px', letterSpacing: '.06em', color: 'rgba(52,0,87,.6)' }}>
          <span>{t('DOTS = MORNING · AFTERNOON, FROM BOOKINGS SO FAR:')}</span>
          {LEVELS.map((l) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={levelDot(l)} />{t(LEVEL_LABEL[l])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

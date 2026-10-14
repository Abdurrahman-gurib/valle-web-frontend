import { useEffect, useState } from 'react';
import { getBackupStatus, type BackupRun, type BackupStatus } from '../../lib/staffApi';
import { cn } from '../../lib/utils';
import { Spinner } from './ui';
import { Kpi, Panel } from './reportUi';

const TH = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
const TD = 'px-[12px] py-[10px] text-[13.5px] border-t border-valle-lilac whitespace-nowrap';
const TDNUM = cn(TD, 'font-mono text-right text-[12.5px]');

/**
 * Backup check for managers: last night's database backup, this month's test
 * restore, and the recent runs. The data is written by the db-backup cron
 * service (Backend/scripts/db-backup.js); this panel only reads it.
 */
const STATE: Record<BackupStatus['state'], { label: string; bg: string; fg: string }> = {
  ok: { label: 'ALL GOOD', bg: '#E2FFEB', fg: '#12B54A' },
  warning: { label: 'CHECK OVERDUE', bg: '#FFFFE2', fg: '#8A7A00' },
  failing: { label: 'FAILING', bg: '#FFE2E7', fg: '#D91E44' },
  unknown: { label: 'NO RUN YET', bg: '#F1F1F4', fg: '#6B6B78' },
};

const when = (iso?: string) => (iso
  ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'never');

function size(bytes: number): string {
  if (!bytes) return '';
  const units = ['B', 'kB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${i === 0 ? n : n.toFixed(1)} ${units[i]}`;
}

function ago(iso?: string): string {
  if (!iso) return '';
  const hours = (Date.now() - Date.parse(iso)) / 3_600_000;
  if (hours < 1) return 'less than an hour ago';
  if (hours < 48) return `${Math.floor(hours)} h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

const KIND: Record<BackupRun['kind'], string> = { backup: 'Nightly backup', restore_test: 'Restore test' };

/** Off-site copy of a nightly backup (API fields since migration 023; absent on older runs). */
type WithOffsite = { offsiteStatus?: '' | 'not_configured' | 'uploaded' | 'failed'; offsiteDetail?: string };
function offsite(run: BackupRun): { text: string; color: string } | null {
  const o = run as BackupRun & WithOffsite;
  if (o.offsiteStatus === 'uploaded') return { text: 'Off-site copy: uploaded', color: '#12B54A' };
  if (o.offsiteStatus === 'not_configured') return { text: 'Off-site copy: not configured', color: 'rgba(52,0,87,.6)' };
  if (o.offsiteStatus === 'failed') return { text: `Off-site copy: failed: ${o.offsiteDetail || 'unknown error'}`, color: '#D91E44' };
  return null;
}

export default function BackupsPanel() {
  const [data, setData] = useState<BackupStatus | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    getBackupStatus()
      .then((d) => { if (!dead) setData(d); })
      .catch(() => { if (!dead) setErr('Could not load the backup log.'); });
    return () => { dead = true; };
  }, []);

  const state = data ? STATE[data.state] : null;
  return (
    <div data-testid="backups-panel">
      <Panel
        title="DATABASE BACKUPS · NIGHTLY BACKUP, MONTHLY TEST RESTORE"
        action={state && (
          <span data-testid="backup-state" className="font-mono text-[10.5px] font-bold tracking-[.12em] px-[10px] py-[5px] rounded-[999px]" style={{ background: state.bg, color: state.fg }}>
            {state.label}
          </span>
        )}
      >
        <div className="p-[14px]">
          {err && <div role="alert" className="text-[#D91E44] text-[13.5px]">{err}</div>}
          {!data && !err && <Spinner />}
          {data && (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[12px]">
                <Kpi
                  tag="LAST GOOD BACKUP"
                  value={data.lastGoodBackup ? ago(data.lastGoodBackup.finishedAt) : 'none'}
                  sub={data.lastGoodBackup ? `${when(data.lastGoodBackup.finishedAt)} · ${size(data.lastGoodBackup.bytes)} · ${data.lastGoodBackup.rows.toLocaleString('en')} rows` : 'No backup has completed yet'}
                  accent={data.lastGoodBackup ? '#33FF74' : '#FF3358'}
                />
                <Kpi
                  tag="LAST PASSED RESTORE TEST"
                  value={data.lastGoodRestoreTest ? ago(data.lastGoodRestoreTest.finishedAt) : 'none'}
                  sub={data.lastGoodRestoreTest ? `${when(data.lastGoodRestoreTest.finishedAt)} · ${data.lastGoodRestoreTest.tables} tables verified` : 'Runs with the first backup of each month'}
                  accent={data.lastGoodRestoreTest ? '#33FF74' : '#FFFC33'}
                />
              </div>
              {data.lastBackup && offsite(data.lastBackup) && (
                <p data-testid="backup-offsite" className="text-[13.5px] font-bold mt-[14px] mx-0 mb-0" style={{ color: offsite(data.lastBackup)!.color }}>
                  {offsite(data.lastBackup)!.text}
                </p>
              )}
              {data.problems.length > 0 && (
                <ul data-testid="backup-problems" className={cn('mt-[14px] mx-0 mb-0 pl-[18px] text-[13.5px] leading-[1.55]', data.state === 'failing' ? 'text-[#D91E44]' : 'text-[#8A7A00]')}>
                  {data.problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
              <p className="text-[12.5px] leading-[1.55] text-[rgba(52,0,87,.65)] mt-[14px] mx-0 mb-0">
                Every night at 02:00 the database is copied to separate storage (14 nightly and 12 monthly copies are kept). Once a month the newest copy is
                restored into a scratch database and compared table by table with the original. If this panel is not green, tell the website administrator.
              </p>
            </>
          )}
        </div>
        {data && data.recent.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>WHEN</th><th className={TH}>RUN</th><th className={TH}>RESULT</th><th className={cn(TH, 'text-right')}>SIZE</th><th className={cn(TH, 'text-right')}>ROWS</th><th className={TH}>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id}>
                    <td className={TD}>{when(r.finishedAt)}</td>
                    <td className={TD}>{KIND[r.kind]}</td>
                    <td className={cn(TD, 'font-bold', r.ok ? 'text-[#12B54A]' : 'text-[#D91E44]')}>{r.ok ? 'Passed' : 'Failed'}</td>
                    <td className={TDNUM}>{size(r.bytes)}</td>
                    <td className={TDNUM}>{r.rows ? r.rows.toLocaleString('en') : ''}</td>
                    <td className={cn(TD, 'whitespace-normal min-w-[220px] text-[rgba(52,0,87,.7)]')}>
                      {r.detail}
                      {offsite(r) && <div className="mt-[2px]" style={{ color: offsite(r)!.color }}>{offsite(r)!.text}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getBackupStatus, type BackupRun, type BackupStatus } from '../../lib/staffApi';
import { Spinner, mono } from './ui';
import { Kpi, Panel, td, tdNum, th } from './reportUi';

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
          <span data-testid="backup-state" style={{ ...mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', background: state.bg, color: state.fg, padding: '5px 10px', borderRadius: 999 }}>
            {state.label}
          </span>
        )}
      >
        <div style={{ padding: 14 }}>
          {err && <div role="alert" style={{ color: '#D91E44', fontSize: 13.5 }}>{err}</div>}
          {!data && !err && <Spinner />}
          {data && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
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
              {data.problems.length > 0 && (
                <ul data-testid="backup-problems" style={{ margin: '14px 0 0', paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55, color: data.state === 'failing' ? '#D91E44' : '#8A7A00' }}>
                  {data.problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(52,0,87,.65)', margin: '14px 0 0' }}>
                Every night at 02:00 the database is copied to separate storage (14 nightly and 12 monthly copies are kept). Once a month the newest copy is
                restored into a scratch database and compared table by table with the original. If this panel is not green, tell the website administrator.
              </p>
            </>
          )}
        </div>
        {data && data.recent.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>WHEN</th><th style={th}>RUN</th><th style={th}>RESULT</th><th style={{ ...th, textAlign: 'right' }}>SIZE</th><th style={{ ...th, textAlign: 'right' }}>ROWS</th><th style={th}>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{when(r.finishedAt)}</td>
                    <td style={td}>{KIND[r.kind]}</td>
                    <td style={{ ...td, fontWeight: 700, color: r.ok ? '#12B54A' : '#D91E44' }}>{r.ok ? 'Passed' : 'Failed'}</td>
                    <td style={tdNum}>{size(r.bytes)}</td>
                    <td style={tdNum}>{r.rows ? r.rows.toLocaleString('en') : ''}</td>
                    <td style={{ ...td, whiteSpace: 'normal', minWidth: 220, color: 'rgba(52,0,87,.7)' }}>{r.detail}</td>
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

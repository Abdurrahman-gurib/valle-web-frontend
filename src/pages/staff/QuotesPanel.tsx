import { useEffect, useState } from 'react';
import type { QuoteRow } from '../../types';
import { listQuotes } from '../../lib/staffApi';
import { Btn, EmptyState, Spinner, card, mono, relTime } from './ui';
import { Panel, td, th } from './reportUi';

const PAGE_SIZE = 20;

/** Phone number as a wa.me target: digits only, no leading zeros or plus. */
export const waDigits = (phone: string | null | undefined): string => (phone || '').replace(/\D/g, '').replace(/^0+/, '');

/**
 * Team-building and group quote requests from the Packages page, newest first,
 * with one-click ways to answer (WhatsApp, call, e-mail with a prefilled subject).
 */
export default function QuotesPanel() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    setLoading(true);
    listQuotes(page, PAGE_SIZE)
      .then((r) => { if (!dead) { setRows(r.items || []); setTotal(r.total || 0); setErr(''); } })
      .catch(() => { if (!dead) setErr('Could not load the quote requests.'); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div data-testid="quotes-panel">
      {err && <div style={{ ...card, padding: 14, marginBottom: 14, color: '#D91E44', fontWeight: 600 }}>{err}</div>}
      {loading && rows.length === 0 && <div style={{ padding: 30, display: 'flex', justifyContent: 'center' }}><Spinner color="#7333FF" /></div>}
      {!loading && rows.length === 0 && !err && (
        <EmptyState title="No quote requests yet" note="Requests sent from the team-building form on the Packages page land here." />
      )}
      {rows.length > 0 && (
        <Panel title={`GROUP & TEAM-BUILDING QUOTE REQUESTS · ${total}`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead><tr style={{ background: '#F7F3FF' }}>
                <th style={th}>Received</th><th style={th}>Contact</th><th style={th}>Company</th><th style={th}>Group</th><th style={th}>Preferred date</th><th style={th}>Message</th><th style={th}>Reply</th>
              </tr></thead>
              <tbody>
                {rows.map((q) => {
                  const wa = waDigits(q.phone);
                  const subject = encodeURIComponent(`Your group visit to VALLÉ Advenature Park${q.company ? ' · ' + q.company : ''}`);
                  return (
                    <tr key={q.id}>
                      <td style={td}><div>{relTime(q.createdAt)}</div><div style={{ ...mono, fontSize: 9.5, color: 'rgba(52,0,87,.55)' }}>{new Date(q.createdAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}</div></td>
                      <td style={{ ...td, fontWeight: 600 }}>{q.name}<div style={{ ...mono, fontSize: 10, fontWeight: 400, color: 'rgba(52,0,87,.6)' }}>{q.email}{q.phone ? ' · ' + q.phone : ''}</div></td>
                      <td style={td}>{q.company || '—'}</td>
                      <td style={td}>{q.groupSize || '—'}</td>
                      <td style={td}>{q.preferredDate || '—'}</td>
                      <td style={{ ...td, whiteSpace: 'normal', maxWidth: 340, fontSize: 13 }}>{q.message || '—'}</td>
                      <td style={td}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <a href={`mailto:${q.email}?subject=${subject}`} style={linkBtn}>E-mail</a>
                          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" style={linkBtn}>WhatsApp</a>}
                          {q.phone && <a href={`tel:${q.phone.replace(/\s+/g, '')}`} style={linkBtn}>Call</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, borderTop: '1px solid #EBE2FF' }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: '.1em', color: 'rgba(52,0,87,.6)' }}>PAGE {page} OF {pages}</span>
              <span style={{ flex: 1 }} />
              <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Btn>
              <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>Next</Btn>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

const linkBtn = {
  border: '1.5px solid #340057', color: '#340057', borderRadius: 999, padding: '6px 11px', fontSize: 12, fontWeight: 700,
  textDecoration: 'none', whiteSpace: 'nowrap' as const,
};

import { useEffect, useState } from 'react';
import type { QuoteRow } from '../../types';
import { listQuotes, listReservations, setReservationStatus, type ReservationRow } from '../../lib/staffApi';
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

  // restaurant tables asked for on the site: soonest first, confirm or decline here
  const [tables, setTables] = useState<ReservationRow[]>([]);
  const [tableBusy, setTableBusy] = useState('');
  const loadTables = () => listReservations().then(setTables).catch(() => { /* shown empty */ });
  useEffect(() => { void loadTables(); }, []);
  const decide = async (id: string, status: 'confirmed' | 'cancelled') => {
    setTableBusy(id);
    try { const row = await setReservationStatus(id, status); setTables((rows) => rows.map((r) => (r.id === id ? row : r))); } finally { setTableBusy(''); }
  };

  return (
    <div data-testid="quotes-panel">
      <Panel title={`RESTAURANT TABLES · ${tables.filter((r) => r.status === 'requested').length} TO CONFIRM`}>
        {tables.length === 0 && <div style={{ padding: 14, fontSize: 13.5, color: 'rgba(52,0,87,.6)' }}>No table requests yet. Guests ask for one from the restaurant pages.</div>}
        {tables.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }} data-testid="tables-list">
              <thead><tr style={{ background: '#F7F3FF' }}><th style={th}>When</th><th style={th}>Restaurant</th><th style={th}>Guest</th><th style={th}>People</th><th style={th}>Pre-order</th><th style={th}>Notes</th><th style={th}>Status</th><th style={th}></th></tr></thead>
              <tbody>
                {tables.map((r) => (
                  <tr key={r.id} style={{ opacity: r.status === 'cancelled' ? 0.55 : 1 }}>
                    <td style={{ ...td, ...mono, fontSize: 12.5 }}>{r.visitDate} {r.visitTime}</td>
                    <td style={td}>{r.restaurantName}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{r.guestName}<div style={{ ...mono, fontSize: 10, fontWeight: 400, color: 'rgba(52,0,87,.6)' }}>{r.email}{r.phone ? ' · ' + r.phone : ''}{r.bookingRef ? ' · ' + r.bookingRef : ''}</div></td>
                    <td style={td}>{r.party}</td>
                    <td style={{ ...td, whiteSpace: 'normal', maxWidth: 260, fontSize: 12.5 }}>{r.preorder.length ? r.preorder.map((l) => `${l.qty} × ${l.item}`).join(', ') : '—'}</td>
                    <td style={{ ...td, whiteSpace: 'normal', maxWidth: 220, fontSize: 12.5 }}>{r.notes || '—'}</td>
                    <td style={{ ...td, ...mono, fontSize: 11, fontWeight: 700, color: r.status === 'confirmed' ? '#1E9E4A' : r.status === 'cancelled' ? '#D91E44' : '#8A6A00' }}>{r.status.toUpperCase()}</td>
                    <td style={td}>
                      {r.status === 'requested' && (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <Btn onClick={() => { void decide(r.id, 'confirmed'); }} disabled={tableBusy === r.id}>Confirm</Btn>
                          <Btn variant="ghost" onClick={() => { void decide(r.id, 'cancelled'); }} disabled={tableBusy === r.id}>Decline</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
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

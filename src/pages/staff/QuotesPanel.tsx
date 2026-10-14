import { useEffect, useState } from 'react';
import type { QuoteRow } from '../../types';
import { listQuotes, listReservations, setReservationStatus, type ReservationRow } from '../../lib/staffApi';
import { cn } from '../../lib/utils';
import { Btn, EmptyState, Spinner, relTime } from './ui';
import { Panel } from './reportUi';

const CARD = 'bg-white border-[1.5px] border-valle-lilac rounded-[18px]';
const TH = 'font-mono text-[9.5px] font-bold tracking-[.13em] uppercase text-valle-violet text-left px-[12px] py-[10px] whitespace-nowrap';
const TD = 'px-[12px] py-[10px] text-[13.5px] border-t border-valle-lilac whitespace-nowrap';

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
        {tables.length === 0 && <div className="p-[14px] text-[13.5px] text-[rgba(52,0,87,.6)]">No table requests yet. Guests ask for one from the restaurant pages.</div>}
        {tables.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[860px]" data-testid="tables-list">
              <thead><tr className="bg-[#F7F3FF]"><th className={TH}>When</th><th className={TH}>Restaurant</th><th className={TH}>Guest</th><th className={TH}>People</th><th className={TH}>Pre-order</th><th className={TH}>Notes</th><th className={TH}>Status</th><th className={TH}></th></tr></thead>
              <tbody>
                {tables.map((r) => (
                  <tr key={r.id} className={r.status === 'cancelled' ? 'opacity-[.55]' : 'opacity-100'}>
                    <td className={cn(TD, 'font-mono text-[12.5px]')}>{r.visitDate} {r.visitTime}</td>
                    <td className={TD}>{r.restaurantName}</td>
                    <td className={cn(TD, 'font-semibold')}>{r.guestName}<div className="font-mono text-[10px] font-normal text-[rgba(52,0,87,.6)]">{r.email}{r.phone ? ' · ' + r.phone : ''}{r.bookingRef ? ' · ' + r.bookingRef : ''}</div></td>
                    <td className={TD}>{r.party}</td>
                    <td className={cn(TD, 'whitespace-normal max-w-[260px] text-[12.5px]')}>{r.preorder.length ? r.preorder.map((l) => `${l.qty} × ${l.item}`).join(', ') : '—'}</td>
                    <td className={cn(TD, 'whitespace-normal max-w-[220px] text-[12.5px]')}>{r.notes || '—'}</td>
                    <td className={cn(TD, 'font-mono text-[11px] font-bold', r.status === 'confirmed' ? 'text-[#1E9E4A]' : r.status === 'cancelled' ? 'text-[#D91E44]' : 'text-[#8A6A00]')}>{r.status.toUpperCase()}</td>
                    <td className={TD}>
                      {r.status === 'requested' && (
                        <div className="inline-flex gap-[6px]">
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
      {err && <div className={cn(CARD, 'p-[14px] mb-[14px] text-[#D91E44] font-semibold')}>{err}</div>}
      {loading && rows.length === 0 && <div className="p-[30px] flex justify-center"><Spinner color="#7333FF" /></div>}
      {!loading && rows.length === 0 && !err && (
        <EmptyState title="No quote requests yet" note="Requests sent from the team-building form on the Packages page land here." />
      )}
      {rows.length > 0 && (
        <Panel title={`GROUP & TEAM-BUILDING QUOTE REQUESTS · ${total}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[860px]">
              <thead><tr className="bg-[#F7F3FF]">
                <th className={TH}>Received</th><th className={TH}>Contact</th><th className={TH}>Company</th><th className={TH}>Group</th><th className={TH}>Preferred date</th><th className={TH}>Message</th><th className={TH}>Reply</th>
              </tr></thead>
              <tbody>
                {rows.map((q) => {
                  const wa = waDigits(q.phone);
                  const subject = encodeURIComponent(`Your group visit to VALLÉ Advenature Park${q.company ? ' · ' + q.company : ''}`);
                  return (
                    <tr key={q.id}>
                      <td className={TD}><div>{relTime(q.createdAt)}</div><div className="font-mono text-[9.5px] text-[rgba(52,0,87,.7)]">{new Date(q.createdAt).toLocaleString('en-GB', { timeZone: 'Indian/Mauritius' })}</div></td>
                      <td className={cn(TD, 'font-semibold')}>{q.name}<div className="font-mono text-[10px] font-normal text-[rgba(52,0,87,.6)]">{q.email}{q.phone ? ' · ' + q.phone : ''}</div></td>
                      <td className={TD}>{q.company || '—'}</td>
                      <td className={TD}>{q.groupSize || '—'}</td>
                      <td className={TD}>{q.preferredDate || '—'}</td>
                      <td className={cn(TD, 'whitespace-normal max-w-[340px] text-[13px]')}>{q.message || '—'}</td>
                      <td className={TD}>
                        <div className="inline-flex gap-[6px]">
                          <a href={`mailto:${q.email}?subject=${subject}`} className={LINK_BTN} style={linkBtn}>E-mail</a>
                          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={LINK_BTN} style={linkBtn}>WhatsApp</a>}
                          {q.phone && <a href={`tel:${q.phone.replace(/\s+/g, '')}`} className={LINK_BTN} style={linkBtn}>Call</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex gap-[8px] items-center p-[12px] border-t border-valle-lilac">
              <span className="font-mono text-[10px] tracking-[.1em] text-[rgba(52,0,87,.6)]">PAGE {page} OF {pages}</span>
              <span className="flex-1" />
              <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Btn>
              <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>Next</Btn>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/* colour and underline stay inline: the global a{color} rule would beat a class */
const linkBtn = { color: '#340057', textDecoration: 'none' };
const LINK_BTN = 'border-[1.5px] border-valle-purple rounded-[999px] px-[11px] py-[6px] text-[12px] font-bold whitespace-nowrap';

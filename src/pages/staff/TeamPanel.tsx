import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createTeamMember, listTeam, sendTeamReset, updateTeamMember, type TeamMember, type TeamRole,
} from '../../lib/staffApi';
import { roleLabel } from '../../lib/hrApi';
import { ValleButton } from '../../components/ui/valle';
import { Panel, td, th } from './reportUi';
import { Spinner, inputStyle, mono, shortDate } from './ui';

const ROLES: TeamRole[] = ['agent', 'hr', 'manager'];
const fieldLabel = { ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(52,0,87,.6)' } as const;

/** Managers only (the API enforces it): staff accounts, roles, access and resets. */
export default function TeamPanel({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'agent' as TeamRole });
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    listTeam().then(setRows).catch((e: Error) => setError(e.message || 'Could not load the team'));
  }, []);
  useEffect(load, [load]);

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id); setError(''); setNote('');
    try { await fn(); setNote(ok); load(); }
    catch (e) { setError((e as Error).message || 'That did not work'); }
    finally { setBusyId(null); }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true); setError(''); setNote('');
    try {
      const res = await createTeamMember({ name: form.name.trim(), email: form.email.trim(), role: form.role });
      setNote(res.emailSent
        ? `${res.user.name} added. They have an e-mail to choose their password.`
        : `${res.user.name} added, but the e-mail could not be sent. Use "Send reset" once mail works.`);
      setForm({ name: '', email: '', role: 'agent' });
      load();
    } catch (err) {
      setError((err as Error).message || 'Could not add the account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Panel title="ADD A TEAM MEMBER">
        <form onSubmit={create} className="grid gap-3 p-3.5 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
          <div>
            <label htmlFor="team-name" style={fieldLabel}>NAME</label>
            <input id="team-name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
          </div>
          <div>
            <label htmlFor="team-email" style={fieldLabel}>WORK E-MAIL</label>
            <input id="team-email" type="email" required maxLength={160} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ ...inputStyle, marginTop: 6 }} />
          </div>
          <div>
            <label htmlFor="team-role" style={fieldLabel}>ROLE</label>
            <select id="team-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TeamRole })} style={{ ...inputStyle, marginTop: 6 }}>
              {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
          <ValleButton type="submit" variant="primary" size="sm" disabled={creating} className="px-5 sm:w-auto">
            {creating ? <Spinner /> : 'Add & e-mail link'}
          </ValleButton>
        </form>
      </Panel>

      {(error || note) && (
        <div role={error ? 'alert' : 'status'} className={`mb-3.5 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold ${error ? 'bg-[rgba(217,30,68,.1)] text-[#D91E44]' : 'bg-valle-lilac text-valle-purple'}`}>
          {error || note}
        </div>
      )}

      <Panel title="STAFF ACCOUNTS">
        {!rows ? (
          <div className="flex justify-center p-6"><Spinner color="#7333FF" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-valle-purple">
              <thead>
                <tr>
                  <th style={th}>Name</th><th style={th}>E-mail</th><th style={th}>Role</th>
                  <th style={th}>Two-step</th><th style={th}>Last sign-in</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const self = u.id === currentUserId;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className={u.active ? '' : 'opacity-55'}>
                      <td style={td}>
                        <span className="font-semibold">{u.name}</span>
                        {self && <span className="ml-1.5 font-mono text-[10px] tracking-widest text-valle-violet">YOU</span>}
                        {!u.active && <span className="ml-1.5 font-mono text-[10px] tracking-widest text-[#D91E44]">INACTIVE</span>}
                      </td>
                      <td style={td}>{u.email}</td>
                      <td style={td}>
                        <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.name}</label>
                        <select
                          id={`role-${u.id}`}
                          value={u.role}
                          disabled={busy || self}
                          title={self ? 'You cannot change your own role' : undefined}
                          onChange={(e) => void act(u.id, () => updateTeamMember(u.id, { role: e.target.value as TeamRole }), `${u.name} is now ${roleLabel(e.target.value)}.`)}
                          style={{ ...inputStyle, padding: '6px 10px', width: 'auto', fontSize: 13 }}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                        </select>
                      </td>
                      <td style={td}>{u.twoFactorEnabled ? <span className="font-bold text-[#0A8F3C]">On</span> : <span className="text-valle-purple/55">Off</span>}</td>
                      <td style={td}>{u.lastLoginAt ? shortDate(u.lastLoginAt) : 'Never'}</td>
                      <td style={td}>
                        <div className="flex gap-2">
                          <ValleButton
                            variant="outline" size="sm" className="w-auto px-3.5 py-1.5 text-[12.5px]"
                            disabled={busy || !u.active}
                            onClick={() => void act(u.id, () => sendTeamReset(u.id), `Reset link e-mailed to ${u.email}.`)}
                          >
                            Send reset
                          </ValleButton>
                          {!self && (
                            <ValleButton
                              variant={u.active ? 'outline' : 'dark'} size="sm" className="w-auto px-3.5 py-1.5 text-[12.5px]"
                              disabled={busy}
                              onClick={() => void act(u.id, () => updateTeamMember(u.id, { active: !u.active }), u.active ? `${u.name} can no longer sign in.` : `${u.name} can sign in again.`)}
                            >
                              {u.active ? 'Deactivate' : 'Reactivate'}
                            </ValleButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

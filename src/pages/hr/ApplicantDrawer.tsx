import { useState } from 'react';
import {
  APPLICATION_STATUSES, errorText, safeCvHref, updateApplication,
  type ApplicationStatus, type HrApplication,
} from '../../lib/hrApi';
import { color } from '../../styles/theme';
import { Btn, Spinner, shortDate } from '../staff/ui';
import { cn } from '@/lib/utils';
import {
  CopyButton, DetailLine, Drawer, Notice, Pill, SectionTitle, TextArea,
  cardCls, fieldCls, optionValue,
} from './hrUi';

export const yearsLabel = (y: number | null): string =>
  y === null || y === undefined ? 'Not given' : y === 0 ? 'No experience yet' : y + ' year' + (y === 1 ? '' : 's');

/** One application, with the two things HR changes: status and the internal note. */
export function ApplicantDrawer({ app, roleName, narrow, onClose, onSaved }: {
  app: HrApplication;
  roleName: string;
  narrow: boolean;
  onClose: () => void;
  onSaved: (a: HrApplication) => void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>(app.status);
  const [note, setNote] = useState(app.hrNote || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const dirty = status !== app.status || note !== (app.hrNote || '');
  const cv = safeCvHref(app.cvUrl);
  const letterLines = app.coverLetter ? app.coverLetter.split('\n') : [];

  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm('Close without saving? The status and note changes will be lost.')) return;
    onClose();
  };

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const saved = await updateApplication(app.id, { status, hrNote: note });
      onSaved(saved);
      setOk('Saved.');
    } catch (e) {
      setErr(errorText(e, 'Could not save this application. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const gridCls = cn(
    cardCls, 'bg-[#F7F3FF] p-[16px] grid gap-[14px]',
    narrow ? 'grid-cols-[1fr]' : 'grid-cols-[1fr_1fr]',
  );

  return (
    <Drawer
      eyebrow="APPLICATION"
      title={app.fullName}
      onClose={close}
      narrow={narrow}
      width={520}
      footer={
        <>
          <Btn variant="ghost" onClick={close} disabled={busy}>Close</Btn>
          <span className="flex-1" />
          <Btn onClick={() => { void save(); }} disabled={busy || !dirty}>
            {busy ? <Spinner /> : 'Save changes'}
          </Btn>
        </>
      }
    >
      <div className="flex items-center gap-[10px] mb-[16px] flex-wrap">
        <Pill value={app.status} />
        <span className="font-mono text-[10px] tracking-[.1em] text-[rgba(52,0,87,.5)]">
          APPLIED {shortDate(app.createdAt)}
        </span>
      </div>

      <div className={gridCls}>
        <DetailLine tag="APPLYING FOR" value={roleName} />
        <DetailLine tag="EXPERIENCE" value={yearsLabel(app.yearsExperience)} />
        <DetailLine tag="EMAIL" value={app.email} />
        <DetailLine tag="PHONE" value={app.phone} />
        <DetailLine tag="CV LINK">
          {cv ? (
            <a
              href={cv}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold break-all"
              style={{ color: color.violet }}
            >
              Open CV
            </a>
          ) : (app.cvUrl ? 'Link was not a usable web address' : 'Not given')}
        </DetailLine>
        <DetailLine tag="LAST UPDATED" value={shortDate(app.updatedAt)} />
      </div>

      <div className="flex gap-[8px] flex-wrap mt-[12px]">
        <CopyButton value={app.email} label="Copy email" />
        {app.phone ? <CopyButton value={app.phone} label="Copy phone" /> : null}
        <a
          href={'mailto:' + encodeURIComponent(app.email) + '?subject=' + encodeURIComponent('Your application to VALLÉ: ' + roleName)}
          className="border-[1.5px] border-solid border-valle-lilac rounded-[999px] py-[7px] px-[14px] text-[12.5px] font-bold whitespace-nowrap"
          style={{ color: color.purple, textDecoration: 'none' }}
        >
          Write a reply
        </a>
      </div>

      <SectionTitle>Cover letter</SectionTitle>
      <div className={cn(cardCls, 'p-[16px] text-[14px] leading-[1.6]')}>
        {letterLines.length === 0 && (
          <span className="text-[rgba(52,0,87,.7)]">No cover letter was sent.</span>
        )}
        {letterLines.map((line, i) => (
          <p key={i} className={cn(i === 0 ? 'm-0' : 'mt-[10px] mx-0 mb-0', '[word-break:break-word]')}>{line}</p>
        ))}
      </div>

      <SectionTitle>Move this application</SectionTitle>
      <select
        id={'app-status-' + app.id}
        value={status}
        onChange={(e) => setStatus(optionValue(APPLICATION_STATUSES, e.target.value))}
        disabled={busy}
        aria-label="Application status"
        className={cn(fieldCls, 'cursor-pointer appearance-auto')}
      >
        {APPLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      <div className="mt-[14px]">
        <TextArea
          id={'app-note-' + app.id}
          label="Internal note"
          value={note}
          onChange={setNote}
          disabled={busy}
          rows={4}
          maxLength={4000}
          hint="Only the hiring team sees this. It is never sent to the applicant."
          placeholder="Interview notes, next step, who is following up."
        />
      </div>

      {(err || ok) && (
        <div className="mt-[14px]">
          <Notice tone={err ? 'error' : 'ok'}>{err || ok}</Notice>
        </div>
      )}
    </Drawer>
  );
}

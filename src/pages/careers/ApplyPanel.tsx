import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Stripes } from '../../components/Stripes';
import type { VacancyDetail } from '../../types';
import { color } from '../../styles/theme';
import { paths } from '../../lib/nav';
import { useT } from '../../i18n';
import { CAREERS_EMAIL, DISPLAY, MONO } from './shared';
import { GhostButton, SubmitButton, TextArea, TextField } from './formParts';
import { COVER_MAX, type Application } from './useApplication';

/** The sticky "Apply now" card: the form, then the thank-you and next steps once it is sent. */
export function ApplyPanel({ vacancy, app, isMobile }: { vacancy: VacancyDetail; app: Application; isMobile: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const { field, sent } = app;
  return (
    <aside
      id="apply"
      className={cn('top-[92px]', isMobile ? 'static mt-2' : 'sticky mt-0')}
    >
      <div className="bg-white rounded-[24px] overflow-hidden shadow-[0_0_0_1.5px_#EBE2FF,0_18px_40px_-22px_rgba(52,0,87,.45)]">
        <div className="bg-valle-purple py-[18px] px-[22px]">
          <div className={cn(MONO, 'text-valle-yellow')}>{sent ? t('APPLICATION SENT') : t('APPLY NOW')}</div>
          <div className={cn(DISPLAY, 'text-[24px] text-white mt-[6px]')}>
            {sent ? t('Thank you') : t('Tell us about you')}
          </div>
        </div>
        <Stripes height={8} />

        {sent ? (
          <div className="p-[clamp(20px,2.4vw,26px)] [animation:vfadeup_.4s_ease_both]">
            <div className="bg-[#E2FFEB] border-[1.5px] border-solid border-valle-green rounded-[18px] py-[18px] px-5">
              <div className={cn(DISPLAY, 'text-[22px] text-valle-purple')}>{t('Application received')}</div>
              <div className="font-mono text-[10.5px] font-normal tracking-[.14em] text-[rgba(52,0,87,.65)] mt-2">
                {app.doneRef ? t('REFERENCE {ref}', { ref: app.doneRef }) + ' · ' : ''}{vacancy.title.toUpperCase()}
              </div>
            </div>
            <div className={cn(MONO, 'text-valle-violet mt-5')}>{t('WHAT HAPPENS NEXT')}</div>
            <ol className="mt-3 mb-0 mx-0 p-0 list-none grid gap-3">
              {[
                t('Our HR team reads every application, usually within five working days.'),
                t('If your profile fits the role, we email you to arrange a chat, on site or by phone.'),
                t('Keep an eye on your spam folder: our reply comes from a vallepark.com address.'),
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span aria-hidden className={cn(MONO, 'bg-[#F7F3FF] text-valle-violet rounded-[999px] w-[26px] h-[26px] inline-flex items-center justify-center shrink-0')}>{i + 1}</span>
                  <span className="text-[14.5px] leading-[1.55] text-[rgba(52,0,87,.78)]">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-[22px] flex gap-[10px] flex-wrap">
              <GhostButton label={t('Browse other roles')} onClick={() => navigate(paths.vacancies())} />
            </div>
          </div>
        ) : (
          <form onSubmit={app.onSubmit} noValidate className="p-[clamp(20px,2.4vw,26px)] grid gap-4">
            <TextField
              id="fullName" label={t('Full name')} required autoComplete="name" maxLength={120}
              placeholder="Jean-Marc Lafleur"
              {...field('fullName')}
            />
            <TextField
              id="email" label={t('Email')} required type="email" inputMode="email" autoComplete="email" maxLength={180}
              placeholder="you@example.com"
              {...field('email')}
            />
            <TextField
              id="phone" label={t('Phone')} type="tel" inputMode="tel" autoComplete="tel" maxLength={40}
              placeholder="+230 5xxx xxxx"
              {...field('phone')}
            />
            <TextField
              id="cvUrl" label={t('Link to your CV')} type="url" inputMode="url" maxLength={500}
              placeholder="https://drive.google.com/..."
              hint={t('A public link (Drive, Dropbox, LinkedIn). We do not accept file uploads.')}
              {...field('cvUrl')}
            />
            <TextField
              id="years" label={t('Years of experience')} inputMode="numeric" maxLength={3}
              placeholder="3"
              {...field('years')}
            />
            <TextArea
              id="coverLetter" label={t('Why you')} max={COVER_MAX}
              placeholder={t('Tell us what you would bring to the valley.')}
              {...field('coverLetter')}
            />

            {app.apiErr && (
              <div role="alert" className="bg-[#FFE2E7] border-[1.5px] border-solid border-[#D91E44] rounded-[12px] py-[13px] px-4 text-[14px] leading-[1.5] text-valle-purple">
                {app.apiErr}
              </div>
            )}

            {app.tried && app.hasErrors && !app.apiErr && (
              <div role="alert" className="bg-[#FFFFE2] border-[1.5px] border-solid border-valle-lilac rounded-[12px] py-[13px] px-4 text-[14px] leading-[1.5] text-valle-purple">
                {t('Please check the highlighted fields before sending.')}
              </div>
            )}

            <SubmitButton busy={app.busy} disabled={app.tried && app.hasErrors} />

            <div className="text-[12.5px] leading-[1.55] text-[rgba(52,0,87,.7)]">
              {t('We use your details only to consider you for this role. Prefer email? Write to')}{' '}
              <a href={'mailto:' + CAREERS_EMAIL} style={{ color: color.violet }}>{CAREERS_EMAIL}</a>.
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}

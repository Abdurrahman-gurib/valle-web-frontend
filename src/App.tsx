import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import NotFoundPage from './pages/NotFound';
import { CatalogProvider } from './store/CatalogContext';
import { LANGS, LangProvider } from './i18n';
import { paths } from './lib/nav';
import { AppStoreProvider } from './store/AppStore';
import { StaffAuthProvider } from './store/StaffAuth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MyDayDrawer } from './components/MyDayDrawer';
import { RateGate } from './components/RateGate';
import { ChatWidget } from './components/ChatWidget';
import { OptionPicker } from './components/OptionPicker';
import { CookieConsent } from './components/CookieConsent';
import { useIsMobile } from './hooks/useIsMobile';
import { OfflineStatus } from './components/InstallApp';
import { ParkStatusBanner } from './components/ParkStatusBanner';
import StaffLogin from './pages/staff/Login';
import StaffResetPassword from './pages/staff/ResetPassword';
import { lazyPage, registerPage } from './lib/lazyPage';
// public pages: one chunk each, loaded for the page being opened (see lib/lazyPage)
const HomePage = lazyPage(() => import('./pages/Home'));
registerPage(/^\/$/, HomePage);
const ExplorePage = lazyPage(() => import('./pages/Explore'));
registerPage(/^\/explore$/, ExplorePage);
const DetailPage = lazyPage(() => import('./pages/Detail'));
registerPage(/^\/activities\//, DetailPage);
const PackagesPage = lazyPage(() => import('./pages/Packages'));
registerPage(/^\/packages(\/|$)/, PackagesPage);
const RestaurantPage = lazyPage(() => import('./pages/Restaurant'));
registerPage(/^\/dine\//, RestaurantPage);
const BookingPage = lazyPage(() => import('./pages/Booking'));
registerPage(/^\/booking$/, BookingPage);
const VacanciesPage = lazyPage(() => import('./pages/Vacancies'));
registerPage(/^\/vacancies$/, VacanciesPage);
const StoryPage = lazyPage(() => import('./pages/Story'));
registerPage(/^\/story$/, StoryPage);
const LegalPage = lazyPage(() => import('./pages/Legal'));
registerPage(/^\/(privacy|terms)$/, LegalPage);
const GroupsPage = lazyPage(() => import('./pages/Groups'));
registerPage(/^\/groups$/, GroupsPage);
const VacancyDetailPage = lazyPage(() => import('./pages/VacancyDetail'));
registerPage(/^\/vacancies\//, VacancyDetailPage);
const TicketPage = lazyPage(() => import('./pages/Ticket'));
registerPage(/^\/ticket\//, TicketPage);
const WaiverPage = lazyPage(() => import('./pages/Waiver'));
registerPage(/^\/waiver\//, WaiverPage);
// the back office (charts, QR scanner, chat console) loads only when staff open it
const StaffDashboard = lazy(() => import('./pages/staff/Dashboard'));
const HrDashboard = lazy(() => import('./pages/hr/Dashboard'));
const backOffice = (el: ReactNode) => <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F7F3FF' }} />}>{el}</Suspense>;

/** The first version of this site used /experience/:id; nginx 301s those, this covers client-side links. */
function LegacyExperienceRedirect() {
  const { id = '' } = useParams<{ id: string }>();
  return <Navigate to={paths.detail(id)} replace />;
}

/** Scrolls to top on route change; scrolls to #hash targets with header offset. */
function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      // small delay so the target page has rendered
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) window.scrollTo({ top: Math.max(0, el.offsetTop - 84), behavior: 'smooth' });
      }, 120);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    // keyed on location.key (unique per navigation) so a repeat click on the
    // same link still scrolls, like the original's unconditional scroll
  }, [location.key]);
  return null;
}

/**
 * Public site chrome: header (which owns the mobile action bar), footer, the two
 * global overlays, and the visitor chat launcher. The staff branch renders none
 * of this: the back office is a separate product surface on the same bundle.
 */
function PublicShell() {
  const isMobile = useIsMobile();
  return (
    <div style={{
      minHeight: '100vh', background: '#FFFFFF', color: '#340057',
      fontFamily: "'Work Sans',sans-serif", paddingBottom: isMobile ? 84 : 0,
    }}>
      <Header />
      <ParkStatusBanner />
      {/* a page not fetched yet (rare: the rest preload when the browser is idle) */}
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}><Outlet /></Suspense>
      <Footer />
      <MyDayDrawer />
      <RateGate />
      <OptionPicker />
      <ChatWidget />
      <CookieConsent />
      <OfflineStatus />
    </div>
  );
}

/** One StaffAuthProvider spans login + dashboard so signing in does not refetch /me. */
function StaffShell() {
  return (
    <StaffAuthProvider>
      <Outlet />
    </StaffAuthProvider>
  );
}

/** The public pages; mounted once per language prefix ('' for English, '/fr', '/de', '/it', '/ar', '/ru', '/es', '/hi'). */
function publicRoutes(prefix: string) {
  return [
    <Route key={prefix + '/'} path={prefix || '/'} element={<HomePage />} />,
    <Route key={prefix + 'explore'} path={prefix + '/explore'} element={<ExplorePage />} />,
    <Route key={prefix + 'act'} path={prefix + '/activities/:id'} element={<DetailPage />} />,
    <Route key={prefix + 'exp'} path={prefix + '/experience/:id'} element={<LegacyExperienceRedirect />} />,
    <Route key={prefix + 'pk'} path={prefix + '/packages'} element={<PackagesPage />} />,
    <Route key={prefix + 'pkg'} path={prefix + '/packages/:group'} element={<PackagesPage />} />,
    <Route key={prefix + 'dine'} path={prefix + '/dine/:id'} element={<RestaurantPage />} />,
    <Route key={prefix + 'book'} path={prefix + '/booking'} element={<BookingPage />} />,
    <Route key={prefix + 'story'} path={prefix + '/story'} element={<StoryPage />} />,
    <Route key={prefix + 'privacy'} path={prefix + '/privacy'} element={<LegalPage kind="privacy" />} />,
    <Route key={prefix + 'terms'} path={prefix + '/terms'} element={<LegalPage kind="terms" />} />,
    <Route key={prefix + 'groups'} path={prefix + '/groups'} element={<GroupsPage />} />,
    <Route key={prefix + 'vac'} path={prefix + '/vacancies'} element={<VacanciesPage />} />,
    <Route key={prefix + 'vacd'} path={prefix + '/vacancies/:slug'} element={<VacancyDetailPage />} />,
    <Route key={prefix + 'tk'} path={prefix + '/ticket/:ref'} element={<TicketPage />} />,
    <Route key={prefix + 'wv'} path={prefix + '/waiver/:ref'} element={<WaiverPage />} />,
  ];
}

export default function App() {
  return (
    // every Motion animation in the app follows the visitor's reduced-motion setting
    <MotionConfig reducedMotion="user">
    <LangProvider>
    <CatalogProvider>
      <AppStoreProvider>
        <ScrollManager />
        <Routes>
          {/* Back office, deliberately unlinked from the public site. One
              StaffAuthProvider spans reservations and careers, so a manager
              moving between them does not refetch the session. */}
          <Route element={<StaffShell />}>
            <Route path="/staff">
              <Route index element={backOffice(<StaffDashboard />)} />
              <Route path="login" element={<StaffLogin />} />
              <Route path="reset" element={<StaffResetPassword />} />
              <Route path="*" element={<Navigate to="/staff" replace />} />
            </Route>
            <Route path="/hr" element={backOffice(<HrDashboard />)} />
          </Route>

          {/* Public site. */}
          <Route element={<PublicShell />}>
            {LANGS.flatMap((l) => publicRoutes(l === 'en' ? '' : '/' + l))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AppStoreProvider>
    </CatalogProvider>
    </LangProvider>
    </MotionConfig>
  );
}

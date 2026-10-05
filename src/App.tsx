import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import NotFoundPage from './pages/NotFound';
import TicketPage from './pages/Ticket';
import WaiverPage from './pages/Waiver';
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
import HomePage from './pages/Home';
import ExplorePage from './pages/Explore';
import DetailPage from './pages/Detail';
import PackagesPage from './pages/Packages';
import RestaurantPage from './pages/Restaurant';
import BookingPage from './pages/Booking';
import { OfflineStatus } from './components/InstallApp';
import VacanciesPage from './pages/Vacancies';
import StoryPage from './pages/Story';
import VacancyDetailPage from './pages/VacancyDetail';
import StaffLogin from './pages/staff/Login';
import StaffDashboard from './pages/staff/Dashboard';
import HrDashboard from './pages/hr/Dashboard';

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
      <Outlet />
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
    <Route key={prefix + 'dine'} path={prefix + '/dine/:id'} element={<RestaurantPage />} />,
    <Route key={prefix + 'book'} path={prefix + '/booking'} element={<BookingPage />} />,
    <Route key={prefix + 'story'} path={prefix + '/story'} element={<StoryPage />} />,
    <Route key={prefix + 'vac'} path={prefix + '/vacancies'} element={<VacanciesPage />} />,
    <Route key={prefix + 'vacd'} path={prefix + '/vacancies/:slug'} element={<VacancyDetailPage />} />,
    <Route key={prefix + 'tk'} path={prefix + '/ticket/:ref'} element={<TicketPage />} />,
    <Route key={prefix + 'wv'} path={prefix + '/waiver/:ref'} element={<WaiverPage />} />,
  ];
}

export default function App() {
  return (
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
              <Route index element={<StaffDashboard />} />
              <Route path="login" element={<StaffLogin />} />
              <Route path="*" element={<Navigate to="/staff" replace />} />
            </Route>
            <Route path="/hr" element={<HrDashboard />} />
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
  );
}

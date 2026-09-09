import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { CatalogProvider } from './store/CatalogContext';
import { AppStoreProvider } from './store/AppStore';
import { StaffAuthProvider } from './store/StaffAuth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MyDayDrawer } from './components/MyDayDrawer';
import { RateGate } from './components/RateGate';
import { ChatWidget } from './components/ChatWidget';
import { useIsMobile } from './hooks/useIsMobile';
import HomePage from './pages/Home';
import ExplorePage from './pages/Explore';
import DetailPage from './pages/Detail';
import PackagesPage from './pages/Packages';
import RestaurantPage from './pages/Restaurant';
import BookingPage from './pages/Booking';
import VacanciesPage from './pages/Vacancies';
import VacancyDetailPage from './pages/VacancyDetail';
import StaffLogin from './pages/staff/Login';
import StaffDashboard from './pages/staff/Dashboard';
import HrDashboard from './pages/hr/Dashboard';

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
      <ChatWidget />
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

export default function App() {
  return (
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
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/experience/:id" element={<DetailPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/dine/:id" element={<RestaurantPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/vacancies" element={<VacanciesPage />} />
            <Route path="/vacancies/:slug" element={<VacancyDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppStoreProvider>
    </CatalogProvider>
  );
}

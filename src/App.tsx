import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

const ShopPage = lazy(() => import('./pages/ShopPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage').then(m => ({ default: m.ExplorePage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
const DeveloperReportsPage = lazy(() => import('./pages/DeveloperReportsPage'));
const DeveloperUsersPage = lazy(() => import('./pages/DeveloperUsersPage'));
const DeveloperServersPage = lazy(() => import('./pages/DeveloperServersPage').then(m => ({ default: m.DeveloperServersPage })));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));

function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4">
      <div className="w-8 h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin" />
      <span className="mt-3 text-xs text-app-muted font-mono">Загрузка интерфейса...</span>
    </div>
  );
}

import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ComplianceNotice } from './components/ComplianceNotice';
import { LegalCenterModal } from './components/LegalCenterModal';
import { GlobalTooltip } from './components/ui/Tooltip';

function ReferralCapture() {
  const location = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref') || params.get('r') || params.get('referral');
      if (ref && typeof ref === 'string' && ref.trim()) {
        const cleanRef = ref.trim();
        localStorage.setItem('pending_referral_code', cleanRef);
      }
    } catch {
      // ignore
    }
  }, [location.search]);

  return null;
}

function DeveloperRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center text-app-muted font-mono text-xs">
        Проверка прав доступа...
      </div>
    );
  }

  const isDev = Boolean(
    user?.email && user.email.toLowerCase().trim() === "gelgaev.dev@mail.ru"
  );

  if (!isDev) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
      }
    } catch {}
  }, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <RealtimeProvider>
          <AuthProvider>
            <BrowserRouter>
              <ReferralCapture />
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<AdminPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/referrals" element={<ReferralPage />} />
                  <Route path="/referral" element={<ReferralPage />} />
                  <Route path="/admin/referrals" element={<ReferralPage />} />
                  <Route
                    path="/users"
                    element={
                      <DeveloperRoute>
                        <DeveloperUsersPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/dev-users"
                    element={
                      <DeveloperRoute>
                        <DeveloperUsersPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <DeveloperRoute>
                        <DeveloperUsersPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <DeveloperRoute>
                        <DeveloperReportsPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/dev-reports"
                    element={
                      <DeveloperRoute>
                        <DeveloperReportsPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <DeveloperRoute>
                        <DeveloperReportsPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/servers"
                    element={
                      <DeveloperRoute>
                        <DeveloperServersPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/dev-servers"
                    element={
                      <DeveloperRoute>
                        <DeveloperServersPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route
                    path="/admin/servers"
                    element={
                      <DeveloperRoute>
                        <DeveloperServersPage />
                      </DeveloperRoute>
                    }
                  />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/catalog" element={<ExplorePage />} />
                  <Route path="/shops" element={<ExplorePage />} />
                  <Route path="/search" element={<ExplorePage />} />
                  <Route path="/moderation" element={<ModerationPage />} />
                  <Route path="/admin/moderation" element={<ModerationPage />} />
                  <Route path="/:slug" element={<ShopPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>

            {/* Russian Law Compliance: Consent Notice */}
            <ComplianceNotice onOpenPrivacyPolicy={() => setIsLegalModalOpen(true)} />

            {/* Global Legal Center Modal */}
            <LegalCenterModal
              isOpen={isLegalModalOpen}
              onClose={() => setIsLegalModalOpen(false)}
              shopName="TMA Builder"
              source="admin"
            />

            {/* Custom Global Tooltip Engine */}
            <GlobalTooltip />
          </BrowserRouter>
        </AuthProvider>
      </RealtimeProvider>
    </LanguageProvider>
  </ThemeProvider>
);
}




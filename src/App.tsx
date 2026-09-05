import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ShopPage from './pages/ShopPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPage from './pages/AdminPage';
import ReferralPage from './pages/ReferralPage';
import DeveloperReportsPage from './pages/DeveloperReportsPage';
import DeveloperUsersPage from './pages/DeveloperUsersPage';
import { DeveloperServersPage } from './pages/DeveloperServersPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ThemeProvider } from './context/ThemeContext';
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
    user?.email && (
      user.email.toLowerCase().trim() === "gelgaev.dev@mail.ru" ||
      user.email.toLowerCase().trim() === "roninfortnite71@gmail.com"
    )
  );

  if (!isDev) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  return (
    <ThemeProvider>
      <RealtimeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ReferralCapture />
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
              <Route path="/:slug" element={<ShopPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>

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
    </ThemeProvider>
  );
}




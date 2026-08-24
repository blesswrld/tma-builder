import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ShopPage from './pages/ShopPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPage from './pages/AdminPage';
import DeveloperReportsPage from './pages/DeveloperReportsPage';
import DeveloperUsersPage from './pages/DeveloperUsersPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ThemeProvider } from './context/ThemeContext';

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
  return (
    <ThemeProvider>
      <RealtimeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AdminPage />} />
              <Route path="/admin" element={<AdminPage />} />
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
              <Route path="/:slug" element={<ShopPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </RealtimeProvider>
    </ThemeProvider>
  );
}




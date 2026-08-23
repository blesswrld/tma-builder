import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ShopPage from './pages/ShopPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPage from './pages/AdminPage';
import DeveloperReportsPage from './pages/DeveloperReportsPage';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <RealtimeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AdminPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/reports" element={<DeveloperReportsPage />} />
              <Route path="/dev-reports" element={<DeveloperReportsPage />} />
              <Route path="/admin/reports" element={<DeveloperReportsPage />} />
              <Route path="/:slug" element={<ShopPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </RealtimeProvider>
    </ThemeProvider>
  );
}




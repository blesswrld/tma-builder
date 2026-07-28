import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ShopPage from './pages/ShopPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/:slug" element={<ShopPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}


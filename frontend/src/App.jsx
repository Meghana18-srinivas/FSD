import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Lots from './pages/Lots';
import LotDetail from './pages/LotDetail';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import { useAuth } from './context/AuthContext';

function Private({ children, admin }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Lots />} />
          <Route path="/lots/:id" element={<LotDetail />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/bookings" element={<Private><MyBookings /></Private>} />
          <Route path="/admin" element={<Private admin><Admin /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

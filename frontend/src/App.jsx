import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Game from './pages/Game';
import Leaderboard from './pages/Leaderboard';
import GoogleCallback from './pages/GoogleCallback';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="main-content" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/game" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="*" element={<Navigate to="/game" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

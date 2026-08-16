import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Companies from './pages/Companies';
import FeatureFlags from './pages/FeatureFlags';
// Phase 24 — Career Outcomes, Placement Intelligence & Workforce Analytics
import OutcomesOverview from './pages/OutcomesOverview';
import OutcomesRoles from './pages/OutcomesRoles';
import OutcomesSkills from './pages/OutcomesSkills';
import OutcomesDataQuality from './pages/OutcomesDataQuality';

// Setup React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// A simple protective wrapper that checks for a token
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Very basic dummy login for dev purposes (in real world, this would hit /api/v1/auth/login and verify role)
const Login = () => {
  const [token, setToken] = React.useState('');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      localStorage.setItem('admin_token', token);
      window.location.href = '/';
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '400px' }}>
        <h2 style={{ marginBottom: '8px', color: 'var(--brand-primary)' }}>Admin Login</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Paste your SUPER_ADMIN or ADMIN JWT token here to authenticate.
        </p>
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="JWT Token..." 
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', color: 'white', marginBottom: '16px' }}
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="companies" element={<Companies />} />
            <Route path="flags" element={<FeatureFlags />} />
            {/* Phase 24 — Career Outcomes */}
            <Route path="outcomes" element={<OutcomesOverview />} />
            <Route path="outcomes/roles" element={<OutcomesRoles />} />
            <Route path="outcomes/skills" element={<OutcomesSkills />} />
            <Route path="outcomes/data-quality" element={<OutcomesDataQuality />} />
            {/* Other routes can be stubbed out similarly */}
            <Route path="*" element={<div style={{ color: 'var(--text-muted)' }}>Under Construction</div>} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

import { useState } from 'react';
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

// Phase 25 — Skills Graph & Career Path Intelligence
import SkillsExplorer from './pages/SkillsExplorer';
import CareerPaths from './pages/CareerPaths';
import SkillsMarketDemand from './pages/SkillsMarketDemand';

// Phase 26 — Personalized Learning & Roadmaps
import LearningOverview from './pages/LearningOverview';

// UI components
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { FormControl, FormGroup, FormLabel } from './components/ui/Form';

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
  const [token, setToken] = useState('');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      localStorage.setItem('admin_token', token);
      window.location.href = '/';
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
      <Card style={{ width: '400px' }}>
        <h2 style={{ marginBottom: '8px', color: 'var(--brand-primary)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          Admin Login
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px', fontWeight: 500 }}>
          Paste your SUPER_ADMIN or ADMIN JWT token here to authenticate.
        </p>
        <form onSubmit={handleLogin}>
          <FormGroup>
            <FormLabel>JWT Token</FormLabel>
            <FormControl 
              type="text" 
              placeholder="eyJhbGciOi..." 
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </FormGroup>
          <Button type="submit" style={{ width: '100%', marginTop: '8px' }}>
            Login to Center
          </Button>
        </form>
      </Card>
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
            {/* Phase 25 — Skills Graph & Careers */}
            <Route path="skills" element={<SkillsExplorer />} />
            <Route path="career-paths" element={<CareerPaths />} />
            <Route path="skills/market-demand" element={<SkillsMarketDemand />} />
            {/* Phase 26 — Personalized Learning & Roadmaps */}
            <Route path="learning" element={<LearningOverview />} />
            {/* Other routes can be stubbed out similarly */}
            <Route path="*" element={<div style={{ color: 'var(--text-muted)' }}>Under Construction</div>} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

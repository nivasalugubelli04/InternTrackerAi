import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Flag, 
  LogOut, 
  Menu, 
  X,
  TrendingUp,
  Award,
  BookOpen,
  Database,
  Briefcase,
  Compass,
  Bot,
} from 'lucide-react';
import { Button } from './ui/Button';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar drawer automatically when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Core Operations',
      items: [
        { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
        { to: '/copilot', icon: <Bot size={18} />, label: 'AI Career Copilot' },
        { to: '/optimization', icon: <TrendingUp size={18} />, label: 'Career Optimization' },
        { to: '/career-command-center', icon: <Compass size={18} />, label: 'Career Command Center' },
        { to: '/portfolio-intelligence', icon: <Award size={18} />, label: 'Portfolio Intelligence' },
        { to: '/opportunities', icon: <Compass size={18} />, label: 'Opportunity Discovery' },
        { to: '/applications', icon: <Briefcase size={18} />, label: 'Applications Tracker' },
        { to: '/users', icon: <Users size={18} />, label: 'Users' },
        { to: '/companies', icon: <Building2 size={18} />, label: 'Companies & Scrapers' },
        { to: '/beta-insights', icon: <TrendingUp size={18} />, label: 'Beta & Feedback Insights' },
        { to: '/flags', icon: <Flag size={18} />, label: 'Feature Flags' },
      ]
    },
    {
      title: 'Placement Intelligence',
      items: [
        { to: '/outcomes', icon: <TrendingUp size={18} />, label: 'Outcomes Overview' },
        { to: '/analytics', icon: <TrendingUp size={18} />, label: 'Career Analytics' },
        { to: '/career-intelligence', icon: <Compass size={18} />, label: 'Career Intelligence' },
        { to: '/integrations', icon: <Database size={18} />, label: 'External Integrations' },
        { to: '/networking', icon: <Compass size={18} />, label: 'Networking & Referrals' },
        { to: '/outcomes/roles', icon: <Briefcase size={18} />, label: 'Role Analytics' },
        { to: '/outcomes/skills', icon: <Award size={18} />, label: 'Skill Match Gaps' },
        { to: '/outcomes/data-quality', icon: <Database size={18} />, label: 'Data Quality' },
        { to: '/career-strategy', icon: <Compass size={18} />, label: 'Career Strategy' },
        { to: '/market-trends', icon: <TrendingUp size={18} />, label: 'Market Trends' },
      ]
    },
    {
      title: 'Skill & Learning Catalog',
      items: [
        { to: '/skills', icon: <Compass size={18} />, label: 'Skills Explorer' },
        { to: '/career-paths', icon: <TrendingUp size={18} />, label: 'Career Paths' },
        { to: '/skills/market-demand', icon: <TrendingUp size={18} />, label: 'Market Demand' },
        { to: '/learning', icon: <BookOpen size={18} />, label: 'Learning roadmap' },
      ]
    }
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar overlay for mobile viewports */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 90
          }}
        />
      )}

      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div 
          style={{ 
            padding: '24px', 
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h2 style={{ color: 'var(--brand-primary)', fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '-0.02em' }}>
              InternTracker
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Admin Center
            </p>
          </div>
          
          {/* Mobile close button */}
          <button 
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'none',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
            className="mobile-close-btn"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation scroll area */}
        <div style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
          {navGroups.map((group, groupIndex) => (
            <div key={group.title} style={{ marginBottom: groupIndex === navGroups.length - 1 ? 0 : '24px' }}>
              <h4 
                style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '10px', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.08em',
                  paddingLeft: '12px',
                  marginBottom: '10px'
                }}
              >
                {group.title}
              </h4>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    marginBottom: '4px',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    textDecoration: 'none'
                  })}
                  onMouseEnter={(e) => {
                    const isActive = e.currentTarget.classList.contains('active');
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isActive = e.currentTarget.classList.contains('active');
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)' }}>
          <Button 
            onClick={handleLogout}
            variant="danger"
            style={{ width: '100%' }}
            icon={<LogOut size={16} />}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="admin-main">
        <div className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Hamburger Menu toggle */}
            <button 
              onClick={() => setSidebarOpen(true)}
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'none'
              }}
              className="hamburger-btn"
            >
              <Menu size={24} />
            </button>
            <h3 style={{ color: 'white', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '18px' }}>
              Operations Center
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>System Live</span>
            <span 
              className="pulse-glow"
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: 'var(--status-success)', 
                boxShadow: 'var(--shadow-success-glow)' 
              }}
            />
          </div>
        </div>

        {/* Inject CSS rules for responsive layout buttons */}
        <style>{`
          @media (max-width: 1024px) {
            .hamburger-btn {
              display: block !important;
            }
            .mobile-close-btn {
              display: flex !important;
            }
          }
        `}</style>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

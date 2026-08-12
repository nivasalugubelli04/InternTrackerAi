import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Server, Flag, LogOut } from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/users', icon: <Users size={20} />, label: 'Users' },
    { to: '/companies', icon: <Building2 size={20} />, label: 'Companies & Scrapers' },
    { to: '/flags', icon: <Flag size={20} />, label: 'Feature Flags' },
    { to: '/logs', icon: <Server size={20} />, label: 'System Logs' },
  ];

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>InternTracker</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Admin Center</p>
        </div>
        
        <div style={{ flex: 1, padding: '16px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: '8px',
                marginBottom: '8px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 16px',
              color: 'var(--status-error)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-header">
          <h3 style={{ color: 'var(--text-primary)' }}>Operations Center</h3>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

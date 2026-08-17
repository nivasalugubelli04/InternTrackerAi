import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`glass-card anim-fade-in ${className}`} {...props}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: React.ReactNode;
  trendType?: 'success' | 'warning' | 'error' | 'neutral';
}

export function StatCard({ title, value, icon, subtitle, trend, trendType = 'neutral' }: StatCardProps) {
  return (
    <div className="glass-card anim-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, var(--brand-primary), var(--accent-purple))'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {title}
          </p>
          <h2 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', lineHeight: '1.2' }}>
            {value}
          </h2>
          {trend && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12px' }}>
              <span className={`badge badge-${trendType}`}>{trend}</span>
            </div>
          )}
          {subtitle && (
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px', fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>
        <div 
          style={{ 
            color: 'var(--brand-primary)', 
            background: 'var(--brand-light)', 
            padding: '10px', 
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

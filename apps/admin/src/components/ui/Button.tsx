import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'outline';
  size?: 'sm' | 'md' | 'lg' | string;
  icon?: React.ReactNode;
}

export function Button({ children, variant = 'primary', size, icon, className = '', style, ...props }: ButtonProps) {
  const getStyleClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'secondary':
      case 'outline':
        return 'btn-secondary';
      case 'danger':
        return 'btn-danger';
      case 'text':
        return '';
      default:
        return 'btn-primary';
    }
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: variant === 'text' ? '4px 8px' : '10px 18px',
    borderRadius: variant === 'text' ? '4px' : '10px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    border: variant === 'secondary' ? '1px solid var(--border-glass)' : 'none',
    ...style
  };

  return (
    <button 
      className={`${getStyleClass()} ${className}`} 
      style={baseStyles}
      {...props}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
}

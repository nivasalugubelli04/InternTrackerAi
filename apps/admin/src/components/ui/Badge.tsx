import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'primary';
}

export function Badge({ children, variant = 'neutral', className = '', ...props }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
}

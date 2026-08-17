import React from 'react';

export function FormGroup({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ marginBottom: '18px', ...style }} {...props}>{children}</div>;
}

export function FormLabel({ children, style, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label 
      style={{ 
        display: 'block', 
        fontSize: '12px', 
        fontWeight: 600, 
        color: 'var(--text-secondary)', 
        marginBottom: '8px', 
        textTransform: 'uppercase', 
        letterSpacing: '0.04em',
        ...style 
      }} 
      {...props}
    >
      {children}
    </label>
  );
}

interface FormControlProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  as?: 'input' | 'select' | 'textarea';
  children?: React.ReactNode;
}

export function FormControl({ as = 'input', children, style, className = '', ...props }: FormControlProps) {
  const baseStyles: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-glass)',
    background: 'var(--bg-input)',
    color: 'white',
    fontSize: '13px',
    fontWeight: 500,
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    ...style
  };

  const onFocus = (e: React.FocusEvent<any>) => {
    e.currentTarget.style.borderColor = 'var(--border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.15)';
  };

  const onBlur = (e: React.FocusEvent<any>) => {
    e.currentTarget.style.borderColor = 'var(--border-glass)';
    e.currentTarget.style.boxShadow = 'none';
  };

  if (as === 'select') {
    return (
      <select 
        style={baseStyles} 
        onFocus={onFocus} 
        onBlur={onBlur} 
        className={className}
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {children}
      </select>
    );
  }

  if (as === 'textarea') {
    return (
      <textarea 
        style={baseStyles} 
        onFocus={onFocus} 
        onBlur={onBlur} 
        className={className}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    );
  }

  return (
    <input 
      style={baseStyles} 
      onFocus={onFocus} 
      onBlur={onBlur} 
      className={className}
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
    />
  );
}

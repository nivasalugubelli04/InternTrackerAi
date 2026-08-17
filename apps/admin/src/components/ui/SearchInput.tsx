import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className = '', style, ...props }: SearchInputProps) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '320px', ...style }}>
      <Search 
        size={16} 
        style={{ 
          position: 'absolute', 
          left: '14px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: 'var(--text-muted)',
          pointerEvents: 'none'
        }} 
      />
      <input 
        type="text" 
        placeholder={placeholder} 
        value={value}
        onChange={onChange}
        className={className}
        style={{ 
          width: '100%', 
          padding: '10px 14px 10px 38px', 
          borderRadius: '10px', 
          border: '1px solid var(--border-glass)', 
          background: 'var(--bg-input)',
          color: 'white',
          fontSize: '13px',
          fontWeight: 500,
          outline: 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }} 
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-focus)';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-glass)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
    </div>
  );
}

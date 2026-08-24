import React from 'react';

export function Table({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="data-table-wrapper anim-fade-in">
      <table className={`data-table ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props}>{children}</thead>;
}

export function TableBody({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>;
}

export function TableRow({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props}>{children}</tr>;
}

export function TableCell({ children, style, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', ...style }} {...props}>{children}</td>;
}

export function TableHeaderCell({ children, style, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th 
      style={{ 
        fontFamily: 'var(--font-display)', 
        fontWeight: 600, 
        fontSize: '11px', 
        textTransform: 'uppercase', 
        letterSpacing: '0.08em', 
        color: 'var(--text-secondary)',
        borderBottom: '1px solid var(--border-glass)',
        ...style 
      }} 
      {...props}
    >
      {children}
    </th>
  );
}

export const Thead = TableHeader;
export const Tbody = TableBody;
export const Tr = TableRow;
export const Td = TableCell;
export const Th = TableHeaderCell;


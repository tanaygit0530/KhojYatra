import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'surface' | 'surface-alt';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface-alt',
  interactive = false,
  className = '',
  style,
  ...props
}) => {
  const bgVar = variant === 'surface' ? 'var(--color-surface)' : 'var(--color-surface-alt)';

  return (
    <div
      className={`khoj-card ${interactive ? 'interactive' : ''} ${className}`}
      style={{
        backgroundColor: bgVar,
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px',
        border: '1px solid rgba(20, 22, 26, 0.04)',
        transition: interactive ? 'transform 0.2s ease, box-shadow 0.2s ease' : undefined,
        cursor: interactive ? 'pointer' : 'default',
        ...style
      }}
      onMouseEnter={(e) => {
        if (interactive) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(20, 22, 26, 0.10)';
        }
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};

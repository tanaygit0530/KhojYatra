import React from 'react';

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const PillButton: React.FC<PillButtonProps> = ({
  children,
  icon,
  size = 'md',
  className = '',
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '8px 18px', fontSize: '0.875rem' },
    md: { padding: '12px 26px', fontSize: '1rem' },
    lg: { padding: '16px 36px', fontSize: '1.125rem' }
  }[size];

  return (
    <button
      className={`pill-button ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        backgroundColor: 'var(--color-cta-bg)',
        color: 'var(--color-cta-text)',
        borderRadius: 'var(--radius-pill)',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.2s ease',
        boxShadow: '0 4px 14px rgba(20, 22, 26, 0.12)',
        lineHeight: 1.2,
        ...sizeStyles,
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.opacity = '0.92';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.opacity = '1';
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

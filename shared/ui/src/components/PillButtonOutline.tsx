import React from 'react';

export interface PillButtonOutlineProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const PillButtonOutline: React.FC<PillButtonOutlineProps> = ({
  children,
  icon,
  size = 'md',
  className = '',
  style,
  ...props
}) => {
  const sizeStyles = {
    sm: { padding: '7px 16px', fontSize: '0.875rem' },
    md: { padding: '10px 22px', fontSize: '0.95rem' },
    lg: { padding: '14px 30px', fontSize: '1.05rem' }
  }[size];

  return (
    <button
      className={`pill-button-outline ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        backgroundColor: 'transparent',
        color: 'var(--color-accent)',
        border: '1.5px solid var(--color-accent)',
        borderRadius: 'var(--radius-pill)',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        lineHeight: 1.2,
        ...sizeStyles,
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

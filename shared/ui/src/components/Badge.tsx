import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'highlight' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'highlight',
  icon,
  size = 'md',
  className = '',
  style,
  ...props
}) => {
  const variantStyles = {
    highlight: {
      backgroundColor: 'var(--color-highlight-soft)',
      color: 'var(--color-text-primary)',
      border: '1px solid rgba(242, 169, 59, 0.3)'
    },
    accent: {
      backgroundColor: 'var(--color-accent-soft)',
      color: 'var(--color-accent-dark)',
      border: '1px solid rgba(47, 93, 227, 0.2)'
    },
    success: {
      backgroundColor: 'rgba(46, 158, 109, 0.12)',
      color: 'var(--color-success)',
      border: '1px solid rgba(46, 158, 109, 0.2)'
    },
    warning: {
      backgroundColor: 'rgba(217, 140, 43, 0.12)',
      color: 'var(--color-warning)',
      border: '1px solid rgba(217, 140, 43, 0.2)'
    },
    danger: {
      backgroundColor: 'rgba(210, 75, 60, 0.12)',
      color: 'var(--color-danger)',
      border: '1px solid rgba(210, 75, 60, 0.2)'
    },
    neutral: {
      backgroundColor: 'rgba(20, 22, 26, 0.05)',
      color: 'var(--color-text-secondary)',
      border: '1px solid rgba(20, 22, 26, 0.08)'
    }
  }[variant];

  const sizeStyles = size === 'sm' 
    ? { padding: '3px 10px', fontSize: '0.75rem' } 
    : { padding: '5px 14px', fontSize: '0.8125rem' };

  return (
    <span
      className={`khoj-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: 'var(--radius-pill)',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.01em',
        lineHeight: 1.3,
        ...variantStyles,
        ...sizeStyles,
        ...style
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

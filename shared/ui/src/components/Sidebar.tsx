import React from 'react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  onClick?: () => void;
}

export interface SidebarProps {
  title?: string;
  subtitle?: string;
  items: SidebarNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  footerContent?: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  title = 'KhojYatra',
  subtitle,
  items,
  activeId,
  onSelect,
  footerContent,
  className = ''
}) => {
  return (
    <aside
      className={`khoj-sidebar ${className}`}
      style={{
        width: '260px',
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 18px',
        borderRight: '1px solid rgba(20, 22, 26, 0.05)',
        boxSizing: 'border-box'
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '0 12px 28px 12px' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            margin: 0,
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-secondary)',
              margin: '4px 0 0 0',
              fontWeight: 500
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Navigation Items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelect(item.id);
                item.onClick?.();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 18px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.92rem',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 4px 14px rgba(47, 93, 227, 0.25)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
                  e.currentTarget.style.color = 'var(--color-accent-dark)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-primary)'
                }}
              >
                {item.icon}
              </span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-highlight-soft)',
                    color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontWeight: 700
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Profile Area */}
      {footerContent && (
        <div
          style={{
            paddingTop: '20px',
            borderTop: '1px solid rgba(20, 22, 26, 0.05)'
          }}
        >
          {footerContent}
        </div>
      )}
    </aside>
  );
};

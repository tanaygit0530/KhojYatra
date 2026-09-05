import React from 'react';

export interface CircleFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: number | string;
  withOverlay?: boolean;
  borderColor?: string;
  children?: React.ReactNode;
}

export const CircleFrame: React.FC<CircleFrameProps> = ({
  src,
  alt = 'Image',
  size = 120,
  withOverlay = false,
  borderColor,
  children,
  className = '',
  style,
  ...props
}) => {
  const sizePx = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`circle-frame ${className}`}
      style={{
        position: 'relative',
        width: sizePx,
        height: sizePx,
        borderRadius: '50%',
        overflow: 'hidden',
        border: borderColor ? `3px solid ${borderColor}` : 'none',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(20, 22, 26, 0.08)',
        backgroundColor: 'var(--color-accent-soft)',
        ...style
      }}
      {...props}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}
      {withOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(20,22,26,0) 40%, rgba(20,22,26,0.5) 100%)',
            pointerEvents: 'none'
          }}
        />
      )}
      {children && (
        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
};

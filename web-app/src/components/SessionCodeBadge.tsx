import React from 'react';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';

interface SessionCodeBadgeProps {
  code: string;
}

export const SessionCodeBadge: React.FC<SessionCodeBadgeProps> = ({ code }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px 16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#888',
        }}
      >
        Session Code
      </div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          fontFamily: 'monospace',
          letterSpacing: '2px',
          color: primaryBlue,
        }}
      >
        {code}
      </div>
    </div>
  );
};

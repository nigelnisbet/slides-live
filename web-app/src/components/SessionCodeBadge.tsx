import React from 'react';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const accentGreen = '#10b981';

interface SessionCodeBadgeProps {
  code: string;
}

export const SessionCodeBadge: React.FC<SessionCodeBadgeProps> = ({ code }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        zIndex: 1000,
        backgroundColor: primaryBlue,
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
          opacity: 0.9,
        }}
      >
        Session Code
      </div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          letterSpacing: '2px',
          color: accentGreen,
        }}
      >
        {code}
      </div>
    </div>
  );
};

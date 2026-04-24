import React from 'react';

const accentGreen = '#10b981';

interface FloatingFeedbackButtonProps {
  onClick: () => void;
}

export const FloatingFeedbackButton: React.FC<FloatingFeedbackButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: accentGreen,
        color: 'white',
        border: 'none',
        fontSize: '28px',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.5)';
      }}
      title="Questions & Feedback"
    >
      💬
    </button>
  );
};

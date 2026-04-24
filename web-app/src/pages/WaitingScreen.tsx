import React from 'react';
import { useSocket } from '../contexts/FirebaseContext';
import { FloatingCircles } from '../components/FloatingCircles';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';

interface WaitingScreenProps {
  onShowFeedbackModal?: () => void;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({ onShowFeedbackModal }) => {
  const { connected, participantCount, currentActivity, sessionCode, participantId, feedbackEnabled } = useSocket();

  // Set page title
  React.useEffect(() => {
    document.title = 'slidesLive';
  }, []);

  // If there's an activity, this screen shouldn't be shown
  // The App component will handle routing to the activity
  if (currentActivity) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
      }}
    >
      <FloatingCircles />
      <div className="text-center max-w-2xl" style={{ position: 'relative', zIndex: 1 }}>
        <div className="bg-white rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-lg">
          <svg
            className="w-16 h-16 animate-pulse"
            style={{ color: primaryBlue }}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>

        <p className="text-2xl text-white/90 mb-8">
          Waiting for the presenter to share an interactive activity...
        </p>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 inline-block">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  connected ? 'bg-green-400' : 'bg-red-400'
                }`}
              />
              <span className="text-white font-medium">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="w-px h-8 bg-white/30" />

            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-white font-medium">
                {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-white/70 text-sm">
          <p>When the presenter moves to an interactive slide,</p>
          <p>the activity will appear here automatically.</p>
        </div>

        {/* Questions and Feedback button */}
        {feedbackEnabled && sessionCode && participantId && onShowFeedbackModal && (
          <div className="mt-8">
            <button
              onClick={onShowFeedbackModal}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all transform hover:scale-105"
              style={{
                backgroundColor: '#f7941d',
                boxShadow: '0 4px 14px rgba(247, 148, 29, 0.4)',
              }}
            >
              💬 Questions & Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

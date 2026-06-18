import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingCircles } from '../components/FloatingCircles';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';

/**
 * The default attendee-facing redirect target when a session ends.
 *
 * This is the primary viral surface (more attendees than presenters by far),
 * so the goal here is "wow, that was fast - I want to run one of these
 * myself" rather than just dumping people back at a bare join form.
 *
 * Free tier: always lands here. Pro tier (future): the presenter will be
 * able to specify their own custom redirect URL instead - see
 * docs/CURRENT_STATUS.md "Strategy Update" for the plan. There's no
 * marketing/signup page built yet (landing/ is empty), so this in-app
 * screen is the Phase 0 stand-in; swapping to an external URL later is a
 * one-line change in App.tsx.
 */
export const SessionEnded: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = 'slidesLive';
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
      }}
    >
      <FloatingCircles />
      <div className="text-center max-w-md" style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.95)',
            padding: '8px 18px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '22px', fontWeight: 600, color: '#111' }}>
            slides<span style={{ fontWeight: 700, color: primaryBlue }}>L</span>ive
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">That's a wrap!</h1>
        <p className="text-white/90 text-lg mb-8">
          Thanks for joining. Want to run live polls, quizzes, and Q&amp;A in your own
          Google Slides presentations - in just a few clicks?
        </p>

        <a
          href="https://slides-live.com"
          className="inline-block px-8 py-4 rounded-lg font-semibold text-white transition-all transform hover:scale-105"
          style={{
            backgroundColor: '#10b981',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
          }}
        >
          Try slidesLive free
        </a>

        <div className="mt-8">
          <button
            onClick={() => navigate('/join', { replace: true })}
            className="text-white/70 underline text-sm"
          >
            Join another session instead
          </button>
        </div>
      </div>
    </div>
  );
};

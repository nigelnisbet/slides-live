import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, push } from 'firebase/database';
import { database } from '../firebase';
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
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  React.useEffect(() => {
    document.title = 'slidesLive';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    try {
      await push(ref(database, 'waitlist'), {
        email: email.trim().toLowerCase(),
        source: 'session-ended',
        timestamp: Date.now(),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

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
          href="https://slides-live.com/about"
          className="inline-block px-8 py-4 rounded-lg font-semibold text-white transition-all transform hover:scale-105"
          style={{
            backgroundColor: '#10b981',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
          }}
        >
          Try slidesLive free
        </a>

        {/* Email capture — prime moment right after a positive session */}
        <div className="mt-8" style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          {status === 'done' ? (
            <p className="text-white font-semibold">You're on the list ✓</p>
          ) : (
            <>
              <p className="text-white/80 text-sm mb-3">
                Want updates and early access as a presenter?
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: '7px',
                    border: 'none', fontSize: '14px', outline: 'none', minWidth: 0,
                  }}
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  style={{
                    padding: '9px 16px', borderRadius: '7px', border: 'none',
                    background: 'rgba(255,255,255,0.9)', color: primaryBlueDark,
                    fontWeight: 700, fontSize: '14px',
                    cursor: status === 'submitting' ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {status === 'submitting' ? '...' : 'Notify me'}
                </button>
              </form>
              {status === 'error' && (
                <p className="text-white/60 text-xs mt-2">Something went wrong — try again.</p>
              )}
            </>
          )}
        </div>

        <div className="mt-6">
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

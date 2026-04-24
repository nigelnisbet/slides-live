import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/FirebaseContext';
import { getDatabase, ref, get } from 'firebase/database';
import { FloatingCircles } from '../components/FloatingCircles';
import { SlidesLiveLogo } from '../components/SlidesLiveLogo';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';
const accentGreen = '#10b981';

export const JoinSession: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const [sessionCode, setSessionCode] = useState(code || '');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameRequired, setNameRequired] = useState(false);
  const navigate = useNavigate();
  const { joinSession, leaveSession, sessionEnded } = useSocket();

  // Set page title
  useEffect(() => {
    document.title = 'slidesLive';
  }, []);

  // Leave any existing session only if session ended
  useEffect(() => {
    if (sessionEnded) {
      leaveSession();
    }
  }, []);

  // Check if name is required for this presentation
  useEffect(() => {
    let cancelled = false;

    const checkNameRequirement = async () => {
      if (code && code.trim()) {
        try {
          const db = getDatabase();
          const sessionSnapshot = await get(ref(db, `sessions/${code.trim().toUpperCase()}`));

          if (cancelled) return;

          if (sessionSnapshot.exists()) {
            const session = sessionSnapshot.val();
            const presentationId = session.presentationId;
            if (presentationId) {
              const configSnapshot = await get(ref(db, `presentations/${presentationId}/config`));

              if (cancelled) return;

              if (configSnapshot.exists()) {
                const config = configSnapshot.val();
                const requiresName = config.requireName || false;
                setNameRequired(requiresName);

                // Only auto-join if name is not required
                if (!requiresName && !cancelled) {
                  setLoading(true);
                  joinSession(code.trim().toUpperCase(), undefined)
                    .then(() => {
                      if (!cancelled) navigate('/waiting');
                    })
                    .catch((err) => {
                      if (!cancelled) {
                        setError((err as Error).message);
                        setLoading(false);
                      }
                    });
                }
              }
            }
          }
        } catch (err) {
          if (!cancelled) {
            console.error('Error checking name requirement:', err);
          }
        }
      }
    };

    checkNameRequirement();

    return () => {
      cancelled = true;
    };
  }, [code, joinSession, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionCode.trim()) {
      setError('Please enter a session code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if this presentation requires a name before joining
      const db = getDatabase();
      const sessionSnapshot = await get(ref(db, `sessions/${sessionCode.trim().toUpperCase()}`));

      if (!sessionSnapshot.exists()) {
        setError('Invalid session code');
        setLoading(false);
        return;
      }

      const session = sessionSnapshot.val();
      const presentationId = session.presentationId;

      if (presentationId) {
        const configSnapshot = await get(ref(db, `presentations/${presentationId}/config`));
        if (configSnapshot.exists()) {
          const config = configSnapshot.val();
          const requiresName = config.requireName || false;

          // Update the UI state
          setNameRequired(requiresName);

          // Validate name requirement
          if (requiresName && !name.trim()) {
            setError('This session requires a name to join');
            setLoading(false);
            return;
          }
        }
      }

      await joinSession(sessionCode.trim().toUpperCase(), name.trim() || undefined);
      navigate('/waiting');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
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
      <SlidesLiveLogo />
      <FloatingCircles />
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full" style={{ position: 'relative', zIndex: 1 }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Welcome to slides<span style={{ fontWeight: '800' }}>L</span>ive
            </span>
          </h1>
          <p className="text-lg text-gray-600 italic mb-4">
            Turn any presentation into an interactive experience
          </p>
          <p className="text-sm text-gray-500">
            Enter the session code to join
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
              Session Code
            </label>
            <input
              type="text"
              id="sessionCode"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 text-center text-2xl font-mono font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 uppercase tracking-widest"
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name {nameRequired ? '(Required)' : '(Optional)'}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter your name"
              maxLength={50}
              required={nameRequired}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !sessionCode.trim()}
            className="w-full text-white py-3 px-6 rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: loading || !sessionCode.trim() ? undefined : accentGreen,
              boxShadow: loading || !sessionCode.trim() ? undefined : '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Waiting for the presenter to start?</p>
          <p>Make sure you have the correct session code.</p>
        </div>
      </div>
    </div>
  );
};

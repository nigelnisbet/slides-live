import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, push } from 'firebase/database';
import { database } from '../firebase';
import { FloatingCircles } from '../components/FloatingCircles';

const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';

const Step: React.FC<{ n: number; title: string; desc: string }> = ({ n, title, desc }) => (
  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', textAlign: 'left' }}>
    <div style={{
      flexShrink: 0,
      width: '36px', height: '36px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, color: '#fff', fontSize: '16px',
    }}>{n}</div>
    <div>
      <div style={{ fontWeight: 600, color: '#fff', fontSize: '16px', marginBottom: '2px' }}>{title}</div>
      <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.5 }}>{desc}</div>
    </div>
  </div>
);

const Badge: React.FC<{ label: string }> = ({ label }) => (
  <span style={{
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.25)',
  }}>{label}</span>
);

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  React.useEffect(() => {
    document.title = 'slidesLive — Interactive Google Slides';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    try {
      await push(ref(database, 'waitlist'), {
        email: email.trim().toLowerCase(),
        source: 'landing',
        timestamp: Date.now(),
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px 60px',
    }}>
      <FloatingCircles />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.95)',
            padding: '8px 18px',
            borderRadius: '12px',
          }}>
            <span style={{ fontSize: '22px', fontWeight: 600, color: '#111' }}>
              slides<span style={{ fontWeight: 700, color: primaryBlue }}>Live</span>
            </span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>
            Make any Google Slides presentation interactive
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
            Run live polls, quizzes, and open questions from your existing slides.
            No app switching. Attendees join instantly with a QR code.
          </p>
        </div>

        {/* How it works */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>How it works</div>
          <Step n={1} title="Install the Chrome extension" desc="One click adds slidesLive to Google Slides — no account needed to start." />
          <Step n={2} title="Click &ldquo;Go Live&rdquo; while editing" desc="Creates a session and opens a floating stats window that sits above your presentation." />
          <Step n={3} title="Attendees scan the QR code" desc="They join on any device. No app download, no sign-in — just the code." />
        </div>

        {/* Activity types */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Activity types</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            <Badge label="Poll" />
            <Badge label="Quiz" />
            <Badge label="Open response" />
            <Badge label="Announcement" />
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              borderRadius: '10px',
              background: '#10b981',
              color: '#fff',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            Install free — Chrome Web Store
          </a>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>We're in beta</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Email capture */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px', margin: '0 0 6px' }}>
            Stay in the loop
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '0 0 16px' }}>
            Get notified of new features and early access opportunities.
          </p>

          {status === 'done' ? (
            <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>You're on the list ✓</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'rgba(255,255,255,0.9)',
                  color: primaryBlueDark,
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: status === 'submitting' ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {status === 'submitting' ? '...' : 'Notify me'}
              </button>
            </form>
          )}
          {status === 'error' && (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '8px' }}>
              Something went wrong — try again.
            </p>
          )}
        </div>

        {/* Already have a code */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={() => navigate('/join')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Have a session code? Join here
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a href="/privacy" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textDecoration: 'underline' }}>
            Privacy Policy
          </a>
        </div>

      </div>
    </div>
  );
};

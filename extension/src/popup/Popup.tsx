import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface SessionInfo {
  sessionId: string | null;
  sessionCode: string | null;
  qrCode: string | null;
  participantCount: number;
  connected: boolean;
}

const Popup: React.FC = () => {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    sessionId: null,
    sessionCode: null,
    qrCode: null,
    participantCount: 0,
    connected: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnGoogleSlides, setIsOnGoogleSlides] = useState(false);
  const [presentationId, setPresentationId] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're on a Google Slides page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      const url = currentTab?.url || '';
      if (url.includes('docs.google.com/presentation')) {
        setIsOnGoogleSlides(true);
        // Extract presentation ID from URL
        const match = url.match(/\/presentation\/d\/([^\/]+)/);
        if (match) {
          setPresentationId(match[1]);
        }
      }
    });

    // Get current session info
    chrome.runtime.sendMessage({ type: 'GET_SESSION_INFO' }, (response) => {
      if (response) {
        setSessionInfo(response);
      }
    });

    // Listen for session stats updates
    const handleMessage = (message: any) => {
      if (message.type === 'SESSION_STATS_UPDATE') {
        setSessionInfo((prev) => ({
          ...prev,
          participantCount: message.data.participantCount,
        }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const createSession = async () => {
    if (!presentationId) {
      setError('Could not detect presentation ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      chrome.runtime.sendMessage(
        {
          type: 'CREATE_SESSION',
          presentationId,
        },
        (response) => {
          setLoading(false);

          if (response.success) {
            setSessionInfo({
              sessionId: response.sessionId,
              sessionCode: response.sessionCode,
              qrCode: response.qrCode,
              participantCount: 0,
              connected: true,
            });
          } else {
            setError(response.error || 'Failed to create session');
          }
        }
      );
    } catch (err) {
      setLoading(false);
      setError((err as Error).message);
    }
  };

  const endSession = () => {
    chrome.runtime.sendMessage({ type: 'END_SESSION' });
    setSessionInfo({
      sessionId: null,
      sessionCode: null,
      qrCode: null,
      participantCount: 0,
      connected: false,
    });
  };

  if (!isOnGoogleSlides) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>
          <span style={{ fontWeight: 600 }}>slides</span>
          <span style={{ fontWeight: 700 }}>L</span>
          <span style={{ fontWeight: 600 }}>ive</span>
        </h2>
        <div style={styles.warning}>
          <p>Please open a Google Slides presentation to create a live session.</p>
        </div>
        <button
          style={styles.builderButton}
          onClick={() => window.open('https://slides-live.com/builder', '_blank')}
        >
          Open Builder
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>
          <span style={{ fontWeight: 600 }}>slides</span>
          <span style={{ fontWeight: 700 }}>L</span>
          <span style={{ fontWeight: 600 }}>ive</span>
        </h2>
        <div style={styles.loading}>Creating session...</div>
      </div>
    );
  }

  if (!sessionInfo.sessionId) {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>
          <span style={{ fontWeight: 600 }}>slides</span>
          <span style={{ fontWeight: 700 }}>L</span>
          <span style={{ fontWeight: 600 }}>ive</span>
        </h2>
        <p style={styles.description}>
          Make any presentation interactive. Start a session and share the QR code with the audience.
        </p>
        {error && <div style={styles.error}>{error}</div>}
        <button style={styles.button} onClick={createSession}>
          Start Session
        </button>
        <button
          style={styles.builderButton}
          onClick={() => window.open('https://slides-live.com/builder', '_blank')}
        >
          Open Builder
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        <span style={{ fontWeight: 600 }}>slides</span>
        <span style={{ fontWeight: 700 }}>L</span>
        <span style={{ fontWeight: 600 }}>ive</span>
      </h2>

      <div style={styles.sessionCode}>
        <div style={styles.label}>Session Code</div>
        <div style={styles.code}>{sessionInfo.sessionCode}</div>
      </div>

      {sessionInfo.qrCode && (
        <div style={styles.qrSection}>
          <img src={sessionInfo.qrCode} alt="Session QR Code" style={styles.qrCode} />
          <div style={styles.joinUrl}>slides-live.com</div>
        </div>
      )}

      <div style={styles.stats}>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{sessionInfo.participantCount}</div>
          <div style={styles.statLabel}>Participants</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statusIndicator(true)} />
          <div style={styles.statLabel}>Active</div>
        </div>
      </div>

      <button
        style={styles.dashboardButton}
        onClick={() => window.open(`https://slides-live.com/presenter/${sessionInfo.sessionCode}`, '_blank')}
      >
        Open Presenter Dashboard
      </button>

      <button
        style={styles.builderButton}
        onClick={() => window.open('https://slides-live.com/builder', '_blank')}
      >
        Open Builder
      </button>

      <button style={styles.endButton} onClick={endSession}>
        End Session
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#3b82f6',
  },
  subtitle: {
    margin: '0 0 16px 0',
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: 500,
  },
  description: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
  },
  warning: {
    padding: '12px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#856404',
  },
  loading: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#666',
  },
  error: {
    padding: '12px',
    backgroundColor: '#f8d7da',
    border: '1px solid #dc3545',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#721c24',
    marginBottom: '16px',
  },
  button: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  dashboardButton: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '16px',
    transition: 'background-color 0.2s',
  },
  endButton: {
    width: '100%',
    padding: '10px 24px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  builderButton: {
    width: '100%',
    padding: '10px 24px',
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  },
  sessionCode: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  label: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  code: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#dc2626',
    fontFamily: 'monospace',
    letterSpacing: '4px',
  },
  qrSection: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  qrCode: {
    width: '200px',
    height: '200px',
  },
  joinUrl: {
    marginTop: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#dc2626',
  },
  stats: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
  },
  statItem: {
    flex: 1,
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase' as const,
  },
  statusIndicator: (connected: boolean) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: connected ? '#28a745' : '#dc3545',
    margin: '0 auto 8px',
  }),
  footer: {
    marginTop: '16px',
    textAlign: 'center' as const,
    color: '#666',
  },
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

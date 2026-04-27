import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/FirebaseContext';
import { useFeedbackUnreadCount } from '../hooks/useFeedbackUnreadCount';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';
const accentGreen = '#10b981';

export const PresenterCompact: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { joinSession, currentActivity, currentResults, error, participantCount, connected, feedbackEnabled, sessionEnded } = useSocket();
  const [joining, setJoining] = useState(true);
  const { unreadCount } = useFeedbackUnreadCount(code || null);

  useEffect(() => {
    if (!code) {
      navigate('/join');
      return;
    }

    // Join session as presenter observer
    joinSession(code, 'Presenter')
      .then(() => {
        setJoining(false);
      })
      .catch((err) => {
        console.error('Failed to join session:', err);
        setJoining(false);
      });
  }, [code, joinSession, navigate]);

  // Redirect if session ended
  useEffect(() => {
    if (sessionEnded) {
      window.close(); // Close the compact window
    }
  }, [sessionEnded]);

  if (joining) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Connecting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  // Render results summary
  let resultsSummary = null;
  if (currentActivity && currentResults) {
    switch (currentActivity.type) {
      case 'poll':
        const pollActivity = currentActivity as any;
        const pollResults = currentResults as any;
        const totalVotes = pollResults.totalResponses || 0;
        resultsSummary = (
          <div style={styles.activitySection}>
            <div style={styles.activityTitle}>📊 Poll Active</div>
            <div style={styles.activitySubtitle}>{pollActivity.question}</div>
            <div style={styles.optionsList}>
              {pollActivity.options?.map((option: string, idx: number) => {
                const votes = pollResults.responses?.[idx] || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                return (
                  <div key={idx} style={styles.optionItem}>
                    <div style={styles.optionLabel}>{option}</div>
                    <div style={styles.barContainer}>
                      <div style={{ ...styles.barFill, width: `${percentage}%` }} />
                    </div>
                    <div style={styles.optionStats}>{votes} ({percentage}%)</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
        break;
      case 'quiz':
        const quizActivity = currentActivity as any;
        const quizResults = currentResults as any;
        const correctCount = quizResults.correctCount || 0;
        const incorrectCount = quizResults.incorrectCount || 0;
        const total = correctCount + incorrectCount;
        resultsSummary = (
          <div style={styles.activitySection}>
            <div style={styles.activityTitle}>🎯 Quiz Active</div>
            <div style={styles.activitySubtitle}>{quizActivity.question}</div>
            <div style={styles.quizStats}>
              <div style={styles.quizStat}>
                <div style={{ ...styles.quizStatValue, color: accentGreen }}>{correctCount}</div>
                <div style={styles.quizStatLabel}>Correct</div>
              </div>
              <div style={styles.quizStat}>
                <div style={{ ...styles.quizStatValue, color: '#ef4444' }}>{incorrectCount}</div>
                <div style={styles.quizStatLabel}>Incorrect</div>
              </div>
              <div style={styles.quizStat}>
                <div style={styles.quizStatValue}>{total}</div>
                <div style={styles.quizStatLabel}>Total</div>
              </div>
            </div>
          </div>
        );
        break;
      case 'text-response':
        const textActivity = currentActivity as any;
        resultsSummary = (
          <div style={styles.activitySection}>
            <div style={styles.activityTitle}>✍️ Text Response</div>
            <div style={styles.activitySubtitle}>{textActivity.prompt}</div>
            <div style={styles.infoText}>
              Responses are being collected...
            </div>
          </div>
        );
        break;
      case 'announcement':
        resultsSummary = (
          <div style={styles.activitySection}>
            <div style={styles.activityTitle}>📢 Announcement</div>
            <div style={styles.infoText}>Showing announcement to participants</div>
          </div>
        );
        break;
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoText}>
          <span style={{ fontWeight: 600 }}>slides</span>
          <span style={{ fontWeight: 700 }}>L</span>
          <span style={{ fontWeight: 600 }}>ive</span>
        </div>
        <div style={styles.sessionCode}>{code}</div>
      </div>

      {/* Participant Count */}
      <div style={styles.statsSection}>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{participantCount}</div>
          <div style={styles.statLabel}>Participants</div>
        </div>

        <div style={styles.statBox}>
          <div style={{
            ...styles.statusDot,
            backgroundColor: connected ? accentGreen : '#ef4444'
          }} />
          <div style={styles.statLabel}>{connected ? 'Connected' : 'Disconnected'}</div>
        </div>

        {feedbackEnabled && (
          <div style={styles.statBox}>
            <div style={styles.feedbackBadge}>
              💬
              {unreadCount > 0 && (
                <span style={styles.feedbackCount}>{unreadCount}</span>
              )}
            </div>
            <div style={styles.statLabel}>Feedback</div>
          </div>
        )}
      </div>

      {/* Current Activity Results */}
      {currentActivity ? (
        resultsSummary
      ) : (
        <div style={styles.waitingSection}>
          <div style={styles.waitingIcon}>⏳</div>
          <div style={styles.waitingText}>Waiting for activity...</div>
        </div>
      )}

      {/* Full Dashboard Link */}
      <div style={styles.footer}>
        <a
          href={`/presenter/${code}`}
          target="_blank"
          style={styles.fullDashboardLink}
        >
          Open Full Dashboard
        </a>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
    padding: '16px',
    color: 'white',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '20px',
    textAlign: 'center',
  },
  logoText: {
    fontSize: '20px',
    color: 'white',
    marginBottom: '8px',
  },
  sessionCode: {
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    fontSize: '16px',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  statsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  statBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    textTransform: 'uppercase',
    opacity: 0.9,
    fontWeight: 500,
    letterSpacing: '0.5px',
  },
  statusDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    margin: '0 auto 8px',
  },
  feedbackBadge: {
    fontSize: '32px',
    position: 'relative',
    marginBottom: '4px',
  },
  feedbackCount: {
    position: 'absolute',
    top: '-4px',
    right: '-8px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '10px',
    padding: '2px 6px',
    minWidth: '20px',
  },
  activitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  activityTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  activitySubtitle: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '16px',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  optionItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  optionLabel: {
    fontSize: '13px',
    fontWeight: 500,
  },
  barContainer: {
    height: '24px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: accentGreen,
    transition: 'width 0.3s ease',
  },
  optionStats: {
    fontSize: '12px',
    opacity: 0.8,
  },
  quizStats: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '8px',
  },
  quizStat: {
    textAlign: 'center',
  },
  quizStatValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  quizStatLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  infoText: {
    fontSize: '14px',
    opacity: 0.9,
    textAlign: 'center',
  },
  waitingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    padding: '32px 16px',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  waitingIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  waitingText: {
    fontSize: '14px',
    opacity: 0.9,
  },
  footer: {
    textAlign: 'center',
  },
  fullDashboardLink: {
    color: 'white',
    fontSize: '13px',
    textDecoration: 'underline',
    opacity: 0.8,
  },
};

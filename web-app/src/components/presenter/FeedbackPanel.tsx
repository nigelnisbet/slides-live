import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const accentGreen = '#10b981';

interface FeedbackMessage {
  messageId: string;
  message: string;
  submittedAt: number;
  editedAt?: number;
}

interface ParticipantFeedback {
  participantId: string;
  participantName?: string;
  messages: FeedbackMessage[];
}

interface FeedbackPanelProps {
  sessionCode: string;
  onClose: () => void;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ sessionCode, onClose }) => {
  const [feedback, setFeedback] = useState<ParticipantFeedback[]>([]);
  const [lastViewedTime] = useState(Date.now());

  useEffect(() => {
    const db = getDatabase();
    const feedbackRef = ref(db, `sessions/${sessionCode}/feedback`);

    const unsubscribe = onValue(feedbackRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const feedbackList: ParticipantFeedback[] = [];

        Object.entries(data).forEach(([participantId, participantData]: [string, any]) => {
          if (participantData.messages) {
            const messages = Object.entries(participantData.messages).map(
              ([messageId, messageData]: [string, any]) => ({
                messageId,
                message: messageData.message,
                submittedAt: messageData.submittedAt,
                editedAt: messageData.editedAt,
              })
            );

            // Sort messages by submittedAt (newest first)
            messages.sort((a, b) => b.submittedAt - a.submittedAt);

            feedbackList.push({
              participantId,
              participantName: participantData.participantName,
              messages,
            });
          }
        });

        // Sort by most recent message
        feedbackList.sort((a, b) => {
          const aLatest = a.messages[0]?.submittedAt || 0;
          const bLatest = b.messages[0]?.submittedAt || 0;
          return bLatest - aLatest;
        });

        setFeedback(feedbackList);
      } else {
        setFeedback([]);
      }
    });

    return () => unsubscribe();
  }, [sessionCode, lastViewedTime]);

  const downloadCSV = () => {
    if (feedback.length === 0) return;

    // Build CSV content
    const headers = ['Participant Name', 'Participant ID', 'Message', 'Submitted At', 'Edited'];
    const rows = feedback.flatMap(participant =>
      participant.messages.map(msg => [
        participant.participantName || 'Anonymous',
        participant.participantId,
        `"${msg.message.replace(/"/g, '""')}"`, // Escape quotes
        new Date(msg.submittedAt).toLocaleString(),
        msg.editedAt ? 'Yes' : 'No',
      ])
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `feedback-${sessionCode}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalMessages = feedback.reduce((sum, p) => sum + p.messages.length, 0);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Questions & Feedback</h2>
            <p style={styles.subtitle}>
              {feedback.length} {feedback.length === 1 ? 'participant' : 'participants'} · {totalMessages}{' '}
              {totalMessages === 1 ? 'message' : 'messages'}
            </p>
          </div>
          <div style={styles.headerButtons}>
            {feedback.length > 0 && (
              <button onClick={downloadCSV} style={styles.downloadBtn}>
                ⬇ Download CSV
              </button>
            )}
            <button onClick={onClose} style={styles.closeBtn}>
              ×
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {feedback.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <p style={styles.emptyText}>No feedback yet</p>
              <p style={styles.emptySubtext}>
                Participants can share questions and feedback during the presentation.
              </p>
            </div>
          ) : (
            <div style={styles.feedbackList}>
              {feedback.map((participant) => (
                <div key={participant.participantId} style={styles.participantCard}>
                  <div style={styles.participantHeader}>
                    <span style={styles.participantName}>
                      {participant.participantName || 'Anonymous'}
                    </span>
                    <span style={styles.messageCount}>
                      {participant.messages.length}{' '}
                      {participant.messages.length === 1 ? 'message' : 'messages'}
                    </span>
                  </div>
                  <div style={styles.messagesList}>
                    {participant.messages.map((msg) => (
                      <div key={msg.messageId} style={styles.messageCard}>
                        <div style={styles.messageText}>{msg.message}</div>
                        <div style={styles.messageTime}>
                          {new Date(msg.submittedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {msg.editedAt && (
                            <span style={styles.editedLabel}> (edited)</span>
                          )}
                          {msg.submittedAt > lastViewedTime && (
                            <span style={styles.newBadge}>NEW</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    zIndex: 2000,
  },
  panel: {
    backgroundColor: 'white',
    width: '450px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.2)',
    animation: 'slideIn 0.3s ease-out',
  },
  header: {
    padding: '24px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: primaryBlue,
    marginBottom: '4px',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  downloadBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: accentGreen,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#9ca3af',
    maxWidth: '300px',
  },
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  participantCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  participantHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  participantName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },
  messageCount: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    padding: '4px 8px',
    borderRadius: '12px',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  messageCard: {
    backgroundColor: 'white',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  messageText: {
    fontSize: '14px',
    color: '#1f2937',
    marginBottom: '6px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.5',
  },
  messageTime: {
    fontSize: '12px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editedLabel: {
    fontStyle: 'italic',
  },
  newBadge: {
    backgroundColor: accentGreen,
    color: 'white',
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: 'auto',
  },
};

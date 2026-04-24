import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, set, push, serverTimestamp } from 'firebase/database';

interface FeedbackMessage {
  messageId: string;
  message: string;
  submittedAt: number;
  editedAt?: number;
  participantId?: string;
  participantName?: string;
}

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const accentGreen = '#10b981';

interface FeedbackModalProps {
  sessionCode: string;
  participantId: string;
  participantName?: string;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  sessionCode,
  participantId,
  participantName,
  onClose,
}) => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const db = getDatabase();
    const feedbackRef = ref(db, `sessions/${sessionCode}/feedback/${participantId}`);

    const unsubscribe = onValue(feedbackRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.messages) {
        // Convert object to array and sort by submittedAt (newest first)
        const messageList = Object.entries(data.messages).map(([key, value]: [string, any]) => ({
          messageId: key,
          participantId: data.participantId || participantId,
          participantName: data.participantName,
          message: value.message,
          submittedAt: value.submittedAt,
          editedAt: value.editedAt,
        }));
        messageList.sort((a, b) => b.submittedAt - a.submittedAt);
        setMessages(messageList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [sessionCode, participantId]);

  const handleSubmit = async () => {
    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const db = getDatabase();
      const messagesRef = ref(db, `sessions/${sessionCode}/feedback/${participantId}/messages`);

      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        message: newMessage.trim(),
        submittedAt: serverTimestamp(),
      });

      // Also update participant info at the top level
      await set(ref(db, `sessions/${sessionCode}/feedback/${participantId}/participantName`), participantName || 'Anonymous');
      await set(ref(db, `sessions/${sessionCode}/feedback/${participantId}/participantId`), participantId);

      setNewMessage('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (messageId: string) => {
    if (!editingText.trim()) return;

    setSubmitting(true);
    try {
      const db = getDatabase();
      const messageRef = ref(db, `sessions/${sessionCode}/feedback/${participantId}/messages/${messageId}`);

      await set(messageRef, {
        message: editingText.trim(),
        submittedAt: messages.find(m => m.messageId === messageId)?.submittedAt || Date.now(),
        editedAt: serverTimestamp(),
      });

      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('Error editing feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (msg: FeedbackMessage) => {
    setEditingMessageId(msg.messageId);
    setEditingText(msg.message);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Questions & Feedback</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          {/* New message input */}
          <div style={styles.inputSection}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your question or feedback here..."
              style={styles.textarea}
              rows={4}
            />
            <button
              onClick={handleSubmit}
              disabled={!newMessage.trim() || submitting}
              style={{
                ...styles.submitBtn,
                opacity: (!newMessage.trim() || submitting) ? 0.5 : 1,
              }}
            >
              {submitting ? 'Sending...' : 'Send'}
            </button>
          </div>

          {/* Previous messages */}
          {messages.length > 0 && (
            <div style={styles.messagesSection}>
              <h3 style={styles.messagesTitle}>Your Messages</h3>
              <div style={styles.messagesList}>
                {messages.map((msg) => (
                  <div key={msg.messageId} style={styles.messageCard}>
                    {editingMessageId === msg.messageId ? (
                      <>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={styles.editTextarea}
                          rows={3}
                          autoFocus
                        />
                        <div style={styles.editButtons}>
                          <button
                            onClick={() => handleEdit(msg.messageId)}
                            disabled={!editingText.trim() || submitting}
                            style={styles.saveBtn}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={submitting}
                            style={styles.cancelBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={styles.messageText}>{msg.message}</div>
                        <div style={styles.messageFooter}>
                          <span style={styles.messageTime}>
                            {new Date(msg.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {msg.editedAt && ' (edited)'}
                          </span>
                          <button
                            onClick={() => startEditing(msg)}
                            style={styles.editBtn}
                          >
                            Edit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '2px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: primaryBlue,
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  inputSection: {
    marginBottom: '24px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
    marginBottom: '12px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: accentGreen,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 14px rgba(247, 148, 29, 0.4)',
  },
  messagesSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '2px solid #e5e7eb',
  },
  messagesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  messageText: {
    fontSize: '14px',
    color: '#1f2937',
    marginBottom: '8px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  editBtn: {
    padding: '4px 12px',
    fontSize: '12px',
    color: primaryBlue,
    backgroundColor: 'transparent',
    border: '1px solid ' + primaryBlue,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  editTextarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '2px solid ' + primaryBlue,
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
    marginBottom: '12px',
  },
  editButtons: {
    display: 'flex',
    gap: '8px',
  },
  saveBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: accentGreen,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

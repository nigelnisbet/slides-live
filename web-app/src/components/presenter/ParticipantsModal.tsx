import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const accentGreen = '#10b981';

interface Participant {
  id: string;
  name?: string;
  joinedAt: number;
  isActive: boolean;
}

interface ParticipantsModalProps {
  sessionCode: string;
  onClose: () => void;
}

export const ParticipantsModal: React.FC<ParticipantsModalProps> = ({ sessionCode, onClose }) => {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const db = getDatabase();
    const participantsRef = ref(db, `sessions/${sessionCode}/participants`);

    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const participantsList = Object.entries(data).map(([id, participantData]: [string, any]) => ({
          id,
          name: participantData.name,
          joinedAt: participantData.joinedAt,
          isActive: participantData.isActive,
        }));

        // Sort by join time (earliest first)
        participantsList.sort((a, b) => a.joinedAt - b.joinedAt);

        setParticipants(participantsList);
      } else {
        setParticipants([]);
      }
    });

    return () => unsubscribe();
  }, [sessionCode]);

  const activeParticipants = participants.filter(p => p.isActive);
  const inactiveParticipants = participants.filter(p => !p.isActive);

  const downloadCSV = () => {
    if (participants.length === 0) return;

    const headers = ['Name', 'Status', 'Joined At'];
    const rows = participants.map(p => [
      p.name || 'Anonymous',
      p.isActive ? 'Active' : 'Left',
      new Date(p.joinedAt).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `participants-${sessionCode}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Participants</h2>
            <p style={styles.subtitle}>
              {activeParticipants.length} active · {inactiveParticipants.length} left
            </p>
          </div>
          <div style={styles.headerButtons}>
            {participants.length > 0 && (
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
          {participants.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>👥</div>
              <p style={styles.emptyText}>No participants yet</p>
            </div>
          ) : (
            <>
              {/* Active participants */}
              {activeParticipants.length > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>
                    Active ({activeParticipants.length})
                  </h3>
                  <div style={styles.participantsList}>
                    {activeParticipants.map((participant, index) => (
                      <div key={participant.id} style={styles.participantCard}>
                        <div style={styles.participantNumber}>{index + 1}</div>
                        <div style={styles.participantInfo}>
                          <div style={styles.participantName}>
                            {participant.name || 'Anonymous'}
                          </div>
                          <div style={styles.participantTime}>
                            Joined {new Date(participant.joinedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <div style={styles.activeIndicator}>●</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive participants */}
              {inactiveParticipants.length > 0 && (
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>
                    Left ({inactiveParticipants.length})
                  </h3>
                  <div style={styles.participantsList}>
                    {inactiveParticipants.map((participant) => (
                      <div key={participant.id} style={styles.participantCardInactive}>
                        <div style={styles.participantInfo}>
                          <div style={styles.participantNameInactive}>
                            {participant.name || 'Anonymous'}
                          </div>
                          <div style={styles.participantTime}>
                            Joined {new Date(participant.joinedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
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
    alignItems: 'flex-start',
    padding: '24px',
    borderBottom: '2px solid #e5e7eb',
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
    padding: '16px 24px 24px',
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
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  participantsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  participantCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  participantCardInactive: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    opacity: 0.6,
  },
  participantNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: primaryBlue,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '2px',
  },
  participantNameInactive: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: '2px',
  },
  participantTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  activeIndicator: {
    color: '#10b981',
    fontSize: '16px',
  },
};

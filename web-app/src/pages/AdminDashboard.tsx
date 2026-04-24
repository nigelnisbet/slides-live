import React, { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove, update } from 'firebase/database';

// Use the existing Firebase app from firebase.ts
const app = getApp();
const database = getDatabase(app);

interface PersonalSession {
  displayName: string;
  sessionCode: string;
  presentationId: string;
  displayMode: string;
  redirectUrl: string;
  active: boolean;
  createdAt: number;
  lastUsed: number | null;
}

const primaryBlue = '#3b82f6';
const accentGreen = '#10b981';

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const AdminDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Record<string, PersonalSession>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    sessionCode: '',
    active: true,
  });

  const loadSessions = async () => {
    try {
      const sessionsRef = ref(database, 'personalSessions');
      const snapshot = await get(sessionsRef);
      if (snapshot.exists()) {
        setSessions(snapshot.val());
      } else {
        setSessions({});
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      alert('Error loading sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.displayName.trim()) {
      alert('Name and display name are required');
      return;
    }

    const name = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (sessions[name]) {
      alert('A session with this name already exists');
      return;
    }

    try {
      const sessionCode = formData.sessionCode.trim() || generateSessionCode();

      await set(ref(database, `personalSessions/${name}`), {
        displayName: formData.displayName.trim(),
        sessionCode: sessionCode.toUpperCase(),
        presentationId: 'conversation-tool',
        displayMode: 'display-only',
        redirectUrl: 'https://slides-live.com',
        active: formData.active,
        createdAt: Date.now(),
        lastUsed: null,
      });

      alert(`Session created for ${formData.displayName}!`);
      setShowAddForm(false);
      setFormData({ name: '', displayName: '', sessionCode: '', active: true });
      loadSessions();
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete session for ${sessions[name].displayName}?`)) {
      return;
    }

    try {
      await remove(ref(database, `personalSessions/${name}`));
      alert('Session deleted!');
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session');
    }
  };

  const handleToggleActive = async (name: string) => {
    try {
      await update(ref(database, `personalSessions/${name}`), {
        active: !sessions[name].active,
      });
      loadSessions();
    } catch (error) {
      console.error('Error toggling active:', error);
      alert('Error updating session');
    }
  };

  const getQRCodeUrl = (name: string) => {
    const baseUrl = 'https://slides-live.com';
    const url = `${baseUrl}/conv-tool/${name}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  const sessionsList = Object.entries(sessions);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Personal Sessions Admin</h1>
        <p style={styles.subtitle}>Manage sales team personal sessions</p>
      </div>

      <div style={styles.actions}>
        <button
          style={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Team Member'}
        </button>
      </div>

      {showAddForm && (
        <div style={styles.form}>
          <h3 style={styles.formTitle}>Add New Team Member</h3>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name (URL)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g., alicia"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <small style={styles.hint}>Will be used in URL: /conv-tool/{formData.name.toLowerCase()}</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Display Name</label>
              <input
                type="text"
                style={styles.input}
                placeholder="e.g., Alicia"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Session Code (optional)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Leave blank to auto-generate"
                value={formData.sessionCode}
                onChange={(e) => setFormData({ ...formData, sessionCode: e.target.value.toUpperCase() })}
                maxLength={6}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <span style={styles.checkboxText}>Active</span>
              </label>
            </div>
          </div>

          <button style={styles.submitButton} onClick={handleAdd}>
            Create Session
          </button>
        </div>
      )}

      <div style={styles.sessionsList}>
        <h3 style={styles.sectionTitle}>Current Sessions ({sessionsList.length})</h3>

        {sessionsList.length === 0 ? (
          <div style={styles.empty}>No sessions yet. Add your first team member above!</div>
        ) : (
          <div style={styles.grid}>
            {sessionsList.map(([name, session]) => (
              <div key={name} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h4 style={styles.cardTitle}>{session.displayName}</h4>
                    <div style={styles.cardSubtitle}>/{name}</div>
                  </div>
                  <div style={session.active ? styles.statusBadgeActive : styles.statusBadgeInactive}>
                    {session.active ? '● Active' : '○ Inactive'}
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Session Code:</span>
                    <span style={styles.infoValue}>{session.sessionCode}</span>
                  </div>

                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>URL:</span>
                    <a
                      href={`https://slides-live.com/conv-tool/${name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                    >
                      slides-live.com/conv-tool/{name}
                    </a>
                  </div>

                  <div style={styles.qrContainer}>
                    <img
                      src={getQRCodeUrl(name)}
                      alt={`QR Code for ${session.displayName}`}
                      style={styles.qrCode}
                    />
                    <a
                      href={getQRCodeUrl(name)}
                      download={`qr-${name}.png`}
                      style={styles.downloadLink}
                    >
                      Download QR Code
                    </a>
                  </div>
                </div>

                <div style={styles.cardActions}>
                  <button
                    style={styles.actionButton}
                    onClick={() => handleToggleActive(name)}
                  >
                    {session.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.deleteButton }}
                    onClick={() => handleDelete(name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '2rem',
  },
  loading: {
    textAlign: 'center',
    padding: '4rem',
    fontSize: '1.2rem',
    color: '#666',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: primaryBlue,
    margin: 0,
  },
  subtitle: {
    color: '#666',
    marginTop: '0.5rem',
  },
  actions: {
    marginBottom: '2rem',
  },
  addButton: {
    backgroundColor: accentGreen,
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '0.5rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formTitle: {
    margin: '0 0 1.5rem 0',
    color: primaryBlue,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  label: {
    fontWeight: '600',
    marginBottom: '0.5rem',
    color: '#333',
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #ddd',
    borderRadius: '0.5rem',
    fontSize: '1rem',
  },
  hint: {
    marginTop: '0.25rem',
    fontSize: '0.875rem',
    color: '#666',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  checkboxText: {
    marginLeft: '0.5rem',
  },
  submitButton: {
    backgroundColor: primaryBlue,
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  sessionsList: {
    marginTop: '2rem',
  },
  sectionTitle: {
    color: primaryBlue,
    marginBottom: '1rem',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    color: '#666',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #eee',
  },
  cardTitle: {
    margin: 0,
    color: primaryBlue,
    fontSize: '1.25rem',
  },
  cardSubtitle: {
    color: '#666',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  },
  statusBadgeActive: {
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  statusBadgeInactive: {
    padding: '0.25rem 0.75rem',
    borderRadius: '1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    backgroundColor: '#fafafa',
    color: '#999',
  },
  cardBody: {
    marginBottom: '1rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
    fontSize: '0.9rem',
  },
  infoLabel: {
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    color: '#333',
    fontFamily: 'monospace',
  },
  link: {
    color: accentGreen,
    textDecoration: 'none',
    wordBreak: 'break-all' as const,
  },
  qrContainer: {
    textAlign: 'center' as const,
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #eee',
  },
  qrCode: {
    width: '150px',
    height: '150px',
    border: '2px solid #eee',
    borderRadius: '0.5rem',
  },
  downloadLink: {
    display: 'block',
    marginTop: '0.5rem',
    color: primaryBlue,
    fontSize: '0.875rem',
    textDecoration: 'none',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #eee',
  },
  actionButton: {
    flex: 1,
    padding: '0.5rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '0.5rem',
    backgroundColor: 'white',
    color: '#333',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  deleteButton: {
    color: '#d32f2f',
    borderColor: '#d32f2f',
  },
};

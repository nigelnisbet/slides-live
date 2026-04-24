import React, { useState } from 'react';
import { PresentationPicker } from './PresentationPicker';
import { FloatingCircles } from '../FloatingCircles';
import { SlidesLiveLogo } from '../SlidesLiveLogo';

// Parse presentation ID from URL or return as-is if it's just an ID
export const parsePresentationId = (input: string): string => {
  const trimmed = input.trim();

  // Check if it's a URL containing /d/
  const dMatch = trimmed.match(/\/d\/([^\/]+)/);
  if (dMatch) {
    return dMatch[1];
  }

  // Check if it's a slides.com URL without /d/ (e.g., slides.com/username/presentation)
  if (trimmed.includes('slides.com')) {
    const parts = trimmed.split('/').filter(p => p && !p.includes('slides.com') && p !== 'https:' && p !== 'http:');
    if (parts.length > 0) {
      // Return the last meaningful part (presentation name/id)
      return parts[parts.length - 1].split('?')[0].split('#')[0];
    }
  }

  // Otherwise assume it's already just the ID
  return trimmed;
};

interface LandingPageProps {
  onLoadPresentation: (presentationId: string) => void;
  onCreateNew: (presentationId: string, slideCount: number) => void;
  onOpenLibrary: () => void;
  loading: boolean;
  currentUserId?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoadPresentation,
  onCreateNew,
  onOpenLibrary,
  loading,
  currentUserId,
}) => {
  const [presentationInput, setPresentationInput] = useState('');
  const [presentationId, setPresentationId] = useState('');
  const [slideCount, setSlideCount] = useState(10);
  const [mode, setMode] = useState<'select' | 'create'>('select');

  const handleInputChange = (value: string) => {
    setPresentationInput(value);
    const parsed = parsePresentationId(value);
    setPresentationId(parsed);
  };

  const handleLoad = () => {
    if (presentationId) {
      onLoadPresentation(presentationId);
    }
  };

  const handleCreate = () => {
    if (presentationId && slideCount > 0) {
      onCreateNew(presentationId, slideCount);
    }
  };

  const handleSelectExisting = (id: string) => {
    setPresentationInput(id);
    setPresentationId(id);
    onLoadPresentation(id);
  };

  return (
    <div style={styles.container}>
      <SlidesLiveLogo />
      <FloatingCircles />
      <div style={styles.header}>
        <h1 style={styles.title}>Builder</h1>
        <p style={styles.subtitle}>
          Create interactive activities for your presentations
        </p>
        <button onClick={onOpenLibrary} style={styles.libraryBtn}>
          📚 Activity Library
        </button>
      </div>

      <div style={styles.content}>
        {/* URL Input Section */}
        <div style={styles.inputSection}>
          <label style={styles.label}>
            Presentation ID or URL
            <small style={styles.hint}>
              Paste the full slides.com URL or just the ID
            </small>
            <input
              type="text"
              value={presentationInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="e.g., https://docs.google.com/presentation/d/1QJ-pGuiw6zi9bzyIu..."
              style={styles.input}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && presentationId) {
                  handleLoad();
                }
              }}
            />
            {presentationId && presentationId !== presentationInput && (
              <small style={styles.parsedId}>Using ID: {presentationId}</small>
            )}
          </label>

          {presentationId && (
            <div style={styles.modeSelector}>
              <button
                onClick={() => setMode('select')}
                style={{
                  ...styles.modeBtn,
                  ...(mode === 'select' ? styles.modeBtnActive : {}),
                }}
              >
                Load Existing
              </button>
              <button
                onClick={() => setMode('create')}
                style={{
                  ...styles.modeBtn,
                  ...(mode === 'create' ? styles.modeBtnActive : {}),
                }}
              >
                Create New
              </button>
            </div>
          )}

          {presentationId && mode === 'select' && (
            <button
              onClick={handleLoad}
              style={styles.actionBtn}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load Presentation'}
            </button>
          )}

          {presentationId && mode === 'create' && (
            <div style={styles.createSection}>
              <label style={styles.label}>
                Number of Horizontal Slides
                <small style={styles.hint}>
                  How many slides in your presentation? (You can add more later)
                </small>
                <input
                  type="number"
                  value={slideCount}
                  onChange={(e) => setSlideCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="100"
                  style={styles.numberInput}
                />
              </label>
              <button
                onClick={handleCreate}
                style={styles.actionBtn}
                disabled={loading || slideCount < 1}
              >
                Create Presentation
              </button>
            </div>
          )}
        </div>

        {/* Existing Presentations */}
        <div style={styles.existingSection}>
          <PresentationPicker onSelect={handleSelectExisting} currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: 'white',
  },
  subtitle: {
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  libraryBtn: {
    marginTop: '16px',
    padding: '12px 24px',
    backgroundColor: 'white',
    color: '#8b5cf6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 'normal',
  },
  parsedId: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: '600',
    marginTop: '4px',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    marginTop: '8px',
  },
  numberInput: {
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    marginTop: '8px',
    width: '120px',
  },
  modeSelector: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
  },
  modeBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  modeBtnActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#3b82f6',
  },
  actionBtn: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '16px',
  },
  createSection: {
    marginTop: '16px',
  },
  existingSection: {
    marginTop: '8px',
  },
};

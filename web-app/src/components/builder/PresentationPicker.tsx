import React, { useState, useEffect } from 'react';
import { ref, get, remove } from 'firebase/database';
import { database } from './firebaseConfig';

interface PresentationListItem {
  id: string;
  title: string;
  activityCount: number;
  tags: string[];
  source: 'google-slides' | 'slides-com' | 'unknown';
  ownerId?: string;
}

interface PresentationPickerProps {
  onSelect: (presentationId: string) => void;
  currentUserId?: string;
}

// Detect source platform from presentation ID
const detectSource = (id: string): 'google-slides' | 'slides-com' | 'unknown' => {
  // Google Slides IDs are typically 44 characters, alphanumeric with dashes/underscores
  // Example: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
  if (id.length >= 40 && /^[a-zA-Z0-9_-]+$/.test(id)) {
    return 'google-slides';
  }
  // slides.com IDs are shorter slugs like "my-presentation" or numeric like "12345"
  if (id.length < 40) {
    return 'slides-com';
  }
  return 'unknown';
};

// Get source display info
const getSourceInfo = (source: 'google-slides' | 'slides-com' | 'unknown') => {
  switch (source) {
    case 'google-slides':
      return { label: 'Google Slides', color: '#ea4335', bgColor: '#fce8e6' };
    case 'slides-com':
      return { label: 'slides.com', color: '#6366f1', bgColor: '#eef2ff' };
    default:
      return { label: 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' };
  }
};

export const PresentationPicker: React.FC<PresentationPickerProps> = ({ onSelect, currentUserId }) => {
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PresentationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPresentations();
  }, [currentUserId]);

  const loadPresentations = async () => {
    setLoading(true);
    setError(null);

    try {
      const presentationsRef = ref(database, 'presentations');
      const snapshot = await get(presentationsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();

        const list: PresentationListItem[] = Object.keys(data).map(id => {
          const source = detectSource(id);
          const storedTags: string[] = data[id].config?.tags || [];

          // Auto-add source tag if not already present
          const sourceTag = source === 'google-slides' ? 'Google Slides' :
                           source === 'slides-com' ? 'slides.com' : null;
          const tags = sourceTag && !storedTags.includes(sourceTag)
            ? [sourceTag, ...storedTags]
            : storedTags;

          return {
            id,
            title: data[id].config?.title || '',
            activityCount: data[id].config?.activities?.length || 0,
            tags,
            source,
            ownerId: data[id].config?.ownerId,
          };
        });

        // Filter by current user if provided
        const filteredList = currentUserId
          ? list.filter(p => p.ownerId === currentUserId)  // Show only user's own presentations
          : list;

        // Collect tags only from filtered presentations
        const tagSet = new Set<string>();
        // Always include source tags
        tagSet.add('Google Slides');
        tagSet.add('slides.com');
        // Add tags from user's presentations
        filteredList.forEach(p => {
          p.tags.forEach(tag => tagSet.add(tag));
        });

        // Sort by title first (if exists), then by ID
        filteredList.sort((a, b) => {
          const aName = a.title || a.id;
          const bName = b.title || b.id;
          return aName.localeCompare(bName);
        });

        setPresentations(filteredList);
        setAllTags(Array.from(tagSet).sort());
      } else {
        setPresentations([]);
        setAllTags([]);
      }
    } catch (err) {
      setError('Failed to load presentations');
      console.error('Error loading presentations:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleDeletePresentation = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await remove(ref(database, `presentations/${deleteTarget.id}`));
      setPresentations(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting presentation:', err);
      setError('Failed to delete presentation');
    } finally {
      setDeleting(false);
    }
  };

  const filteredPresentations = presentations.filter(p => {
    // Filter by search query
    const matchesSearch = searchQuery === '' ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter by selected tags (if any selected, must match at least one)
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => p.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading presentations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button onClick={loadPresentations} style={styles.retryBtn}>
          Retry
        </button>
      </div>
    );
  }

  // Get external link URL based on source
  const getExternalUrl = (presentation: PresentationListItem) => {
    if (presentation.source === 'google-slides') {
      return `https://docs.google.com/presentation/d/${presentation.id}/edit`;
    }
    return `https://mind.slides.com/d/${presentation.id}/live`;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Existing Presentations</h3>

      {presentations.length > 0 && (
        <>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presentations or tags..."
            style={styles.searchInput}
          />

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div style={styles.tagFilterSection}>
              <span style={styles.tagFilterLabel}>Filter by tag:</span>
              <div style={styles.tagFilterList}>
                {allTags.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  const isSource = tag === 'Google Slides' || tag === 'slides.com';
                  const sourceInfo = isSource ? getSourceInfo(
                    tag === 'Google Slides' ? 'google-slides' : 'slides-com'
                  ) : null;

                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        ...styles.tagFilterBtn,
                        backgroundColor: isSelected
                          ? (sourceInfo?.color || '#3b82f6')
                          : (sourceInfo?.bgColor || '#f3f4f6'),
                        color: isSelected
                          ? 'white'
                          : (sourceInfo?.color || '#374151'),
                        borderColor: sourceInfo?.color || '#d1d5db',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  style={styles.clearTagsBtn}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </>
      )}

      {filteredPresentations.length === 0 ? (
        <div style={styles.emptyState}>
          {presentations.length === 0
            ? 'No presentations found. Create your first one!'
            : 'No matching presentations'}
        </div>
      ) : (
        <div style={styles.list}>
          {filteredPresentations.map(presentation => {
            const sourceInfo = getSourceInfo(presentation.source);

            return (
              <div
                key={presentation.id}
                style={styles.listItem}
              >
                <div
                  onClick={() => onSelect(presentation.id)}
                  style={styles.listItemMain}
                >
                  <div style={styles.nameSection}>
                    <div style={styles.nameRow}>
                      <span style={styles.presentationName}>
                        {presentation.title || presentation.id}
                      </span>
                      <span
                        style={{
                          ...styles.sourceTag,
                          backgroundColor: sourceInfo.bgColor,
                          color: sourceInfo.color,
                        }}
                      >
                        {sourceInfo.label}
                      </span>
                    </div>
                    {presentation.title && (
                      <span style={styles.presentationIdSmall}>{presentation.id}</span>
                    )}
                    {/* Show custom tags (excluding source tag) */}
                    {presentation.tags.filter(t => t !== 'Google Slides' && t !== 'slides.com').length > 0 && (
                      <div style={styles.tagList}>
                        {presentation.tags
                          .filter(t => t !== 'Google Slides' && t !== 'slides.com')
                          .map(tag => (
                            <span key={tag} style={styles.tag}>{tag}</span>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  <span style={styles.activityCount}>
                    {presentation.activityCount} {presentation.activityCount === 1 ? 'activity' : 'activities'}
                  </span>
                </div>
                <a
                  href={getExternalUrl(presentation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={styles.slidesLink}
                  title={presentation.source === 'google-slides' ? 'Open in Google Slides' : 'Open in slides.com'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(presentation);
                  }}
                  style={styles.deleteBtn}
                  title="Delete presentation"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div style={styles.dialogOverlay}>
          <div style={styles.dialog}>
            <h3 style={styles.dialogTitle}>Delete Presentation</h3>
            <p style={styles.dialogText}>
              Are you sure you want to delete <strong>{deleteTarget.title || deleteTarget.id}</strong>?
            </p>
            <p style={styles.dialogWarning}>
              This will permanently remove all {deleteTarget.activityCount} {deleteTarget.activityCount === 1 ? 'activity' : 'activities'} associated with this presentation.
            </p>
            <div style={styles.dialogButtons}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={styles.dialogCancelBtn}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePresentation}
                style={styles.dialogDeleteBtn}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  tagFilterSection: {
    marginBottom: '16px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
  },
  tagFilterLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  tagFilterList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tagFilterBtn: {
    padding: '4px 10px',
    fontSize: '12px',
    borderRadius: '12px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
  },
  clearTagsBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '12px',
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  retryBtn: {
    display: 'block',
    margin: '0 auto',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: '#999',
    fontSize: '14px',
  },
  list: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
    backgroundColor: '#fafafa',
    gap: '12px',
  },
  listItemMain: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
  },
  nameSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  presentationName: {
    fontWeight: '500',
    color: '#333',
  },
  sourceTag: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  presentationIdSmall: {
    fontSize: '11px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '4px',
  },
  tag: {
    fontSize: '11px',
    color: '#4b5563',
    backgroundColor: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  activityCount: {
    fontSize: '12px',
    color: '#666',
    backgroundColor: '#e5e7eb',
    padding: '4px 8px',
    borderRadius: '12px',
    flexShrink: 0,
  },
  slidesLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    color: '#6366f1',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    textDecoration: 'none',
    flexShrink: 0,
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'color 0.2s',
    flexShrink: 0,
  },
  dialogOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  dialogTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  dialogText: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  dialogWarning: {
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#dc2626',
    lineHeight: '1.5',
  },
  dialogButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  dialogCancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  dialogDeleteBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};

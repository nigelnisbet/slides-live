import React, { useEffect, useCallback, useState } from 'react';
import { ref, get } from 'firebase/database';
import { ActivityFormFields, ActivityFormData, validateActivity, getDefaultActivity } from './ActivityFormFields';
import { database } from './firebaseConfig';
import { LibraryActivity, saveToLibrary } from './ActivityLibrary';

interface ActivityEditorModalProps {
  isOpen: boolean;
  slidePosition: { indexh: number; indexv: number };
  existingActivity?: ActivityFormData;
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  currentUserId?: string;
}

type ModalMode = 'create' | 'library';

export const ActivityEditorModal: React.FC<ActivityEditorModalProps> = ({
  isOpen,
  slidePosition,
  existingActivity,
  activity,
  onActivityChange,
  onSave,
  onDelete,
  onClose,
  currentUserId,
}) => {
  const [mode, setMode] = useState<ModalMode>('create');
  const [libraryActivities, setLibraryActivities] = useState<LibraryActivity[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'poll' | 'quiz' | 'text-response' | 'web-link' | 'review-game' | 'submit-sample' | 'collaborative-tap-game' | 'attendee-screen-message' | 'announcement'>('all');
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [sourceLibraryActivity, setSourceLibraryActivity] = useState<LibraryActivity | null>(null);
  const [libraryUpdateAvailable, setLibraryUpdateAvailable] = useState(false);

  // Handle escape key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Reset mode when opening for a new activity
      if (!existingActivity) {
        setMode('create');
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown, existingActivity]);

  // Load library activities when switching to library mode
  useEffect(() => {
    if (isOpen && mode === 'library' && currentUserId) {
      loadLibraryActivities();
    }
  }, [isOpen, mode, currentUserId]);

  // Check for library updates when opening an existing activity from library
  useEffect(() => {
    const checkLibraryUpdate = async () => {
      const sourceId = (activity as any).sourceLibraryId;
      const copiedAt = (activity as any).copiedFromLibraryAt;

      if (!isOpen || !existingActivity || !sourceId) {
        setSourceLibraryActivity(null);
        setLibraryUpdateAvailable(false);
        return;
      }

      try {
        const libRef = ref(database, `activityLibrary/${sourceId}`);
        const snapshot = await get(libRef);

        if (snapshot.exists()) {
          const libActivity: LibraryActivity = {
            id: sourceId,
            ...snapshot.val(),
          };
          setSourceLibraryActivity(libActivity);

          // Check if library was updated after this activity was copied
          if (copiedAt && libActivity.updatedAt > copiedAt) {
            setLibraryUpdateAvailable(true);
          } else {
            setLibraryUpdateAvailable(false);
          }
        } else {
          // Library activity was deleted
          setSourceLibraryActivity(null);
          setLibraryUpdateAvailable(false);
        }
      } catch (err) {
        console.error('Error checking library update:', err);
      }
    };

    checkLibraryUpdate();
  }, [isOpen, existingActivity, activity]);

  const loadLibraryActivities = async () => {
    if (!currentUserId) return;

    setLoadingLibrary(true);
    try {
      const libraryRef = ref(database, 'activityLibrary');
      const snapshot = await get(libraryRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: LibraryActivity[] = Object.keys(data).map(id => ({
          id,
          ...data[id],
        }));

        // Filter: show user's own + shared
        const filtered = list.filter(
          a => a.createdBy === currentUserId || a.isShared
        );

        // Sort by updatedAt descending
        filtered.sort((a, b) => b.updatedAt - a.updatedAt);

        setLibraryActivities(filtered);
      } else {
        setLibraryActivities([]);
      }
    } catch (err) {
      console.error('Error loading library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  if (!isOpen) return null;

  const displaySlide = slidePosition.indexv === 0
    ? `Slide ${slidePosition.indexh + 1}`
    : `Slide ${slidePosition.indexh + 1}.${slidePosition.indexv + 1}`;

  const handleSave = () => {
    // Auto-generate ID if needed
    let activityToSave = { ...activity };
    if (!activityToSave.activityId.trim()) {
      const slideNum = activityToSave.slidePosition.indexh;
      activityToSave.activityId = `${activityToSave.type}-slide${slideNum}-${Date.now().toString(36)}`;
      onActivityChange(activityToSave);
    }

    const error = validateActivity(activityToSave);
    if (error) {
      alert(error);
      return;
    }
    onSave();
  };

  // Save/update to library
  const handleSaveToLibrary = async () => {
    if (!currentUserId) return;

    const error = validateActivity(activity);
    if (error) {
      alert(error);
      return;
    }

    setSavingToLibrary(true);
    setLibraryMessage(null);

    try {
      // Generate a name based on the activity content
      let name = '';
      if (activity.type === 'poll' || activity.type === 'quiz') {
        name = activity.question?.slice(0, 50) || `${activity.type} activity`;
      } else if (activity.type === 'text-response') {
        name = activity.prompt?.slice(0, 50) || 'Text response';
      } else if (activity.type === 'web-link') {
        name = activity.title || activity.url?.slice(0, 50) || 'Web link';
      } else if (activity.type === 'review-game') {
        name = activity.gameTitle?.slice(0, 50) || 'Review game';
      } else if (activity.type === 'submit-sample') {
        name = activity.instructions?.slice(0, 50) || 'Canvas activity';
      }

      const config: LibraryActivity['config'] = {};
      if (activity.type === 'poll') {
        config.question = activity.question;
        config.options = activity.options;
        config.showResults = activity.showResults;
      } else if (activity.type === 'quiz') {
        config.question = activity.question;
        config.options = activity.options;
        config.correctAnswer = activity.correctAnswer;
        config.timeLimit = activity.timeLimit;
        config.showResults = activity.showResults;
      } else if (activity.type === 'text-response') {
        config.prompt = activity.prompt;
        config.placeholder = activity.placeholder;
        config.maxLength = activity.maxLength;
      } else if (activity.type === 'web-link') {
        config.title = activity.title;
        config.description = activity.description;
        config.url = activity.url;
        config.displayMode = activity.displayMode;
        config.fullScreen = activity.fullScreen;
      } else if (activity.type === 'review-game') {
        config.title = activity.gameTitle;
        config.questions = activity.gameQuestions;
        config.defaultTimeLimit = activity.defaultTimeLimit;
        config.maxPoints = activity.maxPoints;
        config.minPoints = activity.minPoints;
      } else if (activity.type === 'submit-sample') {
        config.url = activity.url;
        config.instructions = activity.instructions;
        config.allowAnnotations = activity.allowAnnotations;
        config.allowMultipleSubmissions = activity.allowMultipleSubmissions;
        config.canvasSelector = activity.canvasSelector;
      }

      // Check if this activity came from library (has sourceLibraryId)
      const sourceId = (activity as any).sourceLibraryId;

      await saveToLibrary(
        { type: activity.type, name, config },
        currentUserId,
        false,
        sourceId
      );

      setLibraryMessage(sourceId ? 'Updated in library!' : 'Saved to library!');
      setTimeout(() => setLibraryMessage(null), 3000);
    } catch (err) {
      console.error('Error saving to library:', err);
      setLibraryMessage('Failed to save');
    } finally {
      setSavingToLibrary(false);
    }
  };

  // Pull update from library
  const handlePullLibraryUpdate = () => {
    if (!sourceLibraryActivity) return;

    const libActivity = sourceLibraryActivity;
    const config = libActivity.config || {};
    const updatedActivity: ActivityFormData & { sourceLibraryId?: string; copiedFromLibraryAt?: number } = {
      ...activity,
      sourceLibraryId: libActivity.id,
      copiedFromLibraryAt: Date.now(),
    };

    // Update fields from library (with null safety)
    if (libActivity.type === 'poll' || libActivity.type === 'quiz') {
      updatedActivity.question = config.question || '';
      updatedActivity.options = config.options || ['', ''];
      updatedActivity.showResults = config.showResults || 'live';
      if (libActivity.type === 'quiz') {
        updatedActivity.correctAnswer = config.correctAnswer || 0;
        updatedActivity.timeLimit = config.timeLimit || 30;
      }
    } else if (libActivity.type === 'text-response') {
      updatedActivity.prompt = config.prompt || '';
      updatedActivity.placeholder = config.placeholder || '';
      updatedActivity.maxLength = config.maxLength || 500;
    } else if (libActivity.type === 'web-link') {
      updatedActivity.title = config.title || '';
      updatedActivity.description = config.description || '';
      updatedActivity.url = config.url || '';
      updatedActivity.displayMode = config.displayMode || 'iframe';
      updatedActivity.fullScreen = config.fullScreen || false;
    } else if (libActivity.type === 'review-game') {
      updatedActivity.gameTitle = config.title || '';
      updatedActivity.gameQuestions = config.questions || [];
      updatedActivity.defaultTimeLimit = config.defaultTimeLimit || 20;
      updatedActivity.maxPoints = config.maxPoints || 1000;
      updatedActivity.minPoints = config.minPoints || 100;
    } else if (libActivity.type === 'submit-sample') {
      updatedActivity.url = config.url || '';
      updatedActivity.instructions = config.instructions || '';
      updatedActivity.allowAnnotations = config.allowAnnotations !== undefined ? config.allowAnnotations : true;
      updatedActivity.allowMultipleSubmissions = config.allowMultipleSubmissions || false;
      updatedActivity.canvasSelector = config.canvasSelector || 'canvas';
    }

    onActivityChange(updatedActivity);
    setLibraryUpdateAvailable(false);
    setLibraryMessage('Updated from library!');
    setTimeout(() => setLibraryMessage(null), 3000);
  };

  // Select activity from library
  const handleSelectFromLibrary = (libActivity: LibraryActivity) => {
    console.log('[ActivityEditorModal] Selecting from library:', {
      type: libActivity.type,
      id: libActivity.id,
      name: libActivity.name,
      config: libActivity.config,
    });

    // Special handling for collaborative-tap-game (library-only, non-editable)
    if (libActivity.type === 'collaborative-tap-game') {
      const config = libActivity.config || {};
      const gameActivity = {
        type: 'collaborative-tap-game' as const,
        activityId: `${libActivity.type}-slide${slidePosition.indexh}-${Date.now().toString(36)}`,
        slidePosition: {
          indexh: slidePosition.indexh,
          indexv: slidePosition.indexv,
        },
        sourceLibraryId: libActivity.id,
        copiedFromLibraryAt: Date.now(),
        // Only spread defined fields from config
        title: config.title || '',
        question: config.question || '',
        linearIncrement: config.linearIncrement || 1000000,
        cooldownSeconds: config.cooldownSeconds || 3,
        winCondition: config.winCondition || 1000000000000,
      };
      onActivityChange(gameActivity as any);
      setMode('create'); // Switch to create mode to show Add Activity button
      return;
    }

    // Get default activity for this type (for editable types)
    const defaultActivity = getDefaultActivity(libActivity.type as any, slidePosition.indexh, slidePosition.indexv);

    const newActivity: ActivityFormData & { sourceLibraryId?: string; copiedFromLibraryAt?: number } = {
      ...defaultActivity,
      type: libActivity.type as any, // Ensure type is explicitly set
      activityId: `${libActivity.type}-slide${slidePosition.indexh}-${Date.now().toString(36)}`,
      sourceLibraryId: libActivity.id,
      copiedFromLibraryAt: Date.now(),
    };

    // Copy config fields (with null safety for config)
    const config = libActivity.config || {};
    if (libActivity.type === 'poll' || libActivity.type === 'quiz') {
      newActivity.question = config.question || '';
      newActivity.options = config.options || ['', ''];
      newActivity.showResults = config.showResults || 'live';
      if (libActivity.type === 'quiz') {
        newActivity.correctAnswer = config.correctAnswer || 0;
        newActivity.timeLimit = config.timeLimit || 30;
      }
    } else if (libActivity.type === 'text-response') {
      newActivity.prompt = config.prompt || '';
      newActivity.placeholder = config.placeholder || '';
      newActivity.maxLength = config.maxLength || 500;
    } else if (libActivity.type === 'web-link') {
      newActivity.title = config.title || '';
      newActivity.description = config.description || '';
      newActivity.url = config.url || '';
      newActivity.displayMode = config.displayMode || 'iframe';
      newActivity.fullScreen = config.fullScreen || false;
    } else if (libActivity.type === 'review-game') {
      newActivity.gameTitle = config.title || '';
      // Use library questions if available, otherwise keep defaults from getDefaultActivity
      newActivity.gameQuestions = (config.questions && config.questions.length > 0)
        ? config.questions
        : defaultActivity.gameQuestions || [];
      newActivity.defaultTimeLimit = config.defaultTimeLimit || 20;
      newActivity.maxPoints = config.maxPoints || 1000;
      newActivity.minPoints = config.minPoints || 100;
    } else if (libActivity.type === 'submit-sample') {
      newActivity.url = config.url || '';
      newActivity.instructions = config.instructions || '';
      newActivity.allowAnnotations = config.allowAnnotations !== undefined ? config.allowAnnotations : true;
      newActivity.allowMultipleSubmissions = config.allowMultipleSubmissions || false;
      newActivity.canvasSelector = config.canvasSelector || 'canvas';
    }

    console.log('[ActivityEditorModal] Created activity:', {
      type: newActivity.type,
      gameTitle: (newActivity as any).gameTitle,
      gameQuestionsLength: (newActivity as any).gameQuestions?.length,
      question: (newActivity as any).question,
    });

    onActivityChange(newActivity);
    setMode('create');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Filter library activities
  const filteredLibrary = libraryActivities.filter(a => {
    if (libraryFilter !== 'all' && a.type !== libraryFilter) return false;
    if (!librarySearch.trim()) return true;

    const search = librarySearch.toLowerCase();
    const name = (a.name || '').toLowerCase();
    const config = a.config || {};
    const question = (config.question || '').toLowerCase();
    const title = (config.title || '').toLowerCase();
    const prompt = (config.prompt || '').toLowerCase();

    return name.includes(search) || question.includes(search) || title.includes(search) || prompt.includes(search);
  });

  // Get preview text for library activity
  const getPreviewText = (a: LibraryActivity): string => {
    const config = a.config || {};
    switch (a.type) {
      case 'poll':
      case 'quiz':
        return config.question || 'No question';
      case 'text-response':
        return config.prompt || 'No prompt';
      case 'web-link':
        return config.title || config.url || 'No title';
      case 'review-game':
        const qCount = config.questions?.length || 0;
        return `${config.title || 'Untitled'} (${qCount} question${qCount !== 1 ? 's' : ''})`;
      case 'submit-sample':
        return config.instructions || 'No instructions';
      case 'collaborative-tap-game':
        return config.question || config.title || 'Interactive tap game';
      default:
        return '';
    }
  };

  const hasSourceLibraryId = !!(activity as any).sourceLibraryId;

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>
            {existingActivity ? 'Edit Activity' : 'Add Activity'} - {displaySlide}
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {/* Mode tabs - only show for new activities */}
        {!existingActivity && (
          <div style={styles.modeTabs}>
            <button
              onClick={() => setMode('create')}
              style={{
                ...styles.modeTab,
                ...(mode === 'create' ? styles.modeTabActive : {}),
              }}
            >
              Create New
            </button>
            <button
              onClick={() => setMode('library')}
              style={{
                ...styles.modeTab,
                ...(mode === 'library' ? styles.modeTabActive : {}),
              }}
            >
              Choose from Library
            </button>
          </div>
        )}

        <div style={styles.modalBody}>
          {/* Library update available banner */}
          {mode === 'create' && libraryUpdateAvailable && sourceLibraryActivity && (
            <div style={styles.updateBanner}>
              <span style={styles.updateBannerText}>
                Library update available
              </span>
              <button
                onClick={handlePullLibraryUpdate}
                style={styles.updateBannerBtn}
              >
                Pull Update
              </button>
            </div>
          )}

          {mode === 'create' ? (
            <ActivityFormFields
              activity={activity}
              onChange={onActivityChange}
              showSlidePosition={false}
            />
          ) : (
            <div style={styles.libraryPicker}>
              {/* Search and filter */}
              <div style={styles.libraryControls}>
                <input
                  type="text"
                  value={librarySearch}
                  onChange={e => setLibrarySearch(e.target.value)}
                  placeholder="Search activities..."
                  style={styles.librarySearch}
                />
                <select
                  value={libraryFilter}
                  onChange={e => setLibraryFilter(e.target.value as any)}
                  style={styles.libraryFilterSelect}
                >
                  <option value="all">All Types</option>
                  <option value="poll">Polls</option>
                  <option value="quiz">Quizzes</option>
                  <option value="review-game">Review Games</option>
                  <option value="text-response">Text Responses</option>
                  <option value="web-link">Web Links</option>
                  <option value="submit-sample">Canvas Activities</option>
                  <option value="collaborative-tap-game">Interactive Games</option>
                </select>
              </div>

              {/* Activity list */}
              {loadingLibrary ? (
                <div style={styles.libraryLoading}>Loading library...</div>
              ) : filteredLibrary.length === 0 ? (
                <div style={styles.libraryEmpty}>
                  {librarySearch
                    ? 'No activities match your search'
                    : 'No activities in library yet. Create some first!'}
                </div>
              ) : (
                <div style={styles.libraryList}>
                  {filteredLibrary.map(a => (
                    <div
                      key={a.id}
                      style={styles.libraryItem}
                      onClick={() => handleSelectFromLibrary(a)}
                    >
                      <div style={styles.libraryItemHeader}>
                        <span style={styles.libraryItemType}>
                          {a.type === 'poll' && '📊'}
                          {a.type === 'quiz' && '❓'}
                          {a.type === 'review-game' && '⭐'}
                          {a.type === 'text-response' && '💬'}
                          {a.type === 'web-link' && '🔗'}
                          {a.type === 'submit-sample' && '🎨'}
                          {a.type === 'collaborative-tap-game' && '💰'}
                        </span>
                        <span style={styles.libraryItemName}>{a.name}</span>
                        {a.isShared && a.createdBy !== currentUserId && (
                          <span style={styles.libraryItemShared}>Shared</span>
                        )}
                      </div>
                      <div style={styles.libraryItemPreview}>{getPreviewText(a)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.modalFooter}>
          <div style={styles.footerLeft}>
            {existingActivity && (
              <button onClick={onDelete} style={styles.deleteBtn}>
                Delete Activity
              </button>
            )}
            {/* Save to library button */}
            {mode === 'create' && currentUserId && (
              <button
                onClick={handleSaveToLibrary}
                style={styles.libraryBtn}
                disabled={savingToLibrary}
                title={hasSourceLibraryId ? 'Update the library version with your changes' : 'Save this activity to your library for reuse'}
              >
                {savingToLibrary
                  ? 'Saving...'
                  : hasSourceLibraryId
                  ? '↑ Update Library'
                  : '📚 Save to Library'}
              </button>
            )}
            {libraryMessage && (
              <span style={styles.libraryMessage}>{libraryMessage}</span>
            )}
          </div>
          <div style={styles.footerRight}>
            <button onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            {mode === 'create' && (
              <button onClick={handleSave} style={styles.saveBtn}>
                {existingActivity ? 'Update' : 'Add'} Activity
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    lineHeight: '32px',
    textAlign: 'center',
  },
  modeTabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
  },
  modeTab: {
    flex: 1,
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  modeTabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
    minHeight: '300px',
  },
  updateBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  updateBannerText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#92400e',
  },
  updateBannerBtn: {
    padding: '6px 12px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: '0 0 12px 12px',
    gap: '12px',
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  footerRight: {
    display: 'flex',
    gap: '12px',
  },
  deleteBtn: {
    padding: '10px 20px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  libraryBtn: {
    padding: '10px 16px',
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    border: '1px solid #c7d2fe',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  libraryMessage: {
    fontSize: '13px',
    color: '#10b981',
    fontWeight: '500',
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  saveBtn: {
    padding: '10px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  // Library picker styles
  libraryPicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  libraryControls: {
    display: 'flex',
    gap: '12px',
  },
  librarySearch: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  libraryFilterSelect: {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  libraryLoading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  libraryEmpty: {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  libraryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  libraryItem: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: '1px solid #e5e7eb',
  },
  libraryItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  libraryItemType: {
    fontSize: '16px',
  },
  libraryItemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  libraryItemShared: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
  },
  libraryItemPreview: {
    fontSize: '13px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

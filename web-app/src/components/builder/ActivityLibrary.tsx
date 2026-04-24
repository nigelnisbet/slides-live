import React, { useState, useEffect, useCallback } from 'react';
import { ref, get, set, remove, push } from 'firebase/database';
import { database } from './firebaseConfig';

// Library activity stored in Firebase
export interface LibraryActivity {
  id: string;
  type: 'poll' | 'quiz' | 'text-response' | 'web-link' | 'review-game' | 'submit-sample' | 'collaborative-tap-game' | 'attendee-screen-message' | 'announcement';
  name: string;
  config: {
    // Poll/Quiz fields
    question?: string;
    options?: string[];
    showResults?: 'live' | 'end' | 'never';
    correctAnswer?: number;
    timeLimit?: number;
    // Text-response fields
    prompt?: string;
    placeholder?: string;
    maxLength?: number;
    // Web-link fields
    title?: string;
    description?: string;
    url?: string;
    displayMode?: 'iframe' | 'new-tab' | 'redirect';
    fullScreen?: boolean;
    // Review-game fields
    questions?: Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer: number;
      timeLimit?: number;
    }>;
    defaultTimeLimit?: number;
    maxPoints?: number;
    minPoints?: number;
    // Submit-sample fields
    instructions?: string;
    allowAnnotations?: boolean;
    allowMultipleSubmissions?: boolean;
    canvasSelector?: string;
    // Collaborative-tap-game fields
    linearIncrement?: number;
    cooldownSeconds?: number;
    winCondition?: number;
    // Attendee-screen-message fields
    message?: string;
  };
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  isShared: boolean;
}

interface ActivityLibraryProps {
  currentUserId: string;
  onBack: () => void;
  onSelectActivity?: (activity: LibraryActivity) => void;
  mode: 'browse' | 'pick'; // browse = standalone page, pick = picker in modal
}

type ActivityType = 'poll' | 'quiz' | 'text-response' | 'web-link' | 'review-game' | 'submit-sample' | 'collaborative-tap-game' | 'attendee-screen-message' | 'announcement';

const ACTIVITY_TYPES: { type: ActivityType; label: string; icon: string }[] = [
  { type: 'poll', label: 'Polls', icon: '📊' },
  { type: 'quiz', label: 'Quizzes', icon: '❓' },
  { type: 'review-game', label: 'Review Games', icon: '⭐' },
  { type: 'text-response', label: 'Text Responses', icon: '💬' },
  { type: 'web-link', label: 'Web Links', icon: '🔗' },
  { type: 'submit-sample', label: 'Canvas Activities', icon: '🎨' },
  { type: 'collaborative-tap-game', label: 'Interactive Games', icon: '💰' },
  { type: 'attendee-screen-message', label: 'Discussion Prompts', icon: '💭' },
  { type: 'announcement', label: 'Announcements', icon: '📢' },
];

// Generate a hash for duplicate detection based on activity content
const generateActivityHash = (type: ActivityType, config: LibraryActivity['config']): string => {
  if (type === 'poll' || type === 'quiz') {
    const opts = (config.options || []).join('|');
    return `${type}:${config.question || ''}:${opts}`;
  } else if (type === 'text-response') {
    return `${type}:${config.prompt || ''}`;
  } else if (type === 'web-link') {
    return `${type}:${config.url || ''}`;
  } else if (type === 'review-game') {
    const qs = (config.questions || []).map(q => q.question).join('|');
    return `${type}:${config.title || ''}:${qs}`;
  } else if (type === 'submit-sample') {
    return `${type}:${config.url || ''}:${config.instructions || ''}`;
  } else if (type === 'collaborative-tap-game') {
    return `${type}:${config.title || ''}:${config.winCondition || ''}`;
  } else if (type === 'attendee-screen-message') {
    return `${type}:${config.message || ''}`;
  } else if (type === 'announcement') {
    return `${type}:${config.message || ''}`;
  }
  return `${type}:unknown`;
};

export const ActivityLibrary: React.FC<ActivityLibraryProps> = ({
  currentUserId,
  onBack,
  onSelectActivity,
  mode,
}) => {
  const [activities, setActivities] = useState<LibraryActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActivityType>('poll');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LibraryActivity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingActivity, setEditingActivity] = useState<LibraryActivity | null>(null);

  // Load activities from Firebase
  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const libraryRef = ref(database, 'activityLibrary');
      const snapshot = await get(libraryRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: LibraryActivity[] = Object.keys(data).map(id => ({
          id,
          ...data[id],
        }));

        // Filter: show user's own activities + shared activities from others
        const filtered = list.filter(
          a => a.createdBy === currentUserId || a.isShared
        );

        // Sort by updatedAt descending (most recent first)
        filtered.sort((a, b) => b.updatedAt - a.updatedAt);

        setActivities(filtered);
      } else {
        setActivities([]);
      }
    } catch (err) {
      setError('Failed to load activity library');
      console.error('Error loading library:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Filter activities by type and search
  const filteredActivities = activities.filter(a => {
    if (a.type !== activeTab) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const name = (a.name || '').toLowerCase();
    const config = a.config || {};
    const question = (config.question || '').toLowerCase();
    const title = (config.title || '').toLowerCase();
    const prompt = (config.prompt || '').toLowerCase();

    return name.includes(query) || question.includes(query) || title.includes(query) || prompt.includes(query);
  });

  // Delete activity
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await remove(ref(database, `activityLibrary/${deleteTarget.id}`));
      setActivities(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError('Failed to delete activity');
    } finally {
      setDeleting(false);
    }
  };

  // Import activities from all user's presentations
  const handleImportFromPresentations = async () => {
    setImporting(true);
    setImportResult(null);

    try {
      // 1. Get all presentations
      const presentationsRef = ref(database, 'presentations');
      const snapshot = await get(presentationsRef);

      if (!snapshot.exists()) {
        setImportResult({ imported: 0, skipped: 0 });
        setImporting(false);
        return;
      }

      const presentations = snapshot.val();
      const allActivities: Array<{
        type: ActivityType;
        name: string;
        config: LibraryActivity['config'];
        hash: string;
      }> = [];

      // 2. Extract activities from presentations owned by current user
      for (const [, presentation] of Object.entries(presentations)) {
        const pres = presentation as any;
        const config = pres?.config;

        // Only import from user's own presentations
        if (config?.ownerId !== currentUserId) continue;

        // Activities might be an array or an object (Firebase converts arrays to objects sometimes)
        const activitiesData = config?.activities || [];
        const activitiesList = Array.isArray(activitiesData)
          ? activitiesData
          : Object.values(activitiesData);

        for (const activity of activitiesList) {
          // The type is stored as 'activityType' and data is in 'config'
          const type = activity.activityType as ActivityType;
          const cfg = activity.config || {};

          if (!type) continue;

          let name = '';
          const actConfig: LibraryActivity['config'] = {};

          if (type === 'poll' || type === 'quiz') {
            name = cfg.question?.slice(0, 50) || `${type} activity`;
            actConfig.question = cfg.question;
            actConfig.options = cfg.options;
            actConfig.showResults = cfg.showResults;
            if (type === 'quiz') {
              actConfig.correctAnswer = cfg.correctAnswer;
              actConfig.timeLimit = cfg.timeLimit;
            }
          } else if (type === 'text-response') {
            name = cfg.prompt?.slice(0, 50) || 'Text response';
            actConfig.prompt = cfg.prompt;
            actConfig.placeholder = cfg.placeholder;
            actConfig.maxLength = cfg.maxLength;
          } else if (type === 'web-link') {
            name = cfg.title || cfg.url?.slice(0, 50) || 'Web link';
            actConfig.title = cfg.title;
            actConfig.description = cfg.description;
            actConfig.url = cfg.url;
            actConfig.displayMode = cfg.displayMode;
            actConfig.fullScreen = cfg.fullScreen;
          } else if (type === 'review-game') {
            name = cfg.gameTitle?.slice(0, 50) || 'Review game';
            actConfig.title = cfg.gameTitle;
            actConfig.questions = cfg.gameQuestions;
            actConfig.defaultTimeLimit = cfg.defaultTimeLimit;
            actConfig.maxPoints = cfg.maxPoints;
            actConfig.minPoints = cfg.minPoints;
          } else if (type === 'submit-sample') {
            name = cfg.instructions?.slice(0, 50) || 'Canvas activity';
            actConfig.url = cfg.url;
            actConfig.instructions = cfg.instructions;
            actConfig.allowAnnotations = cfg.allowAnnotations;
            actConfig.allowMultipleSubmissions = cfg.allowMultipleSubmissions;
            actConfig.canvasSelector = cfg.canvasSelector;
          }

          // Create a hash to detect duplicates (based on type + key content)
          const hash = generateActivityHash(type, actConfig);

          allActivities.push({ type, name, config: actConfig, hash });
        }
      }

      // 3. Get existing library activities to avoid duplicates
      const existingHashes = new Set(
        activities.map(a => generateActivityHash(a.type, a.config))
      );

      // 4. Filter out duplicates and save new activities
      const newActivities = allActivities.filter(a => !existingHashes.has(a.hash));
      let imported = 0;

      for (const activity of newActivities) {
        // Skip if we've seen this hash already in this batch
        if (existingHashes.has(activity.hash)) continue;
        existingHashes.add(activity.hash);

        await saveToLibrary(
          { type: activity.type, name: activity.name, config: activity.config },
          currentUserId,
          false // Private by default
        );
        imported++;
      }

      setImportResult({
        imported,
        skipped: allActivities.length - imported,
      });

      // Reload library to show new activities
      await loadActivities();
    } catch (err) {
      console.error('Error importing activities:', err);
      setError('Failed to import activities');
    } finally {
      setImporting(false);
    }
  };

  // Toggle shared status
  const handleToggleShared = async (activity: LibraryActivity) => {
    try {
      const newShared = !activity.isShared;
      await set(ref(database, `activityLibrary/${activity.id}/isShared`), newShared);
      setActivities(prev =>
        prev.map(a => (a.id === activity.id ? { ...a, isShared: newShared } : a))
      );
    } catch (err) {
      console.error('Error toggling shared:', err);
    }
  };

  // Start editing activity name
  const handleStartEdit = (activity: LibraryActivity) => {
    setEditingId(activity.id);
    setEditingName(activity.name);
  };

  // Save edited name
  const handleSaveName = async (activityId: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await set(ref(database, `activityLibrary/${activityId}/name`), editingName.trim());
      setActivities(prev =>
        prev.map(a => (a.id === activityId ? { ...a, name: editingName.trim() } : a))
      );
    } catch (err) {
      console.error('Error saving name:', err);
    } finally {
      setEditingId(null);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Get preview text for activity
  const getPreviewText = (activity: LibraryActivity): string => {
    const config = activity.config || {};
    switch (activity.type) {
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
        return config.question || config.title || 'Collaborative game';
      default:
        return '';
    }
  };

  // Get option count for polls/quizzes
  const getOptionInfo = (activity: LibraryActivity): string => {
    const config = activity.config || {};
    if (activity.type === 'poll' || activity.type === 'quiz') {
      const count = config.options?.length || 0;
      return `${count} options`;
    }
    if (activity.type === 'review-game') {
      const count = config.questions?.length || 0;
      return `${count} questions`;
    }
    if (activity.type === 'collaborative-tap-game') {
      return 'Interactive tap game';
    }
    return '';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {mode === 'browse' && (
            <button onClick={onBack} style={styles.backBtn}>
              ← Back
            </button>
          )}
          <h1 style={styles.title}>Activity Library</h1>
        </div>
        <div style={styles.headerRight}>
          <button
            onClick={() => setShowImportDialog(true)}
            style={styles.importBtn}
            title="Import activities from your presentations into the library"
          >
            Import from Presentations
          </button>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {ACTIVITY_TYPES.map(({ type, label, icon }) => {
          const count = activities.filter(a => a.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              style={{
                ...styles.tab,
                ...(activeTab === type ? styles.tabActive : {}),
              }}
            >
              <span style={styles.tabIcon}>{icon}</span>
              <span>{label}</span>
              <span style={styles.tabCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingState}>Loading activities...</div>
        ) : error ? (
          <div style={styles.errorState}>
            {error}
            <button onClick={loadActivities} style={styles.retryBtn}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Create new button - review games must be created from presentation builder */}
            {activeTab === 'review-game' ? (
              <div style={styles.reviewGameNotice}>
                Review games must be created from the presentation builder.
                Once saved to library, they'll appear here for reuse.
              </div>
            ) : (
              <button
                onClick={() => setShowCreateDialog(true)}
                style={styles.createBtn}
              >
                + Create New {ACTIVITY_TYPES.find(t => t.type === activeTab)?.label.slice(0, -1)}
              </button>
            )}

            {/* Activity grid */}
            {filteredActivities.length === 0 ? (
              <div style={styles.emptyState}>
                No {ACTIVITY_TYPES.find(t => t.type === activeTab)?.label.toLowerCase()} yet.
                {searchQuery && ' Try a different search.'}
              </div>
            ) : (
              <div style={styles.grid}>
                {filteredActivities.map(activity => (
                  <div
                    key={activity.id}
                    style={styles.card}
                    onClick={() => {
                      if (mode === 'pick' && onSelectActivity) {
                        onSelectActivity(activity);
                      }
                    }}
                    onDoubleClick={() => {
                      // Only allow editing own activities in browse mode
                      if (mode === 'browse' && activity.createdBy === currentUserId) {
                        setEditingActivity(activity);
                      }
                    }}
                  >
                    <div style={styles.cardHeader}>
                      {editingId === activity.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={() => handleSaveName(activity.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveName(activity.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          onClick={e => e.stopPropagation()}
                          style={styles.cardNameInput}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span style={styles.cardName}>{activity.name}</span>
                          {activity.createdBy === currentUserId && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleStartEdit(activity);
                              }}
                              style={styles.editBtn}
                              title="Rename"
                            >
                              ✏️
                            </button>
                          )}
                        </>
                      )}
                      {activity.createdBy !== currentUserId && (
                        <span style={styles.sharedBadge}>Shared</span>
                      )}
                      {activity.createdBy === currentUserId && editingId !== activity.id && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleShared(activity);
                          }}
                          style={{
                            ...styles.shareToggle,
                            backgroundColor: activity.isShared
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'transparent',
                            color: activity.isShared ? '#10b981' : '#9ca3af',
                          }}
                          title={activity.isShared ? 'Shared with everyone' : 'Only visible to you'}
                        >
                          {activity.isShared ? '🌐' : '🔒'}
                        </button>
                      )}
                    </div>
                    <div style={styles.cardPreview}>{getPreviewText(activity)}</div>
                    {getOptionInfo(activity) && (
                      <div style={styles.cardMeta}>{getOptionInfo(activity)}</div>
                    )}
                    <div style={styles.cardFooter}>
                      <span style={styles.cardDate}>
                        {new Date(activity.updatedAt).toLocaleDateString()}
                      </span>
                      {mode === 'pick' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (onSelectActivity) onSelectActivity(activity);
                          }}
                          style={styles.useBtn}
                        >
                          Use
                        </button>
                      )}
                      {activity.createdBy === currentUserId && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDeleteTarget(activity);
                          }}
                          style={styles.deleteBtn}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div style={styles.dialogOverlay} onClick={() => setDeleteTarget(null)}>
          <div style={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Delete Activity</h3>
            <p style={styles.dialogText}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p style={styles.dialogWarning}>
              This will not affect presentations already using this activity.
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
                onClick={handleDelete}
                style={styles.dialogDeleteBtn}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create dialog */}
      {showCreateDialog && (
        <ActivityDialog
          type={activeTab}
          currentUserId={currentUserId}
          onClose={() => setShowCreateDialog(false)}
          onSaved={activity => {
            setActivities(prev => [activity, ...prev]);
            setShowCreateDialog(false);
          }}
        />
      )}

      {/* Edit dialog */}
      {editingActivity && (
        <ActivityDialog
          type={editingActivity.type}
          currentUserId={currentUserId}
          existingActivity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSaved={activity => {
            setActivities(prev =>
              prev.map(a => (a.id === activity.id ? activity : a))
            );
            setEditingActivity(null);
          }}
        />
      )}

      {/* Import dialog */}
      {showImportDialog && (
        <div style={styles.dialogOverlay} onClick={() => !importing && setShowImportDialog(false)}>
          <div style={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Import from Presentations</h3>
            {importResult ? (
              <>
                <p style={styles.dialogText}>
                  Import complete!
                </p>
                <div style={styles.importStats}>
                  <div style={styles.importStat}>
                    <span style={styles.importStatNumber}>{importResult.imported}</span>
                    <span style={styles.importStatLabel}>imported</span>
                  </div>
                  <div style={styles.importStat}>
                    <span style={styles.importStatNumber}>{importResult.skipped}</span>
                    <span style={styles.importStatLabel}>skipped (duplicates)</span>
                  </div>
                </div>
                <div style={styles.dialogButtons}>
                  <button
                    onClick={() => {
                      setShowImportDialog(false);
                      setImportResult(null);
                    }}
                    style={styles.dialogSaveBtn}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={styles.dialogText}>
                  This will scan all your presentations and import any activities that aren't already in your library.
                </p>
                <p style={styles.dialogWarning}>
                  Imported activities will be private by default. You can share them later.
                </p>
                <div style={styles.dialogButtons}>
                  <button
                    onClick={() => setShowImportDialog(false)}
                    style={styles.dialogCancelBtn}
                    disabled={importing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportFromPresentations}
                    style={styles.dialogSaveBtn}
                    disabled={importing}
                  >
                    {importing ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Create/Edit Activity Dialog
interface ActivityDialogProps {
  type: ActivityType;
  currentUserId: string;
  onClose: () => void;
  onSaved: (activity: LibraryActivity) => void;
  existingActivity?: LibraryActivity; // If provided, we're editing
}

const ActivityDialog: React.FC<ActivityDialogProps> = ({
  type,
  currentUserId,
  onClose,
  onSaved,
  existingActivity,
}) => {
  const isEditing = !!existingActivity;
  const [name, setName] = useState(existingActivity?.name || '');
  const [question, setQuestion] = useState(existingActivity?.config.question || '');
  const [options, setOptions] = useState(existingActivity?.config.options || ['', '']);
  const [correctAnswer, setCorrectAnswer] = useState(existingActivity?.config.correctAnswer || 0);
  const [prompt, setPrompt] = useState(existingActivity?.config.prompt || '');
  const [placeholder, setPlaceholder] = useState(existingActivity?.config.placeholder || '');
  const [title, setTitle] = useState(existingActivity?.config.title || '');
  const [url, setUrl] = useState(existingActivity?.config.url || '');
  const [instructions, setInstructions] = useState(existingActivity?.config.instructions || '');
  const [allowAnnotations, setAllowAnnotations] = useState(existingActivity?.config.allowAnnotations !== undefined ? existingActivity.config.allowAnnotations : true);
  const [isShared, setIsShared] = useState(existingActivity?.isShared || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      const libraryRef = ref(database, 'activityLibrary');
      const newRef = push(libraryRef);

      const config: LibraryActivity['config'] = {};

      if (type === 'poll') {
        config.question = question;
        config.options = options.filter(o => o.trim());
        config.showResults = 'live';
      } else if (type === 'quiz') {
        config.question = question;
        config.options = options.filter(o => o.trim());
        config.correctAnswer = correctAnswer;
        config.showResults = 'end';
        config.timeLimit = 30;
      } else if (type === 'text-response') {
        config.prompt = prompt;
        config.placeholder = placeholder;
        config.maxLength = 500;
      } else if (type === 'web-link') {
        config.title = title;
        config.url = url;
        config.displayMode = 'iframe';
        config.fullScreen = false;
      } else if (type === 'submit-sample') {
        config.url = url;
        config.instructions = instructions;
        config.allowAnnotations = allowAnnotations;
        config.allowMultipleSubmissions = false;
        config.canvasSelector = 'canvas';
      }

      const now = Date.now();

      if (isEditing && existingActivity) {
        // Update existing activity
        const updateRef = ref(database, `activityLibrary/${existingActivity.id}`);
        const updatedActivity: Omit<LibraryActivity, 'id'> = {
          type,
          name: name.trim(),
          config,
          createdBy: existingActivity.createdBy,
          createdAt: existingActivity.createdAt,
          updatedAt: now,
          isShared,
        };
        await set(updateRef, updatedActivity);
        onSaved({ id: existingActivity.id, ...updatedActivity });
      } else {
        // Create new activity
        const activity: Omit<LibraryActivity, 'id'> = {
          type,
          name: name.trim(),
          config,
          createdBy: currentUserId,
          createdAt: now,
          updatedAt: now,
          isShared,
        };
        await set(newRef, activity);
        onSaved({ id: newRef.key!, ...activity });
      }
    } catch (err) {
      console.error('Error saving activity:', err);
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
      if (correctAnswer >= options.length - 1) {
        setCorrectAnswer(0);
      }
    }
  };

  const typeLabel = ACTIVITY_TYPES.find(t => t.type === type)?.label.slice(0, -1) || 'Activity';

  return (
    <div style={styles.dialogOverlay} onClick={onClose}>
      <div style={{ ...styles.dialog, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <h3 style={styles.dialogTitle}>{isEditing ? 'Edit' : 'Create New'} {typeLabel}</h3>

        {/* Name */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Name (for library)</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`My ${typeLabel.toLowerCase()}...`}
            style={styles.input}
            autoFocus
          />
        </div>

        {/* Type-specific fields */}
        {(type === 'poll' || type === 'quiz') && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Question</label>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Enter your question..."
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Options</label>
              {options.map((opt, i) => (
                <div key={i} style={styles.optionRow}>
                  {type === 'quiz' && (
                    <input
                      type="radio"
                      checked={correctAnswer === i}
                      onChange={() => setCorrectAnswer(i)}
                      title="Mark as correct answer"
                    />
                  )}
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${i + 1}`}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      style={styles.removeOptionBtn}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addOption} style={styles.addOptionBtn}>
                + Add Option
              </button>
            </div>
          </>
        )}

        {type === 'text-response' && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Prompt</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="What would you like participants to respond to?"
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Placeholder text</label>
              <input
                type="text"
                value={placeholder}
                onChange={e => setPlaceholder(e.target.value)}
                placeholder="Type your response here..."
                style={styles.input}
              />
            </div>
          </>
        )}

        {type === 'web-link' && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Link title..."
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>URL</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://..."
                style={styles.input}
              />
            </div>
          </>
        )}

        {type === 'submit-sample' && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Activity URL</label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://slides-live.com/..."
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Instructions</label>
              <input
                type="text"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="What should students do?"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={allowAnnotations}
                  onChange={e => setAllowAnnotations(e.target.checked)}
                />
                Allow Annotations
              </label>
            </div>
          </>
        )}

        {/* Shared toggle */}
        <div style={styles.formGroup}>
          <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={isShared}
              onChange={e => setIsShared(e.target.checked)}
            />
            Share with all users
          </label>
          <small style={styles.hint}>
            {isShared
              ? 'Other users will be able to see and use this activity'
              : 'Only you will see this activity'}
          </small>
        </div>

        {/* Buttons */}
        <div style={styles.dialogButtons}>
          <button onClick={onClose} style={styles.dialogCancelBtn} disabled={saving}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={styles.dialogSaveBtn}
            disabled={!name.trim() || saving}
          >
            {saving ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper to save an activity to the library
export const saveToLibrary = async (
  activity: {
    type: 'poll' | 'quiz' | 'text-response' | 'web-link' | 'review-game' | 'submit-sample' | 'collaborative-tap-game' | 'attendee-screen-message' | 'announcement';
    name: string;
    config: LibraryActivity['config'];
  },
  currentUserId: string,
  isShared: boolean = false,
  existingId?: string
): Promise<string> => {
  const now = Date.now();

  if (existingId) {
    // Update existing
    const updateRef = ref(database, `activityLibrary/${existingId}`);
    await set(updateRef, {
      type: activity.type,
      name: activity.name,
      config: activity.config,
      createdBy: currentUserId,
      updatedAt: now,
      isShared,
    });
    return existingId;
  } else {
    // Create new
    const libraryRef = ref(database, 'activityLibrary');
    const newRef = push(libraryRef);
    await set(newRef, {
      type: activity.type,
      name: activity.name,
      config: activity.config,
      createdBy: currentUserId,
      createdAt: now,
      updatedAt: now,
      isShared,
    });
    return newRef.key!;
  }
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
    color: '#333',
  },
  importBtn: {
    padding: '10px 16px',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  searchInput: {
    padding: '10px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    width: '250px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '12px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  tabIcon: {
    fontSize: '16px',
  },
  tabCount: {
    fontSize: '12px',
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  errorState: {
    textAlign: 'center',
    padding: '40px',
    color: '#dc2626',
  },
  retryBtn: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  reviewGameNotice: {
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardNameInput: {
    flex: 1,
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    padding: '4px 8px',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    outline: 'none',
    marginRight: '8px',
  },
  editBtn: {
    padding: '2px 6px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    opacity: 0.5,
    flexShrink: 0,
  },
  sharedBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase',
  },
  shareToggle: {
    padding: '4px 8px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  cardPreview: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '8px',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  cardDate: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  useBtn: {
    padding: '6px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    opacity: 0.5,
  },
  // Dialog styles
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
    zIndex: 2000,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  dialogTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
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
    color: '#6b7280',
    lineHeight: '1.5',
  },
  dialogButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  dialogCancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  dialogDeleteBtn: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  dialogSaveBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  // Form styles
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  removeOptionBtn: {
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  addOptionBtn: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px dashed #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    width: '100%',
  },
  // Import stats
  importStats: {
    display: 'flex',
    gap: '24px',
    justifyContent: 'center',
    marginTop: '20px',
    marginBottom: '20px',
  },
  importStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  importStatNumber: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#10b981',
  },
  importStatLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
};

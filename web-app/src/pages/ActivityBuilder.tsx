import React, { useState, useCallback } from 'react';
import { ref, set, get } from 'firebase/database';
import {
  LandingPage,
  SlideArranger,
  ActivityEditorModal,
  ActivityFormData,
  getDefaultActivity,
  database,
  AuthProvider,
  useAuth,
  LoginScreen,
  SettingsPanel,
  ActivityLibrary,
} from '../components/builder';

type ViewState = 'landing' | 'arranger' | 'library';

// Detect source platform from presentation ID
type PresentationSource = 'google-slides' | 'slides-com' | 'unknown';

const detectSource = (id: string): PresentationSource => {
  // Google Slides IDs are typically 44 characters, alphanumeric with dashes/underscores
  if (id.length >= 40 && /^[a-zA-Z0-9_-]+$/.test(id)) {
    return 'google-slides';
  }
  // slides.com IDs are shorter slugs
  if (id.length < 40) {
    return 'slides-com';
  }
  return 'unknown';
};

// URL parsing helper (extracts presentation ID from Google Slides or slides.com URLs)
const parsePresentationUrl = (url: string): string => {
  // Google Slides: https://docs.google.com/presentation/d/{id}/...
  const googleMatch = url.match(/\/presentation\/d\/([^\/]+)/);
  if (googleMatch) return googleMatch[1];

  // slides.com: https://slides.com/username/deck or similar patterns
  const slidesMatch = url.match(/slides\.com\/[^\/]+\/([^\/\?#]+)/);
  if (slidesMatch) return slidesMatch[1];

  // If no pattern matches, return the trimmed input as-is (might be a direct ID)
  return url.trim();
};

// Copy Presentation Dialog
interface CopyDialogProps {
  onCopy: (targetId: string, newTitle: string) => void;
  onClose: () => void;
  saving: boolean;
  currentTitle: string;
}

const CopyPresentationDialog: React.FC<CopyDialogProps> = ({ onCopy, onClose, saving, currentTitle }) => {
  const [url, setUrl] = useState('');
  const [parsedId, setParsedId] = useState('');
  const [newTitle, setNewTitle] = useState(currentTitle ? `${currentTitle} (Copy)` : '');

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim()) {
      setParsedId(parsePresentationUrl(value));
    } else {
      setParsedId('');
    }
  };

  return (
    <div style={dialogStyles.overlay} onClick={onClose}>
      <div style={dialogStyles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={dialogStyles.title}>Copy Presentation</h3>
        <p style={dialogStyles.description}>
          Enter the URL of the target presentation (Google Slides or slides.com)
        </p>
        <input
          type="text"
          value={url}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder="Paste presentation URL here..."
          style={dialogStyles.input}
          autoFocus
        />
        {parsedId && (
          <div style={dialogStyles.parsedId}>
            Presentation ID: <strong>{parsedId}</strong>
          </div>
        )}
        {parsedId && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
              Title for the new copy:
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Enter a title for the copy..."
              style={dialogStyles.input}
            />
          </div>
        )}
        <div style={dialogStyles.buttons}>
          <button onClick={onClose} style={dialogStyles.cancelBtn} disabled={saving}>
            Cancel
          </button>
          <button
            onClick={() => onCopy(parsedId, newTitle)}
            style={dialogStyles.primaryBtn}
            disabled={!parsedId || saving}
          >
            {saving ? 'Copying...' : 'Copy & Open'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Re-point Presentation Dialog
interface RepointDialogProps {
  currentId: string;
  onRepoint: (newId: string) => void;
  onClose: () => void;
  saving: boolean;
}

const RepointPresentationDialog: React.FC<RepointDialogProps> = ({ currentId, onRepoint, onClose, saving }) => {
  const [url, setUrl] = useState('');
  const [parsedId, setParsedId] = useState('');

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim()) {
      setParsedId(parsePresentationUrl(value));
    } else {
      setParsedId('');
    }
  };

  return (
    <div style={dialogStyles.overlay} onClick={onClose}>
      <div style={dialogStyles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={dialogStyles.title}>Re-point Presentation</h3>
        <p style={dialogStyles.description}>
          Move activities from <strong>{currentId}</strong> to a new presentation.
          Enter the target URL:
        </p>
        <input
          type="text"
          value={url}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder="Paste new presentation URL here..."
          style={dialogStyles.input}
          autoFocus
        />
        {parsedId && (
          <div style={dialogStyles.parsedId}>
            New ID: <strong>{parsedId}</strong>
          </div>
        )}
        <div style={dialogStyles.buttons}>
          <button onClick={onClose} style={dialogStyles.cancelBtn} disabled={saving}>
            Cancel
          </button>
          <button
            onClick={() => onRepoint(parsedId)}
            style={dialogStyles.primaryBtn}
            disabled={!parsedId || saving}
          >
            {saving ? 'Moving...' : 'Move Activities'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Transfer Ownership Dialog
interface TransferDialogProps {
  presentationTitle: string;
  onTransfer: (newOwnerId: string) => void;
  onClose: () => void;
  saving: boolean;
}

const TransferOwnershipDialog: React.FC<TransferDialogProps> = ({ presentationTitle, onTransfer, onClose, saving }) => {
  const [targetUser, setTargetUser] = useState('');

  // Predefined users for easy selection
  const knownUsers = [
    { id: 'nigel-nisbet', name: 'Nigel Nisbet' },
    { id: 'pl', name: 'PL' },
  ];

  return (
    <div style={dialogStyles.overlay} onClick={onClose}>
      <div style={dialogStyles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={dialogStyles.title}>Transfer Ownership</h3>
        <p style={dialogStyles.description}>
          Transfer <strong>{presentationTitle || 'this presentation'}</strong> to another user.
          After transfer, you will no longer see it in your list.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            Select user:
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {knownUsers.map(user => (
              <button
                key={user.id}
                onClick={() => setTargetUser(user.id)}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  textAlign: 'left',
                  backgroundColor: targetUser === user.id ? '#3b82f6' : '#f3f4f6',
                  color: targetUser === user.id ? 'white' : '#374151',
                  border: targetUser === user.id ? '2px solid #3b82f6' : '2px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {user.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            Or enter user ID manually:
          </label>
          <input
            type="text"
            value={targetUser}
            onChange={e => setTargetUser(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="e.g., john-doe"
            style={dialogStyles.input}
          />
        </div>

        <div style={dialogStyles.buttons}>
          <button onClick={onClose} style={dialogStyles.cancelBtn} disabled={saving}>
            Cancel
          </button>
          <button
            onClick={() => onTransfer(targetUser)}
            style={{
              ...dialogStyles.primaryBtn,
              backgroundColor: '#f59e0b',
            }}
            disabled={!targetUser || saving}
          >
            {saving ? 'Transferring...' : 'Transfer Ownership'}
          </button>
        </div>
      </div>
    </div>
  );
};

const dialogStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },
  description: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  parsedId: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#f0fdf4',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#166534',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  cancelBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};

// Inner component that uses authentication
const ActivityBuilderInner: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  // Set page title
  React.useEffect(() => {
    document.title = 'slidesLive build';
  }, []);

  // View state
  const [view, setView] = useState<ViewState>('landing');

  // Presentation state
  const [presentationId, setPresentationId] = useState('');
  const [presentationTitle, setPresentationTitle] = useState('');
  const [presentationTags, setPresentationTags] = useState<string[]>([]);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [originalFeedbackEnabled, setOriginalFeedbackEnabled] = useState(false);
  const [requireName, setRequireName] = useState(false);
  const [originalRequireName, setOriginalRequireName] = useState(false);
  const [horizontalCount, setHorizontalCount] = useState(0);
  const [verticalCounts, setVerticalCounts] = useState<Map<number, number>>(new Map());
  const [activities, setActivities] = useState<ActivityFormData[]>([]);
  const [originalActivities, setOriginalActivities] = useState<ActivityFormData[]>([]);
  const [originalHorizontalCount, setOriginalHorizontalCount] = useState(0);
  const [originalVerticalCounts, setOriginalVerticalCounts] = useState<Map<number, number>>(new Map());

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Multi-select support: Set of "indexh-indexv" keys
  const [selectedSlides, setSelectedSlides] = useState<Set<string>>(new Set());
  const [lastClickedSlide, setLastClickedSlide] = useState<{ indexh: number; indexv: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<ActivityFormData>(getDefaultActivity());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drag & drop state
  const [draggedSlide, setDraggedSlide] = useState<{ indexh: number; indexv: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ indexh: number; indexv: number } | null>(null);

  // Dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showRepointDialog, setShowRepointDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  // Helper functions for slide keys
  const slideKey = (h: number, v: number) => `${h}-${v}`;
  const parseSlideKey = (key: string) => {
    const [h, v] = key.split('-').map(Number);
    return { indexh: h, indexv: v };
  };

  // Derive slide structure from activities
  const deriveSlideStructure = useCallback((acts: ActivityFormData[], defaultHCount = 10) => {
    let maxH = defaultHCount - 1; // 0-indexed
    const vCounts = new Map<number, number>();

    acts.forEach(a => {
      maxH = Math.max(maxH, a.slidePosition.indexh);
      const currentV = vCounts.get(a.slidePosition.indexh) || 1;
      vCounts.set(a.slidePosition.indexh, Math.max(currentV, a.slidePosition.indexv + 1));
    });

    // Ensure all horizontal slides have at least 1 vertical
    for (let i = 0; i <= maxH; i++) {
      if (!vCounts.has(i)) {
        vCounts.set(i, 1);
      }
    }

    return { horizontal: maxH + 1, vertical: vCounts };
  }, []);

  // Load presentation from Firebase
  const handleLoadPresentation = useCallback(async (id: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const configRef = ref(database, `presentations/${id}/config`);
      const snapshot = await get(configRef);

      let loadedActivities: ActivityFormData[] = [];
      let loadedFeedbackEnabled = false;
      let loadedRequireName = false;

      if (snapshot.exists()) {
        const config = snapshot.val();
        // Load title, tags, and settings if they exist
        setPresentationTitle(config.title || '');
        setPresentationTags(config.tags || []);
        loadedFeedbackEnabled = config.feedbackEnabled || false;
        setFeedbackEnabled(loadedFeedbackEnabled);
        loadedRequireName = config.requireName || false;
        setRequireName(loadedRequireName);
        loadedActivities = (config.activities || []).map((act: any) => ({
          type: act.config?.type || act.activityType || 'poll',
          activityId: act.activityId,
          slidePosition: act.slidePosition,
          question: act.config?.question,
          options: act.config?.options,
          showResults: act.config?.showResults || 'live',
          correctAnswer: act.config?.correctAnswer,
          timeLimit: act.config?.timeLimit,
          title: act.config?.title,
          description: act.config?.description,
          url: act.config?.url,
          displayMode: act.config?.displayMode || 'iframe',
          fullScreen: act.config?.fullScreen || false,
          // Text-response fields
          prompt: act.config?.prompt,
          placeholder: act.config?.placeholder,
          maxLength: act.config?.maxLength,
          // Review-game fields
          gameTitle: act.config?.title,
          gameQuestions: act.config?.questions,
          defaultTimeLimit: act.config?.defaultTimeLimit,
          maxPoints: act.config?.maxPoints,
          minPoints: act.config?.minPoints,
          // Submit-sample fields
          instructions: act.config?.instructions,
          allowAnnotations: act.config?.allowAnnotations,
          allowMultipleSubmissions: act.config?.allowMultipleSubmissions,
          canvasSelector: act.config?.canvasSelector,
          // Attendee-screen-message fields
          message: act.config?.message,
          // Web-link background color
          iframeBackgroundColor: act.config?.iframeBackgroundColor,
          // Library tracking fields
          sourceLibraryId: act.sourceLibraryId,
          copiedFromLibraryAt: act.copiedFromLibraryAt,
        }));
      }

      const structure = deriveSlideStructure(loadedActivities);

      setPresentationId(id);
      setActivities(loadedActivities);
      setOriginalActivities(JSON.parse(JSON.stringify(loadedActivities)));
      setOriginalFeedbackEnabled(loadedFeedbackEnabled);
      setOriginalRequireName(loadedRequireName);
      setHorizontalCount(structure.horizontal);
      setVerticalCounts(structure.vertical);
      setOriginalHorizontalCount(structure.horizontal);
      setOriginalVerticalCounts(new Map(structure.vertical));
      setView('arranger');

      if (loadedActivities.length > 0) {
        setMessage({ type: 'success', text: `Loaded ${loadedActivities.length} activities` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to load: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  }, [deriveSlideStructure]);

  // Create new presentation
  const handleCreateNew = useCallback((id: string, slideCount: number) => {
    const structure = deriveSlideStructure([], slideCount);

    setPresentationId(id);
    setPresentationTitle(''); // New presentations start with no title
    setPresentationTags([]); // New presentations start with no tags
    setFeedbackEnabled(false); // New presentations start with feedback disabled
    setOriginalFeedbackEnabled(false);
    setRequireName(false); // New presentations don't require name by default
    setOriginalRequireName(false);
    setActivities([]);
    setOriginalActivities([]);
    setHorizontalCount(structure.horizontal);
    setVerticalCounts(structure.vertical);
    setOriginalHorizontalCount(structure.horizontal);
    setOriginalVerticalCounts(new Map(structure.vertical));
    setView('arranger');
    setMessage({ type: 'success', text: `Created new presentation with ${slideCount} slides` });
  }, [deriveSlideStructure]);

  // Get activity at position
  const getActivityAt = useCallback((indexh: number, indexv: number) => {
    return activities.find(
      a => a.slidePosition.indexh === indexh && a.slidePosition.indexv === indexv
    );
  }, [activities]);

  // Handle slide click (single-click for select, with shift support)
  const handleSlideClick = useCallback((indexh: number, indexv: number, shiftKey: boolean) => {
    const key = slideKey(indexh, indexv);

    if (shiftKey && lastClickedSlide) {
      // Range selection: select all slides from lastClicked to current
      const newSelection = new Set(selectedSlides);

      // Determine range bounds
      const minH = Math.min(lastClickedSlide.indexh, indexh);
      const maxH = Math.max(lastClickedSlide.indexh, indexh);

      // Select all horizontal slides in range (all vertical positions)
      for (let h = minH; h <= maxH; h++) {
        const vCount = verticalCounts.get(h) || 1;
        for (let v = 0; v < vCount; v++) {
          newSelection.add(slideKey(h, v));
        }
      }

      setSelectedSlides(newSelection);
    } else {
      // Single click - replace selection
      const newSelection = new Set<string>();
      newSelection.add(key);
      setSelectedSlides(newSelection);
      setLastClickedSlide({ indexh, indexv });
    }
  }, [lastClickedSlide, selectedSlides, verticalCounts]);

  // Handle slide double-click (open editor)
  const handleSlideDoubleClick = useCallback((indexh: number, indexv: number) => {
    const existing = getActivityAt(indexh, indexv);

    // Set single selection for editing
    setSelectedSlides(new Set([slideKey(indexh, indexv)]));
    setLastClickedSlide({ indexh, indexv });

    if (existing) {
      setCurrentActivity({ ...existing });
    } else {
      setCurrentActivity(getDefaultActivity('poll', indexh, indexv));
    }

    setIsModalOpen(true);
  }, [getActivityAt]);

  // Handle add horizontal slide
  const handleAddHorizontal = useCallback(() => {
    setHorizontalCount(prev => prev + 1);
    const newCounts = new Map(verticalCounts);
    newCounts.set(horizontalCount, 1);
    setVerticalCounts(newCounts);
  }, [horizontalCount, verticalCounts]);

  // Handle add vertical slide
  const handleAddVertical = useCallback((indexh: number) => {
    const newCounts = new Map(verticalCounts);
    const current = newCounts.get(indexh) || 1;
    newCounts.set(indexh, current + 1);
    setVerticalCounts(newCounts);
  }, [verticalCounts]);

  // Handle delete slide (called from thumbnail trash icon)
  // This removes the activity AND the slide itself (shifting subsequent slides)
  const handleDeleteSlide = useCallback((indexh: number, indexv: number) => {
    // Calculate total slides
    let totalSlides = 0;
    for (let h = 0; h < horizontalCount; h++) {
      totalSlides += verticalCounts.get(h) || 1;
    }

    // Prevent deleting the last slide
    if (totalSlides <= 1) {
      return;
    }

    const vCount = verticalCounts.get(indexh) || 1;

    if (indexv === 0 && vCount === 1) {
      // Deleting the only slide in a column - remove the entire column
      // Remove any activity at this position
      const newActivities = activities.filter(
        a => !(a.slidePosition.indexh === indexh && a.slidePosition.indexv === indexv)
      );

      // Shift all activities from columns to the right
      const shiftedActivities = newActivities.map(a => {
        if (a.slidePosition.indexh > indexh) {
          return {
            ...a,
            slidePosition: {
              indexh: a.slidePosition.indexh - 1,
              indexv: a.slidePosition.indexv,
            }
          };
        }
        return a;
      });

      // Update vertical counts - shift all columns after indexh
      const newVerticalCounts = new Map<number, number>();
      for (let h = 0; h < horizontalCount; h++) {
        if (h < indexh) {
          newVerticalCounts.set(h, verticalCounts.get(h) || 1);
        } else if (h > indexh) {
          newVerticalCounts.set(h - 1, verticalCounts.get(h) || 1);
        }
        // Skip h === indexh (the deleted column)
      }

      setActivities(shiftedActivities);
      setHorizontalCount(horizontalCount - 1);
      setVerticalCounts(newVerticalCounts);
    } else {
      // Deleting a vertical sub-slide - just remove that slide and shift others in the column
      // Remove the activity at this position
      const newActivities = activities.filter(
        a => !(a.slidePosition.indexh === indexh && a.slidePosition.indexv === indexv)
      );

      // Shift activities below this one up
      const shiftedActivities = newActivities.map(a => {
        if (a.slidePosition.indexh === indexh && a.slidePosition.indexv > indexv) {
          return {
            ...a,
            slidePosition: {
              indexh: a.slidePosition.indexh,
              indexv: a.slidePosition.indexv - 1,
            }
          };
        }
        return a;
      });

      // Update vertical count for this column
      const newVerticalCounts = new Map(verticalCounts);
      newVerticalCounts.set(indexh, vCount - 1);

      setActivities(shiftedActivities);
      setVerticalCounts(newVerticalCounts);
    }

    // Clear selection if the deleted slide was selected
    const deletedKey = slideKey(indexh, indexv);
    if (selectedSlides.has(deletedKey)) {
      const newSelection = new Set(selectedSlides);
      newSelection.delete(deletedKey);
      setSelectedSlides(newSelection);
    }
  }, [activities, horizontalCount, verticalCounts, selectedSlides]);

  // Get the editing slide position (first selected slide)
  const getEditingSlidePosition = useCallback(() => {
    if (selectedSlides.size === 0) return null;
    const firstKey = Array.from(selectedSlides)[0];
    return parseSlideKey(firstKey);
  }, [selectedSlides]);

  // Handle save activity
  const handleSaveActivity = useCallback(() => {
    const editingSlide = getEditingSlidePosition();
    if (!editingSlide) return;

    // Auto-generate activity ID if needed
    let activityToSave = { ...currentActivity };
    if (!activityToSave.activityId.trim()) {
      activityToSave.activityId = `${activityToSave.type}-slide${editingSlide.indexh}-${Date.now().toString(36)}`;
    }

    // Update slide position to match editing slide
    activityToSave.slidePosition = { ...editingSlide };

    // Check if updating existing or adding new
    const existingIndex = activities.findIndex(
      a => a.slidePosition.indexh === editingSlide.indexh &&
           a.slidePosition.indexv === editingSlide.indexv
    );

    if (existingIndex >= 0) {
      const newActivities = [...activities];
      newActivities[existingIndex] = activityToSave;
      setActivities(newActivities);
    } else {
      setActivities([...activities, activityToSave]);
    }

    setIsModalOpen(false);
  }, [getEditingSlidePosition, currentActivity, activities]);

  // Handle delete activity
  const handleDeleteActivity = useCallback(() => {
    const editingSlide = getEditingSlidePosition();
    if (!editingSlide) return;

    setActivities(activities.filter(
      a => !(a.slidePosition.indexh === editingSlide.indexh &&
             a.slidePosition.indexv === editingSlide.indexv)
    ));

    setIsModalOpen(false);
  }, [getEditingSlidePosition, activities]);

  // Handle close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Drag & drop handlers
  const handleDragStart = useCallback((indexh: number, indexv: number) => {
    setDraggedSlide({ indexh, indexv });
    // If dragged slide is not in selection, make it the only selection
    const key = slideKey(indexh, indexv);
    if (!selectedSlides.has(key)) {
      setSelectedSlides(new Set([key]));
      setLastClickedSlide({ indexh, indexv });
    }
  }, [selectedSlides]);

  const handleDragEnd = useCallback(() => {
    setDraggedSlide(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((indexh: number, indexv: number) => {
    if (draggedSlide && (draggedSlide.indexh !== indexh || draggedSlide.indexv !== indexv)) {
      setDropTarget({ indexh, indexv });
    }
  }, [draggedSlide]);

  const handleDrop = useCallback((targetIndexh: number, targetIndexv: number) => {
    if (!draggedSlide) return;

    // Check if we're moving multiple slides
    if (selectedSlides.size > 1) {
      // Multi-slide move: calculate offset and apply to all selected
      const selectedArray = Array.from(selectedSlides)
        .map(parseSlideKey)
        .sort((a, b) => a.indexh - b.indexh || a.indexv - b.indexv);

      const firstSelected = selectedArray[0];
      const offsetH = targetIndexh - firstSelected.indexh;

      setActivities(prev => prev.map(a => {
        const actKey = slideKey(a.slidePosition.indexh, a.slidePosition.indexv);
        if (selectedSlides.has(actKey)) {
          return {
            ...a,
            slidePosition: {
              indexh: a.slidePosition.indexh + offsetH,
              indexv: a.slidePosition.indexv,
            }
          };
        }
        return a;
      }));

      // Update selection to new positions
      const newSelection = new Set<string>();
      selectedArray.forEach(pos => {
        newSelection.add(slideKey(pos.indexh + offsetH, pos.indexv));
      });
      setSelectedSlides(newSelection);
    } else {
      // Single slide move with shift/insert behavior
      const source = draggedSlide;
      const target = { indexh: targetIndexh, indexv: targetIndexv };

      if (source.indexh === target.indexh && source.indexv === target.indexv) return;

      setActivities(prev => prev.map(a => {
        const pos = a.slidePosition;
        if (pos.indexh === source.indexh && pos.indexv === source.indexv) {
          // Move dragged activity to target position
          return { ...a, slidePosition: { ...target } };
        }
        // Shift activities between source and target
        if (source.indexh < target.indexh) {
          // Moving right: shift items left
          if (pos.indexh > source.indexh && pos.indexh <= target.indexh && pos.indexv === source.indexv) {
            return { ...a, slidePosition: { indexh: pos.indexh - 1, indexv: pos.indexv } };
          }
        } else if (source.indexh > target.indexh) {
          // Moving left: shift items right
          if (pos.indexh >= target.indexh && pos.indexh < source.indexh && pos.indexv === source.indexv) {
            return { ...a, slidePosition: { indexh: pos.indexh + 1, indexv: pos.indexv } };
          }
        }
        return a;
      }));

      // Update selection to new position
      setSelectedSlides(new Set([slideKey(target.indexh, target.indexv)]));
      setLastClickedSlide(target);
    }

    setDraggedSlide(null);
    setDropTarget(null);
  }, [draggedSlide, selectedSlides]);

  // Copy presentation handler
  const handleCopyPresentation = useCallback(async (targetId: string, newTitle: string) => {
    setSaving(true);
    setMessage(null);

    try {
      // Generate new activity IDs for the copy
      const copiedActivities = activities.map(activity => {
        const newActivityId = `${activity.type}-slide${activity.slidePosition.indexh}-${Date.now().toString(36)}`;
        return {
          ...activity,
          activityId: newActivityId,
        };
      });

      const config = {
        presentationId: targetId,
        title: newTitle,
        tags: presentationTags,
        ownerId: user?.id,
        activities: copiedActivities.map(activity => {
          const base = {
            activityId: activity.activityId,
            slidePosition: activity.slidePosition,
            activityType: activity.type,
          };

          if (activity.type === 'poll') {
            return { ...base, config: { type: 'poll', question: activity.question, options: activity.options, showResults: activity.showResults } };
          } else if (activity.type === 'quiz') {
            return { ...base, config: { type: 'quiz', question: activity.question, options: activity.options, correctAnswer: activity.correctAnswer, timeLimit: activity.timeLimit, showResults: activity.showResults, points: 100 } };
          } else if (activity.type === 'text-response') {
            return { ...base, config: { type: 'text-response', prompt: activity.prompt, placeholder: activity.placeholder, maxLength: activity.maxLength } };
          } else if (activity.type === 'review-game') {
            return { ...base, config: { type: 'review-game', title: (activity as any).gameTitle, questions: (activity as any).gameQuestions, defaultTimeLimit: (activity as any).defaultTimeLimit || 20, maxPoints: (activity as any).maxPoints || 1000, minPoints: (activity as any).minPoints || 100 } };
          } else if (activity.type === 'submit-sample') {
            return { ...base, config: { type: 'submit-sample', url: activity.url, instructions: activity.instructions, allowAnnotations: activity.allowAnnotations, allowMultipleSubmissions: activity.allowMultipleSubmissions, canvasSelector: activity.canvasSelector } };
          } else if (activity.type === 'attendee-screen-message') {
            return { ...base, config: { type: 'attendee-screen-message', message: activity.message } };
          } else if (activity.type === 'announcement') {
            return { ...base, config: { type: 'announcement', message: activity.message } };
          } else {
            return { ...base, config: { type: 'web-link', title: activity.title, description: activity.description, url: activity.url, displayMode: activity.displayMode, fullScreen: activity.fullScreen, iframeBackgroundColor: activity.iframeBackgroundColor } };
          }
        }),
      };

      const configRef = ref(database, `presentations/${targetId}/config`);
      await set(configRef, config);

      setMessage({ type: 'success', text: `Copied! Opening ${newTitle || targetId}...` });
      setShowCopyDialog(false);

      // Navigate to the new copy
      setTimeout(() => {
        // Update state to reflect the new presentation
        setPresentationId(targetId);
        setPresentationTitle(newTitle);
        setActivities(copiedActivities);
        setOriginalActivities(JSON.parse(JSON.stringify(copiedActivities)));
        // Keep the same slide structure
        setOriginalHorizontalCount(horizontalCount);
        setOriginalVerticalCounts(new Map(verticalCounts));
      }, 500);
    } catch (error) {
      setMessage({ type: 'error', text: `Copy failed: ${(error as Error).message}` });
    } finally {
      setSaving(false);
    }
  }, [activities, presentationTags, user, horizontalCount, verticalCounts]);

  // Build config JSON
  const buildConfigJSON = useCallback(() => {
    return {
      presentationId,
      title: presentationTitle,
      tags: presentationTags,
      feedbackEnabled,
      requireName,
      ownerId: user?.id,
      activities: activities.map(activity => {
        // Build base object with only core fields and library tracking
        const base: any = {
          activityId: activity.activityId,
          slidePosition: activity.slidePosition,
          activityType: activity.type,
        };

        // Preserve library tracking fields if they exist
        if ((activity as any).sourceLibraryId) {
          base.sourceLibraryId = (activity as any).sourceLibraryId;
        }
        if ((activity as any).copiedFromLibraryAt) {
          base.copiedFromLibraryAt = (activity as any).copiedFromLibraryAt;
        }

        // Build config object with ONLY the fields for this activity type
        let config: any;

        if (activity.type === 'poll') {
          config = {
            type: 'poll',
            question: activity.question,
            options: activity.options,
            showResults: activity.showResults,
          };
        } else if (activity.type === 'quiz') {
          config = {
            type: 'quiz',
            question: activity.question,
            options: activity.options,
            correctAnswer: activity.correctAnswer,
            timeLimit: activity.timeLimit,
            showResults: activity.showResults,
            points: 100,
          };
        } else if (activity.type === 'text-response') {
          config = {
            type: 'text-response',
            prompt: activity.prompt,
            placeholder: activity.placeholder,
            maxLength: activity.maxLength,
          };
        } else if (activity.type === 'review-game') {
          config = {
            type: 'review-game',
            title: (activity as any).gameTitle,
            questions: (activity as any).gameQuestions,
            defaultTimeLimit: (activity as any).defaultTimeLimit || 20,
            maxPoints: (activity as any).maxPoints || 1000,
            minPoints: (activity as any).minPoints || 100,
          };
        } else if (activity.type === 'submit-sample') {
          config = {
            type: 'submit-sample',
            url: activity.url,
            instructions: activity.instructions,
            allowAnnotations: activity.allowAnnotations,
            allowMultipleSubmissions: activity.allowMultipleSubmissions,
            canvasSelector: activity.canvasSelector,
          };
        } else if ((activity as any).type === 'collaborative-tap-game') {
          config = {
            type: 'collaborative-tap-game',
            title: (activity as any).title,
            question: (activity as any).question,
            linearIncrement: (activity as any).linearIncrement,
            cooldownSeconds: (activity as any).cooldownSeconds,
            winCondition: (activity as any).winCondition,
          };
        } else if (activity.type === 'attendee-screen-message') {
          config = {
            type: 'attendee-screen-message',
            message: activity.message,
          };
        } else if (activity.type === 'announcement') {
          config = {
            type: 'announcement',
            message: activity.message,
          };
        } else {
          // web-link or unknown type
          config = {
            type: 'web-link',
            title: activity.title,
            description: activity.description,
            url: activity.url,
            displayMode: activity.displayMode,
            fullScreen: activity.fullScreen,
            iframeBackgroundColor: activity.iframeBackgroundColor,
          };
        }

        // Filter out undefined values from config to prevent Firebase errors
        const cleanConfig = Object.fromEntries(
          Object.entries(config).filter(([_, value]) => value !== undefined)
        );

        // Return the complete activity object without spreading the activity
        return {
          activityId: base.activityId,
          slidePosition: base.slidePosition,
          activityType: base.activityType,
          ...(base.sourceLibraryId && { sourceLibraryId: base.sourceLibraryId }),
          ...(base.copiedFromLibraryAt && { copiedFromLibraryAt: base.copiedFromLibraryAt }),
          config: cleanConfig,
        };
      }),
    };
  }, [presentationId, presentationTitle, presentationTags, feedbackEnabled, requireName, activities, user]);

  // Re-point presentation handler
  const handleRepointPresentation = useCallback(async (newId: string) => {
    if (!confirm(`This will move all activities from "${presentationId}" to "${newId}". The original will remain. Continue?`)) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const config = buildConfigJSON();
      config.presentationId = newId;

      const newRef = ref(database, `presentations/${newId}/config`);
      await set(newRef, config);

      setPresentationId(newId);
      setOriginalActivities(JSON.parse(JSON.stringify(activities)));
      setOriginalHorizontalCount(horizontalCount);
      setOriginalVerticalCounts(new Map(verticalCounts));

      setMessage({ type: 'success', text: `Moved to ${newId}!` });
      setShowRepointDialog(false);
    } catch (error) {
      setMessage({ type: 'error', text: `Move failed: ${(error as Error).message}` });
    } finally {
      setSaving(false);
    }
  }, [presentationId, activities, buildConfigJSON]);

  // Transfer ownership handler
  const handleTransferOwnership = useCallback(async (newOwnerId: string) => {
    setSaving(true);
    setMessage(null);

    try {
      // Update just the ownerId in Firebase
      const ownerRef = ref(database, `presentations/${presentationId}/config/ownerId`);
      await set(ownerRef, newOwnerId);

      setMessage({ type: 'success', text: `Transferred to ${newOwnerId}! Returning to list...` });
      setShowTransferDialog(false);

      // After a brief delay, go back to landing (since user no longer owns this)
      setTimeout(() => {
        setView('landing');
        setPresentationId('');
        setPresentationTitle('');
        setPresentationTags([]);
        setActivities([]);
        setOriginalActivities([]);
        setHorizontalCount(0);
        setVerticalCounts(new Map());
        setOriginalHorizontalCount(0);
        setOriginalVerticalCounts(new Map());
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: `Transfer failed: ${(error as Error).message}` });
    } finally {
      setSaving(false);
    }
  }, [presentationId]);

  // Handle save to Firebase
  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    try {
      const config = buildConfigJSON();
      const configRef = ref(database, `presentations/${presentationId}/config`);
      await set(configRef, config);
      setOriginalActivities(JSON.parse(JSON.stringify(activities)));
      setOriginalFeedbackEnabled(feedbackEnabled);
      setOriginalRequireName(requireName);
      setOriginalHorizontalCount(horizontalCount);
      setOriginalVerticalCounts(new Map(verticalCounts));
      setMessage({ type: 'success', text: `Saved ${activities.length} activities!` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to save: ${(error as Error).message}` });
    } finally {
      setSaving(false);
    }
  }, [buildConfigJSON, presentationId, activities, feedbackEnabled, requireName, horizontalCount, verticalCounts]);

  // Handle back to landing
  const handleBack = useCallback(() => {
    const activitiesChanged = JSON.stringify(activities) !== JSON.stringify(originalActivities);
    const structureChanged = horizontalCount !== originalHorizontalCount ||
      JSON.stringify(Array.from(verticalCounts.entries())) !== JSON.stringify(Array.from(originalVerticalCounts.entries()));
    const feedbackChanged = feedbackEnabled !== originalFeedbackEnabled;
    const requireNameChanged = requireName !== originalRequireName;
    if (activitiesChanged || structureChanged || feedbackChanged || requireNameChanged) {
      if (!confirm('You have unsaved changes. Are you sure you want to go back?')) {
        return;
      }
    }
    setView('landing');
    setPresentationId('');
    setPresentationTitle('');
    setPresentationTags([]);
    setFeedbackEnabled(false);
    setOriginalFeedbackEnabled(false);
    setRequireName(false);
    setOriginalRequireName(false);
    setActivities([]);
    setOriginalActivities([]);
    setHorizontalCount(0);
    setVerticalCounts(new Map());
    setOriginalHorizontalCount(0);
    setOriginalVerticalCounts(new Map());
    setMessage(null);
  }, [activities, originalActivities, horizontalCount, originalHorizontalCount, verticalCounts, originalVerticalCounts, feedbackEnabled, originalFeedbackEnabled, requireName, originalRequireName]);

  // Check if there are unsaved changes (activities, slide structure, or settings)
  const hasActivitiesChanged = JSON.stringify(activities) !== JSON.stringify(originalActivities);
  const hasStructureChanged = horizontalCount !== originalHorizontalCount ||
    JSON.stringify(Array.from(verticalCounts.entries())) !== JSON.stringify(Array.from(originalVerticalCounts.entries()));
  const hasFeedbackChanged = feedbackEnabled !== originalFeedbackEnabled;
  const hasRequireNameChanged = requireName !== originalRequireName;
  const hasChanges = hasActivitiesChanged || hasStructureChanged || hasFeedbackChanged || hasRequireNameChanged;

  // Clear message after 5 seconds
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}>
        <div style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <>
      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Toast Message */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {message.text}
        </div>
      )}

      {/* User bar - shown only on landing view (arranger has its own in header) */}
      {view === 'landing' && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
        }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#333',
            }}>
              {user.name || 'Account'}
            </span>
          </button>
        </div>
      )}

      {view === 'landing' && (
        <LandingPage
          onLoadPresentation={handleLoadPresentation}
          onCreateNew={handleCreateNew}
          onOpenLibrary={() => setView('library')}
          loading={loading}
          currentUserId={user.id}
        />
      )}

      {view === 'library' && (
        <ActivityLibrary
          currentUserId={user.id}
          onBack={() => setView('landing')}
          mode="browse"
        />
      )}

      {view === 'arranger' && (
        <SlideArranger
          presentationId={presentationId}
          presentationTitle={presentationTitle}
          presentationSource={detectSource(presentationId)}
          onTitleChange={setPresentationTitle}
          tags={presentationTags}
          onTagsChange={setPresentationTags}
          feedbackEnabled={feedbackEnabled}
          onFeedbackEnabledChange={setFeedbackEnabled}
          requireName={requireName}
          onRequireNameChange={setRequireName}
          horizontalCount={horizontalCount}
          verticalCounts={verticalCounts}
          activities={activities}
          selectedSlides={selectedSlides}
          onSlideClick={handleSlideClick}
          onSlideDoubleClick={handleSlideDoubleClick}
          onAddHorizontal={handleAddHorizontal}
          onAddVertical={handleAddVertical}
          onDeleteSlide={handleDeleteSlide}
          onSave={handleSave}
          onBack={handleBack}
          saving={saving}
          hasChanges={hasChanges}
          // Drag & drop props
          draggedSlide={draggedSlide}
          dropTarget={dropTarget}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          // Copy/repoint/transfer props
          onShowCopyDialog={() => setShowCopyDialog(true)}
          onShowRepointDialog={() => setShowRepointDialog(true)}
          onShowTransferDialog={() => setShowTransferDialog(true)}
          // User info
          userName={user.name}
          onShowSettings={() => setShowSettings(true)}
        />
      )}

      <ActivityEditorModal
        isOpen={isModalOpen}
        slidePosition={getEditingSlidePosition() || { indexh: 0, indexv: 0 }}
        existingActivity={getEditingSlidePosition() ? getActivityAt(getEditingSlidePosition()!.indexh, getEditingSlidePosition()!.indexv) : undefined}
        activity={currentActivity}
        onActivityChange={setCurrentActivity}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        onClose={handleCloseModal}
        currentUserId={user.id}
      />

      {/* Copy Presentation Dialog */}
      {showCopyDialog && (
        <CopyPresentationDialog
          onCopy={handleCopyPresentation}
          onClose={() => setShowCopyDialog(false)}
          saving={saving}
          currentTitle={presentationTitle}
        />
      )}

      {/* Re-point Presentation Dialog */}
      {showRepointDialog && (
        <RepointPresentationDialog
          currentId={presentationId}
          onRepoint={handleRepointPresentation}
          onClose={() => setShowRepointDialog(false)}
          saving={saving}
        />
      )}

      {/* Transfer Ownership Dialog */}
      {showTransferDialog && (
        <TransferOwnershipDialog
          presentationTitle={presentationTitle}
          onTransfer={handleTransferOwnership}
          onClose={() => setShowTransferDialog(false)}
          saving={saving}
        />
      )}
    </>
  );
};

// Main export - wraps with AuthProvider
export const ActivityBuilder: React.FC = () => {
  return (
    <AuthProvider>
      <ActivityBuilderInner />
    </AuthProvider>
  );
};

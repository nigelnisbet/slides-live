import React, { useRef, useState, useCallback } from 'react';
import { VerticalSlideColumn } from './VerticalSlideColumn';
import { AddSlideButton } from './SlideThumbnail';
import { ActivityFormData } from './ActivityFormFields';

type PresentationSource = 'google-slides' | 'slides-com' | 'unknown';

interface SlideArrangerProps {
  presentationId: string;
  presentationTitle: string;
  presentationSource: PresentationSource;
  onTitleChange: (title: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  feedbackEnabled: boolean;
  onFeedbackEnabledChange: (enabled: boolean) => void;
  requireName: boolean;
  onRequireNameChange: (required: boolean) => void;
  horizontalCount: number;
  verticalCounts: Map<number, number>; // indexh -> vertical slide count
  activities: ActivityFormData[];
  // Multi-select support
  selectedSlides: Set<string>;
  onSlideClick: (indexh: number, indexv: number, shiftKey: boolean) => void;
  onSlideDoubleClick: (indexh: number, indexv: number) => void;
  onAddHorizontal: () => void;
  onAddVertical: (indexh: number) => void;
  onDeleteSlide: (indexh: number, indexv: number) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
  hasChanges: boolean;
  // Drag & drop
  draggedSlide: { indexh: number; indexv: number } | null;
  dropTarget: { indexh: number; indexv: number } | null;
  onDragStart: (indexh: number, indexv: number) => void;
  onDragEnd: () => void;
  onDragOver: (indexh: number, indexv: number) => void;
  onDrop: (indexh: number, indexv: number) => void;
  // Copy/repoint/transfer dialogs
  onShowCopyDialog: () => void;
  onShowRepointDialog: () => void;
  onShowTransferDialog: () => void;
  // User info for header
  userName?: string;
  onShowSettings?: () => void;
}

export const SlideArranger: React.FC<SlideArrangerProps> = ({
  presentationId,
  presentationTitle,
  presentationSource,
  onTitleChange,
  tags,
  onTagsChange,
  feedbackEnabled,
  onFeedbackEnabledChange,
  requireName,
  onRequireNameChange,
  horizontalCount,
  verticalCounts,
  activities,
  selectedSlides,
  onSlideClick,
  onSlideDoubleClick,
  onAddHorizontal,
  onAddVertical,
  onDeleteSlide,
  onSave,
  onBack,
  saving,
  hasChanges,
  draggedSlide,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onShowCopyDialog,
  onShowRepointDialog,
  onShowTransferDialog,
  userName,
  onShowSettings,
}) => {
  // Google Slides = vertical strip layout, slides.com = horizontal with vertical sub-slides
  const isGoogleSlides = presentationSource === 'google-slides';
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(presentationTitle);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Tag management
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }
    setNewTag('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  // Click-and-drag scrolling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Calculate total slide count
  let totalSlides = 0;
  for (let h = 0; h < horizontalCount; h++) {
    totalSlides += verticalCounts.get(h) || 1;
  }

  // Render columns for each horizontal slide
  const columns = [];
  for (let ih = 0; ih < horizontalCount; ih++) {
    // For Google Slides, ignore vertical counts (always 1)
    const vertCount = isGoogleSlides ? 1 : (verticalCounts.get(ih) || 1);
    columns.push(
      <VerticalSlideColumn
        key={ih}
        indexh={ih}
        verticalCount={vertCount}
        activities={activities}
        selectedSlides={selectedSlides}
        onSlideClick={onSlideClick}
        onSlideDoubleClick={onSlideDoubleClick}
        onAddVertical={onAddVertical}
        onDeleteSlide={onDeleteSlide}
        totalSlides={totalSlides}
        allowVerticalSlides={!isGoogleSlides}
        draggedSlide={draggedSlide}
        dropTarget={dropTarget}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.backBtn}>
            ← Back
          </button>
          <div style={styles.titleSection}>
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => {
                  onTitleChange(editedTitle);
                  setIsEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onTitleChange(editedTitle);
                    setIsEditingTitle(false);
                  } else if (e.key === 'Escape') {
                    setEditedTitle(presentationTitle);
                    setIsEditingTitle(false);
                  }
                }}
                style={styles.titleInput}
                placeholder="Enter presentation title..."
                autoFocus
              />
            ) : (
              <h1
                style={styles.title}
                onClick={() => {
                  setEditedTitle(presentationTitle);
                  setIsEditingTitle(true);
                }}
                title="Click to edit title"
              >
                {presentationTitle || presentationId}
                <span style={styles.editIcon}>✏️</span>
              </h1>
            )}
            {presentationTitle && (
              <span style={styles.presentationIdSmall}>ID: {presentationId}</span>
            )}
            {/* Tags section */}
            <div style={styles.tagsSection}>
              {tags.map(tag => (
                <span key={tag} style={styles.tagChip}>
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={styles.tagRemoveBtn}
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
              {showTagInput ? (
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onBlur={() => {
                    if (newTag.trim()) handleAddTag();
                    else setShowTagInput(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    else if (e.key === 'Escape') {
                      setNewTag('');
                      setShowTagInput(false);
                    }
                  }}
                  placeholder="Enter tag..."
                  style={styles.tagInput}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  style={styles.addTagBtn}
                  title="Add tag"
                >
                  + Add Tag
                </button>
              )}
            </div>
            {/* Settings toggles */}
            <div style={styles.settingsTogglesSection}>
              <label style={styles.settingToggleLabel}>
                <input
                  type="checkbox"
                  checked={feedbackEnabled}
                  onChange={(e) => onFeedbackEnabledChange(e.target.checked)}
                  style={styles.settingCheckbox}
                />
                <span style={styles.settingToggleText}>
                  Enable Questions & Feedback
                </span>
              </label>
              <label style={styles.settingToggleLabel}>
                <input
                  type="checkbox"
                  checked={requireName}
                  onChange={(e) => onRequireNameChange(e.target.checked)}
                  style={styles.settingCheckbox}
                />
                <span style={styles.settingToggleText}>
                  Require Name on Sign In
                </span>
              </label>
            </div>
          </div>
          <span style={styles.slideCount}>
            {horizontalCount} slides · {activities.length} activities
          </span>
        </div>
        <div style={styles.headerRight}>
          {hasChanges && <span style={styles.unsavedIndicator}>Unsaved changes</span>}
          <button onClick={onShowTransferDialog} style={styles.secondaryBtn} title="Transfer ownership to another user">
            Transfer
          </button>
          <button onClick={onShowRepointDialog} style={styles.secondaryBtn} title="Change presentation URL">
            Re-point
          </button>
          <button onClick={onShowCopyDialog} style={styles.secondaryBtn} title="Copy activities to another presentation">
            Copy to...
          </button>
          <button
            onClick={onSave}
            style={{
              ...styles.saveBtn,
              opacity: saving ? 0.7 : 1,
            }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {/* User info divider */}
          <div style={styles.headerDivider} />
          {userName && <span style={styles.userName}>{userName}</span>}
          {onShowSettings && (
            <button onClick={onShowSettings} style={styles.settingsBtn}>
              Settings
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        Double-click to edit. Shift-click to multi-select. Drag slides to reorder.
      </div>

      {/* Slide Grid */}
      <div
        ref={scrollContainerRef}
        style={{
          ...styles.scrollContainer,
          cursor: isDragging ? 'grabbing' : 'grab',
          // For Google Slides, primarily scroll vertically
          overflowX: isGoogleSlides ? 'hidden' : 'auto',
          overflowY: isGoogleSlides ? 'auto' : 'auto',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{
          ...styles.slideGrid,
          // Google Slides: vertical column layout
          // slides.com: horizontal row layout
          flexDirection: isGoogleSlides ? 'column' : 'row',
        }}>
          {columns}
          <div style={styles.addColumnWrapper}>
            <AddSlideButton
              direction={isGoogleSlides ? 'vertical' : 'horizontal'}
              onClick={onAddHorizontal}
            />
          </div>
        </div>
      </div>

      {/* Footer with keyboard hints */}
      <div style={styles.footer}>
        <span>Tip: Two-finger scroll or click-drag to navigate</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1a1a2e',
    color: 'white',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #333',
    backgroundColor: '#16213e',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  titleInput: {
    fontSize: '20px',
    fontWeight: '600',
    backgroundColor: '#1a1a2e',
    border: '1px solid #4b5563',
    borderRadius: '4px',
    color: 'white',
    padding: '4px 8px',
    width: '300px',
  },
  editIcon: {
    fontSize: '14px',
    opacity: 0.5,
  },
  presentationIdSmall: {
    fontSize: '11px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  tagsSection: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
    marginTop: '4px',
  },
  tagChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#e5e7eb',
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '1px solid rgba(99, 102, 241, 0.5)',
  },
  tagRemoveBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: '0 2px',
    marginLeft: '2px',
  },
  tagInput: {
    fontSize: '11px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #4b5563',
    borderRadius: '10px',
    color: 'white',
    padding: '2px 8px',
    width: '100px',
    outline: 'none',
  },
  addTagBtn: {
    fontSize: '11px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: '1px dashed #4b5563',
    borderRadius: '10px',
    padding: '2px 8px',
    cursor: 'pointer',
  },
  slideCount: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  unsavedIndicator: {
    fontSize: '12px',
    color: '#f59e0b',
    padding: '4px 8px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: '4px',
  },
  secondaryBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  saveBtn: {
    padding: '10px 24px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  headerDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#4b5563',
    marginLeft: '8px',
  },
  userName: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  settingsBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  instructions: {
    textAlign: 'center',
    padding: '12px',
    fontSize: '14px',
    color: '#9ca3af',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  scrollContainer: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'auto',
    padding: '24px',
    WebkitOverflowScrolling: 'touch',
  },
  slideGrid: {
    display: 'flex',
    gap: '16px',
    minWidth: 'max-content',
    paddingBottom: '24px',
  },
  addColumnWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #333',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    backgroundColor: '#16213e',
  },
  settingsTogglesSection: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  settingToggleLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    gap: '8px',
  },
  settingCheckbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  settingToggleText: {
    fontSize: '13px',
    color: '#e5e7eb',
    fontWeight: '500',
  },
};

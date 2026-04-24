import React from 'react';
import { SlideThumbnail, AddSlideButton } from './SlideThumbnail';
import { ActivityFormData } from './ActivityFormFields';

interface VerticalSlideColumnProps {
  indexh: number;
  verticalCount: number; // Number of vertical slides (minimum 1 for the main slide)
  activities: ActivityFormData[];
  selectedSlides: Set<string>;
  onSlideClick: (indexh: number, indexv: number, shiftKey: boolean) => void;
  onSlideDoubleClick: (indexh: number, indexv: number) => void;
  onAddVertical: (indexh: number) => void;
  onDeleteSlide: (indexh: number, indexv: number) => void;
  totalSlides: number; // Total slides across all columns (to prevent deleting last slide)
  allowVerticalSlides?: boolean; // If false, hide the "add vertical" button (e.g., for Google Slides)
  // Drag & drop
  draggedSlide: { indexh: number; indexv: number } | null;
  dropTarget: { indexh: number; indexv: number } | null;
  onDragStart: (indexh: number, indexv: number) => void;
  onDragEnd: () => void;
  onDragOver: (indexh: number, indexv: number) => void;
  onDrop: (indexh: number, indexv: number) => void;
}

export const VerticalSlideColumn: React.FC<VerticalSlideColumnProps> = ({
  indexh,
  verticalCount,
  activities,
  selectedSlides,
  onSlideClick,
  onSlideDoubleClick,
  onAddVertical,
  onDeleteSlide,
  totalSlides,
  allowVerticalSlides = true,
  draggedSlide,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  // Get activity at a specific position
  const getActivityAt = (ih: number, iv: number) => {
    return activities.find(
      a => a.slidePosition.indexh === ih && a.slidePosition.indexv === iv
    );
  };

  // Check if a slide is selected (uses Set<string> with "h-v" keys)
  const isSelected = (ih: number, iv: number) => {
    return selectedSlides.has(`${ih}-${iv}`);
  };

  // Check if a slide is being dragged
  const isDragging = (ih: number, iv: number) => {
    return draggedSlide?.indexh === ih && draggedSlide?.indexv === iv;
  };

  // Check if a slide is the drop target
  const isDropTarget = (ih: number, iv: number) => {
    return dropTarget?.indexh === ih && dropTarget?.indexv === iv;
  };

  // Render vertical slides (indexv: 0, 1, 2, ...)
  const slides = [];
  for (let iv = 0; iv < verticalCount; iv++) {
    slides.push(
      <SlideThumbnail
        key={`${indexh}-${iv}`}
        indexh={indexh}
        indexv={iv}
        activity={getActivityAt(indexh, iv)}
        onClick={(shiftKey) => onSlideClick(indexh, iv, shiftKey)}
        onDoubleClick={() => onSlideDoubleClick(indexh, iv)}
        onDelete={() => onDeleteSlide(indexh, iv)}
        canDelete={totalSlides > 1}
        isSelected={isSelected(indexh, iv)}
        isDragging={isDragging(indexh, iv)}
        isDropTarget={isDropTarget(indexh, iv)}
        onDragStart={() => onDragStart(indexh, iv)}
        onDragEnd={onDragEnd}
        onDragOver={() => onDragOver(indexh, iv)}
        onDrop={() => onDrop(indexh, iv)}
      />
    );
  }

  return (
    <div style={styles.column}>
      {slides}
      {allowVerticalSlides && (
        <AddSlideButton
          direction="vertical"
          onClick={() => onAddVertical(indexh)}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
};

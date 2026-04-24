import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Use the existing Firebase app from firebase.ts (slideslive-prod)
const app = getApp();
const database = getDatabase(app);

// SlidesLive brand colors
const primaryBlue = '#3b82f6';

// Word cloud colors - vibrant palette
const wordCloudColors = [
  '#3b82f6', // SlidesLive Blue
  '#10b981', // Green
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

// Common stop words to filter out
const stopWords = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'our', 'their', 'mine', 'yours', 'hers', 'ours',
  'theirs', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'also', 'now', 'here', 'there', 'then', 'once', 'if', 'because', 'until', 'while',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
  'am', 'being', 'get', 'got', 'getting', 'like', 'really', 'think', 'know', 'going',
  'want', 'see', 'look', 'make', 'way', 'well', 'back', 'much', 'go', 'good', 'new',
  'first', 'last', 'long', 'great', 'little', 'own', 'old', 'right', 'big', 'high',
  'different', 'small', 'large', 'next', 'early', 'young', 'important', 'public',
  'bad', 'same', 'able', 'im', 'dont', 'cant', 'wont', 'didnt', 'isnt', 'arent',
  'wasnt', 'werent', 'hasnt', 'havent', 'hadnt', 'doesnt', 'wouldnt', 'couldnt',
  'shouldnt', 'lets', 'thats', 'whats', 'heres', 'theres', 'wheres', 'its', 'ive',
  'youve', 'weve', 'theyve', 'youre', 'were', 'theyre', 'ill', 'youll', 'hell',
  'shell', 'well', 'theyll', 'id', 'youd', 'hed', 'shed', 'wed', 'theyd',
]);

interface TextResponseActivity {
  activityId?: string;
  type: 'text-response';
  prompt: string;
  placeholder?: string;
  maxLength?: number;
}

interface TextResponseResultsProps {
  activity: TextResponseActivity;
  sessionCode: string;
}

interface ResponseEntry {
  answer: string;
  submittedAt: number;
  participantId: string;
}

interface WordCount {
  word: string;
  count: number;
  size: number;
  color: string;
}

type DisplayMode = 'list' | 'word-cloud';

const RESPONSES_PER_PAGE = 50;
const DEBOUNCE_MS = 500;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 72;
const MIN_WORD_LENGTH = 2;

export const TextResponseResults: React.FC<TextResponseResultsProps> = ({ activity, sessionCode }) => {
  const [responses, setResponses] = useState<ResponseEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(RESPONSES_PER_PAGE);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const pendingResponsesRef = useRef<ResponseEntry[] | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activity.activityId || !sessionCode) return;

    const responsesRef = ref(database, `sessions/${sessionCode}/responses/${activity.activityId}`);
    const unsubscribe = onValue(responsesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries: ResponseEntry[] = Object.entries(data).map(([participantId, value]: [string, any]) => ({
          participantId,
          answer: value.answer,
          submittedAt: value.submittedAt,
        }));
        // Sort by submission time (newest first)
        entries.sort((a, b) => b.submittedAt - a.submittedAt);

        // Debounce updates for large sessions
        pendingResponsesRef.current = entries;

        if (!debounceTimerRef.current) {
          setResponses(entries);
          debounceTimerRef.current = setTimeout(() => {
            if (pendingResponsesRef.current) {
              setResponses(pendingResponsesRef.current);
            }
            debounceTimerRef.current = null;
          }, DEBOUNCE_MS);
        }
      } else {
        setResponses([]);
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [activity.activityId, sessionCode]);

  // Reset visible count when activity changes
  useEffect(() => {
    setVisibleCount(RESPONSES_PER_PAGE);
  }, [activity.activityId]);

  // Calculate word frequencies for word cloud
  const wordCounts = useMemo((): WordCount[] => {
    const wordMap = new Map<string, number>();

    // Extract and count words from all responses
    responses.forEach(({ answer }) => {
      // Normalize: lowercase, remove punctuation, split into words
      const words = answer
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word =>
          word.length >= MIN_WORD_LENGTH &&
          !stopWords.has(word) &&
          !/^\d+$/.test(word) // Filter out pure numbers
        );

      words.forEach(word => {
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      });
    });

    // Convert to array and sort by count
    const sortedWords = Array.from(wordMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 80); // Limit to top 80 words

    if (sortedWords.length === 0) return [];

    // Calculate size based on frequency
    const maxCount = sortedWords[0].count;
    const minCount = sortedWords[sortedWords.length - 1].count;
    const countRange = maxCount - minCount || 1;

    return sortedWords.map((item, index) => ({
      ...item,
      // Scale size logarithmically for better distribution
      size: MIN_FONT_SIZE +
        ((Math.log(item.count - minCount + 1) / Math.log(countRange + 1)) * (MAX_FONT_SIZE - MIN_FONT_SIZE)),
      color: wordCloudColors[index % wordCloudColors.length],
    }));
  }, [responses]);

  const visibleResponses = responses.slice(0, visibleCount);
  const hasMore = responses.length > visibleCount;

  const loadMore = () => {
    setVisibleCount(prev => prev + RESPONSES_PER_PAGE);
  };

  const renderToggleButtons = () => (
    <div style={styles.toggleContainer}>
      <button
        onClick={() => setDisplayMode('list')}
        style={{
          ...styles.toggleButton,
          ...(displayMode === 'list' ? styles.toggleButtonActive : {}),
        }}
        title="List View"
      >
        ☰
      </button>
      <button
        onClick={() => setDisplayMode('word-cloud')}
        style={{
          ...styles.toggleButton,
          ...(displayMode === 'word-cloud' ? styles.toggleButtonActive : {}),
        }}
        title="Word Cloud"
      >
        ☁️
      </button>
    </div>
  );

  const renderListView = () => (
    <>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {visibleResponses.map((entry) => (
          <div
            key={entry.participantId}
            className="p-4 bg-gray-50 rounded-lg border-l-4"
            style={{ borderLeftColor: primaryBlue }}
          >
            <p className="text-gray-800">{entry.answer}</p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(entry.submittedAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={loadMore}
          className="mt-4 w-full py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: '#e0f2fe', color: primaryBlue }}
        >
          Load more ({responses.length - visibleCount} remaining)
        </button>
      )}
    </>
  );

  const renderWordCloud = () => {
    if (wordCounts.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">☁️</div>
          <p>Not enough words yet for a word cloud</p>
        </div>
      );
    }

    // Create a stable seed based on words for consistent layout
    const seed = wordCounts.reduce((acc, w) => acc + w.word.charCodeAt(0), 0);
    const seededRandom = (i: number) => {
      const x = Math.sin(seed + i * 9999) * 10000;
      return x - Math.floor(x);
    };

    // Container dimensions for positioning
    const width = 550;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 2;

    // Use canvas to measure actual text width
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const measureText = (text: string, fontSize: number): number => {
      if (!ctx) return text.length * fontSize * 0.6; // fallback
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
      return ctx.measureText(text).width;
    };

    // Place words using spiral algorithm - biggest words first, near center
    const placedWords: Array<{
      word: string;
      count: number;
      size: number;
      color: string;
      x: number;
      y: number;
      rotation: number;
      width: number;
      height: number;
    }> = [];

    // Sort by size (biggest first)
    const sorted = [...wordCounts].sort((a, b) => b.size - a.size);

    sorted.forEach((item, index) => {
      const rand = seededRandom(index);
      // ~25% vertical for variety
      const rotation = rand > 0.75 ? -90 : 0;

      // Measure actual text width using canvas
      const textWidth = measureText(item.word, item.size);
      const textHeight = item.size * 1.2; // Line height

      // Swap dimensions for rotated words
      const wordWidth = rotation ? textHeight : textWidth;
      const wordHeight = rotation ? textWidth : textHeight;

      // Spiral outward from center to find placement
      let placed = false;
      let angle = seededRandom(index + 50) * Math.PI * 2;
      let radius = 0;
      const angleStep = 0.2; // Small steps for tight packing
      const radiusStep = 1.5;
      let attempts = 0;
      const maxAttempts = 800;

      // Padding between words
      const padding = 4;

      while (!placed && attempts < maxAttempts) {
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        // Check bounds
        const halfW = wordWidth / 2 + padding;
        const halfH = wordHeight / 2 + padding;

        if (x - halfW >= 0 && x + halfW <= width && y - halfH >= 0 && y + halfH <= height) {
          // Check collision with placed words
          const collides = placedWords.some(p => {
            const pHalfW = p.width / 2 + padding;
            const pHalfH = p.height / 2 + padding;
            return !(x + halfW < p.x - pHalfW || x - halfW > p.x + pHalfW ||
                     y + halfH < p.y - pHalfH || y - halfH > p.y + pHalfH);
          });

          if (!collides) {
            placedWords.push({
              ...item,
              x,
              y,
              rotation,
              width: wordWidth,
              height: wordHeight,
            });
            placed = true;
          }
        }

        angle += angleStep;
        radius += radiusStep / (2 * Math.PI); // Archimedean spiral
        attempts++;
      }

      // If couldn't place, skip this word rather than overlap
      if (!placed && placedWords.length < 3) {
        // Only force-place if we have very few words
        placedWords.push({
          ...item,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          rotation,
          width: wordWidth,
          height: wordHeight,
        });
      }
    });

    return (
      <div style={styles.wordCloudContainer}>
        <div style={{
          ...styles.wordCloud,
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
        }}>
          {placedWords.map(({ word, count, size, color, x, y, rotation }) => (
            <span
              key={word}
              style={{
                ...styles.wordCloudWord,
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                fontSize: `${size}px`,
                color,
                transform: `translate(-50%, -50%) ${rotation ? 'rotate(-90deg)' : ''}`,
                whiteSpace: 'nowrap',
              }}
              title={`"${word}" appears ${count} time${count !== 1 ? 's' : ''}`}
            >
              {word}
            </span>
          ))}
        </div>
        <div style={styles.wordCloudStats}>
          <span>{wordCounts.length} unique words</span>
          <span>•</span>
          <span>Top word: "{wordCounts[0]?.word}" ({wordCounts[0]?.count}×)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-800">Responses</h3>
          {renderToggleButtons()}
        </div>
        <span
          className="px-3 py-1 rounded-full text-sm font-semibold"
          style={{ backgroundColor: '#e0f2fe', color: primaryBlue }}
        >
          {responses.length} {responses.length === 1 ? 'response' : 'responses'}
        </span>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">💬</div>
          <p>Waiting for responses...</p>
        </div>
      ) : (
        <>
          {displayMode === 'list' && renderListView()}
          {displayMode === 'word-cloud' && renderWordCloud()}
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toggleContainer: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '4px',
  },
  toggleButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
  toggleButtonActive: {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  wordCloudContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  wordCloud: {
    overflow: 'hidden',
    margin: '0 auto',
  },
  wordCloudWord: {
    fontWeight: '600',
    cursor: 'default',
    transition: 'transform 0.2s, opacity 0.2s',
    lineHeight: 1.2,
  },
  wordCloudStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#6b7280',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    marginTop: '16px',
    width: '100%',
    justifyContent: 'center',
  },
};

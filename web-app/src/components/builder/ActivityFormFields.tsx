import React from 'react';
import { ReviewGameQuestionEditor, ReviewGameQuestionData } from './ReviewGameQuestionEditor';

export type ActivityType = 'poll' | 'quiz' | 'web-link' | 'text-response' | 'review-game' | 'submit-sample' | 'attendee-screen-message' | 'announcement';

export type ActivityFormData = {
  type: ActivityType;
  activityId: string;
  slidePosition: { indexh: number; indexv: number };

  // Poll/Quiz fields
  question?: string;
  options?: string[];
  showResults?: 'live' | 'end' | 'never';

  // Quiz-specific
  correctAnswer?: number;
  timeLimit?: number;

  // Web-link specific
  title?: string;
  description?: string;
  url?: string;
  displayMode?: 'iframe' | 'new-tab' | 'redirect';
  fullScreen?: boolean;
  iframeBackgroundColor?: string;

  // Text-response specific
  prompt?: string;
  placeholder?: string;
  maxLength?: number;

  // Review-game specific
  gameTitle?: string;
  gameQuestions?: ReviewGameQuestionData[];
  defaultTimeLimit?: number;
  maxPoints?: number;
  minPoints?: number;

  // Submit-sample specific
  instructions?: string;
  allowAnnotations?: boolean;
  allowMultipleSubmissions?: boolean;
  canvasSelector?: string;

  // Attendee-screen-message specific
  message?: string;
};

const generateQuestionId = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const getDefaultActivity = (type: ActivityType = 'poll', indexh = 0, indexv = 0): ActivityFormData => {
  if (type === 'web-link') {
    return {
      type,
      activityId: '',
      slidePosition: { indexh, indexv },
      title: '',
      description: '',
      url: '',
      displayMode: 'iframe',
      fullScreen: false,
      iframeBackgroundColor: '',
    };
  }
  if (type === 'text-response') {
    return {
      type,
      activityId: '',
      slidePosition: { indexh, indexv },
      prompt: '',
      placeholder: 'Type your response here...',
      maxLength: 500,
    };
  }
  if (type === 'review-game') {
    return {
      type,
      activityId: '',
      slidePosition: { indexh, indexv },
      gameTitle: '',
      gameQuestions: Array.from({ length: 5 }, () => ({
        id: generateQuestionId(),
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
      })),
      defaultTimeLimit: 20,
      maxPoints: 1000,
      minPoints: 100,
    };
  }
  if (type === 'submit-sample') {
    return {
      type,
      activityId: '',
      slidePosition: { indexh, indexv },
      url: '',
      instructions: '',
      allowAnnotations: true,
      allowMultipleSubmissions: false,
      canvasSelector: 'canvas',
    };
  }
  if (type === 'attendee-screen-message') {
    return {
      type,
      activityId: '',
      slidePosition: { indexh, indexv },
      message: '',
    };
  }
  if (type === 'announcement') {
    return {
      type,
      activityId: '',
      slidePosition: { indexh, indexv },
      message: '',
    };
  }
  return {
    type,
    activityId: '',
    slidePosition: { indexh, indexv },
    question: '',
    options: ['', '', '', ''],
    showResults: 'live',
    ...(type === 'quiz' ? { correctAnswer: 0, timeLimit: 30 } : {}),
  };
};

export const validateActivity = (activity: ActivityFormData): string | null => {
  if (activity.type === 'poll' || activity.type === 'quiz') {
    if (!activity.question?.trim()) return 'Question is required';
    if (!activity.options?.length || activity.options.length < 2) {
      return 'At least 2 options are required';
    }
    if (activity.options.some(opt => !opt.trim())) {
      return 'All options must have text';
    }
    if (activity.type === 'quiz') {
      if (activity.correctAnswer === undefined ||
          activity.correctAnswer < 0 ||
          activity.correctAnswer >= activity.options.length) {
        return 'Valid correct answer must be selected';
      }
    }
  } else if (activity.type === 'web-link') {
    if (!activity.title?.trim()) return 'Title is required';
    if (!activity.url?.trim()) return 'URL is required';
    try {
      new URL(activity.url);
    } catch {
      return 'Please enter a valid URL';
    }
  } else if (activity.type === 'text-response') {
    if (!activity.prompt?.trim()) return 'Prompt/question is required';
  } else if (activity.type === 'review-game') {
    if (!activity.gameTitle?.trim()) return 'Game title is required';
    if (!activity.gameQuestions?.length) return 'At least one question is required';
    for (let i = 0; i < activity.gameQuestions.length; i++) {
      const q = activity.gameQuestions[i];
      if (!q.question?.trim()) return `Question ${i + 1}: Question text is required`;
      if (!q.options?.length || q.options.length < 2) {
        return `Question ${i + 1}: At least 2 options are required`;
      }
      if (q.options.some(opt => !opt.trim())) {
        return `Question ${i + 1}: All options must have text`;
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        return `Question ${i + 1}: Valid correct answer must be selected`;
      }
    }
  } else if (activity.type === 'submit-sample') {
    if (!activity.url?.trim()) return 'Activity URL is required';
    try {
      new URL(activity.url);
    } catch {
      return 'Please enter a valid URL';
    }
    if (!activity.instructions?.trim()) return 'Instructions are required';
  } else if (activity.type === 'attendee-screen-message') {
    if (!activity.message?.trim()) return 'Message is required';
  } else if (activity.type === 'announcement') {
    if (!activity.message?.trim()) return 'Message is required';
  } else if ((activity as any).type === 'collaborative-tap-game') {
    // collaborative-tap-game comes from library with all config, no validation needed
    return null;
  }

  return null;
};

interface ActivityFormFieldsProps {
  activity: ActivityFormData;
  onChange: (activity: ActivityFormData) => void;
  showSlidePosition?: boolean;
}

export const ActivityFormFields: React.FC<ActivityFormFieldsProps> = ({
  activity,
  onChange,
  showSlidePosition = true,
}) => {
  const handleTypeChange = (type: ActivityType) => {
    const newActivity = getDefaultActivity(type, activity.slidePosition.indexh, activity.slidePosition.indexv);
    newActivity.activityId = activity.activityId;
    onChange(newActivity);
  };

  const handleAddOption = () => {
    if (activity.options) {
      onChange({
        ...activity,
        options: [...activity.options, ''],
      });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (activity.options && activity.options.length > 2) {
      onChange({
        ...activity,
        options: activity.options.filter((_, i) => i !== index),
      });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    if (activity.options) {
      const newOptions = [...activity.options];
      newOptions[index] = value;
      onChange({ ...activity, options: newOptions });
    }
  };

  return (
    <div style={styles.formSection}>
      <label style={styles.label}>
        Activity Type
        <select
          value={activity.type}
          onChange={(e) => handleTypeChange(e.target.value as ActivityType)}
          style={styles.select}
        >
          <option value="poll">Poll (Multiple Choice)</option>
          <option value="quiz">Quiz (With Correct Answer)</option>
          <option value="review-game">Review Game (Multi-Question Competition)</option>
          <option value="text-response">Open-Ended Text Response</option>
          <option value="web-link">Web Link</option>
          <option value="submit-sample">Submit Sample (Canvas Activity with Annotations)</option>
          <option value="attendee-screen-message">Attendee Screen Message (Discussion Prompt)</option>
          <option value="announcement">Announcement (Simple Message Display)</option>
        </select>
      </label>

      <label style={styles.label}>
        Activity ID
        <small style={styles.hint}>Leave blank to auto-generate</small>
        <input
          type="text"
          value={activity.activityId}
          onChange={(e) => onChange({ ...activity, activityId: e.target.value })}
          placeholder="e.g., poll-1, quiz-intro (optional)"
          style={styles.input}
        />
      </label>

      {showSlidePosition && (
        <div style={styles.row}>
          <label style={styles.label}>
            Slide Number (H)
            <small style={styles.hint}>Horizontal slide index (0 = first slide)</small>
            <input
              type="number"
              value={activity.slidePosition.indexh}
              onChange={(e) => onChange({
                ...activity,
                slidePosition: { ...activity.slidePosition, indexh: parseInt(e.target.value) || 0 }
              })}
              min="0"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Sub-slide (V)
            <small style={styles.hint}>Vertical slide index (usually 0)</small>
            <input
              type="number"
              value={activity.slidePosition.indexv}
              onChange={(e) => onChange({
                ...activity,
                slidePosition: { ...activity.slidePosition, indexv: parseInt(e.target.value) || 0 }
              })}
              min="0"
              style={styles.input}
            />
          </label>
        </div>
      )}

      {/* Poll/Quiz Fields */}
      {(activity.type === 'poll' || activity.type === 'quiz') && (
        <>
          <label style={styles.label}>
            Question
            <input
              type="text"
              value={activity.question || ''}
              onChange={(e) => onChange({ ...activity, question: e.target.value })}
              placeholder="Enter your question"
              style={styles.input}
            />
          </label>

          <div style={styles.label}>
            Answer Options
            {activity.options?.map((option, index) => (
              <div key={index} style={styles.optionRow}>
                {activity.type === 'quiz' && (
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={activity.correctAnswer === index}
                    onChange={() => onChange({ ...activity, correctAnswer: index })}
                    title="Mark as correct answer"
                    style={styles.radio}
                  />
                )}
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  style={{
                    ...styles.input,
                    ...(activity.type === 'quiz' && activity.correctAnswer === index ? styles.correctOption : {})
                  }}
                />
                {activity.options && activity.options.length > 2 && (
                  <button onClick={() => handleRemoveOption(index)} style={styles.removeBtn}>×</button>
                )}
              </div>
            ))}
            <button onClick={handleAddOption} style={styles.addBtn}>+ Add Option</button>
            {activity.type === 'quiz' && (
              <small style={styles.hint}>Click the radio button to mark the correct answer</small>
            )}
          </div>

          {activity.type === 'quiz' && (
            <label style={styles.label}>
              Time Limit (seconds)
              <input
                type="number"
                value={activity.timeLimit || 30}
                onChange={(e) => onChange({ ...activity, timeLimit: parseInt(e.target.value) || 30 })}
                min="5"
                style={styles.input}
              />
            </label>
          )}

          <label style={styles.label}>
            Show Results
            <select
              value={activity.showResults || 'live'}
              onChange={(e) => onChange({ ...activity, showResults: e.target.value as any })}
              style={styles.select}
            >
              <option value="live">Live (as responses come in)</option>
              <option value="end">At End (after activity closes)</option>
              <option value="never">Never (presenter only)</option>
            </select>
          </label>
        </>
      )}

      {/* Text Response Fields */}
      {activity.type === 'text-response' && (
        <>
          <label style={styles.label}>
            Prompt / Question
            <input
              type="text"
              value={activity.prompt || ''}
              onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
              placeholder="e.g., What are your thoughts on...?"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Placeholder Text (optional)
            <small style={styles.hint}>Hint text shown in the input box</small>
            <input
              type="text"
              value={activity.placeholder || ''}
              onChange={(e) => onChange({ ...activity, placeholder: e.target.value })}
              placeholder="e.g., Type your response here..."
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Max Character Length
            <input
              type="number"
              value={activity.maxLength || 500}
              onChange={(e) => onChange({ ...activity, maxLength: parseInt(e.target.value) || 500 })}
              min="50"
              max="2000"
              style={styles.input}
            />
          </label>
        </>
      )}

      {/* Review Game Fields */}
      {activity.type === 'review-game' && (
        <>
          <label style={styles.label}>
            Game Title
            <input
              type="text"
              value={activity.gameTitle || ''}
              onChange={(e) => onChange({ ...activity, gameTitle: e.target.value })}
              placeholder="e.g., Chapter 5 Review"
              style={styles.input}
            />
          </label>

          <div style={styles.row}>
            <label style={styles.label}>
              Time Per Question (seconds)
              <input
                type="number"
                value={activity.defaultTimeLimit || 20}
                onChange={(e) => onChange({ ...activity, defaultTimeLimit: parseInt(e.target.value) || 20 })}
                min="5"
                max="120"
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Max Points Per Question
              <input
                type="number"
                value={activity.maxPoints || 1000}
                onChange={(e) => onChange({ ...activity, maxPoints: parseInt(e.target.value) || 1000 })}
                min="100"
                max="10000"
                style={styles.input}
              />
            </label>
          </div>

          <ReviewGameQuestionEditor
            questions={activity.gameQuestions || []}
            onChange={(questions) => onChange({ ...activity, gameQuestions: questions })}
            defaultTimeLimit={activity.defaultTimeLimit || 20}
          />
        </>
      )}

      {/* Submit-sample Fields */}
      {activity.type === 'submit-sample' && (
        <>
          <label style={styles.label}>
            Activity URL
            <small style={styles.hint}>URL of the canvas-based activity (e.g., fraction-builder)</small>
            <input
              type="url"
              value={activity.url || ''}
              onChange={(e) => onChange({ ...activity, url: e.target.value })}
              placeholder="https://slides-live.com/src/fraction-builder/index.html"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Instructions
            <small style={styles.hint}>What should students do in this activity?</small>
            <input
              type="text"
              value={activity.instructions || ''}
              onChange={(e) => onChange({ ...activity, instructions: e.target.value })}
              placeholder="e.g., Build the fraction 2/3"
              style={styles.input}
            />
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={activity.allowAnnotations || false}
              onChange={(e) => onChange({ ...activity, allowAnnotations: e.target.checked })}
              style={styles.checkbox}
            />
            Allow Annotations (drawing tools on top of canvas)
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={activity.allowMultipleSubmissions || false}
              onChange={(e) => onChange({ ...activity, allowMultipleSubmissions: e.target.checked })}
              style={styles.checkbox}
            />
            Allow Multiple Submissions (students can update their work)
          </label>

          <label style={styles.label}>
            Canvas Selector (Advanced)
            <small style={styles.hint}>CSS selector for the canvas element (default: "canvas")</small>
            <input
              type="text"
              value={activity.canvasSelector || ''}
              onChange={(e) => onChange({ ...activity, canvasSelector: e.target.value })}
              placeholder="canvas or #game-canvas"
              style={styles.input}
            />
          </label>
        </>
      )}

      {/* Web-link Fields */}
      {activity.type === 'web-link' && (
        <>
          <label style={styles.label}>
            Title
            <input
              type="text"
              value={activity.title || ''}
              onChange={(e) => onChange({ ...activity, title: e.target.value })}
              placeholder="e.g., Interactive Game"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Description (optional)
            <input
              type="text"
              value={activity.description || ''}
              onChange={(e) => onChange({ ...activity, description: e.target.value })}
              placeholder="e.g., Complete the pattern puzzles!"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            URL
            <small style={styles.hint}>Full URL including https://</small>
            <input
              type="url"
              value={activity.url || ''}
              onChange={(e) => onChange({ ...activity, url: e.target.value })}
              placeholder="https://example.com/game"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Display Mode
            <select
              value={activity.displayMode || 'iframe'}
              onChange={(e) => onChange({ ...activity, displayMode: e.target.value as any })}
              style={styles.select}
            >
              <option value="iframe">Embedded (iframe)</option>
              <option value="new-tab">Open in New Tab</option>
              <option value="redirect">Redirect (leave attendee app)</option>
              <option value="click-to-open">Click to Open (button with tracking)</option>
            </select>
          </label>

          {activity.displayMode === 'iframe' && (
            <>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={activity.fullScreen || false}
                  onChange={(e) => onChange({ ...activity, fullScreen: e.target.checked })}
                  style={styles.checkbox}
                />
                Full Screen Mode (hides header, best for games)
              </label>

              <label style={styles.label}>
                Iframe Background Color (optional)
                <small style={styles.hint}>Use for transparent iframes. Examples: white, black, #f0f0f0</small>
                <input
                  type="text"
                  value={activity.iframeBackgroundColor || ''}
                  onChange={(e) => onChange({ ...activity, iframeBackgroundColor: e.target.value })}
                  placeholder="e.g., white, #ffffff, or leave blank"
                  style={styles.input}
                />
              </label>
            </>
          )}
        </>
      )}

      {/* Attendee Screen Message Fields */}
      {activity.type === 'attendee-screen-message' && (
        <>
          <label style={styles.label}>
            Discussion Prompt / Message
            <small style={styles.hint}>This message will be displayed prominently on all attendee screens</small>
            <textarea
              value={activity.message || ''}
              onChange={(e) => onChange({ ...activity, message: e.target.value })}
              placeholder="e.g., What are your thoughts on this topic? Turn to a neighbor and discuss."
              style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
              rows={3}
            />
          </label>

          <div style={{
            padding: '12px',
            backgroundColor: '#eff6ff',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1e40af'
          }}>
            <strong>Note:</strong> This slide type displays a message to attendees but does not collect electronic responses.
            It's perfect for facilitating verbal discussion or activities that don't require digital interaction.
          </div>
        </>
      )}

      {/* Announcement Fields */}
      {activity.type === 'announcement' && (
        <>
          <label style={styles.label}>
            Announcement Message
            <small style={styles.hint}>Simple message displayed prominently on attendee screens</small>
            <textarea
              value={activity.message || ''}
              onChange={(e) => onChange({ ...activity, message: e.target.value })}
              placeholder="e.g., WELCOME, Participate with the group to solve the problem"
              style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
              rows={3}
            />
          </label>

          <div style={{
            padding: '12px',
            backgroundColor: '#eff6ff',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#1e40af'
          }}>
            <strong>Note:</strong> Announcements are clean, simple messages - just large text on a branded background.
            Use for welcomes, instructions, or group activity prompts.
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
    flex: 1,
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  correctOption: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  optionRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  radio: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '8px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  addBtn: {
    padding: '8px 12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginTop: '4px',
    alignSelf: 'flex-start',
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 'normal',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#555',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
};

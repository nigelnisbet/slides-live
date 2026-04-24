import React, { useState } from 'react';

export interface ReviewGameQuestionData {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
}

interface ReviewGameQuestionEditorProps {
  questions: ReviewGameQuestionData[];
  onChange: (questions: ReviewGameQuestionData[]) => void;
  defaultTimeLimit: number;
}

const generateId = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const ReviewGameQuestionEditor: React.FC<ReviewGameQuestionEditorProps> = ({
  questions,
  onChange,
  defaultTimeLimit,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(questions.length > 0 ? 0 : null);

  const addQuestion = () => {
    const newQuestion: ReviewGameQuestionData = {
      id: generateId(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
    };
    onChange([...questions, newQuestion]);
    setExpandedIndex(questions.length);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    onChange(updated);
    if (expandedIndex === index) {
      setExpandedIndex(updated.length > 0 ? Math.min(index, updated.length - 1) : null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateQuestion = (index: number, updates: Partial<ReviewGameQuestionData>) => {
    const updated = questions.map((q, i) => (i === index ? { ...q, ...updates } : q));
    onChange(updated);
  };

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length < 6) {
      updateQuestion(qIndex, { options: [...q.options, ''] });
    }
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length > 2) {
      const newOptions = q.options.filter((_, i) => i !== optIndex);
      const newCorrect = q.correctAnswer >= optIndex && q.correctAnswer > 0
        ? q.correctAnswer - 1
        : q.correctAnswer;
      updateQuestion(qIndex, {
        options: newOptions,
        correctAnswer: Math.min(newCorrect, newOptions.length - 1)
      });
    }
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const q = questions[qIndex];
    const newOptions = q.options.map((o, i) => (i === optIndex ? value : o));
    updateQuestion(qIndex, { options: newOptions });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const updated = [...questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
    setExpandedIndex(newIndex);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>Questions ({questions.length})</h4>
        <button
          onClick={addQuestion}
          disabled={questions.length >= 20}
          style={{
            ...styles.addButton,
            opacity: questions.length >= 20 ? 0.5 : 1,
          }}
        >
          + Add Question
        </button>
      </div>

      {questions.length === 0 && (
        <div style={styles.emptyState}>
          No questions yet. Add at least one question to create your Review Game.
        </div>
      )}

      <div style={styles.questionList}>
        {questions.map((q, qIndex) => {
          const isExpanded = expandedIndex === qIndex;
          return (
            <div key={q.id} style={styles.questionCard}>
              <div
                style={styles.questionHeader}
                onClick={() => setExpandedIndex(isExpanded ? null : qIndex)}
              >
                <div style={styles.questionHeaderLeft}>
                  <span style={styles.questionNumber}>Q{qIndex + 1}</span>
                  <span style={styles.questionPreview}>
                    {q.question || '(No question text)'}
                  </span>
                </div>
                <div style={styles.questionHeaderRight}>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveQuestion(qIndex, 'up'); }}
                    disabled={qIndex === 0}
                    style={{ ...styles.moveBtn, opacity: qIndex === 0 ? 0.3 : 1 }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveQuestion(qIndex, 'down'); }}
                    disabled={qIndex === questions.length - 1}
                    style={{ ...styles.moveBtn, opacity: qIndex === questions.length - 1 ? 0.3 : 1 }}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeQuestion(qIndex); }}
                    style={styles.deleteBtn}
                    title="Delete question"
                  >
                    ×
                  </button>
                  <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={styles.questionBody}>
                  <label style={styles.label}>
                    Question Text
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                      placeholder="Enter your question..."
                      style={styles.input}
                    />
                  </label>

                  <div style={styles.optionsSection}>
                    <div style={styles.optionsHeader}>
                      <span style={styles.optionsLabel}>Answer Options</span>
                      <button
                        onClick={() => addOption(qIndex)}
                        disabled={q.options.length >= 6}
                        style={{
                          ...styles.addOptionBtn,
                          opacity: q.options.length >= 6 ? 0.5 : 1,
                        }}
                      >
                        + Add Option
                      </button>
                    </div>

                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} style={styles.optionRow}>
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctAnswer === optIndex}
                          onChange={() => updateQuestion(qIndex, { correctAnswer: optIndex })}
                          style={styles.radio}
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                          placeholder={`Option ${optIndex + 1}`}
                          style={{
                            ...styles.optionInput,
                            borderColor: q.correctAnswer === optIndex ? '#10b981' : '#4b5563',
                          }}
                        />
                        {q.options.length > 2 && (
                          <button
                            onClick={() => removeOption(qIndex, optIndex)}
                            style={styles.removeOptionBtn}
                            title="Remove option"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <div style={styles.correctHint}>
                      Select the radio button next to the correct answer
                    </div>
                  </div>

                  <label style={styles.label}>
                    Time Limit Override (optional)
                    <div style={styles.timeLimitRow}>
                      <input
                        type="number"
                        value={q.timeLimit || ''}
                        onChange={(e) => updateQuestion(qIndex, {
                          timeLimit: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        placeholder={`Default: ${defaultTimeLimit}s`}
                        min="5"
                        max="120"
                        style={styles.timeLimitInput}
                      />
                      <span style={styles.timeLimitHint}>
                        seconds (leave empty for default)
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#e5e7eb',
  },
  addButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    fontSize: '13px',
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  questionCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  questionHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  questionNumber: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  questionPreview: {
    fontSize: '13px',
    color: '#e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  questionHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  moveBtn: {
    width: '24px',
    height: '24px',
    padding: 0,
    fontSize: '12px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: '1px solid #4b5563',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteBtn: {
    width: '24px',
    height: '24px',
    padding: 0,
    fontSize: '16px',
    lineHeight: '1',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  expandIcon: {
    fontSize: '10px',
    color: '#6b7280',
    marginLeft: '8px',
  },
  questionBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#9ca3af',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#1f2937',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    color: 'white',
    outline: 'none',
  },
  optionsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionsLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#9ca3af',
  },
  addOptionBtn: {
    padding: '4px 8px',
    fontSize: '11px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: '1px dashed #4b5563',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  radio: {
    width: '18px',
    height: '18px',
    accentColor: '#10b981',
    cursor: 'pointer',
  },
  optionInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '13px',
    backgroundColor: '#1f2937',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    color: 'white',
    outline: 'none',
  },
  removeOptionBtn: {
    width: '24px',
    height: '24px',
    padding: 0,
    fontSize: '16px',
    lineHeight: '1',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  correctHint: {
    fontSize: '11px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  timeLimitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timeLimitInput: {
    width: '100px',
    padding: '8px 12px',
    fontSize: '13px',
    backgroundColor: '#1f2937',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    color: 'white',
    outline: 'none',
  },
  timeLimitHint: {
    fontSize: '11px',
    color: '#6b7280',
  },
};

export default ReviewGameQuestionEditor;

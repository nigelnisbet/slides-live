import React, { useState } from 'react';
import { useSocket } from '../../contexts/FirebaseContext';
import { FloatingCircles } from '../FloatingCircles';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';
const accentGreen = '#10b981';

interface QuizActivity {
  activityId?: string;
  type: 'quiz';
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
  showResults?: 'live' | 'end' | 'never';
}

interface QuizProps {
  activity: QuizActivity;
}

export const Quiz: React.FC<QuizProps> = ({ activity }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);
  const { submitResponse } = useSocket();

  const handleOptionSelect = (index: number) => {
    if (submitted) return;
    setSelectedOption(index);
  };

  const handleSubmit = async () => {
    if (selectedOption === null) return;

    try {
      await submitResponse(activity.activityId || '', selectedOption);
      setSubmitted(true);

      // Show correct answer after a brief delay
      setTimeout(() => {
        setShowCorrect(true);
      }, 500);
    } catch (error) {
      console.error('Error submitting quiz response:', error);
    }
  };

  const isCorrect = submitted && selectedOption === activity.correctAnswer;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)`,
      }}
    >
      <FloatingCircles />
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full" style={{ position: 'relative', zIndex: 1 }}>
        <div className="mb-6">
          <span
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide"
            style={{ backgroundColor: '#e0f2fe', color: primaryBlue }}
          >
            Quiz Question
          </span>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-6">{activity.question}</h2>

        <div className="space-y-4 mb-6">
          {activity.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrectAnswer = index === activity.correctAnswer;
            const showAsCorrect = showCorrect && isCorrectAnswer;
            const showAsIncorrect = showCorrect && isSelected && !isCorrectAnswer;

            return (
              <div
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  submitted ? 'cursor-default' : 'cursor-pointer hover:shadow-md'
                }`}
                style={{
                  borderColor: showAsCorrect
                    ? '#10b981'
                    : showAsIncorrect
                    ? '#ef4444'
                    : isSelected
                    ? primaryBlue
                    : '#e5e7eb',
                  backgroundColor: showAsCorrect
                    ? '#d1fae5'
                    : showAsIncorrect
                    ? '#fee2e2'
                    : isSelected
                    ? '#eff6ff'
                    : 'white',
                }}
              >
                <div className="flex items-center">
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0"
                    style={{
                      borderColor: showAsCorrect
                        ? '#10b981'
                        : showAsIncorrect
                        ? '#ef4444'
                        : isSelected
                        ? primaryBlue
                        : '#d1d5db',
                      backgroundColor: showAsCorrect
                        ? '#10b981'
                        : showAsIncorrect
                        ? '#ef4444'
                        : isSelected
                        ? primaryBlue
                        : 'white',
                    }}
                  >
                    {(isSelected || showAsCorrect) && (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        {showAsCorrect ? (
                          <path d="M5 13l4 4L19 7" />
                        ) : showAsIncorrect ? (
                          <path d="M6 18L18 6M6 6l12 12" />
                        ) : (
                          <path d="M5 13l4 4L19 7" />
                        )}
                      </svg>
                    )}
                  </div>
                  <span className="text-lg text-gray-800 flex-grow">{option}</span>
                  {showAsCorrect && (
                    <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className="w-full text-white py-3 px-6 rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: selectedOption === null ? undefined : accentGreen,
              boxShadow: selectedOption === null ? undefined : '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            Submit Answer
          </button>
        ) : (
          <div className="text-center">
            <div
              className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg ${
                isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isCorrect ? (
                  <path d="M5 13l4 4L19 7" />
                ) : (
                  <path d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              <span className="font-semibold">
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
            {!isCorrect && showCorrect && (
              <p className="mt-3 text-sm text-gray-600">
                The correct answer is: {activity.options[activity.correctAnswer]}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

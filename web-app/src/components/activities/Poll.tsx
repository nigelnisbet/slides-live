import React, { useState } from 'react';
import { PollActivity, PollResults } from '../../types/activity';
import { useSocket } from '../../contexts/FirebaseContext';
import { FloatingCircles } from '../FloatingCircles';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';
const accentGreen = '#10b981';

interface PollProps {
  activity: PollActivity;
  results?: PollResults;
}

export const Poll: React.FC<PollProps> = ({ activity, results }) => {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const { submitResponse } = useSocket();

  const handleOptionToggle = (index: number) => {
    if (submitted) return;

    if (activity.allowMultiple) {
      setSelectedOptions(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index]
      );
    } else {
      setSelectedOptions([index]);
    }
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0) return;

    try {
      await submitResponse(activity.activityId || '', selectedOptions);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting poll response:', error);
    }
  };

  const showResults = submitted && results && activity.showResults === 'live';
  const totalVotes = results?.totalResponses || 0;

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
            {activity.allowMultiple ? 'Poll (Select All That Apply)' : 'Poll'}
          </span>
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-6">{activity.question}</h2>

        <div className="space-y-4 mb-6">
          {activity.options.map((option, index) => {
            const isSelected = selectedOptions.includes(index);
            const votes = results?.responses?.[index] || 0;
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

            return (
              <div
                key={index}
                onClick={() => handleOptionToggle(index)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  submitted ? 'cursor-default' : 'hover:shadow-md'
                }`}
                style={{
                  borderColor: isSelected ? primaryBlue : '#e5e7eb',
                  backgroundColor: showResults
                    ? `rgba(59, 130, 246, ${percentage / 100 * 0.1})`
                    : isSelected
                    ? '#eff6ff'
                    : 'white',
                }}
              >
                <div className="flex items-center">
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0"
                    style={{
                      borderColor: isSelected ? primaryBlue : '#d1d5db',
                      backgroundColor: isSelected ? primaryBlue : 'white',
                    }}
                  >
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-lg text-gray-800 flex-grow">{option}</span>
                  {showResults && (
                    <div className="ml-4 text-right">
                      <span className="font-bold" style={{ color: primaryBlue }}>{percentage}%</span>
                      <div className="text-xs text-gray-500">{votes} {votes === 1 ? 'vote' : 'votes'}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOptions.length === 0}
            className="w-full text-white py-3 px-6 rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: selectedOptions.length === 0 ? undefined : accentGreen,
              boxShadow: selectedOptions.length === 0 ? undefined : '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            Submit Vote
          </button>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-6 py-3 rounded-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">Vote Recorded!</span>
            </div>
            {showResults && (
              <p className="mt-3 text-sm text-gray-600">
                {totalVotes} {totalVotes === 1 ? 'response' : 'responses'} so far
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

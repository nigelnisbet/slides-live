import React from 'react';
import { QuizActivity, QuizResults as QuizResultsType } from '../../types/activity';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';

interface QuizResultsProps {
  activity: QuizActivity;
  results: QuizResultsType | null;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ activity, results }) => {
  const totalResponses = results?.totalResponses || 0;
  const responses = results?.responses || [];
  const correctCount = results?.correctCount || 0;
  const incorrectCount = results?.incorrectCount || 0;
  const correctAnswer = activity.correctAnswer;

  // Calculate stats for each option
  const optionStats = activity.options.map((option, index) => {
    const count = responses[index] || 0;
    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
    const isCorrect = index === correctAnswer;
    return { option, count, percentage, isCorrect };
  });

  const accuracyRate = totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold" style={{ color: primaryBlue }}>{totalResponses}</div>
          <div className="text-sm text-gray-500 mt-1">Total Responses</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{correctCount}</div>
          <div className="text-sm text-gray-500 mt-1">Correct</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold text-red-600">{incorrectCount}</div>
          <div className="text-sm text-gray-500 mt-1">Incorrect</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl font-bold" style={{ color: primaryBlue }}>{accuracyRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-500 mt-1">Accuracy</div>
        </div>
      </div>

      {/* Answer Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Answer Distribution</h3>

        {totalResponses === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">⏳</div>
            <p className="text-gray-600">Waiting for responses...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {optionStats.map((stat, index) => (
              <div key={index} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {stat.isCorrect && (
                      <span className="text-green-500 text-xl">✓</span>
                    )}
                    <span className={`font-medium ${stat.isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                      {stat.option}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{stat.count} responses</span>
                    <span className={`text-lg font-bold ${stat.isCorrect ? 'text-green-600' : 'text-gray-800'}`}>
                      {stat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stat.isCorrect
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : 'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${stat.percentage}%` }}
                  >
                    {stat.count > 0 && (
                      <div className="flex items-center justify-end h-full px-3 text-white font-semibold text-sm">
                        {stat.count}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Correct Answer Highlight */}
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-green-600 text-2xl">✓</span>
          <h4 className="text-lg font-bold text-green-800">Correct Answer</h4>
        </div>
        <p className="text-green-700 text-xl font-semibold ml-9">
          {activity.options[correctAnswer]}
        </p>
        {activity.points && (
          <p className="text-green-600 text-sm mt-2 ml-9">
            Worth {activity.points} points
          </p>
        )}
      </div>

      {/* Real-time indicator */}
      {totalResponses > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates enabled</span>
        </div>
      )}
    </div>
  );
};

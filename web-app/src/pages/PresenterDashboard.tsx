import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/FirebaseContext';
import { PollResults } from '../components/presenter/PollResults';
import { QuizResults } from '../components/presenter/QuizResults';
import { TextResponseResults } from '../components/presenter/TextResponseResults';
import { FeedbackPanel } from '../components/presenter/FeedbackPanel';
import { ParticipantsModal } from '../components/presenter/ParticipantsModal';
import { useFeedbackUnreadCount } from '../hooks/useFeedbackUnreadCount';
import { FloatingCircles } from '../components/FloatingCircles';
import { SlidesLiveLogo } from '../components/SlidesLiveLogo';
import { SessionCodeBadge } from '../components/SessionCodeBadge';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';
const accentColor = '#10b981';

export const PresenterDashboard: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { joinSession, currentActivity, currentResults, error, participantCount, connected, feedbackEnabled, sessionEnded, sessionCode } = useSocket();
  const [joining, setJoining] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const { unreadCount, markAsViewed } = useFeedbackUnreadCount(code || null);

  // Set page title
  useEffect(() => {
    document.title = 'slidesLive present';
  }, []);

  useEffect(() => {
    if (!code) {
      navigate('/join');
      return;
    }

    // Join session as presenter observer
    joinSession(code, 'Presenter')
      .then(() => {
        setJoining(false);
      })
      .catch((err) => {
        console.error('Failed to join session:', err);
        setJoining(false);
      });
  }, [code, joinSession, navigate]);

  // Redirect to builder if session ended
  useEffect(() => {
    if (sessionEnded) {
      console.log('Session ended in PresenterDashboard, redirecting to builder');
      navigate('/builder', { replace: true });
    }
  }, [sessionEnded, navigate]);

  // Brief delay to let Firebase listeners fire and load current activity
  useEffect(() => {
    if (sessionCode && !joining) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 300); // Brief 300ms delay
      return () => clearTimeout(timer);
    }
  }, [sessionCode, joining]);

  useEffect(() => {
    if (error) {
      console.error('Socket error:', error);
    }
  }, [error]);

  const handleOpenFeedback = () => {
    setShowFeedbackPanel(true);
    if (code) {
      markAsViewed();
    }
  };

  if (joining || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative', background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)` }}>
        <FloatingCircles />
        <div className="text-white text-xl" style={{ position: 'relative', zIndex: 1 }}>Joining session...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ position: 'relative', background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)` }}>
        <FloatingCircles />
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md" style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="text-2xl font-bold text-red-600 mb-4">Connection Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/join')}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Back to Join
          </button>
        </div>
      </div>
    );
  }

  // Render results based on activity type
  let resultsComponent = null;
  if (currentActivity) {
    switch (currentActivity.type) {
      case 'poll':
        resultsComponent = (
          <PollResults
            activity={currentActivity as any}
            sessionCode={code || ''}
          />
        );
        break;
      case 'quiz':
        resultsComponent = (
          <QuizResults
            activity={currentActivity as any}
            sessionCode={code || ''}
          />
        );
        break;
      case 'text-response':
        resultsComponent = (
          <TextResponseResults
            activity={currentActivity as any}
            sessionCode={code || ''}
          />
        );
        break;
      case 'announcement':
        resultsComponent = (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Announcement</h3>
            <p className="text-gray-600">Currently showing announcement to participants</p>
          </div>
        );
        break;
      default:
        resultsComponent = null;
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ position: 'relative', background: `linear-gradient(135deg, ${primaryBlue} 0%, ${primaryBlueDark} 100%)` }}>
      <SlidesLiveLogo />
      {sessionCode && <SessionCodeBadge code={sessionCode} />}
      <FloatingCircles />
      <div className="max-w-7xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Presenter Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Participants Button */}
              <button
                onClick={() => setShowParticipantsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
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
                  <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-semibold">{participantCount}</span>
                <span>Participants</span>
              </button>

              {/* Feedback Button */}
              {feedbackEnabled && (
                <button
                  onClick={handleOpenFeedback}
                  className="relative flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
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
                    <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>Feedback</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Activity Results */}
        {currentActivity ? (
          <div>{resultsComponent}</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for Activity</h2>
            <p className="text-gray-600">
              Results will appear here when you launch an activity from your presentation.
            </p>
          </div>
        )}

        {/* Feedback Panel Modal */}
        {showFeedbackPanel && code && (
          <FeedbackPanel
            sessionCode={code}
            onClose={() => setShowFeedbackPanel(false)}
          />
        )}

        {/* Participants Modal */}
        {showParticipantsModal && code && (
          <ParticipantsModal
            sessionCode={code}
            onClose={() => setShowParticipantsModal(false)}
          />
        )}
      </div>
    </div>
  );
};

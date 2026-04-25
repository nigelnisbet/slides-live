import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { JoinSession } from './pages/JoinSession';
import { PersonalSessionJoin } from './pages/PersonalSessionJoin';
import { WaitingScreen } from './pages/WaitingScreen';
import { PresenterDashboard } from './pages/PresenterDashboard';
import { ActivityBuilder } from './pages/ActivityBuilder';
import { AdminDashboard } from './pages/AdminDashboard';
import { Poll } from './components/activities/Poll';
import { Quiz } from './components/activities/Quiz';
import { TextResponse } from './components/activities/TextResponse';
import { Announcement } from './components/activities/Announcement';
import { SessionCodeBadge } from './components/SessionCodeBadge';
import { FeedbackModal } from './components/FeedbackModal';
import { FloatingFeedbackButton } from './components/FloatingFeedbackButton';
import { SlidesLiveLogo } from './components/SlidesLiveLogo';
import { SocketProvider, useSocket } from './contexts/FirebaseContext';

const ActivityRouter: React.FC = () => {
  const { sessionEnded, sessionCode } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to join page when session ends or disconnects (for attendee pages only)
  useEffect(() => {
    const isAttendeePage = location.pathname === '/waiting';
    if (isAttendeePage && (sessionEnded || !sessionCode)) {
      console.log('Session ended or disconnected, redirecting to join page');
      navigate('/join', { replace: true });
    }
  }, [sessionEnded, sessionCode, navigate, location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/join" replace />} />
      <Route path="/join" element={<JoinSession />} />
      <Route path="/join/:code" element={<JoinSession />} />
      <Route path="/conv-tool/:name" element={<PersonalSessionJoin />} />
      <Route path="/waiting" element={<WaitingContent />} />
      <Route path="/presenter/:code" element={<PresenterDashboard />} />
      <Route path="/builder" element={<ActivityBuilder />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/join" replace />} />
    </Routes>
  );
};

const WaitingContent: React.FC = () => {
  const { currentActivity, currentResults, sessionCode, participantId, participantName, feedbackEnabled, sessionEnded } = useSocket();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  // Redirect to join if session ended
  useEffect(() => {
    if (sessionEnded) {
      console.log('Session ended in WaitingContent, redirecting to join');
      navigate('/join', { replace: true });
    }
  }, [sessionEnded, navigate]);

  // Brief delay to let Firebase listeners fire and load current activity
  useEffect(() => {
    if (sessionCode) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 300); // Brief 300ms delay
      return () => clearTimeout(timer);
    }
  }, [sessionCode]);

  // Determine if we should show content or waiting screen
  const showActivity = currentActivity !== null;

  // Activity component rendering
  let activityComponent = null;
  if (showActivity) {
    // Use activityId as key to force remounting when switching between activities
    // This ensures component state (like selected answers) is reset between activities
    const activityKey = currentActivity.activityId || `${currentActivity.type}-${Date.now()}`;

    switch (currentActivity.type) {
      case 'poll':
        activityComponent = <Poll key={activityKey} activity={currentActivity as any} results={currentResults as any} />;
        break;
      case 'quiz':
        activityComponent = <Quiz key={activityKey} activity={currentActivity as any} />;
        break;
      case 'text-response':
        activityComponent = <TextResponse key={activityKey} activity={currentActivity as any} />;
        break;
      case 'announcement':
        activityComponent = <Announcement key={activityKey} activity={currentActivity as any} />;
        break;
      default:
        activityComponent = null;
    }
  }

  // Don't render anything during brief initialization to avoid flashing wrong screen
  if (isInitializing) {
    return null;
  }

  return (
    <>
      <SlidesLiveLogo />
      {sessionCode && <SessionCodeBadge code={sessionCode} />}

      {/* Show either activity or waiting screen */}
      {showActivity ? activityComponent : (
        <WaitingScreen onShowFeedbackModal={() => setShowFeedbackModal(true)} />
      )}

      {/* Floating feedback button when activity is showing */}
      {showActivity && feedbackEnabled && sessionCode && participantId && (
        <FloatingFeedbackButton onClick={() => setShowFeedbackModal(true)} />
      )}

      {/* Render feedback modal ONCE at this level - persists across all state changes */}
      {showFeedbackModal && sessionCode && participantId && feedbackEnabled && (
        <FeedbackModal
          sessionCode={sessionCode}
          participantId={participantId}
          participantName={participantName || undefined}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <SocketProvider>
      <BrowserRouter>
        <ActivityRouter />
      </BrowserRouter>
    </SocketProvider>
  );
};

export default App;

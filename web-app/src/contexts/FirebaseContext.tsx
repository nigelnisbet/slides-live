/**
 * FirebaseContext - Replaces SocketContext with Firebase Realtime Database
 *
 * This provides the same interface as the old SocketContext but uses
 * Firebase Realtime Database instead of Socket.IO for real-time sync.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import {
  ref,
  set,
  get,
  update,
  onValue,
  runTransaction,
  onDisconnect,
  Unsubscribe,
} from 'firebase/database';
import {
  ActivityDefinition,
  ActivityResults,
  PollActivity,
  QuizActivity,
} from '../types/activity';
import {
  AttendeeJoinedPayload,
} from '../types/session';
import { database } from '../firebase';

interface FirebaseContextType {
  connected: boolean;
  sessionEnded: boolean;
  sessionCode: string | null;
  joinSession: (sessionCode: string, name?: string) => Promise<AttendeeJoinedPayload>;
  submitResponse: (activityId: string, answer: any) => Promise<void>;
  currentActivity: ActivityDefinition | null;
  currentResults: ActivityResults | null;
  error: string | null;
  participantCount: number;
  feedbackEnabled: boolean;
  requireName: boolean;
  leaveSession: () => void;
  participantId: string | null;
  participantName: string | null;
  // Generic activity update for presenter controls
  updateActivity?: (activityId: string, updates: Partial<ActivityResults>) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(
    sessionStorage.getItem('attendeeName')
  );
  const [currentActivity, setCurrentActivity] = useState<ActivityDefinition | null>(null);
  const [currentResults, setCurrentResults] = useState<ActivityResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [requireName, setRequireName] = useState(false);
  const [unsubscribes, setUnsubscribes] = useState<Unsubscribe[]>([]);
  const settingsLoadedRef = useRef<string | null>(null); // Track which session we've loaded settings for

  // Monitor Firebase connection status
  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const isConnected = snapshot.val() === true;
      console.log('Firebase connection status:', isConnected ? 'connected' : 'disconnected');
      setConnected(isConnected);

      if (isConnected) {
        setError(null);
        // Auto-rejoin session if we were disconnected
        const savedSessionCode = sessionStorage.getItem('currentSessionCode');
        const savedParticipantId = sessionStorage.getItem('participantId');
        const savedName = sessionStorage.getItem('attendeeName');
        if (savedSessionCode && savedParticipantId && !sessionCode) {
          console.log('Auto-rejoining session after reconnect:', savedSessionCode, savedParticipantId);

          // Re-mark as active in Firebase and reset onDisconnect handler (only for non-presenters)
          if (savedName !== 'Presenter') {
            const participantRef = ref(database, `sessions/${savedSessionCode}/participants/${savedParticipantId}`);
            update(participantRef, { isActive: true }).catch(err => {
              console.error('Failed to mark as active during rejoin:', err);
            });

            // Reset onDisconnect handler
            const isActiveRef = ref(database, `sessions/${savedSessionCode}/participants/${savedParticipantId}/isActive`);
            onDisconnect(isActiveRef).set(false);
          }

          // Restore local state
          setSessionCode(savedSessionCode);
          setParticipantId(savedParticipantId);
          setParticipantName(savedName);
        }
      } else if (sessionCode) {
        setError('Connection lost. Reconnecting...');
      }
    });

    return () => unsubscribe();
  }, [sessionCode]);

  // Setup listeners when session is joined
  useEffect(() => {
    if (!sessionCode || !participantId) return;

    const listeners: Unsubscribe[] = [];

    // Keep-alive: Periodically update isActive to prevent stale disconnects
    // This ensures that even if onDisconnect fires incorrectly, we recover quickly
    const keepAliveInterval = setInterval(() => {
      if (connected && sessionCode && participantId && participantName !== 'Presenter') {
        const participantRef = ref(database, `sessions/${sessionCode}/participants/${participantId}`);
        update(participantRef, {
          isActive: true,
          lastSeen: Date.now()
        }).catch(err => {
          console.warn('Keep-alive update failed:', err);
        });
      }
    }, 5000); // Update every 5 seconds

    // Listen to session status
    const sessionStatusRef = ref(database, `sessions/${sessionCode}/status`);
    const statusUnsub = onValue(sessionStatusRef, (snapshot) => {
      const status = snapshot.val();
      console.log('Session status:', status);
      // Only treat as ended if explicitly set to 'ended', not if temporarily null
      // (null can happen during Firebase sync issues, but session may still be active)
      if (status === 'ended') {
        setError('Session has ended');
        setSessionEnded(true);
        setConnected(false);
        setCurrentActivity(null);
        setCurrentResults(null);
        setParticipantCount(0);
        setSessionCode(null);
        setParticipantId(null);
        sessionStorage.removeItem('currentSessionCode');
        sessionStorage.removeItem('attendeeName');
        sessionStorage.removeItem('participantId');
      }
    });
    listeners.push(statusUnsub);

    // Listen to current activity
    const activityRef = ref(database, `sessions/${sessionCode}/currentActivity`);
    const activityUnsub = onValue(activityRef, (snapshot) => {
      const activity = snapshot.val();
      console.log('Current activity:', activity);
      setCurrentActivity(activity);
      // Reset results when activity changes
      if (activity) {
        setCurrentResults(null);
      }
    });
    listeners.push(activityUnsub);

    // Listen to participant count
    const participantsRef = ref(database, `sessions/${sessionCode}/participants`);
    const participantsUnsub = onValue(participantsRef, (snapshot) => {
      const participants = snapshot.val();
      const count = participants ? Object.keys(participants).filter(
        id => participants[id]?.isActive
      ).length : 0;
      console.log('Participant count:', count);
      setParticipantCount(count);
    });
    listeners.push(participantsUnsub);

    // Listen to feedback enabled setting from presentation config (once per session)
    const loadFeedbackSetting = async () => {
      // Only load once per session code
      if (settingsLoadedRef.current === sessionCode) return;

      try {
        const sessionSnapshot = await get(ref(database, `sessions/${sessionCode}`));
        if (sessionSnapshot.exists()) {
          const session = sessionSnapshot.val();
          const presentationId = session.presentationId;
          if (presentationId) {
            const configSnapshot = await get(ref(database, `presentations/${presentationId}/config`));
            if (configSnapshot.exists()) {
              const config = configSnapshot.val();
              setFeedbackEnabled(config.feedbackEnabled || false);
              setRequireName(config.requireName || false);
              settingsLoadedRef.current = sessionCode; // Mark as loaded for this session
            }
          }
        }
      } catch (error) {
        console.error('Error loading feedback setting:', error);
      }
    };
    loadFeedbackSetting();

    setUnsubscribes(listeners);

    return () => {
      clearInterval(keepAliveInterval);
      listeners.forEach(unsub => unsub());
    };
  }, [sessionCode, participantId, connected]);

  // Listen to aggregated results for current activity (debounced for large sessions)
  const pendingResultsRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 500; // Update UI at most every 500ms during high-traffic periods

  useEffect(() => {
    if (!sessionCode || !currentActivity?.activityId) return;

    const resultsRef = ref(database, `sessions/${sessionCode}/aggregatedResults/${currentActivity.activityId}`);
    const unsubscribe = onValue(resultsRef, (snapshot) => {
      const results = snapshot.val();
      if (results) {
        // Store the latest results
        pendingResultsRef.current = results;

        // If no timer is running, update immediately and start debounce
        if (!debounceTimerRef.current) {
          const enrichedResults = {
            ...results,
            activityId: currentActivity.activityId,
            question: (currentActivity as PollActivity | QuizActivity).question,
            options: (currentActivity as PollActivity | QuizActivity).options,
          };
          setCurrentResults(enrichedResults);

          // Start debounce timer for subsequent rapid updates
          debounceTimerRef.current = setTimeout(() => {
            // Apply any pending results that came in during debounce period
            if (pendingResultsRef.current) {
              const latestResults = {
                ...pendingResultsRef.current,
                activityId: currentActivity.activityId,
                question: (currentActivity as PollActivity | QuizActivity).question,
                options: (currentActivity as PollActivity | QuizActivity).options,
              };
              setCurrentResults(latestResults);
            }
            debounceTimerRef.current = null;
          }, DEBOUNCE_MS);
        }
        // If timer is running, pendingResultsRef will be processed when it fires
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [sessionCode, currentActivity?.activityId]);

  const joinSession = useCallback(async (
    code: string,
    name?: string
  ): Promise<AttendeeJoinedPayload> => {
    try {
      console.log('Attempting to join session:', code);

      // Verify session exists
      const sessionRef = ref(database, `sessions/${code}`);
      const sessionSnapshot = await get(sessionRef);

      if (!sessionSnapshot.exists()) {
        throw new Error('Invalid session code');
      }

      const session = sessionSnapshot.val();
      console.log('Session found:', session);

      if (session.status === 'ended') {
        throw new Error('Session has ended');
      }

      // Generate participant ID
      const newParticipantId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Only register as participant if not a presenter
      const isPresenter = name === 'Presenter';
      if (!isPresenter) {
        // Register as participant
        const participantRef = ref(database, `sessions/${code}/participants/${newParticipantId}`);
        await set(participantRef, {
          name: name || null,
          joinedAt: Date.now(),
          isActive: true
        });

        // Setup onDisconnect to mark as inactive
        const isActiveRef = ref(database, `sessions/${code}/participants/${newParticipantId}/isActive`);
        onDisconnect(isActiveRef).set(false);
      }

      // Save session info for auto-reconnection
      setSessionCode(code);
      setParticipantId(newParticipantId);
      setParticipantName(name || null);
      sessionStorage.setItem('currentSessionCode', code);
      sessionStorage.setItem('participantId', newParticipantId);
      if (name) {
        sessionStorage.setItem('attendeeName', name);
      } else {
        sessionStorage.removeItem('attendeeName');
      }

      // Set current activity if there is one
      if (session.currentActivity) {
        setCurrentActivity(session.currentActivity);
      }

      setError(null);
      setSessionEnded(false);

      // Handle missing or invalid createdAt timestamp
      let createdAtISO: string;
      try {
        createdAtISO = session.createdAt ? new Date(session.createdAt).toISOString() : new Date().toISOString();
      } catch {
        createdAtISO = new Date().toISOString();
      }

      // Return payload matching old Socket interface
      const response: AttendeeJoinedPayload = {
        sessionId: session.id,
        currentState: {
          session: {
            id: session.id,
            code: code,
            presentationId: session.presentationId,
            currentSlide: session.currentSlide || { indexh: 0, indexv: 0, timestamp: Date.now() },
            status: session.status,
            participantCount: session.participants ? Object.keys(session.participants).length : 0,
            createdAt: createdAtISO,
            currentActivity: session.currentActivity || undefined,
          },
          currentSlide: session.currentSlide || { indexh: 0, indexv: 0, timestamp: Date.now() },
          activeActivity: session.currentActivity || undefined,
        },
      };

      console.log('Successfully joined session:', response);
      return response;

    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Error joining session:', errorMessage);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const submitResponse = useCallback(async (activityId: string, answer: any): Promise<void> => {
    if (!sessionCode || !participantId) {
      throw new Error('Not in a session');
    }

    console.log('Submitting response:', { activityId, answer });

    const responseRef = ref(database, `sessions/${sessionCode}/responses/${activityId}/${participantId}`);

    // Check if this is a submit-sample activity (allows multiple submissions)
    const isSubmitSample = answer && typeof answer === 'object' && 'imageUrl' in answer && 'version' in answer;

    // Check if this is a collaborative-tap-game tap (allows multiple taps)
    const isTapGame = answer && typeof answer === 'object' && 'action' in answer && answer.action === 'tap';

    // Check for duplicate response (but allow submit-sample and tap-game to submit multiple times)
    if (!isSubmitSample && !isTapGame) {
      const existingResponse = await get(responseRef);
      if (existingResponse.exists()) {
        throw new Error('Already responded to this activity');
      }
    }

    // Submit response
    await set(responseRef, {
      answer,
      submittedAt: Date.now()
    });

    // Update aggregated results using transaction
    await updateAggregatedResults(sessionCode, activityId, answer);

    console.log('Response submitted successfully');
  }, [sessionCode, participantId]);

  const updateAggregatedResults = async (code: string, activityId: string, answer: any) => {
    const aggregatedRef = ref(database, `sessions/${code}/aggregatedResults/${activityId}`);

    // Get current activity to check its configuration
    const activityRef = ref(database, `sessions/${code}/currentActivity`);
    const activitySnapshot = await get(activityRef);
    const activity = activitySnapshot.val();

    await runTransaction(aggregatedRef, (current) => {
      // Check if this is a collaborative-tap-game activity
      if (answer && typeof answer === 'object' && 'action' in answer && answer.action === 'tap') {
        // Initialize if first tap
        if (!current) {
          return {
            activityId,
            title: activity?.title || 'Collaborative Tap Game',
            currentMode: 'linear',
            currentTotal: 0,
            isActive: false,
            isWinner: false,
            tapCount: 0,
          };
        }

        // Only process taps if game is active
        if (!current.isActive) {
          return current; // No change if game not active
        }

        // Update tap game state
        const currentMode = current.currentMode || 'linear';
        const linearIncrement = activity?.linearIncrement || 1000000;
        const winCondition = activity?.winCondition || 1000000000000;

        let newTotal = current.currentTotal || 0;

        // Calculate new total based on mode
        if (currentMode === 'linear') {
          newTotal += linearIncrement;
        } else if (currentMode === 'exponential') {
          newTotal = newTotal === 0 ? 1 : newTotal * 2;
        }

        // Check win condition
        const isWinner = newTotal >= winCondition;

        return {
          ...current,
          currentTotal: newTotal,
          isWinner: isWinner || current.isWinner, // Once won, stay won
          isActive: isWinner ? false : current.isActive, // Stop if won
          tapCount: (current.tapCount || 0) + 1,
        };
      }

      // Check if this is a submit-sample activity (answer has imageUrl property)
      if (answer && typeof answer === 'object' && 'imageUrl' in answer) {
        // For submit-sample activities, store submissions as an array
        const submissions = current?.submissions || [];
        const newSubmission: any = {
          participantId: participantId || 'unknown',
          imageUrl: answer.imageUrl,
          timestamp: answer.timestamp || new Date().toISOString(),
          version: answer.version || 1,
        };

        // Only include participantName if it exists (Firebase doesn't allow undefined)
        if (participantName) {
          newSubmission.participantName = participantName;
        }

        // Check if this participant already has a submission
        const existingIndex = submissions.findIndex((s: any) => s.participantId === participantId);
        let updatedSubmissions;
        let isNewSubmission;

        if (existingIndex >= 0) {
          // Update existing submission
          updatedSubmissions = [...submissions];
          updatedSubmissions[existingIndex] = newSubmission;
          isNewSubmission = false;
        } else {
          // Add new submission
          updatedSubmissions = [...submissions, newSubmission];
          isNewSubmission = true;
        }

        return {
          submissions: updatedSubmissions,
          totalSubmissions: isNewSubmission ? (current?.totalSubmissions || 0) + 1 : (current?.totalSubmissions || 0),
          lastUpdated: Date.now()
        };
      }

      // For poll/quiz activities, use the original logic
      if (!current) {
        // Initialize with the answer
        return {
          responses: incrementResponseArray([], answer),
          totalResponses: 1,
          lastUpdated: Date.now()
        };
      }

      return {
        ...current,
        responses: incrementResponseArray(current.responses || [], answer),
        totalResponses: (current.totalResponses || 0) + 1,
        lastUpdated: Date.now()
      };
    });
  };

  const incrementResponseArray = (responses: number[], answer: any): number[] => {
    const result = [...responses];
    if (Array.isArray(answer)) {
      // Multiple selection
      answer.forEach((idx: number) => {
        while (result.length <= idx) result.push(0);
        result[idx]++;
      });
    } else if (typeof answer === 'number') {
      // Single selection
      while (result.length <= answer) result.push(0);
      result[answer]++;
    }
    return result;
  };

  const updateActivity = useCallback(async (activityId: string, updates: Partial<ActivityResults>): Promise<void> => {
    if (!sessionCode) {
      throw new Error('Not in a session');
    }

    const aggregatedRef = ref(database, `sessions/${sessionCode}/aggregatedResults/${activityId}`);
    await update(aggregatedRef, updates);
  }, [sessionCode]);

  const leaveSession = useCallback(() => {
    if (sessionCode && participantId && participantName !== 'Presenter') {
      // Mark as inactive (only for non-presenters)
      const participantRef = ref(database, `sessions/${sessionCode}/participants/${participantId}`);
      update(participantRef, { isActive: false });
    }

    // Cleanup listeners
    unsubscribes.forEach(unsub => unsub());
    setUnsubscribes([]);

    setSessionCode(null);
    setParticipantId(null);
    setCurrentActivity(null);
    setCurrentResults(null);
    setSessionEnded(false);
    setError(null);
    sessionStorage.removeItem('currentSessionCode');
    sessionStorage.removeItem('attendeeName');
    sessionStorage.removeItem('participantId');
  }, [sessionCode, participantId, participantName, unsubscribes]);

  return (
    <FirebaseContext.Provider
      value={{
        connected,
        sessionEnded,
        sessionCode,
        joinSession,
        submitResponse,
        currentActivity,
        currentResults,
        error,
        participantCount,
        feedbackEnabled,
        requireName,
        leaveSession,
        participantId,
        participantName,
        updateActivity,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextType => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

// Backward compatibility - export useSocket as alias to useFirebase
export const useSocket = useFirebase;

// Also export the Provider with backward compatible name
export const SocketProvider = FirebaseProvider;

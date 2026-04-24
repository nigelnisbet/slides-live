/**
 * Service Worker for Google Slides Extension
 *
 * Handles session management, Firebase communication, and
 * bridges between the content script and the attendee app.
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, remove, onValue, Unsubscribe } from 'firebase/database';
import { FIREBASE_CONFIG } from '../firebase-config';

console.log('[SlidesLive Extension] Background service worker started');

// Firebase configuration
const firebaseConfig = FIREBASE_CONFIG;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Session state (in-memory, restored from storage on wake)
let currentSessionCode: string | null = null;
let currentSessionId: string | null = null;
let currentQRCode: string | null = null;
let currentPresentationId: string | null = null;
let activities: any[] = [];
let participantCount = 0;
let unsubscribeParticipants: Unsubscribe | null = null;

// Restore session state from storage on service worker start
async function restoreSessionState() {
  try {
    const stored = await chrome.storage.local.get(['googleSlidesSessionState']);
    if (stored.googleSlidesSessionState) {
      const state = stored.googleSlidesSessionState;
      currentSessionCode = state.sessionCode;
      currentSessionId = state.sessionId;
      currentQRCode = state.qrCode;
      currentPresentationId = state.presentationId;
      activities = state.activities || [];
      participantCount = state.participantCount || 0;

      console.log('[SlidesLive] Session state restored:', currentSessionCode);

      // Re-setup participant listener if we have an active session
      if (currentSessionCode) {
        setupParticipantListener(currentSessionCode);
        startKeepAlive();
      }
    }
  } catch (error) {
    console.error('[SlidesLive] Error restoring session state:', error);
  }
}

// Save session state to storage
async function saveSessionState() {
  try {
    await chrome.storage.local.set({
      googleSlidesSessionState: {
        sessionCode: currentSessionCode,
        sessionId: currentSessionId,
        qrCode: currentQRCode,
        presentationId: currentPresentationId,
        activities,
        participantCount,
      }
    });
    console.log('[SlidesLive] Session state saved');
  } catch (error) {
    console.error('[SlidesLive] Error saving session state:', error);
  }
}

// Clear session state from storage
async function clearSessionState() {
  try {
    await chrome.storage.local.remove(['googleSlidesSessionState']);
    console.log('[SlidesLive] Session state cleared');
  } catch (error) {
    console.error('[SlidesLive] Error clearing session state:', error);
  }
}

// Restore state immediately on load
restoreSessionState();

// Keep-alive alarm to prevent service worker from sleeping during active sessions
const KEEP_ALIVE_ALARM = 'google-slides-keep-alive';

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === KEEP_ALIVE_ALARM) {
    console.log('[SlidesLive] Keep-alive ping');
    chrome.storage.local.get(['googleSlidesSessionState']).then((result) => {
      if (result.googleSlidesSessionState?.sessionCode) {
        console.log('[SlidesLive] Session still active:', result.googleSlidesSessionState.sessionCode);
      } else {
        chrome.alarms.clear(KEEP_ALIVE_ALARM);
        console.log('[SlidesLive] No active session, stopping keep-alive');
      }
    });
  }
});

// Start keep-alive alarm when session is active
function startKeepAlive() {
  chrome.alarms.create(KEEP_ALIVE_ALARM, {
    periodInMinutes: 0.4 // Every 24 seconds
  });
  console.log('[SlidesLive] Keep-alive alarm started');
}

// Stop keep-alive alarm
function stopKeepAlive() {
  chrome.alarms.clear(KEEP_ALIVE_ALARM);
  console.log('[SlidesLive] Keep-alive alarm stopped');
}

// Generate 6-character session code (avoiding confusing characters)
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Setup participant count listener
function setupParticipantListener(sessionCode: string) {
  if (unsubscribeParticipants) {
    unsubscribeParticipants();
  }

  const participantsRef = ref(database, `sessions/${sessionCode}/participants`);
  unsubscribeParticipants = onValue(participantsRef, (snapshot) => {
    const participants = snapshot.val();
    participantCount = participants
      ? Object.keys(participants).filter(id => participants[id]?.isActive).length
      : 0;

    console.log('[SlidesLive] Participant count updated:', participantCount);
    saveSessionState();

    chrome.runtime.sendMessage({
      type: 'SESSION_STATS_UPDATE',
      data: { participantCount },
    }).catch(() => {
      // Popup might not be open
    });
  });
}

// Create a new session
async function createSession(presentationId: string) {
  try {
    console.log('[SlidesLive] Creating session for:', presentationId);

    // Generate unique session code
    let code = generateSessionCode();
    let attempts = 0;

    // Make sure code is unique
    while (attempts < 10) {
      const existingSession = await get(ref(database, `sessions/${code}`));
      if (!existingSession.exists()) break;
      code = generateSessionCode();
      attempts++;
    }

    if (attempts >= 10) {
      return { success: false, error: 'Failed to generate unique session code' };
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const extensionId = chrome.runtime.id;

    // Load activities for this presentation from Firebase
    // Activities are stored at presentations/{id}/config/activities
    const configSnapshot = await get(ref(database, `presentations/${presentationId}/config`));
    if (configSnapshot.exists()) {
      const config = configSnapshot.val();
      activities = config.activities || [];
      console.log('[SlidesLive] Loaded activities from config:', activities.length);
    } else {
      // Fallback: try direct activities path
      const activitiesSnapshot = await get(ref(database, `presentations/${presentationId}/activities`));
      activities = activitiesSnapshot.exists() ? activitiesSnapshot.val() : [];
      console.log('[SlidesLive] Loaded activities from direct path:', activities.length);
    }

    console.log('[SlidesLive] Loaded activities:', activities.length);

    // Create session in Firebase (same structure as slides.com extension)
    await set(ref(database, `sessions/${code}`), {
      id: sessionId,
      presentationId,
      presenterId: extensionId,
      platform: 'google-slides',
      status: 'active',
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      currentSlide: { indexh: 0, indexv: 0, timestamp: Date.now() },
      currentActivity: null,
      activities: activities
    });

    currentSessionCode = code;
    currentSessionId = sessionId;
    currentPresentationId = presentationId;

    // Generate QR code URL (using public QR code API - works in service workers)
    const attendeeAppUrl = process.env.NODE_ENV === 'production'
      ? 'https://slides-live.com'
      : 'http://localhost:5173';
    const joinUrl = `${attendeeAppUrl}/join/${code}`;
    currentQRCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;

    // Setup participant count listener
    setupParticipantListener(code);

    // Save session state to storage for persistence
    await saveSessionState();

    // Start keep-alive to maintain connection
    startKeepAlive();

    console.log('[SlidesLive] Session created:', { code, sessionId });

    return {
      success: true,
      sessionId,
      sessionCode: code,
      qrCode: currentQRCode,
    };

  } catch (error) {
    console.error('[SlidesLive] Error creating session:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle slide change from content script
async function handleSlideChange(slideData: { indexh: number; indexv: number }) {
  if (!currentSessionCode) {
    await restoreSessionState();
  }

  if (!currentSessionCode) {
    console.log('[SlidesLive] No active session, ignoring slide change');
    return;
  }

  console.log('[SlidesLive] Handling slide change:', slideData);

  try {
    // Update current slide in Firebase
    await update(ref(database, `sessions/${currentSessionCode}`), {
      currentSlide: { ...slideData, timestamp: Date.now() }
    });

    // Find activity at this slide position (Google Slides only has horizontal slides)
    const activity = activities.find((a: any) =>
      a.slidePosition.indexh === slideData.indexh &&
      a.slidePosition.indexv === (slideData.indexv || 0)
    );

    if (activity) {
      console.log('[SlidesLive] Activity found at slide:', activity);
      await set(ref(database, `sessions/${currentSessionCode}/currentActivity`), {
        ...activity.config,
        activityId: activity.activityId
      });
    } else {
      console.log('[SlidesLive] No activity at this slide');
      await set(ref(database, `sessions/${currentSessionCode}/currentActivity`), null);
    }

  } catch (error) {
    console.error('[SlidesLive] Error handling slide change:', error);
  }
}

// End the current session
async function endSession() {
  console.log('[SlidesLive] Ending session');

  if (currentSessionCode) {
    try {
      // First, set status to 'ended' so clients can disconnect gracefully
      console.log('[SlidesLive] Setting session status to ended:', currentSessionCode);
      await update(ref(database, `sessions/${currentSessionCode}`), {
        status: 'ended',
        endedAt: Date.now()
      });
      console.log('[SlidesLive] Session status updated to ended');

      // Wait a moment for clients to receive the status change
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then delete the entire session from Firebase to clean up all data
      // This removes participants, responses, review game data, everything
      console.log('[SlidesLive] Deleting session data from Firebase:', currentSessionCode);
      await remove(ref(database, `sessions/${currentSessionCode}`));
      console.log('[SlidesLive] Session data deleted successfully');
    } catch (error) {
      console.error('[SlidesLive] Error ending/deleting session:', error);
    }
  }

  if (unsubscribeParticipants) {
    unsubscribeParticipants();
    unsubscribeParticipants = null;
  }

  currentSessionCode = null;
  currentSessionId = null;
  currentQRCode = null;
  currentPresentationId = null;
  activities = [];
  participantCount = 0;

  await clearSessionState();
  stopKeepAlive();
}

// Get current session info
function getSessionInfo() {
  return {
    sessionId: currentSessionId,
    sessionCode: currentSessionCode,
    qrCode: currentQRCode,
    participantCount,
    connected: currentSessionCode !== null,
  };
}

// Message handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[SlidesLive] Message received:', message.type);

  switch (message.type) {
    case 'CREATE_SESSION':
      createSession(message.presentationId).then(sendResponse);
      return true; // Async response

    case 'END_SESSION':
      endSession().then(() => sendResponse({ success: true }));
      return true;

    case 'GET_SESSION_INFO':
      restoreSessionState().then(() => {
        sendResponse(getSessionInfo());
      });
      return true; // Async response

    case 'SLIDE_CHANGED':
      if (message.data) {
        handleSlideChange({
          indexh: message.data.indexh || message.data.slideIndex || 0,
          indexv: 0 // Google Slides doesn't have vertical slides
        }).then(() => {
          sendResponse({ status: 'ok' });
        });
        return true; // Async response
      }
      sendResponse({ status: 'ok' });
      return false;

    case 'PAGE_LOADED':
      console.log('[SlidesLive] Page loaded:', message.data);
      sendResponse({ status: 'ok' });
      return false;

    default:
      return false;
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && currentSessionCode) {
    if (!changeInfo.url.includes('docs.google.com/presentation')) {
      console.log('[SlidesLive] Left Google Slides page');
    }
  }
});

export {};

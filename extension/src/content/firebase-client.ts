/**
 * Firebase connection for the content script.
 *
 * Separate from the service worker's connection - the content script needs
 * direct, real-time reads (thumbnail badges, PiP live stats) and writes
 * (on-slide activity authoring) from inside the Slides page itself, rather
 * than relaying everything through chrome.runtime messaging.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { FIREBASE_CONFIG } from '../firebase-config';

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
export const database = getDatabase(app);
export const auth = getAuth(app);

// Writes to presentations/{id}/config require auth != null (see
// database.rules.json). Anonymous auth satisfies that with zero UI/friction -
// no sign-in flow needed for the Phase 0 "share with friends" build.
let anonAuthPromise: Promise<void> | null = null;
export function ensureAnonymousAuth(): Promise<void> {
  if (!anonAuthPromise) {
    anonAuthPromise = signInAnonymously(auth)
      .then(() => {})
      .catch((err) => {
        console.warn('[SlidesLive] Anonymous auth failed:', err.message);
        anonAuthPromise = null; // allow retry on next call
        throw err;
      });
  }
  return anonAuthPromise;
}

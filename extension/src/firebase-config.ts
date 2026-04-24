// Firebase configuration for Chrome Extension
// This file is safe to commit (Firebase keys are not secret for client apps)

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDUaDp9BLbBEkOJSngCVvmwoLFGm4xCS7E",
  authDomain: "slideslive-prod.firebaseapp.com",
  databaseURL: "https://slideslive-prod-default-rtdb.firebaseio.com",
  projectId: "slideslive-prod",
  storageBucket: "slideslive-prod.firebasestorage.app",
  messagingSenderId: "1093603701254",
  appId: "1:1093603701254:web:520f9a75d0640960268987"
};

// Attendee app URLs
export const ATTENDEE_APP_URL =
  process.env.NODE_ENV === 'production'
    ? "https://slides-live.com"
    : "http://localhost:5173";

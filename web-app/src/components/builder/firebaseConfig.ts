import { getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Use the existing Firebase app from firebase.ts (slideslive-prod)
const app = getApp();
export const database = getDatabase(app);

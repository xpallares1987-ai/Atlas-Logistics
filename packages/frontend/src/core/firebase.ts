import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './config.js';

if (getApps().length === 0 && env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  initializeApp({
    credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY)),
  });
}

export const firestoreDb = getFirestore();
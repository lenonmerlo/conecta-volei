import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getMessaging,
  isSupported as isMessagingSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(Boolean);
}

export async function getFirebaseMessaging() {
  if (
    typeof window === "undefined" ||
    !hasFirebaseConfig() ||
    !(await isMessagingSupported())
  ) {
    return null;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getMessaging(app);
}
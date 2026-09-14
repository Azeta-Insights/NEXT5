import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB16Ic_RNzb8e5kyxQr2a6BWpeiFaSyIig',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'buoyant-aggregator-kgmzr.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'buoyant-aggregator-kgmzr',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'buoyant-aggregator-kgmzr.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '931790837413',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:931790837413:web:9a8bc68658ca2e8da09f4c',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase initialization note (running in offline/resilient mode):', error);
  try {
    // If provided config failed, safely initialize a placeholder app that prevents uncaught crash
    app = getApps().length === 0 
      ? initializeApp({ apiKey: 'AIzaSyB16Ic_RNzb8e5kyxQr2a6BWpeiFaSyIig', projectId: 'next5-app' }) 
      : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (fallbackError) {
    console.warn('Firebase fallback initialization note:', fallbackError);
    auth = {} as Auth;
    db = {} as Firestore;
  }
}

const googleProvider = new GoogleAuthProvider();

export { 
  app, 
  auth, 
  db, 
  signInAnonymously, 
  signInWithPopup, 
  googleProvider, 
  fbSignOut, 
  onAuthStateChanged 
};
export type { FirebaseUser };
export default app;

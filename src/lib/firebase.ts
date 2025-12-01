import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDQER8z-7T2h0q4_-WJQtrZn-BapWj3l7s",
  authDomain: "the-advance-expense-note.firebaseapp.com",
  projectId: "the-advance-expense-note",
  storageBucket: "the-advance-expense-note.firebasestorage.app",
  messagingSenderId: "1054085009990",
  appId: "1:1054085009990:web:8e6cf51b8ea6b1d9c13047",
  measurementId: "G-92GSQQ52DR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support offline persistence.');
  }
});

export default app;

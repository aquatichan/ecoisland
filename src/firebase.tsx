// @ts-nocheck
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyChlIARReYcMBQnKi1wasuHxKqaxGsjj68",
  authDomain: "ecoisland-b9e34.firebaseapp.com",
  projectId: "ecoisland-b9e34",
  storageBucket: "ecoisland-b9e34.appspot.com",
  messagingSenderId: "418757158753",
  appId: "1:418757158753:web:b98fd5f79542129d38c720",
  measurementId: "G-RZQ9N4DDV7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
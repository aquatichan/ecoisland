// Firebase client setup. In local development with VITE_USE_EMULATORS=true
// the app talks to the Firebase emulators under a demo project, so tests and
// screenshots never touch real student data.
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

export const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === "true";

const config = {
  apiKey: "AIzaSyChlIARReYcMBQnKi1wasuHxKqaxGsjj68",
  authDomain: "ecoisland-b9e34.firebaseapp.com",
  projectId: USE_EMULATORS ? "demo-ecoisland" : "ecoisland-b9e34",
  storageBucket: USE_EMULATORS ? "demo-ecoisland.appspot.com" : "ecoisland-b9e34.appspot.com",
  messagingSenderId: "418757158753",
  appId: "1:418757158753:web:b98fd5f79542129d38c720",
  measurementId: "G-RZQ9N4DDV7",
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

if (USE_EMULATORS) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

/** Firebase Storage is only needed for profile pictures, so it loads on demand. */
export async function getStorageLazy() {
  const mod = await import("firebase/storage");
  const storage = mod.getStorage(app);
  if (USE_EMULATORS && !(storage as unknown as { _ecoEmu?: boolean })._ecoEmu) {
    mod.connectStorageEmulator(storage, "127.0.0.1", 9199);
    (storage as unknown as { _ecoEmu?: boolean })._ecoEmu = true;
  }
  return { storage, mod };
}

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyACAp-gYI8FF6HiklK2x18kmh6itBoJoaY",
  authDomain: "pvcasa-3d536.firebaseapp.com",
  projectId: "pvcasa-3d536",
  storageBucket: "pvcasa-3d536.firebasestorage.app",
  messagingSenderId: "460891501407",
  appId: "1:460891501407:web:1d2b5a3ee8feba8db1bcea",
  measurementId: "G-LE1RWD88V4",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

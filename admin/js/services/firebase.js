// Import necessary Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
apiKey: "AIzaSyACAp-gYI8FF6HiklK2x18kmh6itBoJoaY",
authDomain: "pvcasa-3d536.firebaseapp.com",
projectId: "pvcasa-3d536",
storageBucket: "pvcasa-3d536.firebasestorage.app",
messagingSenderId: "460891501407",
appId: "1:460891501407:web:1d2b5a3ee8feba8db1bcea",
measurementId: "G-LE1RWD88V4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
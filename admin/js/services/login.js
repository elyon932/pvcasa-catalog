// Import necessary Firebase Authentication functions
import {
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { auth } from "/admin/js/services/firebase.js";

// Login with email and password
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}


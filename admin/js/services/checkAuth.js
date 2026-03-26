// Import necessary Firebase Authentication functions
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth } from "/admin/js/services/firebase.js";

// Check authentication state
export function checkAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
// Import necessary Firebase Authentication functions
import {
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { auth } from "/admin/js/services/firebase.js";

// Logout current user
export function logout() {
  return signOut(auth);
}

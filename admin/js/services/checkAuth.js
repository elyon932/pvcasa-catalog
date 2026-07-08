import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth } from "/shared/firebase.js";

export function checkAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

import { signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth } from "/shared/firebase.js";

export function logout() {
  return signOut(auth);
}

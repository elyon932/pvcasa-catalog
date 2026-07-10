import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { auth } from "../../../shared/firebase.js";

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

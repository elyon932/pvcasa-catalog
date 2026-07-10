import { login } from "./services/login.js";
import { checkAuth } from "./services/checkAuth.js";

const DASHBOARD_URL = "../dashboard/";

const ERROR_MESSAGES = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-disabled": "Este usuário está desativado.",
  "auth/user-not-found": "Nenhum usuário encontrado com este e-mail.",
  "auth/wrong-password": "Senha incorreta. Tente novamente.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos.",
  "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
};

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("login-btn");
const messageBox = document.getElementById("login-error");

checkAuth((user) => {
  if (user) window.location.replace(DASHBOARD_URL);
});

function showMessage(message, isError = true) {
  messageBox.textContent = message;
  messageBox.classList.toggle("is-error", isError);
  messageBox.classList.toggle("is-success", !isError);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Informe e-mail e senha.");
    return;
  }

  loginButton.disabled = true;
  const originalLabel = loginButton.textContent;
  loginButton.textContent = "Entrando...";

  try {
    await login(email, password);
    showMessage("Login efetuado. Redirecionando...", false);
    window.location.replace(DASHBOARD_URL);
  } catch (error) {
    passwordInput.value = "";
    showMessage(ERROR_MESSAGES[error.code] ?? "Não foi possível entrar. Tente novamente.");
    loginButton.disabled = false;
    loginButton.textContent = originalLabel;
  }
});

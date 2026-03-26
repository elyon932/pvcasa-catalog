// Import the modules
import { login } from "/admin/js/services/login.js";
import { checkAuth } from "/admin/js/services/checkAuth.js";

/* =========================================
   1. CheckAuth Script
   ========================================= */

// Check auth state on page Admin load
checkAuth((user) => {
  if (user) {
    window.location.replace("/admin/dashboard/");
  }
});

/* =========================================
   2. Authentication Script
   ========================================= */

// DOM elements
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
let errorDiv = document.getElementById("login-error");

// Create errorDiv if it doesn't exist
if (!errorDiv) {
	errorDiv = document.createElement("div");
	errorDiv.id = "login-error";
	errorDiv.style.color = "#d33";
	errorDiv.style.marginTop = "10px";
	errorDiv.style.fontSize = "0.95rem";

	// Try to append after the button
	if (loginBtn && loginBtn.parentNode) {
	loginBtn.parentNode.appendChild(errorDiv);
	} else if (form) {
	form.appendChild(errorDiv);
	}
}

// Helper: show error or success message
function showMessage(message, isError = true) {
	errorDiv.textContent = message;
	errorDiv.style.color = isError ? "#d33" : "#0a0";
}

// Form submit handler: sign in with email & password
if (form) {
	form.addEventListener("submit", async (e) => {
    	e.preventDefault();

		// Get input values
		const email = emailInput.value.trim();
		const password = passwordInput.value;

		// Basic client-side validation
		if (!email || !password) {
			showMessage("Please provide both email and password.");
			return;
		}

		// Disable the button while processing
		loginBtn.disabled = true;
		const originalBtnText = loginBtn.textContent;
		loginBtn.textContent = "Logging in...";

		// Attempt sign-in
		try {
			await login(email, password);
		
		// Clear inputs and show success message
		emailInput.value = "";
		passwordInput.value = "";
		showMessage("Login successful — redirecting...", false);
		
		// Redirect to dashboard after a short delay	
		setTimeout(() => {
        	window.location.href = "/admin/dashboard/";
      	}, 700);

		// Handle errors
		} catch (err) {
			// Clear inputs
			emailInput.value = "";
			passwordInput.value = "";

		// Handle common errors
		switch (err.code) {
			case "auth/invalid-email":
				showMessage("Invalid email address.");
				break;
			case "auth/user-disabled":
				showMessage("This user has been disabled.");
				break;
			case "auth/user-not-found":
				showMessage("No user found with this email.");
				break;
			case "auth/wrong-password":
				showMessage("Wrong password. Try again or reset password.");
				break;
			default:
				showMessage("Login failed. Please try again.");
		}

		// Re-enable button and restore text
		} finally {
			loginBtn.disabled = false;
			loginBtn.textContent = originalBtnText;
		}
	});
} else {
	console.warn("Login form not found: #login-form");
}

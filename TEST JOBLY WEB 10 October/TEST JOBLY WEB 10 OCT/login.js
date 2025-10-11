import { auth, signIn, signOutUser } from '../firebase-config.js';

const loginForm = document.getElementById('loginForm');
const signOutButton = document.getElementById('signOut');
const messageElement = document.getElementById('message');

// Debug: Verify DOM elements
if (!loginForm) console.error('Login form not found');
if (!signOutButton) console.error('Sign-out button not found');
if (!messageElement) console.error('Message element not found');

// Monitor authentication state and handle redirect
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User signed in:', user.email); // Debug
        messageElement.textContent = `Login successful! Welcome back, ${user.email}!`;
        messageElement.classList.remove('error');
        messageElement.classList.add('success');
        signOutButton.style.display = 'block';
        setTimeout(() => {
            console.log('Redirecting to landingpage2.html'); // Debug
            window.location.href = 'landingpage2.html';
        }, 2000); // Redirect after 2 seconds
    } else {
        console.log('No user signed in'); // Debug
        messageElement.textContent = 'Please sign in to continue.';
        messageElement.classList.remove('success');
        messageElement.classList.add('error');
        signOutButton.style.display = 'none';
    }
});

// Handle form submission
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (!emailInput || !passwordInput) {
            console.error('Email or password input not found');
            messageElement.textContent = 'Form error: Please check input fields.';
            messageElement.classList.remove('success');
            messageElement.classList.add('error');
            return;
        }
        const email = emailInput.value;
        const password = passwordInput.value;
        console.log('Attempting login with:', email); // Debug
        signIn(email, password, messageElement);
    });
}

// Handle sign-out
if (signOutButton) {
    signOutButton.addEventListener('click', () => {
        console.log('Sign-out clicked'); // Debug
        signOutUser(messageElement);
    });
}
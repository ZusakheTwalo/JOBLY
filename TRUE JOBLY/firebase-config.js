import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

// Your Firebase configuration object - KEEP YOUR EXISTING DETAILS
const firebaseConfig = {
    apiKey: "AIzaSyAybKDDc5dEU-3GMXd9mK3CWr6210cNVsg",
    authDomain: "jobly-app-3ac10.firebaseapp.com",
    projectId: "jobly-app-3ac10",
    storageBucket: "jobly-app-3ac10.firebasestorage.app",
    messagingSenderId: "1075507986069",
    appId: "1:1075507986069:web:7c9dd17711c79fd216e59c"
};

// Initialize Firebase and export services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

// --- Authentication Functions ---

/**
 * Registers a new user, saves their details to Firestore, and redirects to the login page.
 */
export function signUp(email, password, firstName, lastName, messageElement) {
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Save user details to Firestore
            return setDoc(doc(db, "users", user.uid), {
                firstName,
                lastName,
                email
            });
        })
        .then(() => {
            messageElement.textContent = `Registration successful! Welcome, ${firstName}! Redirecting to login...`;
            messageElement.className = 'success';
            // Automatically sign out so they can log in fresh
            return signOut(auth);
        })
        .then(() => {
            setTimeout(() => {
                window.location.href = 'login.html'; // Correct: Redirect to the separate login page
            }, 2000);
        })
        .catch((error) => {
            handleAuthError(error, messageElement);
        });
}

/**
 * Signs in an existing user and redirects to the landing page.
 */
export function signIn(email, password, messageElement) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            messageElement.textContent = `Login successful! Welcome back!`;
            messageElement.className = 'success';
            setTimeout(() => {
                window.location.href = 'landingpage2.html';
            }, 1500);
        })
        .catch((error) => {
            handleAuthError(error, messageElement);
        });
}

/**
 * Signs out the current user and redirects to the login page.
 */
export async function signOutUser() {
    try {
        await signOut(auth);
        console.log('User signed out successfully.');
        window.location.href = 'login.html'; // Correct: Redirect to the separate login page
    } catch (error) {
        console.error('Sign-out error:', error);
        // Still redirect even if there's an error
        window.location.href = 'login.html';
    }
}


/**
 * A helper function to display user-friendly error messages.
 */
function handleAuthError(error, messageElement) {
    console.error('Authentication Error:', error.code);
    let errorMessage = 'An unexpected error occurred. Please try again.';
    switch (error.code) {
        case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered.';
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            errorMessage = 'Invalid email or password.';
            break;
        case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
        case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters.';
            break;
    }
    messageElement.textContent = errorMessage;
    messageElement.className = 'error';
}


import { auth, db, signOutUser } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    // Navigation elements
    const profileDropdown = document.querySelector('.profile-dropdown');
    const guestCta = document.querySelector('.guest-cta');
    const profileInitials = document.getElementById('profileInitials');
    const logoutButton = document.getElementById('logout');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    // Hamburger menu toggle
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active'));
        });
    }
    
    // Firebase auth state listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            guestCta.style.display = 'none';
            profileDropdown.style.display = 'block';

            // Get user initials from Firestore
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const initials = (userData.firstName?.charAt(0) || '') + (userData.lastName?.charAt(0) || '');
                    profileInitials.textContent = initials.toUpperCase() || 'U';
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                profileInitials.textContent = 'U';
            }

            // Attach logout listener
            if (logoutButton) {
                logoutButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    signOutUser();
                });
            }

        } else {
            // User is signed out
            guestCta.style.display = 'block';
            profileDropdown.style.display = 'none';
        }
    });
});

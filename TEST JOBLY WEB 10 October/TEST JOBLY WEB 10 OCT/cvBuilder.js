import { auth, signOutUser, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {

    // DOM Elements
    const loader = document.getElementById('loader');
    const cvBuilderContent = document.getElementById('cv-builder-content');
    const cvForm = document.getElementById('cvForm');
    const previewContainer = document.getElementById('cvPreview');
    const previewActions = document.getElementById('preview-actions');
    const saveButton = document.getElementById('saveCV');
    const downloadButton = document.getElementById('downloadPDF');
    const resetButton = document.getElementById('resetForm');
    const messageElement = document.getElementById('message');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const profileInitials = document.getElementById('profileInitials');
    const logoutButton = document.getElementById('logout');

    let currentUserId = null;

    // --- 1. AUTHENTICATION HANDLING ---
    const authObserver = onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            currentUserId = user.uid;
            await setupUserUI(user.uid);
            
            // Show content, hide loader
            loader.style.display = 'none';
            cvBuilderContent.style.display = 'block';
        } else {
            // User is signed out, redirect to login
            console.log('No user signed in. Redirecting to login.');
            window.location.href = 'index.html'; // Redirect to the main unified page
        }
    });
    
    // Function to get user data and update UI
    async function setupUserUI(userId) {
        try {
            const userDocRef = doc(db, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const firstName = userData.firstName || '';
                const lastName = userData.lastName || '';
                const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
                profileInitials.textContent = initials;
                
                // Pre-fill form with user data
                document.getElementById('fullName').value = `${firstName} ${lastName}`;
                document.getElementById('email').value = userData.email || '';

            } else {
                console.error('User document not found in Firestore.');
                showMessage('Could not load user profile.', true);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            showMessage('Error loading your profile.', true);
        }
    }

    // --- 2. UI & EVENT LISTENERS ---

    // Hamburger menu toggle
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active'));
    });

    // Logout button
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        signOutUser().catch(error => console.error('Sign out error:', error));
    });

    // Form submission for preview
    cvForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateForm()) {
            generatePreview();
            previewActions.style.display = 'flex';
        }
    });

    // Save CV button
    saveButton.addEventListener('click', async () => {
        if (!currentUserId || !validateForm()) {
            showMessage('Please fill all required fields before saving.', true);
            return;
        }

        const cvData = getCvData();
        cvData.createdAt = serverTimestamp(); // Add a timestamp

        try {
            // Use a consistent ID like 'latest' to always update the user's main CV
            const cvDocRef = doc(db, 'users', currentUserId, 'cvs', 'latest'); 
            await setDoc(cvDocRef, cvData);
            showMessage('CV saved successfully to your profile!', false);
        } catch (error) {
            console.error('Error saving CV:', error);
            showMessage('Failed to save CV. Please try again.', true);
        }
    });

    // Download PDF button
    downloadButton.addEventListener('click', () => {
        if (previewContainer.innerHTML.trim() === '') {
             showMessage('Please preview your CV before downloading.', true);
             return;
        }
        window.print(); // Uses browser's print-to-pdf functionality
    });
    
    // Reset Form button
    resetButton.addEventListener('click', () => {
        cvForm.reset();
        previewContainer.innerHTML = '';
        previewActions.style.display = 'none';
        messageElement.style.display = 'none';
        clearAllErrors();
        setupUserUI(currentUserId); // Re-fill with default user data
    });


    // --- 3. HELPER FUNCTIONS ---

    // Function to generate CV preview HTML
    function generatePreview() {
        const data = getCvData();
        previewContainer.innerHTML = `
            <div id="previewContent">
                <h3>Personal Information</h3>
                <p><strong>Name:</strong> ${data.fullName}</p>
                <p><strong>Profession:</strong> ${data.profession}</p>
                <p><strong>Location:</strong> ${data.address}</p>
                <p><strong>Phone:</strong> ${data.phone}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                
                <h3>Professional Summary</h3>
                <p>${data.summary.replace(/\n/g, '<br>')}</p>
                
                <h3>Work Experience</h3>
                <p>${data.experience.replace(/\n/g, '<br>')}</p>
                
                <h3>Skills</h3>
                <p>${data.skills}</p>
            </div>
        `;
    }

    // Function to get all data from the form
    function getCvData() {
        return {
            fullName: document.getElementById('fullName').value,
            profession: document.getElementById('profession').value,
            address: document.getElementById('address').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            summary: document.getElementById('summary').value,
            experience: document.getElementById('experience').value,
            skills: document.getElementById('skills').value,
            location: document.getElementById('address').value // for job matching
        };
    }

    // Simple Form Validation
    function validateForm() {
        let isValid = true;
        clearAllErrors();
        const requiredFields = ['fullName', 'profession', 'address', 'phone', 'email', 'summary', 'experience', 'skills'];
        
        requiredFields.forEach(id => {
            const input = document.getElementById(id);
            if (!input.value.trim()) {
                showError(id, 'This field is required.');
                isValid = false;
            }
        });
        return isValid;
    }

    // UI Feedback Functions
    function showError(inputId, message) {
        const errorElement = document.getElementById(`${inputId}-error`);
        if(errorElement) errorElement.textContent = message;
    }
    
    function clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    }

    function showMessage(msg, isError = false) {
        messageElement.textContent = msg;
        messageElement.className = isError ? 'error' : 'success';
        messageElement.style.display = 'block';
        setTimeout(() => { messageElement.style.display = 'none'; }, 4000);
    }
});


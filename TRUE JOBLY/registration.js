console.log('registration.js loaded'); // Debug

import { signUp } from './firebase-config.js';

const registrationForm = document.getElementById('registrationForm');
const messageElement = document.getElementById('message');

if (!registrationForm) {
    console.error('Registration form not found');
    if (messageElement) {
        messageElement.textContent = 'Form not found. Please check the page setup.';
        messageElement.classList.add('error');
    }
    throw new Error('Registration form not found');
}

if (!messageElement) {
    console.error('Message element not found');
    throw new Error('Message element not found');
}

registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log('Attempting registration:', { email, firstName, lastName });

    signUp(email, password, firstName, lastName, messageElement);
});
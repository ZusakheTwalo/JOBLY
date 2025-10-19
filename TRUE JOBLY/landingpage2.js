import { auth, signOutUser } from './firebase-config.js';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const profileInitials = document.getElementById('profileInitials');
const profileDropdown = document.querySelector('.profile-dropdown');
const guestCta = document.querySelector('.guest-cta');
const logoutButton = document.getElementById('logout');
const messageElement = document.getElementById('message');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const notificationIcon = document.querySelector('.notification-icon');
const notificationDropdown = document.querySelector('.notification-dropdown');
const notificationList = document.getElementById('notificationList');
const notificationCount = document.getElementById('notificationCount');
const markAllRead = document.querySelector('.mark-all-read');
const newsletterForm = document.getElementById('newsletterForm');
const closeNotifications = document.querySelector('.close-notifications');
const footerToggles = document.querySelectorAll('.footer-toggle');

// Hamburger menu toggle
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active'));
    });
}

// Footer toggle for mobile
footerToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
        const links = toggle.nextElementSibling;
        links.classList.toggle('active');
        toggle.setAttribute('aria-expanded', links.classList.contains('active'));
    });
});

// Authentication state handling
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User signed in:', user.email);
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
            profileInitials.textContent = initials;
            profileDropdown.style.display = 'block';
            guestCta.style.display = 'none';
            loadNotifications(user.uid);
        } else {
            console.error('User document not found');
            messageElement.textContent = 'User profile not found.';
            messageElement.classList.add('error');
            profileDropdown.style.display = 'none';
            guestCta.style.display = 'block';
            notificationCount.textContent = '0';
            notificationList.innerHTML = '<div class="notification-empty">No notifications available.</div>';
        }
    } else {
        console.log('No user signed in');
        profileInitials.textContent = '';
        profileDropdown.style.display = 'none';
        guestCta.style.display = 'block';
        notificationCount.textContent = '0';
        notificationList.innerHTML = '<div class="notification-empty">No notifications available.</div>';
    }
});

// Logout handling
if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Logout clicked');
        signOutUser(messageElement);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    });
}

// Notification toggle
if (notificationIcon && notificationDropdown) {
    notificationIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (auth.currentUser) {
            notificationDropdown.classList.toggle('active');
            notificationIcon.setAttribute('aria-expanded', notificationDropdown.classList.contains('active'));
        } else {
            alert('Please log in to view notifications.');
        }
    });
    notificationIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (auth.currentUser) {
                notificationDropdown.classList.toggle('active');
                notificationIcon.setAttribute('aria-expanded', notificationDropdown.classList.contains('active'));
            } else {
                alert('Please log in to view notifications.');
            }
        }
    });
}

// Close notifications
if (closeNotifications) {
    closeNotifications.addEventListener('click', () => {
        notificationDropdown.classList.remove('active');
        notificationIcon.setAttribute('aria-expanded', 'false');
    });
    closeNotifications.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            notificationDropdown.classList.remove('active');
            notificationIcon.setAttribute('aria-expanded', 'false');
        }
    });
}

// Load notifications
async function loadNotifications(userId) {
    try {
        const db = getFirestore();
        const notificationsRef = collection(db, `users/${userId}/notifications`);
        const snapshot = await getDocs(notificationsRef);
        let unreadCount = 0;
        notificationList.innerHTML = '';

        if (snapshot.empty) {
            notificationList.innerHTML = '<div class="notification-empty">No notifications available.</div>';
            notificationCount.textContent = '0';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const isUnread = !data.read;
            if (isUnread) unreadCount++;
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item-content ${isUnread ? 'notification-unread' : ''}`;
            notificationItem.tabIndex = 0;
            notificationItem.dataset.id = doc.id;
            notificationItem.innerHTML = `
                <div class="notification-icon-wrapper job-match-icon">
                    <i class="fas fa-briefcase"></i>
                </div>
                <div class="notification-content">
                    <h4>${data.title}</h4>
                    <p>${data.message}</p>
                    <span class="notification-time">${new Date(data.timestamp).toLocaleString()}</span>
                    <button class="notification-close">×</button>
                </div>
            `;
            notificationItem.addEventListener('click', async (e) => {
                if (e.target.classList.contains('notification-close')) {
                    await updateDoc(doc.ref, { read: true });
                    loadNotifications(userId);
                }
            });
            notificationItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (e.target.classList.contains('notification-close')) {
                        notificationItem.querySelector('.notification-close').click();
                    }
                }
            });
            notificationList.appendChild(notificationItem);
        });
        notificationCount.textContent = unreadCount;
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationList.innerHTML = '<div class="notification-empty">Error loading notifications.</div>';
        notificationCount.textContent = '0';
    }
}

// Mark all notifications as read
if (markAllRead) {
    markAllRead.addEventListener('click', async (e) => {
        e.preventDefault();
        if (auth.currentUser) {
            const db = getFirestore();
            const notificationsRef = collection(db, `users/${auth.currentUser.uid}/notifications`);
            const snapshot = await getDocs(notificationsRef);
            snapshot.forEach(doc => {
                if (!doc.data().read) {
                    updateDoc(doc.ref, { read: true });
                }
            });
            loadNotifications(auth.currentUser.uid);
        }
    });
    markAllRead.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            markAllRead.click();
        }
    });
}

// Newsletter form validation
if (newsletterForm) {
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('email-error');

    emailInput.addEventListener('input', () => {
        if (!emailInput.validity.valid) {
            emailError.textContent = 'Please enter a valid email address.';
        } else {
            emailError.textContent = '';
        }
    });

    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        if (email && emailInput.validity.valid) {
            try {
                const db = getFirestore();
                await setDoc(doc(db, 'newsletter', email), { email, subscribedAt: new Date() });
                messageElement.textContent = 'Subscribed successfully!';
                messageElement.classList.add('success');
                messageElement.classList.remove('error');
                newsletterForm.reset();
                emailError.textContent = '';
            } catch (error) {
                console.error('Error subscribing:', error);
                messageElement.textContent = 'Failed to subscribe. Please try again.';
                messageElement.classList.add('error');
                messageElement.classList.remove('success');
            }
        } else {
            emailError.textContent = 'Please enter a valid email address.';
        }
    });
}
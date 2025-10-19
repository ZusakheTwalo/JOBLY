import { auth, signOutUser } from './firebase-config.js';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const profileInitials = document.getElementById('profileInitials');
const profileDropdown = document.querySelector('.profile-dropdown');
const guestCta = document.querySelector('.guest-cta');
const logoutButton = document.getElementById('logout');
const notificationIcon = document.querySelector('.notification-icon');
const notificationDropdown = document.querySelector('.notification-dropdown');
const notificationList = document.getElementById('notificationList');
const notificationCount = document.getElementById('notificationCount');
const markAllRead = document.querySelector('.mark-all-read');
const closeNotifications = document.querySelector('.close-notifications');
const searchButton = document.getElementById('search-button');
const jobsContainer = document.getElementById('jobs');
const applicationModal = document.getElementById('application-modal');
const jobDetailsModal = document.getElementById('job-details-modal');
const closeApplicationBtn = document.querySelector('.close-application');
const closeDetailsBtn = document.querySelector('.close-details');
const applicationForm = document.getElementById('application-form');

// Hamburger menu toggle
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', navLinks.classList.contains('active'));
    });
}

// Footer toggle for mobile
document.querySelectorAll('.footer-toggle').forEach(toggle => {
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
            jobsContainer.innerHTML = `
                <div class="error">User profile not found. Please update your profile.</div>
            `;
            setTimeout(() => { jobsContainer.innerHTML = ''; }, 3000);
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
        signOutUser(jobsContainer);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    });
}

// Notification toggle
if (notificationIcon && notificationDropdown) {
    notificationIcon.addEventListener('click', () => {
        notificationDropdown.classList.toggle('active');
        notificationIcon.setAttribute('aria-expanded', notificationDropdown.classList.contains('active'));
    });
    notificationIcon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            notificationDropdown.classList.toggle('active');
            notificationIcon.setAttribute('aria-expanded', notificationDropdown.classList.contains('active'));
        }
    });
}

if (closeNotifications) {
    closeNotifications.addEventListener('click', () => {
        notificationDropdown.classList.remove('active');
        notificationIcon.setAttribute('aria-expanded', 'false');
    });
    closeNotifications.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
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
            notificationItem.innerHTML = `
                <div class="notification-icon-wrapper job-match-icon">
                    <i class="fas fa-briefcase"></i>
                </div>
                <div class="notification-content">
                    <h4>${data.title}</h4>
                    <p>${data.message}</p>
                    <span class="notification-time">${new Date(data.timestamp).toLocaleString()}</span>
                </div>
            `;
            notificationItem.addEventListener('click', async () => {
                if (isUnread) {
                    await updateDoc(doc.ref, { read: true });
                    loadNotifications(userId);
                }
            });
            notificationItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    notificationItem.click();
                }
            });
            notificationList.appendChild(notificationItem);
        });
        notificationCount.textContent = unreadCount;
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationList.innerHTML = '<div class="notification-empty">Error loading notifications.</div>';
    }
}

// Mark all notifications as read
if (markAllRead) {
    markAllRead.addEventListener('click', async () => {
        const db = getFirestore();
        const notificationsRef = collection(db, `users/${auth.currentUser.uid}/notifications`);
        const snapshot = await getDocs(notificationsRef);
        snapshot.forEach(doc => {
            if (!doc.data().read) {
                updateDoc(doc.ref, { read: true });
            }
        });
        loadNotifications(auth.currentUser.uid);
    });
    markAllRead.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            markAllRead.click();
        }
    });
}

// Enhance modal accessibility
[applicationModal, jobDetailsModal].forEach(modal => {
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
            if (modal === applicationModal) {
                const form = document.getElementById('application-form');
                if (!form.querySelector('.application-success')) {
                    form.reset();
                }
            }
            document.body.style.overflow = 'auto';
        }
        if (e.key === 'Tab') {
            const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
});

// Enhance close buttons
[closeApplicationBtn, closeDetailsBtn].forEach(btn => {
    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            btn.click();
        }
    });
});

// Enhance search button
if (searchButton) {
    searchButton.addEventListener('click', () => {
        searchButton.classList.add('loading');
        setTimeout(() => {
            searchButton.classList.remove('loading');
        }, 2000);
    });
    searchButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            searchButton.click();
        }
    });
}
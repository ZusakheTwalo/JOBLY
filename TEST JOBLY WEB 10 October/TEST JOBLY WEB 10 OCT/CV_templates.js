import { auth, signOutUser } from './firebase-config.js';
import { getFirestore, doc, setDoc, collection, getDocs, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

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
const footerToggles = document.querySelectorAll('.footer-toggle');
const templateButtons = document.querySelectorAll('.template-button');
const selectButtons = document.querySelectorAll('.select-template');
const modals = document.querySelectorAll('.modal');
const closeButtons = document.querySelectorAll('.close');
const messageElement = document.getElementById('message');

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
            setTimeout(() => { messageElement.textContent = ''; }, 3000);
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

// Modal handling
templateButtons.forEach(button => {
    button.addEventListener('click', () => {
        const template = button.getAttribute('data-template');
        const modal = document.getElementById(`${template}-modal`);
        button.classList.add('loading');
        setTimeout(() => {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            modal.querySelector('.modal-content').focus();
            button.classList.remove('loading');
        }, 500);
    });
});

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        modals.forEach(modal => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    });
    button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            button.click();
        }
    });
});

// Keyboard accessibility for modals
modals.forEach(modal => {
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
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

// Select template handling
selectButtons.forEach(button => {
    button.addEventListener('click', () => {
        const template = button.getAttribute('data-template');
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const db = getFirestore();
                const templateData = { template, selectedAt: new Date().toISOString() };
                button.classList.add('loading');
                try {
                    await setDoc(doc(db, 'users', user.uid, 'templates', template), templateData);
                    messageElement.textContent = `Selected ${template} template! Proceed to <a href="cvbuilder.html">CV Builder</a> to customize.`;
                    messageElement.classList.add('success');
                    messageElement.classList.remove('error');
                    modals.forEach(modal => {
                        modal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                    });
                } catch (error) {
                    console.error('Error saving template:', error);
                    messageElement.textContent = 'Error saving template: ' + error.message;
                    messageElement.classList.add('error');
                    messageElement.classList.remove('success');
                } finally {
                    button.classList.remove('loading');
                }
                setTimeout(() => { messageElement.textContent = ''; }, 5000);
            } else {
                messageElement.textContent = 'Please sign in to select a template.';
                messageElement.classList.add('error');
                messageElement.classList.remove('success');
                setTimeout(() => { messageElement.textContent = ''; }, 3000);
            }
        });
    });
});
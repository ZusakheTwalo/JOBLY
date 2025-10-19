import { auth, db } from './firebase-config.js';
import { onSnapshot, collection, doc, updateDoc, query, orderBy, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements for notifications
    const notificationIcon = document.querySelector('.notification-icon');
    const notificationBadge = document.getElementById('notificationCount');
    const notificationDropdown = document.querySelector('.notification-dropdown');
    const notificationList = document.getElementById('notificationList');
    const markAllReadBtn = document.querySelector('.mark-all-read');
    const closeNotificationsBtn = document.querySelector('.close-notifications');

    let notificationListener = null; // To hold the Firestore listener unsubscribe function
    let currentUserId = null;

    if (!notificationIcon || !notificationBadge || !notificationDropdown || !notificationList) {
        console.error('Notification UI elements not found. Aborting notification script.');
        return;
    }

    // Main authentication state listener
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            // Detach any existing listener before starting a new one
            if (notificationListener) {
                notificationListener();
            }
            initializeNotifications(currentUserId);
        } else {
            // User signed out, clear everything
            currentUserId = null;
            if (notificationListener) {
                notificationListener();
            }
            clearNotifications();
        }
    });

    /**
     * Sets up the real-time listener for application updates for the logged-in user.
     * @param {string} userId - The UID of the current user.
     */
    function initializeNotifications(userId) {
        const applicationsRef = collection(db, 'users', userId, 'applications');
        const q = query(applicationsRef, orderBy('date_applied', 'desc'));

        notificationListener = onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNotifications(notifications);
        }, (error) => {
            console.error("Error fetching notifications:", error);
            notificationList.innerHTML = '<div class="notification-empty">Could not load notifications.</div>';
        });
    }

    /**
     * Renders the notifications in the dropdown UI.
     * @param {Array<object>} notifications - An array of notification objects from Firestore.
     */
    function renderNotifications(notifications) {
        if (notifications.length === 0) {
            notificationList.innerHTML = '<div class="notification-empty">You have no new notifications.</div>';
            notificationBadge.textContent = '0';
            notificationBadge.style.display = 'none';
            return;
        }

        let unreadCount = 0;
        let listHtml = '';

        notifications.forEach(notif => {
            // Assume notifications without 'isRead' field are unread
            const isUnread = notif.isRead === false; 
            if (isUnread) {
                unreadCount++;
            }

            const icon = getIconForStatus(notif.status);
            const timeAgo = formatTimeAgo(notif.date_applied);

            listHtml += `
                <div class="notification-item-content ${isUnread ? 'notification-unread' : ''}" data-id="${notif.id}">
                    <div class="notification-icon-wrapper ${icon.class}">
                        <i class="fas ${icon.name}"></i>
                    </div>
                    <div class="notification-content">
                        <h4>${notif.job_title}</h4>
                        <p>Status: <strong>${notif.status}</strong> at ${notif.company_name}</p>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        });

        notificationList.innerHTML = listHtml;

        // Update badge
        notificationBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    /**
     * Marks all unread notifications as read in Firestore.
     */
    async function markAllNotificationsAsRead() {
        if (!currentUserId) return;
        
        const applicationsRef = collection(db, 'users', currentUserId, 'applications');
        const q = query(applicationsRef, where('isRead', '==', false));
        
        try {
            const snapshot = await getDocs(q);
            snapshot.forEach(document => {
                const docRef = doc(db, 'users', currentUserId, 'applications', document.id);
                updateDoc(docRef, { isRead: true });
            });
        } catch (error) {
            console.error("Error marking notifications as read:", error);
        }
    }

    /**
     * Clears the notification UI when the user logs out.
     */
    function clearNotifications() {
        notificationList.innerHTML = '<div class="notification-empty">Please log in to see notifications.</div>';
        notificationBadge.textContent = '0';
        notificationBadge.style.display = 'none';
    }

    // --- Helper Functions ---

    function getIconForStatus(status) {
        switch (status?.toLowerCase()) {
            case 'submitted':
                return { name: 'fa-paper-plane', class: 'job-match-icon' };
            case 'viewed':
                return { name: 'fa-eye', class: 'job-alert-icon' };
            case 'shortlisted':
                return { name: 'fa-star', class: 'job-match-icon' };
            case 'rejected':
                return { name: 'fa-times-circle', class: 'job-rejected-icon' };
            default:
                return { name: 'fa-bell', class: 'job-alert-icon' };
        }
    }

    function formatTimeAgo(timestamp) {
        if (!timestamp || !timestamp.toDate) {
            return 'Just now';
        }
        const date = timestamp.toDate();
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    }

    // --- Event Listeners for UI interaction ---

    notificationIcon.addEventListener('click', () => {
        notificationDropdown.classList.toggle('active');
        // When the user opens the dropdown, we assume they've seen the notifications.
        if (notificationDropdown.classList.contains('active')) {
            markAllNotificationsAsRead();
        }
    });

    markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    
    closeNotificationsBtn.addEventListener('click', () => {
        notificationDropdown.classList.remove('active');
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationIcon.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.classList.remove('active');
        }
    });
});

    // Inside handleApplication function in scripts.js
    await setDoc(applicationRef, {
        job_id: jobId,
        job_title: jobTitle,
        company_name: job.company || 'N/A',
        date_applied: serverTimestamp(),
        status: 'Submitted',
        isRead: false // <-- Add this line
    });
    

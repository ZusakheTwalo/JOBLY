import { auth, db } from './firebase-config.js';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    const applicationsList = document.getElementById('applications-list');
    const statusModal = document.getElementById('status-modal');
    const modalJobTitle = document.getElementById('modal-job-title');
    const closeModalButton = statusModal.querySelector('.close-button');
    const statusOptions = statusModal.querySelector('.status-options');
    const toast = document.getElementById('toast-notification');

    let currentApplicationId = null;

    // Listen for Authentication State
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in, fetch their applications
            listenForApplications(user.uid);
        } else {
            // User is not logged in
            applicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="fas fa-user-lock"></i>
                    <h3>Please Log In</h3>
                    <p>You need to be logged in to view your applications.</p>
                </div>`;
        }
    });

    /**
     * Sets up a real-time listener for the user's applications in Firestore.
     * @param {string} userId The UID of the logged-in user.
     */
    function listenForApplications(userId) {
        const applicationsRef = collection(db, 'users', userId, 'applications');
        const q = query(applicationsRef, orderBy('date_applied', 'desc'));

        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                applicationsList.innerHTML = `
                <div class="no-applications">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Applications Yet</h3>
                    <p>You haven't applied for any jobs yet. Start searching now!</p>
                </div>`;
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const app = { id: doc.id, ...doc.data() };
                html += createApplicationCard(app);
            });
            applicationsList.innerHTML = html;

        }, (error) => {
            console.error("Error fetching applications:", error);
            applicationsList.innerHTML = `<div class="no-applications"><h3>Error</h3><p>Could not load your applications.</p></div>`;
        });
    }

    /**
     * Creates the HTML for a single application card.
     * @param {object} app The application data object from Firestore.
     * @returns {string} The HTML string for the card.
     */
    function createApplicationCard(app) {
        const date = app.date_applied?.toDate().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A';
        const status = app.status || 'Submitted';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');

        return `
            <div class="application-card status-${statusClass}">
                <div class="card-content">
                    <div class="card-details">
                        <h3>${app.job_title || 'N/A'}</h3>
                        <div class="card-meta">
                            <span><i class="fas fa-building"></i> ${app.company_name || 'N/A'}</span>
                            <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <div class="status-tag">${status}</div>
                        <button class="update-button" data-id="${app.id}" data-title="${app.job_title}" data-current-status="${status}">
                            Update Status
                        </button>
                    </div>
                </div>
            </div>`;
    }

    // --- Modal Handling ---

    // Event delegation to open the modal
    applicationsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('update-button')) {
            currentApplicationId = e.target.dataset.id;
            const jobTitle = e.target.dataset.title;
            const currentStatus = e.target.dataset.currentStatus;
            openModal(jobTitle, currentStatus);
        }
    });

    function openModal(jobTitle, currentStatus) {
        modalJobTitle.textContent = jobTitle;
        // Highlight the current status button
        statusOptions.querySelectorAll('.status-option').forEach(btn => {
            btn.classList.toggle('current', btn.dataset.status === currentStatus);
        });
        statusModal.style.display = 'flex';
    }

    function closeModal() {
        statusModal.style.display = 'none';
        currentApplicationId = null;
    }

    closeModalButton.addEventListener('click', closeModal);
    statusModal.addEventListener('click', (e) => {
        if (e.target === statusModal) closeModal();
    });

    // --- Status Update Logic ---
    statusOptions.addEventListener('click', async (e) => {
        if (e.target.classList.contains('status-option')) {
            const newStatus = e.target.dataset.status;
            if (!currentApplicationId || !auth.currentUser) return;

            const appRef = doc(db, 'users', auth.currentUser.uid, 'applications', currentApplicationId);
            try {
                await updateDoc(appRef, { status: newStatus });
                showToast(`Status updated to "${newStatus}"!`);
                closeModal();
            } catch (error) {
                console.error("Error updating status:", error);
                showToast("Failed to update status.", true);
            }
        }
    });

    // --- Toast Notification ---
    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.style.backgroundColor = isError ? 'var(--status-not-selected)' : 'var(--text-dark)';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});

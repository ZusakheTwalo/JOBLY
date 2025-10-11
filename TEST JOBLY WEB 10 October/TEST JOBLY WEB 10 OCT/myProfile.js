import { auth } from './firebase-config.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const cvPreview = document.getElementById('cvPreview');
const messageElement = document.createElement('div');
messageElement.id = 'message';
cvPreview.insertAdjacentElement('beforebegin', messageElement);

// Redirect to login if not authenticated
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Fetch and display saved CV
    const db = getFirestore();
    const cvCollection = collection(db, 'users', user.uid, 'cvs');
    try {
        const cvSnapshot = await getDocs(cvCollection);
        if (cvSnapshot.empty) {
            messageElement.textContent = 'No CV saved yet. Create one using the CV Builder!';
            messageElement.classList.add('error');
            cvPreview.innerHTML = '';
            return;
        }

        // Display the most recent CV (based on createdAt)
        let latestCV = null;
        let latestTime = 0;
        cvSnapshot.forEach((doc) => {
            const cvData = doc.data();
            const cvTime = new Date(cvData.createdAt).getTime();
            if (cvTime > latestTime) {
                latestCV = cvData;
                latestTime = cvTime;
            }
        });

        cvPreview.innerHTML = `
            <h3>${latestCV.fullName}</h3>
            <p><strong>${latestCV.profession}</strong></p>
            <p>${latestCV.address} | ${latestCV.phone} | ${latestCV.email} | ${latestCV.linkedin}</p>
            <h4>Professional Summary</h4>
            <p>${latestCV.summary}</p>
            <h4>Education</h4>
            <p>${latestCV.education}</p>
            <h4>Work Experience</h4>
            <p>${latestCV.experience}</p>
            <h4>Skills</h4>
            <p>${latestCV.skills}</p>
            <h4>Languages</h4>
            <p>${latestCV.languages}</p>
            <h4>References</h4>
            <p>${latestCV.references}</p>
        `;
        messageElement.textContent = 'CV loaded successfully!';
        messageElement.classList.add('success');
        setTimeout(() => {
            messageElement.textContent = '';
        }, 2000);
    } catch (error) {
        console.error('Error fetching CV:', error);
        messageElement.textContent = 'Error loading CV: ' + error.message;
        messageElement.classList.add('error');
    }
});
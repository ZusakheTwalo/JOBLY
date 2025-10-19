import { auth, db } from './firebase-config.js';
import { doc, getDoc, collection, query, getDocs, orderBy, limit, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
    const keywordInput = document.getElementById('keyword');
    const departmentSelect = document.getElementById('department');
    const searchButton = document.getElementById('search-button');
    const loadingElement = document.getElementById('loading');
    const jobsContainer = document.getElementById('jobs');
    
    // Modal elements
    const applicationModal = document.getElementById('application-modal');
    const jobDetailsModal = document.getElementById('job-details-modal');
    const closeBtn = document.querySelector('.close');
    const closeDetailsBtn = document.querySelector('.close-details');
    const jobTitleElement = document.getElementById('job-title');
    const jobIdElement = document.getElementById('job-id');
    const applicationForm = document.getElementById('application-form');

    // Job details modal elements
    const detailsJobTitle = document.getElementById('details-job-title');
    const detailsCompany = document.getElementById('details-company');
    const detailsLocation = document.getElementById('details-location');
    const detailsSalary = document.getElementById('details-salary');
    const detailsPosted = document.getElementById('details-posted');
    const detailsDescription = document.getElementById('details-description');
    const applyFromDetailsBtn = document.querySelector('.apply-from-details-btn');

    // Store original form HTML to reset properly
    const originalFormHTML = applicationForm.innerHTML;

    // Store current job data for details modal
    let currentJobData = null;

    // Store CV data for matching
    let userCvData = { skills: [], location: '' };

    // Render URL
    const RENDER_URL = 'https://job-application-ap3s.onrender.com';

    // Load departments and wait for auth/CV
    loadDepartments();

    // Wait for auth state and load CV
    auth.onAuthStateChanged(async user => {
        if (user) {
            console.log('User logged in:', user.uid);
            try {
                await loadUserCv(user.uid);
                console.log('CV data loaded:', userCvData);
                fetchJobs();
            } catch (error) {
                console.error('Failed to load CV:', error);
                userCvData = { skills: [], location: '' };
                jobsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Unable to load your CV. Please upload a CV in your profile to see personalized job matches.</p>
                    </div>
                `;
                fetchJobs();
            }
        } else {
            console.log('No user logged in, skipping CV fetch');
            userCvData = { skills: [], location: '' };
            jobsContainer.innerHTML = `
                <div class="no-cv-message">
                    <p>Please log in and upload your CV to see personalized job matches.</p>
                </div>
            `;
            fetchJobs();
        }
    });

    // Event listeners
    searchButton.addEventListener('click', fetchJobs);
    keywordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fetchJobs();
    });
    
    // Modal events
    closeBtn.addEventListener('click', () => {
        applicationModal.style.display = 'none';
        resetForm();
    });
    
    closeDetailsBtn.addEventListener('click', () => {
        jobDetailsModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === applicationModal) {
            applicationModal.style.display = 'none';
            resetForm();
        }
        if (e.target === jobDetailsModal) {
            jobDetailsModal.style.display = 'none';
        }
    });
    
    applyFromDetailsBtn.addEventListener('click', () => {
        if (currentJobData) {
            jobDetailsModal.style.display = 'none';
            openApplicationModal(currentJobData.id, currentJobData.title);
        }
    });
    
    applicationForm.addEventListener('submit', handleApplication);

    async function loadUserCv(userId) {
        console.log('Attempting to load CV for user:', userId);
        try {
            const cvsCollectionRef = collection(db, 'users', userId, 'cvs');
            const cvsQuery = query(cvsCollectionRef, orderBy('createdAt', 'desc'), limit(1));
            const cvsSnapshot = await getDocs(cvsQuery);
            
            if (!cvsSnapshot.empty) {
                const cvDoc = cvsSnapshot.docs[0];
                userCvData = cvDoc.data();
                console.log('Raw CV data:', userCvData);
                
                // Handle skills - check different possible formats
                if (typeof userCvData.skills === 'string') {
                    userCvData.skills = userCvData.skills.split(',').map(s => s.trim().toLowerCase());
                } else if (!Array.isArray(userCvData.skills)) {
                    userCvData.skills = [];
                } else {
                    userCvData.skills = userCvData.skills.map(s => s.toLowerCase());
                }
                
                // Ensure location is a string
                userCvData.location = userCvData.location ? userCvData.location.toLowerCase() : '';
            } else {
                console.log('No CV found for user');
                userCvData = { skills: [], location: '' };
            }
        } catch (error) {
            console.error('Error fetching CV:', error);
            throw error;
        }
    }

    function calculateMatchScore(job) {
        if (!userCvData || !userCvData.skills.length) {
            return 0;
        }

        const jobDescription = (job.description || '').toLowerCase();
        const jobLocation = (job.location?.display_name || job.location || '').toLowerCase();
        
        // Calculate skill match (70% weight)
        let skillMatchScore = 0;
        const cvSkills = userCvData.skills;
        let matchedSkills = 0;
        
        cvSkills.forEach(skill => {
            if (jobDescription.includes(skill)) {
                matchedSkills++;
            }
        });
        
        if (cvSkills.length > 0) {
            skillMatchScore = (matchedSkills / cvSkills.length) * 70;
        }
        
        // Calculate location match (30% weight)
        let locationMatchScore = 0;
        if (userCvData.location && jobLocation.includes(userCvData.location)) {
            locationMatchScore = 30;
        }
        
        // Total match score
        const totalScore = Math.round(skillMatchScore + locationMatchScore);
        return Math.min(totalScore, 100);
    }

    function loadDepartments() {
        try {
            while (departmentSelect.options.length > 1) {
                departmentSelect.remove(1);
            }
            
            fetch(`${RENDER_URL}/departments`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(departments => {
                    departments.forEach(dept => {
                        const option = document.createElement('option');
                        option.value = dept;
                        option.textContent = dept;
                        departmentSelect.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error("Error loading departments:", error);
                    const mockDepartments = [
                        "Accounting and Finance", "Building and Construction", "Business Management",
                        "Creativity and Media", "Defense and Security", "Education", "Engineering",
                        "Health", "Public Relations", "Technology", "Tourism", "Transport",
                        "Sales", "Human Resources", "Customer Service", "Other"
                    ];
                    mockDepartments.forEach(dept => {
                        const option = document.createElement('option');
                        option.value = dept;
                        option.textContent = dept;
                        departmentSelect.appendChild(option);
                    });
                });
        } catch (error) {
            console.error("Error loading departments:", error);
        }
    }

    function fetchJobs() {
        const keyword = keywordInput.value.trim();
        const department = departmentSelect.value;
        
        const departmentToSend = department === "All Industries" ? "" : department;
        
        loadingElement.style.display = 'block';
        jobsContainer.innerHTML = '';
        
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (departmentToSend) params.append('department', departmentToSend);
        
        fetch(`${RENDER_URL}/jobs?${params.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(jobs => {
                if (!jobs || jobs.length === 0) {
                    jobsContainer.innerHTML = `
                        <div class="no-results">
                            <i class="fas fa-search"></i>
                            <h3>No jobs found</h3>
                            <p>Try adjusting your search criteria</p>
                        </div>
                    `;
                } else {
                    displayJobs(jobs);
                }
            })
            .catch(error => {
                console.error("Fetch error:", error);
                jobsContainer.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error loading jobs</h3>
                        <p>Please try again later</p>
                    </div>
                `;
            })
            .finally(() => {
                loadingElement.style.display = 'none';
            });
    }

    function displayJobs(jobs) {
        window.jobDetails = {};
        const departments = {};
    
        // Group jobs by department
        jobs.forEach(job => {
            window.jobDetails[job.id] = job;
            const department = job.department || 'Other';
            if (!departments[department]) {
                departments[department] = [];
            }
            departments[department].push(job);
        });
    
        let html = '';
        // Iterate over each department
        for (const [department, deptJobs] of Object.entries(departments)) {
    
            // --- ENHANCEMENT: Calculate scores and sort jobs within this department ---
            // 1. Add a matchScore property to each job object in the current department's array.
            deptJobs.forEach(job => {
                job.matchScore = calculateMatchScore(job);
            });
    
            // 2. Sort the array of jobs for this department in-place, based on the new matchScore property.
            deptJobs.sort((a, b) => b.matchScore - a.matchScore);
            // --- END OF ENHANCEMENT ---
    
            html += `
                <div class="department-section">
                    <div class="department-header">
                        <span>${department}</span>
                        <span class="job-count-badge">${deptJobs.length} Job${deptJobs.length !== 1 ? 's' : ''}</span>
                    </div>
            `;
            
            // Iterate over the now-sorted list of jobs for this department
            deptJobs.forEach(job => {
                // The matchScore is now available on the job object
                html += `
                    <div class="job">
                        <h3>${job.title || 'No title'}</h3>
                        <div class="job-meta">
                            <span><i class="fas fa-percentage"></i> Match: ${job.matchScore}%</span>
                            <span><i class="fas fa-building"></i> ${job.company || 'N/A'}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${job.location || 'N/A'}</span>
                            ${job.salary_min ? `<span><i class="fas fa-money-bill-wave"></i> R${job.salary_min.toLocaleString()}${job.salary_max ? ' - R' + job.salary_max.toLocaleString() : ''}</span>` : ''}
                            ${job.days_ago !== null ? `<span><i class="fas fa-clock"></i> ${job.days_ago} day${job.days_ago !== 1 ? 's' : ''} ago</span>` : ''}
                        </div>
                        <div class="job-description">${job.description ? job.description.substring(0, 200) + '...' : 'No description available.'}</div>
                        <div class="job-actions">
                            <button class="apply-btn" data-job-id="${job.id}" data-job-title="${job.title}">
                                <i class="fas fa-paper-plane"></i> Apply Now
                            </button>
                            <button class="view-details-btn" data-job-id="${job.id}">
                                <i class="fas fa-info-circle"></i> View Details
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
    
        jobsContainer.innerHTML = html;
    
        document.querySelectorAll('.apply-btn').forEach(button => {
            button.addEventListener('click', () => {
                const jobId = button.getAttribute('data-job-id');
                const jobTitle = button.getAttribute('data-job-title');
                openApplicationModal(jobId, jobTitle);
            });
        });
    
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', () => {
                const jobId = button.getAttribute('data-job-id');
                showJobDetails(jobId);
            });
        });
    }

    function openApplicationModal(jobId, jobTitle) {
        jobIdElement.value = jobId;
        jobTitleElement.textContent = jobTitle;
        applicationModal.style.display = 'block';
    }

    function showJobDetails(jobId) {
        const job = window.jobDetails[jobId];
        if (!job) return;
        
        currentJobData = job;
        const matchScore = calculateMatchScore(job);
        
        detailsJobTitle.textContent = job.title || 'No title';
        detailsCompany.textContent = job.company || 'N/A';
        detailsLocation.textContent = job.location || 'N/A';
        
        if (job.salary_min) {
            detailsSalary.textContent = `R${job.salary_min.toLocaleString()}${job.salary_max ? ' - R' + job.salary_max.toLocaleString() : ''}`;
        } else {
            detailsSalary.textContent = 'Not specified';
        }
        
        if (job.days_ago !== null) {
            detailsPosted.textContent = `${job.days_ago} day${job.days_ago !== 1 ? 's' : ''} ago`;
        } else {
            detailsPosted.textContent = 'Recently';
        }
        
        if (job.description) {
            let description = job.description
                .replace(/<[^>]*>/g, '')
                .replace(/\n/g, '<br>')
                .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
                .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
            detailsDescription.innerHTML = description;
        } else {
            detailsDescription.textContent = 'No description available.';
        }
        
        jobDetailsModal.style.display = 'block';
    }
    
    function resetForm() {
        applicationForm.innerHTML = originalFormHTML;
        applicationForm.addEventListener('submit', handleApplication);
    }

    function validateCoverLetter(coverLetter) {
        const errors = [];
        if (coverLetter.length > 5000) {
            errors.push('Cover letter must be less than 5000 characters');
        }
        const wordCount = coverLetter.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount < 10 && coverLetter.length > 0) {
            errors.push('Cover letter should be at least 10 words long');
        }
        if (coverLetter.trim().length === 0 && coverLetter.length > 0) {
            errors.push('Cover letter contains only whitespace');
        }
        const lines = coverLetter.split('\n');
        const uniqueLines = new Set(lines.filter(line => line.trim().length > 0));
        if (uniqueLines.size < lines.length / 2 && lines.length > 3) {
            errors.push('Cover letter appears to have repetitive content');
        }
        return errors;
    }

    async function handleApplication(e) {
        e.preventDefault();
        
        const jobId = jobIdElement.value;
        const jobTitle = jobTitleElement.textContent;
        const name = document.getElementById('applicant-name').value;
        const email = document.getElementById('applicant-email').value;
        const phone = document.getElementById('applicant-phone').value;
        const coverLetter = document.getElementById('applicant-cover').value;
        const resume = document.getElementById('applicant-resume').files[0];
        
        if (!name || !email || !phone || !resume) {
            alert('Please fill in all required fields');
            return;
        }
        
        const fileExtension = resume.name.split('.').pop().toLowerCase();
        if (!['pdf', 'doc', 'docx'].includes(fileExtension)) {
            alert('Please upload a PDF, DOC, or DOCX file only.');
            return;
        }
        
        const coverLetterErrors = validateCoverLetter(coverLetter);
        if (coverLetterErrors.length > 0) {
            const coverLetterTextarea = document.getElementById('applicant-cover');
            const errorElement = coverLetterTextarea.parentNode.querySelector('.error-message') || document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.textContent = coverLetterErrors.join('. ');
            errorElement.style.display = 'block';
            coverLetterTextarea.style.borderColor = '#ff6b6b';
            coverLetterTextarea.focus();
            return;
        }
        
        const formDataToSend = new FormData();
        formDataToSend.append('job_id', jobId);
        formDataToSend.append('job_title', jobTitle);
        formDataToSend.append('name', name);
        formDataToSend.append('email', email);
        formDataToSend.append('phone', phone);
        formDataToSend.append('cover_letter', coverLetter);
        formDataToSend.append('resume', resume);
        
        const submitButton = applicationForm.querySelector('.apply-button');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;
        
        try {
            const response = await fetch(`${RENDER_URL}/apply`, {
                method: 'POST',
                body: formDataToSend
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Network error');
            }
            
            const data = await response.json();
            
            // Save application details to Firestore
            const user = auth.currentUser;
            if (user) {
                const job = window.jobDetails[jobId];
                const applicationRef = doc(collection(db, 'users', user.uid, 'applications'));
                await setDoc(applicationRef, {
                    job_id: jobId,
                    job_title: jobTitle,
                    company_name: job.company || 'N/A',
                    date_applied: serverTimestamp(),
                    status: 'Submitted'
                });
                console.log('Application saved to Firestore:', { job_id: jobId, job_title: jobTitle });
            }
            
            let successMessage = `
                <div class="application-success">
                    <i class="fas fa-check-circle"></i>
                    <h3>Application Submitted!</h3>
                    <p>Thank you for applying to "${jobTitle}".</p>
                    <p>We'll review your application and be in touch soon.</p>
            `;
            
            if (data.confirmation_sent) {
                successMessage += `<p><i class="fas fa-envelope"></i> A confirmation email has been sent to ${email}</p>`;
            }
            
            successMessage += `</div>`;
            
            applicationForm.innerHTML = successMessage;
            
            setTimeout(() => {
                applicationModal.style.display = 'none';
                resetForm();
            }, 4000);
        } catch (error) {
            console.error("Application error:", error);
            alert('Error submitting application: ' + error.message);
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }
});

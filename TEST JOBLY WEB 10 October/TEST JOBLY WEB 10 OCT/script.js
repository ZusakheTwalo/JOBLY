document.addEventListener('DOMContentLoaded', function() {
    const keywordInput = document.getElementById('keyword');
    const departmentSelect = document.getElementById('department');
    const searchButton = document.getElementById('search-button');
    const loadingElement = document.getElementById('loading');
    const jobsContainer = document.getElementById('jobs');
    
    // Modal elements
    const modal = document.getElementById('application-modal');
    const closeBtn = document.querySelector('.close');
    const jobTitleElement = document.getElementById('job-title');
    const jobIdElement = document.getElementById('job-id');
    const applicationForm = document.getElementById('application-form');

    // Load departments on page load
    loadDepartments();

    // Event listeners
    searchButton.addEventListener('click', fetchJobs);
    keywordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') fetchJobs();
    });
    
    // Modal events
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Form submission
    applicationForm.addEventListener('submit', handleApplication);

    function loadDepartments() {
        try {
            // Clear existing options except the first one
            while (departmentSelect.options.length > 1) {
                departmentSelect.remove(1);
            }
            
            // Fetch departments from backend
            fetch('/departments')
                .then(response => response.json())
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
                    // Fallback to mock departments
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
            
            fetchJobs(); // Load initial jobs
        } catch (error) {
            console.error("Error loading departments:", error);
        }
    }

    function fetchJobs() {
        const keyword = keywordInput.value.trim();
        const department = departmentSelect.value;
        
        // Handle "All Industries" case for API call
        const departmentToSend = department === "All Industries" ? "" : department;
        
        loadingElement.style.display = 'block';
        jobsContainer.innerHTML = '';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (departmentToSend) params.append('department', departmentToSend);
        
        fetch(`/jobs?${params.toString()}`)
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
                        <p>${error.message}</p>
                        <p>Please try again later or check your connection</p>
                    </div>
                `;
            })
            .finally(() => {
                loadingElement.style.display = 'none';
            });
    }

    function displayJobs(jobs) {
        const jobsByDepartment = {};
        
        jobs.forEach(job => {
            const dept = job.department || 'Other';
            if (!jobsByDepartment[dept]) jobsByDepartment[dept] = [];
            jobsByDepartment[dept].push(job);
        });
        
        let html = '';
        for (const [department, deptJobs] of Object.entries(jobsByDepartment)) {
            html += `
                <div class="department-section">
                    <div class="department-header">
                        <h2>${department}</h2>
                        <span class="job-count-badge">${deptJobs.length} job${deptJobs.length !== 1 ? 's' : ''}</span>
                    </div>
                    ${deptJobs.map(job => `
                        <div class="job">
                            <h3>${job.title || 'No title'}</h3>
                            <div class="job-meta">
                                <span><i class="fas fa-building"></i> ${job.company || 'N/A'}</span>
                                <span><i class="fas fa-map-marker-alt"></i> ${job.location || 'N/A'}</span>
                                ${job.salary_min ? `<span><i class="fas fa-money-bill-wave"></i> R${job.salary_min.toLocaleString()}</span>` : ''}
                                ${job.days_ago !== null ? `<span><i class="fas fa-clock"></i> ${job.days_ago} day${job.days_ago !== 1 ? 's' : ''} ago</span>` : ''}
                            </div>
                            ${job.description ? `<div class="job-description">${job.description.substring(0, 200)}${job.description.length > 200 ? '...' : ''}</div>` : ''}
                            <div class="job-actions">
                                <button class="apply-btn" data-job-id="${job.id}" data-job-title="${job.title || 'N/A'}">
                                    <i class="fas fa-paper-plane"></i> Apply Now
                                </button>
                                ${job.url ? `<button onclick="window.open('${job.url}', '_blank')">
                                    <i class="fas fa-external-link-alt"></i> View Details
                                </button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        jobsContainer.innerHTML = html;
        
        // Add event listeners to all apply buttons
        document.querySelectorAll('.apply-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const jobId = e.target.closest('.apply-btn').getAttribute('data-job-id');
                const jobTitle = e.target.closest('.apply-btn').getAttribute('data-job-title');
                openApplicationModal(jobId, jobTitle);
            });
        });
    }
    
    function openApplicationModal(jobId, jobTitle) {
        jobTitleElement.textContent = jobTitle;
        jobIdElement.value = jobId;
        modal.style.display = 'block';
        
        // Pre-fill form if user has applied before
        const savedData = localStorage.getItem('jobAppFormData');
        if (savedData) {
            const formData = JSON.parse(savedData);
            document.getElementById('applicant-name').value = formData.name || '';
            document.getElementById('applicant-email').value = formData.email || '';
            document.getElementById('applicant-phone').value = formData.phone || '';
            document.getElementById('applicant-cover').value = formData.cover || '';
        }
    }
    
    function handleApplication(e) {
        e.preventDefault();
        
        // Get form values
        const jobId = jobIdElement.value;
        const name = document.getElementById('applicant-name').value;
        const email = document.getElementById('applicant-email').value;
        const phone = document.getElementById('applicant-phone').value;
        const coverLetter = document.getElementById('applicant-cover').value;
        const resume = document.getElementById('applicant-resume').files[0];
        
        // Validate form
        if (!name || !email || !phone || !resume) {
            alert('Please fill in all required fields');
            return;
        }
        
        // Save form data to localStorage for future use
        const formData = {
            name: name,
            email: email,
            phone: phone,
            cover: coverLetter
        };
        localStorage.setItem('jobAppFormData', JSON.stringify(formData));
        
        // Create FormData for file upload
        const formDataToSend = new FormData();
        formDataToSend.append('job_id', jobId);
        formDataToSend.append('name', name);
        formDataToSend.append('email', email);
        formDataToSend.append('phone', phone);
        formDataToSend.append('cover_letter', coverLetter);
        formDataToSend.append('resume', resume);
        
        // Send application to backend
        fetch('/apply', {
            method: 'POST',
            body: formDataToSend
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Show success message
            applicationForm.innerHTML = `
                <div class="application-success">
                    <i class="fas fa-check-circle" style="font-size: 3rem;"></i>
                    <h3>Application Submitted!</h3>
                    <p>Thank you for applying to "${jobTitleElement.textContent}".</p>
                    <p>We'll review your application and be in touch soon.</p>
                </div>
            `;
            
            setTimeout(() => {
                modal.style.display = 'none';
                
                // Reset form for next time
                applicationForm.reset();
                applicationForm.innerHTML = document.getElementById('application-form').innerHTML;
                
                // Reattach event listeners
                applicationForm.addEventListener('submit', handleApplication);
            }, 3000);
        })
        .catch(error => {
            console.error("Application error:", error);
            alert('Error submitting application: ' + error.message);
        });
    }
});
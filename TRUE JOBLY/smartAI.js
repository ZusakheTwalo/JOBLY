// Debug function
        function debugLog(message, data = null) {
            console.log(`[SmartAI Debug] ${message}`, data || '');
            
            // Also show in UI for easier debugging if debug panel is visible
            const debugOutput = document.getElementById('debug-output');
            if (debugOutput) {
                const time = new Date().toLocaleTimeString();
                const debugEntry = document.createElement('div');
                debugEntry.className = 'debug-entry';
                debugEntry.innerHTML = `
                    <span class="debug-time">[${time}]</span>
                    <span>${message}</span>
                `;
                debugOutput.appendChild(debugEntry);
                debugOutput.scrollTop = debugOutput.scrollHeight;
            }
        }

        // Toggle debug panel visibility
        function toggleDebugPanel() {
            const debugPanel = document.getElementById('debug-panel');
            const debugToggle = document.getElementById('debug-toggle');
            
            if (debugPanel.style.display === 'block') {
                debugPanel.style.display = 'none';
                debugToggle.textContent = 'Show';
            } else {
                debugPanel.style.display = 'block';
                debugToggle.textContent = 'Hide';
            }
        }

        // Set up debug panel toggle
        document.addEventListener('DOMContentLoaded', function() {
            const debugToggle = document.getElementById('debug-toggle');
            if (debugToggle) {
                debugToggle.addEventListener('click', toggleDebugPanel);
            }
            
            // Add keyboard shortcut to toggle debug panel (Ctrl+Shift+D)
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    toggleDebugPanel();
                }
            });
            
            // Set up application modal events
            const applicationModal = document.getElementById('application-modal');
            const closeApplicationBtn = document.querySelector('.close-application');
            const applicationForm = document.getElementById('application-form');
            
            if (closeApplicationBtn) {
                closeApplicationBtn.addEventListener('click', () => {
                    applicationModal.style.display = 'none';
                    resetApplicationForm();
                });
            }
            
            if (applicationForm) {
                applicationForm.addEventListener('submit', handleApplication);
            }
            
            window.addEventListener('click', (e) => {
                if (e.target === applicationModal) {
                    applicationModal.style.display = 'none';
                    resetApplicationForm();
                }
            });
            
            // Initialize the app
            initializeApp();
        });

        // Global variable to store all matched jobs
        let allMatchedJobs = [];

        // Simulate the SmartAI process with actual API calls
        async function initializeApp() {
            debugLog('Starting SmartAI initialization');
            
            try {
                // Simulate authentication (replace with your actual auth code)
                debugLog('Checking authentication status');
                const isAuthenticated = await checkAuthentication();
                
                if (!isAuthenticated) {
                    debugLog('User not authenticated, redirecting to login');
                    window.location.href = 'login.html';
                    return;
                }
                
                debugLog('User authenticated successfully');
                
                // Simulate fetching CV data (replace with your actual Firebase code)
                debugLog('Fetching CV data from Firebase');
                const cvData = await fetchCVData();
                
                if (!cvData) {
                    document.getElementById('no-cv-message').style.display = 'block';
                    document.getElementById('loading').style.display = 'none';
                    debugLog('No CV found, showing message');
                    return;
                }
                
                debugLog('CV data retrieved successfully');
                
                // Display CV summary
                displayCVSummary(cvData);
                
                // Fetch jobs from API
                debugLog('Fetching jobs from API');
                const jobs = await fetchJobs();
                
                debugLog(`Received ${jobs.length} jobs from API`);
                
                // Calculate matches
                debugLog('Calculating job matches');
                const matchedJobs = calculateMatches(jobs, cvData);
                
                debugLog(`Calculated ${matchedJobs.length} job matches`);
                
                // Store all matched jobs for filtering
                allMatchedJobs = matchedJobs;
                
                // Display job matches
                displayJobMatches(matchedJobs);
                
                // Show the dashboard content and filters
                document.getElementById('dashboard-content').style.display = 'grid';
                document.getElementById('filters-section').style.display = 'block';
                document.getElementById('loading').style.display = 'none';
                
                debugLog('Dashboard displayed successfully');
                
            } catch (error) {
                console.error('Error:', error);
                debugLog('Error occurred: ' + error.message);
                
                // Show error message
                document.getElementById('loading').innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error loading your data</h3>
                        <p>${error.message}</p>
                        <button onclick="window.location.reload()" class="btn" style="margin-top: 10px;">Try Again</button>
                    </div>
                `;
            }
        }

        // Enhanced CV data extraction
        function extractCVData(cvData) {
            // Parse skills into an array with proper normalization
            const skills = cvData.skills 
                ? cvData.skills.split(',').map(skill => skill.trim().toLowerCase())
                : [];
            
            // Extract experience level
            const experience = extractExperienceLevel(cvData.experience || '');
            
            // Extract education level
            const education = extractEducationLevel(cvData.education || '');
            
            return { skills, experience, education };
        }

        function extractExperienceLevel(experienceText) {
            const text = experienceText.toLowerCase();
            if (text.includes('senior') || text.match(/\d+\s*(\+|plus)\s*years/) || text.match(/([5-9]|[1-9]\d+)\s*years/)) {
                return 'senior';
            } else if (text.includes('mid-level') || text.match(/[3-7]\s*years/)) {
                return 'mid-level';
            } else if (text.includes('junior') || text.includes('entry') || text.match(/[0-2]\s*years/)) {
                return 'junior';
            }
            return 'unknown';
        }

        function extractEducationLevel(educationText) {
            const text = educationText.toLowerCase();
            if (text.includes('phd') || text.includes('doctorate')) {
                return 'phd';
            } else if (text.includes('master')) {
                return 'masters';
            } else if (text.includes('bachelor') || text.includes('bs') || text.includes('ba')) {
                return 'bachelors';
            } else if (text.includes('associate') || text.includes('diploma')) {
                return 'associate';
            } else if (text.includes('high school') || text.includes('hs')) {
                return 'high-school';
            }
            return 'unknown';
        }

        // Enhanced job analysis
        function analyzeJobRequirements(jobDescription) {
            const desc = jobDescription.toLowerCase();
            
            // Extract required skills
            const requiredSkills = extractSkillsFromText(desc);
            
            // Extract required experience level
            const requiredExperience = extractRequiredExperience(desc);
            
            // Extract required education
            const requiredEducation = extractRequiredEducation(desc);
            
            return { requiredSkills, requiredExperience, requiredEducation };
        }

        function extractSkillsFromText(text) {
            // Common tech skills to look for
            const commonSkills = [
                'javascript', 'python', 'java', 'c#', 'php', 'ruby', 'go', 'rust',
                'react', 'angular', 'vue', 'node', 'express', 'django', 'flask',
                'html', 'css', 'sass', 'less', 'sql', 'nosql', 'mongodb', 'postgresql',
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'git'
            ];
            
            return commonSkills.filter(skill => text.includes(skill));
        }

        function extractRequiredExperience(text) {
            if (text.includes('senior') || text.match(/\d+\s*(\+|plus)\s*years/) || text.match(/([5-9]|[1-9]\d+)\s*years/)) {
                return 'senior';
            } else if (text.includes('mid-level') || text.match(/[3-7]\s*years/)) {
                return 'mid-level';
            } else if (text.includes('junior') || text.includes('entry') || text.match(/[0-2]\s*years/)) {
                return 'junior';
            }
            return 'unknown';
        }

        function extractRequiredEducation(text) {
            if (text.includes('phd') || text.includes('doctorate')) {
                return 'phd';
            } else if (text.includes('master')) {
                return 'masters';
            } else if (text.includes('bachelor') || text.includes('bs') || text.includes('ba')) {
                return 'bachelors';
            } else if (text.includes('associate') || text.includes('diploma')) {
                return 'associate';
            }
            return 'unknown';
        }

        // Filter jobs based on minimum match score
        function filterJobs() {
            const minScore = parseInt(document.getElementById('min-match').value);
            const filteredJobs = allMatchedJobs.filter(job => job.matchScore >= minScore);
            
            // Clear existing displays
            document.getElementById('top-matches').innerHTML = '';
            document.getElementById('all-matches').innerHTML = '';
            
            // Display filtered jobs
            displayJobMatches(filteredJobs);
            
            debugLog(`Filtered jobs to show only those with ${minScore}% match or higher`);
        }

        // Simulate authentication check
        async function checkAuthentication() {
            // Replace with your actual authentication check
            return new Promise(resolve => {
                setTimeout(() => resolve(true), 500);
            });
        }

        // Simulate fetching CV data
        async function fetchCVData() {
            // Replace with your actual Firebase code
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        skills: "JavaScript, React, Node.js, Python, HTML, CSS",
                        experience: "5 years of full-stack development experience",
                        education: "Bachelor's degree in Computer Science"
                    });
                }, 1000);
            });
        }

        // Fetch jobs from API
        async function fetchJobs() {
            try {
                debugLog('Fetching jobs from API endpoint');
                
                const response = await fetch('https://jobs-api-1-pqyy.onrender.com/jobs');
                
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }
                
                const jobs = await response.json();
                return jobs;
                
            } catch (error) {
                console.error('Error fetching jobs:', error);
                debugLog('Error fetching jobs: ' + error.message);
                
                // Return mock data if API fails
                debugLog('Using mock job data as fallback');
                return [
                    {
                        id: '1',
                        title: 'Frontend Developer',
                        company: 'Tech Solutions Inc.',
                        description: 'Looking for a skilled frontend developer with React experience. Minimum 3 years of professional experience required. Bachelor\'s degree in Computer Science preferred.'
                    },
                    {
                        id: '2',
                        title: 'Full Stack Engineer',
                        company: 'Web Innovations LLC',
                        description: 'Join our team as a full stack engineer. We need someone with Node.js and React skills. 5+ years of experience and a degree in Computer Science or related field.'
                    },
                    {
                        id: '3',
                        title: 'JavaScript Developer',
                        company: 'Digital Creations',
                        description: 'JavaScript developer needed with expertise in modern frameworks. Experience with HTML and CSS is required. Education background in web development is a plus.'
                    },
                    {
                        id: '4',
                        title: 'Marketing Specialist',
                        company: 'Creative Ads Co.',
                        description: 'Seeking a marketing specialist with 3+ years of experience in digital marketing. Bachelor\'s degree in Marketing or related field required.'
                    },
                    {
                        id: '5',
                        title: 'Data Scientist',
                        company: 'Analytics Pro',
                        description: 'Looking for a data scientist with Python, machine learning, and statistical analysis experience. Master\'s degree or PhD in Data Science preferred.'
                    }
                ];
            }
        }

        function displayCVSummary(cvData) {
            // Display skills
            const skillsContainer = document.getElementById('cv-skills');
            if (cvData.skills) {
                const skills = cvData.skills.split(',').map(skill => skill.trim());
                skills.forEach(skill => {
                    const skillTag = document.createElement('span');
                    skillTag.className = 'cv-tag';
                    skillTag.textContent = skill;
                    skillsContainer.appendChild(skillTag);
                });
            }
            
            // Display experience
            const experienceContainer = document.getElementById('cv-experience');
            if (cvData.experience) {
                experienceContainer.textContent = cvData.experience;
            } else {
                experienceContainer.textContent = 'No experience listed';
            }
            
            // Display education
            const educationContainer = document.getElementById('cv-education');
            if (cvData.education) {
                educationContainer.textContent = cvData.education;
            } else {
                educationContainer.textContent = 'No education listed';
            }
            
            debugLog('CV summary displayed');
        }

        function calculateMatches(jobs, cvData) {
            const { skills, experience, education } = extractCVData(cvData);
            
            // Calculate match score for each job
            return jobs.map(job => {
                const { requiredSkills, requiredExperience, requiredEducation } = analyzeJobRequirements(job.description || '');
                
                let score = 0;
                let reasons = [];
                let missing = [];
                
                // Skills matching (50% of score)
                if (requiredSkills.length > 0) {
                    const matchedSkills = skills.filter(skill => 
                        requiredSkills.includes(skill)
                    );
                    
                    const skillMatchPercentage = matchedSkills.length / requiredSkills.length;
                    score += Math.min(50, skillMatchPercentage * 50);
                    
                    if (matchedSkills.length > 0) {
                        reasons.push(`Your skills in ${matchedSkills.slice(0, 3).join(', ')} match ${Math.round(skillMatchPercentage * 100)}% of required skills.`);
                    } else {
                        missing.push(`Missing all required skills: ${requiredSkills.join(', ')}`);
                    }
                }
                
                // Experience matching (25% of score)
                if (requiredExperience !== 'unknown') {
                    const experienceLevels = ['junior', 'mid-level', 'senior'];
                    const cvExpIndex = experienceLevels.indexOf(experience);
                    const jobExpIndex = experienceLevels.indexOf(requiredExperience);
                    
                    if (cvExpIndex >= jobExpIndex) {
                        score += 25;
                        reasons.push(`Your ${experience} experience meets or exceeds the ${requiredExperience} level required.`);
                    } else {
                        score += Math.max(0, 25 - (jobExpIndex - cvExpIndex) * 10);
                        missing.push(`The position requires ${requiredExperience} level experience, but you have ${experience} experience.`);
                    }
                }
                
                // Education matching (25% of score)
                if (requiredEducation !== 'unknown') {
                    const educationLevels = ['high-school', 'associate', 'bachelors', 'masters', 'phd'];
                    const cvEduIndex = educationLevels.indexOf(education);
                    const jobEduIndex = educationLevels.indexOf(requiredEducation);
                    
                    if (cvEduIndex >= jobEduIndex) {
                        score += 25;
                        reasons.push(`Your ${education} education meets or exceeds the ${requiredEducation} requirement.`);
                    } else {
                        score += Math.max(0, 25 - (jobEduIndex - cvEduIndex) * 10);
                        missing.push(`The position requires ${requiredEducation} education, but you have ${education}.`);
                    }
                }
                
                // Ensure score is between 0-100
                score = Math.min(100, Math.max(0, Math.round(score)));
                
                return {
                    ...job,
                    matchScore: score,
                    matchReasons: reasons,
                    missingRequirements: missing
                };
            }).filter(job => job.matchScore >= 30) // Only show jobs with at least 30% match
            .sort((a, b) => b.matchScore - a.matchScore);
        }

        function displayJobMatches(matchedJobs) {
            // Display top 3 matches
            const topMatchesContainer = document.getElementById('top-matches');
            const topMatches = matchedJobs.slice(0, 3);
            
            if (topMatches.length === 0) {
                topMatchesContainer.innerHTML = `
                    <div class="no-matches">
                        <i class="fas fa-search"></i>
                        <h3>No strong matches found</h3>
                        <p>Try lowering the minimum match score or adding more skills to your CV</p>
                    </div>
                `;
            } else {
                topMatches.forEach(job => {
                    const matchCard = document.createElement('div');
                    matchCard.className = 'top-match-card';
                    matchCard.innerHTML = `
                        <span class="match-badge">${job.matchScore}% Match</span>
                        <h3>${job.title}</h3>
                        <p class="company">${job.company}</p>
                        <p class="match-reason">${job.matchReasons[0] || 'Good overall match for your profile.'}</p>
                        ${job.missingRequirements.length > 0 ? 
                            `<p class="missing-skills"><strong>Note:</strong> ${job.missingRequirements[0]}</p>` : 
                            ''}
                    `;
                    topMatchesContainer.appendChild(matchCard);
                });
            }
            
            // Display all matches
            const allMatchesContainer = document.getElementById('all-matches');
            
            if (matchedJobs.length === 0) {
                allMatchesContainer.innerHTML = `
                    <div class="no-matches">
                        <i class="fas fa-search"></i>
                        <h3>No job matches found</h3>
                        <p>Try lowering the minimum match score or adding more skills to your CV</p>
                    </div>
                `;
            } else {
                matchedJobs.forEach(job => {
                    const jobElement = document.createElement('div');
                    jobElement.className = 'job-match';
                    jobElement.innerHTML = `
                        <div class="job-match-header">
                            <div>
                                <h3 class="job-title">${job.title}</h3>
                                <p class="company-name">${job.company}</p>
                            </div>
                            <span class="match-score">${job.matchScore}% Match</span>
                        </div>
                        <div class="match-details">
                            <div class="match-reason">
                                <h4>Why you're a good fit:</h4>
                                <p>${job.matchReasons.join(' ')}</p>
                            </div>
                            ${job.missingRequirements.length > 0 ? `
                            <div class="missing-requirements">
                                <h4>Consider improving:</h4>
                                <p class="missing-list">${job.missingRequirements.join(' ')}</p>
                            </div>
                            ` : ''}
                        </div>
                        <div class="job-actions">
                            <button class="apply-btn" onclick="applyForJob('${job.id}', '${job.title}', '${job.company}')">Apply Now</button>
                        </div>
                    `;
                    allMatchesContainer.appendChild(jobElement);
                });
            }
            
            debugLog(`Displayed ${matchedJobs.length} job matches`);
        }

        // Function to handle job applications
        function applyForJob(jobId, jobTitle, companyName) {
            // Update modal content
            document.getElementById('job-title').textContent = jobTitle;
            document.getElementById('job-id').value = jobId;
            document.getElementById('job-title-field').value = jobTitle;
            document.getElementById('company-name-field').value = companyName;
            
            // Show the modal
            document.getElementById('application-modal').style.display = 'block';
            
            debugLog(`Opening application form for: ${jobTitle} at ${companyName}`);
        }

        // Function to reset the application form
        function resetApplicationForm() {
            const applicationForm = document.getElementById('application-form');
            
            // Recreate the form if it was replaced with success message
            if (applicationForm.querySelector('.application-success') || !applicationForm.querySelector('.form-group')) {
                const formHtml = `
                    <input type="hidden" id="job-id" name="job_id">
                    <input type="hidden" id="job-title-field" name="job_title">
                    <input type="hidden" id="company-name-field" name="company_name">
                    
                    <div class="form-group">
                        <label for="applicant-name">Full Name *</label>
                        <input type="text" id="applicant-name" name="name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="applicant-email">Email *</label>
                        <input type="email" id="applicant-email" name="email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="applicant-phone">Phone Number *</label>
                        <input type="tel" id="applicant-phone" name="phone" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="applicant-resume">Upload Resume (PDF, DOC, DOCX) *</label>
                        <input type="file" id="applicant-resume" name="resume" accept=".pdf,.doc,.docx" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="applicant-cover">Cover Letter</label>
                        <textarea id="applicant-cover" name="cover_letter" placeholder="Tell us why you're a good fit for this position..."></textarea>
                    </div>
                    
                    <button type="submit" class="apply-button">Submit Application</button>
                `;
                
                applicationForm.innerHTML = formHtml;
                
                // Reattach event listener
                applicationForm.addEventListener('submit', handleApplication);
            } else {
                applicationForm.reset();
            }
        }

        // Function to handle application form submission
        async function handleApplication(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            
            try {
                // API Base URL
                const API_BASE_URL = 'https://jobs-api-1-pqyy.onrender.com';
                
                const response = await fetch(`${API_BASE_URL}/apply`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Application failed');
                }
                
                const data = await response.json();
                
                // Show success message
                const successMessage = `
                    <div class="application-success">
                        <i class="fas fa-check-circle"></i>
                        <h3>Application Submitted Successfully!</h3>
                        <p>Thank you for applying to "${document.getElementById('job-title').textContent}".</p>
                        ${data.confirmation_sent ? 
                            '<p><i class="fas fa-envelope"></i> A confirmation email has been sent to your email address.</p>' : 
                            ''}
                        <p>Your application has been forwarded to the hiring team.</p>
                        <p>They will review your qualifications and contact you if you're selected for an interview.</p>
                    </div>
                `;
                
                e.target.innerHTML = successMessage;
                
                // Close modal after 5 seconds
                setTimeout(() => {
                    document.getElementById('application-modal').style.display = 'none';
                    resetApplicationForm();
                }, 5000);
                
            } catch (error) {
                console.error('Application error:', error);
                alert('Error submitting application: ' + error.message);
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        }
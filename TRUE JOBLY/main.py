from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
import os
import re
import time
import threading
import base64
from datetime import datetime
from werkzeug.utils import secure_filename

# SendGrid imports
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition

app = Flask(__name__, static_folder='.', static_url_path='')

# Enable CORS for all origins
CORS(app)

# Adzuna API credentials
ADZUNA_APP_ID = "23c1b28a"
ADZUNA_API_KEY = "4b9b103c5696357dc79c7c98d7ba5d6d"
COUNTRY_CODE = "za"

# SendGrid configuration
# Remove the default API key - only use environment variable
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@joblyplatform.co.za')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@joblyplatform.co.za')

# Allowed file extensions for resumes
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}

# Department categorization
DEPARTMENT_KEYWORDS = {
    "Accounting and Finance": ["accountant", "finance", "audit", "bookkeeper", "tax", "payroll", "cfo", "financial", "accounting"],
    "Building and Construction": ["construction", "builder", "architect", "civil engineer", "carpenter", "plumber", "electrician", "contractor", "building"],
    "Business Management": ["manager", "management", "business", "executive", "director", "consultant", "strategist", "operations", "business development"],
    "Creativity and Media": ["designer", "artist", "media", "creative", "photographer", "writer", "editor", "content", "graphic", "video"],
    "Defense and Security": ["security", "police", "defense", "military", "safety", "guard", "armed", "protection", "patrol"],
    "Education": ["teacher", "lecturer", "educator", "tutor", "professor", "school", "university", "college", "instructor", "training"],
    "Engineering": ["engineer", "mechanical", "electrical", "chemical", "industrial", "technician", "technical", "development", "design"],
    "Health": ["doctor", "nurse", "medical", "healthcare", "pharmacist", "dentist", "hospital", "clinic", "therapist", "caregiver"],
    "Public Relations": ["PR", "public relations", "communication", "marketing", "advertising", "brand", "social media", "campaign", "outreach"],
    "Technology": ["developer", "programmer", "IT", "software", "data", "analyst", "cyber", "system", "network", "database", "web", "app"],
    "Tourism": ["tourism", "travel", "hotel", "tour guide", "hospitality", "chef", "restaurant", "accommodation", "resort", "tourist"],
    "Transport": ["driver", "logistics", "transport", "supply chain", "shipping", "delivery", "courier", "fleet", "truck", "logistic"],
    "Sales": ["sales", "account manager", "business development", "representative", "retail", "merchandiser", "client executive"],
    "Human Resources": ["HR", "human resources", "recruiter", "talent", "recruitment", "people operations", "hiring"],
    "Customer Service": ["customer service", "support", "call center", "helpdesk", "client service", "contact center"],
    "Other": []
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def categorize_job(title, description=""):
    if not title:
        return "Other"
    
    title_lower = title.lower()
    description_lower = description.lower() if description else ""
    text_to_search = title_lower + " " + description_lower
    
    for department, keywords in DEPARTMENT_KEYWORDS.items():
        for keyword in keywords:
            if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', text_to_search):
                return department
    return "Other"

def fetch_jobs(keyword=None, department=None, page=1, max_results=100):
    all_jobs = []
    max_pages = 5
    
    for current_page in range(1, max_pages + 1):
        url = f"https://api.adzuna.com/v1/api/jobs/{COUNTRY_CODE}/search/{current_page}"
        params = {
            "app_id": ADZUNA_APP_ID,
            "app_key": ADZUNA_API_KEY,
            "results_per_page": 50,
            "sort_by": "date",
            "max_days_old": 30
        }
        
        if keyword:
            params["what"] = keyword
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if response.status_code == 429:
                time.sleep(2)
                continue
                
            if not data.get("results"):
                break
                
            for job in data.get("results", []):
                job_department = categorize_job(job.get("title"), job.get("description"))
                
                if department and department != "All Industries":
                    if job_department.lower() != department.lower():
                        continue
                        
                created = job.get("created")
                days_ago = None
                if created:
                    try:
                        created_date = datetime.strptime(created, "%Y-%m-%dT%H:%M:%SZ")
                        days_ago = (datetime.now() - created_date).days
                    except ValueError:
                        days_ago = None
                
                all_jobs.append({
                    "id": job.get("id"),
                    "title": job.get("title"),
                    "company": job.get("company", {}).get("display_name"),
                    "location": job.get("location", {}).get("display_name"),
                    "salary_min": job.get("salary_min"),
                    "salary_max": job.get("salary_max"),
                    "salary_is_predicted": job.get("salary_is_predicted"),
                    "url": job.get("redirect_url"),
                    "department": job_department,
                    "description": job.get("description", ""),
                    "created": created,
                    "days_ago": days_ago
                })
                
                if len(all_jobs) >= max_results:
                    break
                    
            if len(all_jobs) >= max_results:
                break
                
        except Exception as e:
            print(f"Error fetching jobs: {e}")
            break
    
    return all_jobs

def create_attachment(file_path, filename):
    """Create SendGrid attachment from file"""
    try:
        with open(file_path, 'rb') as f:
            data = f.read()
        
        encoded = base64.b64encode(data).decode()
        
        # Determine MIME type
        file_ext = filename.split('.')[-1].lower()
        mime_types = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
        mime_type = mime_types.get(file_ext, 'application/octet-stream')
        
        return Attachment(
            FileContent(encoded),
            FileName(filename),
            FileType(mime_type),
            Disposition('attachment')
        )
    except Exception as e:
        print(f"Error creating attachment: {e}")
        return None

def send_application_email(job_id, name, email, phone, cover_letter, resume_path):
    try:
        # Create SendGrid client
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        
        # Create email message
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=ADMIN_EMAIL,
            subject=f"Job Application: {job_id} - {name}",
            html_content=f"""
            <h3>New Job Application Received</h3>
            <p><strong>Position:</strong> {job_id}</p>
            <p><strong>Applicant Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Phone:</strong> {phone}</p>
            <p><strong>Cover Letter:</strong></p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                {cover_letter if cover_letter else 'No cover letter provided'}
            </div>
            <p><em>This email was sent from Jobly Recruitment Portal</em></p>
            """
        )
        
        # Add resume attachment
        if resume_path and os.path.exists(resume_path):
            attachment = create_attachment(resume_path, os.path.basename(resume_path))
            if attachment:
                message.attachment = attachment
                print("✅ Resume attachment added")
        
        # Send email
        response = sg.send(message)
        print(f"✅ Application email sent successfully. Status: {response.status_code}")
        return response.status_code in [200, 202]
        
    except Exception as e:
        print(f"❌ Error sending application email: {str(e)}")
        return False

def send_confirmation_email(applicant_email, applicant_name, job_title):
    try:
        # Create SendGrid client
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        
        # Create confirmation email
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=applicant_email,
            subject=f"Application Confirmation - {job_title}",
            html_content=f"""
            <h3>Application Received Successfully!</h3>
            <p>Dear {applicant_name},</p>
            
            <p>Thank you for applying for the position of <strong>{job_title}</strong> through Jobly Recruitment.</p>
            
            <p>We have successfully received your application. It will be fowarded to the company for review.
            If your qualifications matches their requirements, they will contact you.</p>
            
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4>Application Summary</h4>
                <p><strong>Position:</strong> {job_title}</p>
                <p><strong>Applicant:</strong> {applicant_name}</p>
                <p><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
            </div>
            
            <p>Best regards,<br>
            <strong>The Jobly Recruitment Team</strong></p>
            
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
                This is an automated confirmation. Please do not reply to this email.
            </p>
            """
        )
        
        # Send email
        response = sg.send(message)
        print(f"✅ Confirmation email sent successfully. Status: {response.status_code}")
        return response.status_code in [200, 202]
        
    except Exception as e:
        print(f"❌ Error sending confirmation email: {str(e)}")
        return False

def send_emails_async(job_id, name, email, phone, cover_letter, resume_path, job_title):
    """Send emails in a background thread"""
    def send_emails():
        try:
            print("📧 Starting background email process...")
            
            # Send application email to admin
            print("📧 Sending application email to admin...")
            app_email_sent = send_application_email(job_id, name, email, phone, cover_letter, resume_path)
            
            # Send confirmation email to applicant
            print("📧 Sending confirmation email to applicant...")
            conf_email_sent = send_confirmation_email(email, name, job_title)
            
            if app_email_sent and conf_email_sent:
                print("✅ All emails sent successfully")
            else:
                print("⚠️ Some emails may not have been sent successfully")
                
        except Exception as e:
            print(f"❌ Error in email thread: {str(e)}")
    
    # Start email sending in background thread
    email_thread = threading.Thread(target=send_emails)
    email_thread.daemon = True
    email_thread.start()
    print("✅ Email thread started")

def cleanup_file_async(resume_path):
    """Clean up temporary file in background"""
    def cleanup():
        try:
            # Wait 15 seconds to ensure email thread has read the file
            print(f"⏳ Waiting to clean up file: {resume_path}")
            time.sleep(15)
            
            if os.path.exists(resume_path):
                os.remove(resume_path)
                print("✅ Temporary file cleaned up")
            else:
                print("ℹ️ File already removed or not found")
        except Exception as e:
            print(f"❌ Error cleaning up file: {str(e)}")
    
    cleanup_thread = threading.Thread(target=cleanup)
    cleanup_thread.daemon = True
    cleanup_thread.start()

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/jobs')
def get_jobs():
    try:
        keyword = request.args.get('keyword')
        department = request.args.get('department')
        
        if department == "All Industries" or department == "":
            department = None
            
        page = int(request.args.get('page', 1))
        jobs = fetch_jobs(keyword=keyword, department=department, page=page, max_results=100)
        return jsonify(jobs)
    except Exception as e:
        print(f"❌ Error in /jobs endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/departments')
def get_departments():
    return jsonify(list(DEPARTMENT_KEYWORDS.keys()))

@app.route('/apply', methods=['POST'])
def handle_application():
    print("📨 Application endpoint hit")
    
    try:
        # Check if request contains form data
        if not request.form and not request.files:
            print("❌ No form data received")
            return jsonify({"error": "No form data received"}), 400
        
        # Check if resume file is present
        if 'resume' not in request.files:
            print("❌ No resume file in request")
            return jsonify({"error": "No resume file provided"}), 400
        
        resume = request.files['resume']
        print(f"📄 Resume file: {resume.filename}")
        
        if resume.filename == '':
            print("❌ Empty resume filename")
            return jsonify({"error": "No resume file selected"}), 400
        
        if not allowed_file(resume.filename):
            print("❌ Invalid file type")
            return jsonify({"error": "Invalid file type. Please upload PDF, DOC, or DOCX files only."}), 400
        
        # Get form data
        job_id = request.form.get('job_id', 'Unknown Position')
        job_title = request.form.get('job_title', 'Unknown Position')
        name = request.form.get('name', '')
        email = request.form.get('email', '')
        phone = request.form.get('phone', '')
        cover_letter = request.form.get('cover_letter', '')
        
        print(f"👤 Application details - Name: {name}, Email: {email}, Job: {job_title}")
        
        # Validate required fields
        if not all([name, email, phone]):
            print("❌ Missing required fields")
            return jsonify({"error": "Missing required fields: name, email, and phone are required"}), 400
        
        # Validate email format
        import re
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            print("❌ Invalid email format")
            return jsonify({"error": "Invalid email format"}), 400
        
        # Create uploads directory if it doesn't exist
        uploads_dir = 'uploads'
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
            print(f"📁 Created uploads directory: {uploads_dir}")
        
        # Save the resume temporarily
        filename = secure_filename(resume.filename)
        resume_path = os.path.join(uploads_dir, f"{name.replace(' ', '_')}_{job_id}_{filename}")
        resume.save(resume_path)
        print(f"✅ Resume saved temporarily: {resume_path}")
        
        # Send emails in background thread
        send_emails_async(job_id, name, email, phone, cover_letter, resume_path, job_title)
        
        # Clean up temporary file in background
        cleanup_file_async(resume_path)
        
        # Return immediate success response
        print("✅ Application processing started successfully")
        return jsonify({
            "message": "Application submitted successfully! You will receive a confirmation email shortly.", 
            "confirmation_sent": True
        }), 200
            
    except Exception as e:
        print(f"❌ Unexpected error in /apply: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy", "message": "Server is running"})

@app.route('/test-email')
def test_email():
    """Endpoint to test SendGrid email functionality"""
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=ADMIN_EMAIL,
            subject="SendGrid Test - Job Portal",
            html_content="<strong>This is a test email from your job portal using SendGrid!</strong>"
        )
        
        response = sg.send(message)
        return jsonify({
            "status": "success", 
            "message": f"SendGrid test email sent successfully! Status: {response.status_code}"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Create uploads directory if it doesn't exist
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    
    print("🚀 Starting Flask server with SendGrid...")
    print(f"📧 SendGrid configured: {bool(SENDGRID_API_KEY and SENDGRID_API_KEY != 'your_sendgrid_api_key_here')}")
    print(f"📨 From email: {FROM_EMAIL}")
    print(f"👤 Admin email: {ADMIN_EMAIL}")
    
    app.run(debug=False, host='0.0.0.0', port=5000)
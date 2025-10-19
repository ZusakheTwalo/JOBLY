const isLoggedIn = localStorage.getItem("current_user");

const features = {
  jobs: {
    title: "Explore Job Listings",
    desc: "Find entry-level, internship, and graduate opportunities. Updated daily.",
    images: [
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=700&h=300&fit=crop",
      "https://images.unsplash.com/photo-1521791055366-0d553872125f?w=700&h=300&fit=crop",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=700&h=300&fit=crop",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=700&h=300&fit=crop"
    ]
  },
  cvBuilder: {
    title: "CV Builder",
    desc: "Create a professional CV with our easy-to-use builder, designed to highlight your skills and experience.",
    images: [
      "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=700&h=300&fit=crop", // person typing on laptop
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=700&h=300&fit=crop", // notebook + laptop
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=700&h=300&fit=crop"  // hands with keyboard
    ]
  },
  cvTemplates: {
    title: "CV Templates",
    desc: "Choose from modern, minimalist, ATS-friendly, and standout layouts to help your CV shine.",
    images: [
      "https://cdn4.vectorstock.com/i/1000x1000/40/48/simple-professional-cv-and-resume-template-vector-46164048.jpg",
      "https://cdn-images.zety.com/pages/canva_resume_zety_us_9.png",  
      
    ]
  },
  skills: {
    title: "Skills Training",
    desc: "Upskill yourself with courses and workshops designed to enhance your career prospects.",
    images: [
       // person with headset training
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=700&h=300&fit=crop", // teamwork workshop
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=700&h=300&fit=crop"  // coding training session
    ]
  },
  mentors: {
    title: "Connect with Mentors",
    desc: "Get personalized career advice from professionals in your field. Build confidence and discover new pathways.",
    images: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=700&h=300&fit=crop",
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=700&h=300&fit=crop",
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=700&h=300&fit=crop"
    ]
  },
};

const serviceVideos = {
  jobs: "https://www.youtube.com/watch?v=Fsg1bUqNSSQ&t=337s",
  mentors: "https://www.bing.com/videos/riverview/relatedvideo?&q=mentors+on+jobs&&mid=86014AC1BF9FBDB56A3D86014AC1BF9FBDB56A3D&mmscn=mtsc&aps=33&FORM=VRDGAR",
  cvBuilder: "https://www.bing.com/videos/riverview/relatedvideo?&q=cv+builder&&mid=F5182E47B9FFBED167D8F5182E47B9FFBED167D8&&FORM=VRDGAR",
  cvTemplates: "https://www.bing.com/videos/riverview/relatedvideo?&q=cv+builder&&mid=F5182E47B9FFBED167D8F5182E47B9FFBED167D8&&FORM=VRDGAR",
  skills: "https://www.bing.com/videos/riverview/relatedvideo?&q=cv+builder&&mid=F5182E47B9FFBED167D8F5182E47B9FFBED167D8&&FORM=VRDGAR"
};

function showFeature(key) {
  const feature = features[key];
  const section = document.getElementById("feature-section");
  const topMessage = document.getElementById("top-message");
  if (!feature || !section) return;

  // Hide top-message
  if (topMessage) topMessage.style.display = "none";

  // Show only video and text for the service (no images)
  const videoSrc = serviceVideos[key];
  section.innerHTML = `
    <h3>${feature.title}</h3>
    <p>${feature.desc}</p>
    <video controls width="700" style="max-width:100%;border-radius:8px;">
      <source src="${videoSrc}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  `;
}

const heroImages = [
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=700&h=300&fit=crop",
  "https://images.unsplash.com/photo-1521791055366-0d553872125f?w=700&h=300&fit=crop",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=700&h=300&fit=crop"
];

let heroIndex = 0;
const heroImgTag = document.getElementById("hero-image");

if (heroImgTag) {
  setInterval(() => {
    heroIndex = (heroIndex + 1) % heroImages.length;
    heroImgTag.src = heroImages[heroIndex];
  }, 4000);
}

// Restore top-message when Home is clicked
function showPreview(page) {
  const topMessage = document.getElementById("top-message");
  const section = document.getElementById("feature-section");
  if (topMessage) topMessage.style.display = "";
  if (section) section.innerHTML = "";
}

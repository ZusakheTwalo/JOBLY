document.addEventListener("DOMContentLoaded", () => {
  const chatbotIcon = document.getElementById("chatbot-icon");
  const chatbotContainer = document.getElementById("chatbot-container");
  const closeBtn = document.getElementById("close-btn");
  const sendBtn = document.getElementById("send-btn");
  const input = document.getElementById("chatbot-input");
  const messages = document.getElementById("chatbot-messages");
  const clearBtn = document.getElementById("clear-btn");

  let jobSectorStep = false;

  chatbotIcon.addEventListener("click", () => {
    chatbotContainer.classList.toggle("hidden");
    if (messages.children.length === 0) {
      botGreeting();
    }
  });

  closeBtn.addEventListener("click", () => {
    chatbotContainer.classList.add("hidden");
  });

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  clearBtn.addEventListener("click", () => {
    messages.innerHTML = "";
  });

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    setTimeout(() => {
      const reply = getBotReply(text);
      addMessage(reply, "bot");
    }, 800);
  }

  function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `message ${sender}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  function botGreeting() {
    addMessage("👋 Hi there! I'm JoblyBot. How can I assist you today?", "bot");
    setTimeout(() => {
      showOptions();
    }, 600);
  }

  function showOptions() {
    addQuickReplies([
      "🔍 View Available Jobs",
      "📄 How to Apply",
      "📬 Contact Support",
      "📦 Application Status",
      "🧑‍🏫 Mentors",
      "🎓 Free Courses",
      "🧾 Create a CV",
      "💡 ATS Rating Help"
    ]);
  }

  function addQuickReplies(options) {
    options.forEach(option => {
      const btn = document.createElement("button");
      btn.className = "bot-option";
      btn.textContent = option;
      btn.addEventListener("click", () => {
        input.value = option;
        sendMessage();
      });
      messages.appendChild(btn);
    });
    messages.scrollTop = messages.scrollHeight;
  }

  function getBotReply(userInput) {
    const lower = userInput.toLowerCase();

    if (lower.includes("job") || lower.includes("view available jobs") || lower.includes("i want a job")) {
      jobSectorStep = true;
      return "Which job sector are you interested in?\n🏛 Government\n🏗 Construction\n🏢 Private Companies\n🏬 Public Companies\n➕ Other";
    }

    if (jobSectorStep) {
      jobSectorStep = false;

      if (lower.includes("government")) {
        return "Here are Government jobs:\n• Admin Clerk – Dept. of Labour\n• Traffic Officer – Municipality\n• Data Capturer – Dept. of Education";
      } else if (lower.includes("construction")) {
        return "Here are Construction jobs:\n• General Worker – BuildPro\n• Site Supervisor – MegaConstruct\n• Bricklayer – UrbanBuilders";
      } else if (lower.includes("private")) {
        return "Private Company jobs:\n• Customer Service – Clicks\n• IT Support – Private Tech Co.\n• Sales Rep – Vodacom";
      } else if (lower.includes("public")) {
        return "Public Company jobs:\n• Junior Analyst – Eskom\n• HR Assistant – SABC\n• Intern – Transnet";
      } else if (lower.includes("other")) {
        return "Other jobs:\n• Freelance Graphic Designer\n• Part-time Tutor\n• Delivery Driver – MrD";
      } else {
        jobSectorStep = true;
        return "Please select one of the following sectors: Government, Construction, Private, Public, or Other.";
      }
    }

    if (lower.includes("apply")) {
      return "You can apply by visiting our careers page and uploading your CV.";
    } else if (lower.includes("status")) {
      return "To check your application status, please log in to your Jobly profile.";
    } else if (lower.includes("contact")) {
      return "You can reach us at support@jobly.co.za or call 0800-123-456.";
    } else if (lower.includes("mentor")) {
      return "Here are your mentors' contact details:\n📧 Email: mentors@jobly.co.za\n📞 Phone: 083 456 7890";
    } else if (lower.includes("free course") || lower.includes("online course") || lower.includes("graduate") || lower.includes("matriculant")) {
      return "To access free courses, visit the Resources section of our website, then click 'For Matriculants & Graduates'. You'll find topics like CV writing, coding basics, and interview prep.";
    } else if (lower.includes("cv") || lower.includes("create cv")) {
      return "To create a strong CV:\n1. Start with personal details\n2. Write a short career objective\n3. List your education & achievements\n4. Include work/volunteer experience\n5. Add technical and soft skills\n6. Keep formatting clean and simple";
    } else if (lower.includes("ats")) {
      return "ATS (Applicant Tracking System) Tips:\n• Use simple formatting (no tables or columns)\n• Include keywords from the job post\n• Use standard section headings\n• Save in .docx or .pdf format";
    } else if (lower.includes("help")) {
      return "Sure! You can ask about jobs, mentors, CVs, ATS, free courses, how to apply, or contact support.";
    } else if (lower.includes("hello") || lower.includes("hi")) {
      return "Hello! How can I help you with Jobly today?";
    } else {
      return "Sorry, I don't understand that yet. Try asking something like 'View jobs', 'Create a CV', or 'Free courses'.";
    }
  }
});

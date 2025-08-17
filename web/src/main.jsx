import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://your-api-gateway-url.execute-api.ap-southeast-1.amazonaws.com/prod";

// Mental Health Companion App
function MentalHealthCompanion() {
  const [currentView, setCurrentView] = useState("chat");
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem("mhc_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("mhc_user");
    setUser(null);
    setIsLoggedIn(false);
    setCurrentView("login");
  };

  if (!isLoggedIn) {
    return (
      <LoginForm
        onLogin={(userData) => {
          setUser(userData);
          setIsLoggedIn(true);
          localStorage.setItem("mhc_user", JSON.stringify(userData));
          setCurrentView("chat");
        }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          padding: "1rem 2rem",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <h1
              style={{
                margin: 0,
                color: "#2d3748",
                fontSize: "1.5rem",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              🧠 MindCare Companion
            </h1>
          </div>
          <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              onClick={() => setCurrentView("chat")}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "20px",
                background: currentView === "chat" ? "#667eea" : "transparent",
                color: currentView === "chat" ? "white" : "#4a5568",
                cursor: "pointer",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setCurrentView("dashboard")}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "20px",
                background:
                  currentView === "dashboard" ? "#667eea" : "transparent",
                color: currentView === "dashboard" ? "white" : "#4a5568",
                cursor: "pointer",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCurrentView("appointments")}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "20px",
                background:
                  currentView === "appointments" ? "#667eea" : "transparent",
                color: currentView === "appointments" ? "white" : "#4a5568",
                cursor: "pointer",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
            >
              📅 Appointments
            </button>
            <div
              style={{
                marginLeft: "1rem",
                padding: "0.5rem 1rem",
                background: "rgba(102, 126, 234, 0.1)",
                borderRadius: "20px",
                fontSize: "0.9rem",
                color: "#4a5568",
              }}
            >
              👋 Hi, {user?.name || "User"}
            </div>
            <button
              onClick={logout}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                background: "white",
                color: "#4a5568",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
        {currentView === "chat" && <ChatInterface user={user} />}
        {currentView === "dashboard" && <Dashboard user={user} />}
        {currentView === "appointments" && <Appointments user={user} />}
      </main>
    </div>
  );
}

// Login Form Component
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("demo@student.edu");
  const [name, setName] = useState("Demo Student");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // For demo purposes, create a mock user
      const userData = {
        id: 1,
        email,
        name,
        created_at: new Date().toISOString(),
      };

      setTimeout(() => {
        onLogin(userData);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: "white",
          padding: "3rem",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          maxWidth: "400px",
          width: "100%",
          margin: "1rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              margin: "0 0 0.5rem 0",
              color: "#2d3748",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "2rem",
            }}
          >
            🧠 MindCare Companion
          </h1>
          <p style={{ color: "#718096", margin: 0 }}>
            Your 24/7 mental health support
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#4a5568",
                fontWeight: "500",
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "1rem",
                transition: "border-color 0.2s",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#667eea")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                color: "#4a5568",
                fontWeight: "500",
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "2px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "1rem",
                transition: "border-color 0.2s",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#667eea")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {isLoading ? "🔄 Signing In..." : "🚀 Enter MindCare"}
          </button>
        </form>

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "#f7fafc",
            borderRadius: "10px",
            fontSize: "0.9rem",
            color: "#4a5568",
          }}
        >
          <strong>🔒 Privacy First:</strong> Your conversations are encrypted
          and secure. We follow HIPAA compliance standards.
        </div>
      </div>
    </div>
  );
}

// Chat Interface Component
function ChatInterface({ user }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello ${
        user?.name || "there"
      }! 👋 I'm your MindCare companion. I'm here to provide support, listen to your concerns, and help you with mental health resources. How are you feeling today?`,
      timestamp: new Date().toISOString(),
      sentiment: "supportive",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Simulate API call for demo
      setTimeout(() => {
        const responses = [
          "I understand you're going through a challenging time. It's important to remember that seeking help is a sign of strength. Would you like to talk about what's been on your mind?",
          "Thank you for sharing that with me. Your feelings are valid and it's completely normal to experience ups and downs. Have you tried any coping strategies that have helped you before?",
          "I can hear that you're feeling overwhelmed. Let's take this one step at a time. What's one small thing that might help you feel a bit better right now?",
          "It sounds like you're dealing with a lot of stress. Remember to be kind to yourself. Would you like me to guide you through a quick breathing exercise?",
          "Your mental health is important, and I'm glad you're reaching out. If you ever feel like you're in crisis, please don't hesitate to contact emergency services or a crisis helpline.",
        ];

        const randomResponse =
          responses[Math.floor(Math.random() * responses.length)];

        const assistantMessage = {
          role: "assistant",
          content: randomResponse,
          timestamp: new Date().toISOString(),
          sentiment: "supportive",
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, but I encountered a technical issue. Please try again or contact support if the problem persists.",
          timestamp: new Date().toISOString(),
          sentiment: "neutral",
        },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        overflow: "hidden",
        height: "80vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: "1.5rem",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          color: "white",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>💝 Safe Space Chat</h2>
        <p style={{ margin: "0.5rem 0 0 0", opacity: 0.9, fontSize: "0.9rem" }}>
          🔒 Private & Secure • Available 24/7
        </p>
      </div>

      {/* Crisis Banner */}
      <div
        style={{
          background: "#fed7d7",
          color: "#c53030",
          padding: "0.75rem 1.5rem",
          fontSize: "0.9rem",
          textAlign: "center",
          borderBottom: "1px solid #fbb6ce",
        }}
      >
        <strong>🚨 Crisis Support:</strong> If you're having thoughts of
        self-harm, please call <strong>995</strong> (Emergency) or{" "}
        <strong>1800-221-4444</strong> (Samaritans)
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          background: "#f8fafc",
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: "1rem",
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "1rem",
                borderRadius: "20px",
                background:
                  message.role === "user"
                    ? "linear-gradient(135deg, #667eea, #764ba2)"
                    : "white",
                color: message.role === "user" ? "white" : "#2d3748",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  lineHeight: "1.5",
                  wordWrap: "break-word",
                }}
              >
                {message.content}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.7,
                  marginTop: "0.5rem",
                  textAlign: "right",
                }}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div
            style={{
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <div
              style={{
                padding: "1rem",
                borderRadius: "20px",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                color: "#4a5568",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <div style={{ fontSize: "0.9rem" }}>MindCare is typing</div>
                <div style={{ display: "flex", gap: "2px" }}>
                  <div
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#667eea",
                      animation: "pulse 1.5s infinite",
                    }}
                  ></div>
                  <div
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#667eea",
                      animation: "pulse 1.5s infinite 0.2s",
                    }}
                  ></div>
                  <div
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#667eea",
                      animation: "pulse 1.5s infinite 0.4s",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "1rem",
          background: "white",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share what's on your mind... (Press Enter to send)"
            disabled={isTyping}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "2px solid #e2e8f0",
              borderRadius: "15px",
              fontSize: "1rem",
              resize: "none",
              minHeight: "50px",
              maxHeight: "120px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#667eea")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
          <button
            onClick={sendMessage}
            disabled={isTyping || !input.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              background:
                input.trim() && !isTyping
                  ? "linear-gradient(135deg, #667eea, #764ba2)"
                  : "#e2e8f0",
              color: input.trim() && !isTyping ? "white" : "#a0aec0",
              border: "none",
              borderRadius: "15px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {isTyping ? "⏳" : "💬"}
          </button>
        </div>

        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "#718096",
            textAlign: "center",
          }}
        >
          Remember: This is a supportive space. Your privacy and wellbeing are
          our priority.
        </div>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard({ user }) {
  const [stats, setStats] = useState({
    totalConversations: 12,
    totalMessages: 156,
    crisisAlerts: 0,
    averageRating: 4.8,
    lastLogin: new Date().toISOString(),
  });

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#2d3748" }}>
          📊 Your Mental Health Journey
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              padding: "1.5rem",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {stats.totalConversations}
            </div>
            <div style={{ opacity: 0.9 }}>Conversations</div>
          </div>

          <div
            style={{
              padding: "1.5rem",
              background: "linear-gradient(135deg, #48bb78, #38a169)",
              color: "white",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {stats.totalMessages}
            </div>
            <div style={{ opacity: 0.9 }}>Messages Exchanged</div>
          </div>

          <div
            style={{
              padding: "1.5rem",
              background: "linear-gradient(135deg, #ed8936, #dd6b20)",
              color: "white",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {stats.averageRating}/5
            </div>
            <div style={{ opacity: 0.9 }}>Satisfaction</div>
          </div>

          <div
            style={{
              padding: "1.5rem",
              background:
                stats.crisisAlerts > 0
                  ? "linear-gradient(135deg, #f56565, #e53e3e)"
                  : "linear-gradient(135deg, #68d391, #48bb78)",
              color: "white",
              borderRadius: "15px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {stats.crisisAlerts}
            </div>
            <div style={{ opacity: 0.9 }}>Crisis Alerts</div>
          </div>
        </div>
      </div>

      {/* Mood Tracking */}
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", color: "#2d3748" }}>
          🎭 Mood Tracker
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0.5rem",
            textAlign: "center",
          }}
        >
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
            (day, index) => (
              <div key={day}>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#718096",
                    marginBottom: "0.5rem",
                  }}
                >
                  {day}
                </div>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background:
                      index < 5
                        ? "linear-gradient(135deg, #48bb78, #38a169)"
                        : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    fontSize: "1.2rem",
                  }}
                >
                  {index < 5 ? "😊" : ""}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Resources */}
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", color: "#2d3748" }}>
          🔗 Helpful Resources
        </h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              padding: "1rem",
              background: "#f7fafc",
              borderRadius: "10px",
              borderLeft: "4px solid #667eea",
            }}
          >
            <strong>Crisis Helplines</strong>
            <p style={{ margin: "0.5rem 0 0 0", color: "#4a5568" }}>
              24/7 support: 995 (Emergency), 1800-221-4444 (Samaritans)
            </p>
          </div>
          <div
            style={{
              padding: "1rem",
              background: "#f7fafc",
              borderRadius: "10px",
              borderLeft: "4px solid #48bb78",
            }}
          >
            <strong>Breathing Exercises</strong>
            <p style={{ margin: "0.5rem 0 0 0", color: "#4a5568" }}>
              4-7-8 technique: Inhale 4, Hold 7, Exhale 8
            </p>
          </div>
          <div
            style={{
              padding: "1rem",
              background: "#f7fafc",
              borderRadius: "10px",
              borderLeft: "4px solid #ed8936",
            }}
          >
            <strong>Campus Counseling</strong>
            <p style={{ margin: "0.5rem 0 0 0", color: "#4a5568" }}>
              Free counseling services available at Student Center
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Appointments Component
function Appointments({ user }) {
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      counselor: "Dr. Lisa Wong",
      date: "2025-08-20",
      time: "14:00",
      type: "Individual Counseling",
      status: "scheduled",
    },
    {
      id: 2,
      counselor: "Dr. Michael Tan",
      date: "2025-08-25",
      time: "10:00",
      type: "Group Therapy",
      status: "confirmed",
    },
  ]);

  const [showBooking, setShowBooking] = useState(false);

  return (
    <div style={{ display: "grid", gap: "2rem" }}>
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ margin: 0, color: "#2d3748" }}>📅 Your Appointments</h2>
          <button
            onClick={() => setShowBooking(!showBooking)}
            style={{
              padding: "0.75rem 1.5rem",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {showBooking ? "Cancel" : "+ Book Appointment"}
          </button>
        </div>

        {showBooking && (
          <div
            style={{
              padding: "1.5rem",
              background: "#f7fafc",
              borderRadius: "15px",
              marginBottom: "2rem",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", color: "#2d3748" }}>
              Book New Appointment
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              <select
                style={{
                  padding: "0.75rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  outline: "none",
                }}
              >
                <option>Select Counselor</option>
                <option>Dr. Lisa Wong - Anxiety/Depression</option>
                <option>Dr. Michael Tan - Stress Management</option>
                <option>Dr. Sarah Lee - Crisis Intervention</option>
              </select>
              <input
                type="date"
                style={{
                  padding: "0.75rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  outline: "none",
                }}
              />
              <select
                style={{
                  padding: "0.75rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  outline: "none",
                }}
              >
                <option>Select Time</option>
                <option>09:00 AM</option>
                <option>10:00 AM</option>
                <option>11:00 AM</option>
                <option>02:00 PM</option>
                <option>03:00 PM</option>
                <option>04:00 PM</option>
              </select>
              <button
                style={{
                  padding: "0.75rem",
                  background: "linear-gradient(135deg, #48bb78, #38a169)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Book Now
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: "1rem" }}>
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              style={{
                padding: "1.5rem",
                border: "2px solid #e2e8f0",
                borderRadius: "15px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "600",
                    color: "#2d3748",
                    marginBottom: "0.5rem",
                  }}
                >
                  {appointment.counselor}
                </div>
                <div style={{ color: "#4a5568", marginBottom: "0.5rem" }}>
                  📅 {new Date(appointment.date).toLocaleDateString()} at{" "}
                  {appointment.time}
                </div>
                <div style={{ color: "#718096", fontSize: "0.9rem" }}>
                  {appointment.type}
                </div>
              </div>
              <div>
                <span
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    background:
                      appointment.status === "confirmed"
                        ? "#c6f6d5"
                        : "#bee3f8",
                    color:
                      appointment.status === "confirmed"
                        ? "#22543d"
                        : "#2a4365",
                  }}
                >
                  {appointment.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Render the app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MentalHealthCompanion />
  </React.StrictMode>
);

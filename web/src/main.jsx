import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  BarChart3,
  Calendar,
  Send,
  User,
  LogOut,
  Heart,
  Shield,
  Phone,
  AlertTriangle,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  Clock,
  CheckCircle,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import "./styles.css";

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://xc0ml0kag0.execute-api.ap-southeast-1.amazonaws.com/prod";

// Enhanced Mental Health Companion App
function MentalHealthCompanion() {
  const [currentView, setCurrentView] = useState("chat");
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const menuItems = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "appointments", label: "Appointments", icon: Calendar },
  ];

  return (
    <div className="min-h-screen gradient-bg">
      {/* Enhanced Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 bg-gradient-to-r from-mindcare-light to-mindcare-dark rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gradient">
                MindCare Companion
              </h1>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      currentView === item.id
                        ? "bg-mindcare-light text-white shadow-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gray-100 rounded-full px-4 py-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.name || "User"}
                </span>
              </div>

              <motion.button
                onClick={logout}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <LogOut className="w-5 h-5" />
              </motion.button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-gray-200 py-4"
              >
                <div className="flex flex-col space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                          currentView === item.id
                            ? "bg-mindcare-light text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentView === "chat" && <ChatInterface user={user} />}
            {currentView === "dashboard" && <Dashboard user={user} />}
            {currentView === "appointments" && <Appointments user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Enhanced Login Form Component
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("demo@student.edu");
  const [name, setName] = useState("Demo Student");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md w-full p-8"
      >
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 bg-gradient-to-r from-mindcare-light to-mindcare-dark rounded-2xl flex items-center justify-center mx-auto mb-4"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Heart className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gradient mb-2">
            MindCare Companion
          </h1>
          <p className="text-gray-600">Your 24/7 mental health support</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-field"
              placeholder="Enter your full name"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </div>
            ) : (
              "Enter MindCare"
            )}
          </motion.button>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 bg-blue-50 rounded-xl"
        >
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Privacy First
              </h3>
              <p className="text-sm text-blue-700">
                Your conversations are encrypted and secure. We follow HIPAA
                compliance standards.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Enhanced Chat Interface Component
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
      // Call the backend chat API
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: input,
          userId: user?.id,
          userName: user?.name,
          conversationId: messages.find((m) => m.conversationId)
            ?.conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        role: "assistant",
        content: data.reply,
        timestamp: data.timestamp,
        sentiment: data.sentiment,
        intent: data.intent,
        conversationId: data.conversationId,
        crisis: data.crisis,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);

      // Show crisis alert if detected
      if (data.crisis) {
        setTimeout(() => {
          alert(
            "🚨 Crisis Detected: Please reach out to emergency services (995) or call +94-112-729729 (Samaritans) immediately if you're in immediate danger."
          );
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to send message:", error);

      // Fallback response if API fails
      const fallbackMessage = {
        role: "assistant",
        content:
          "I apologize, but I'm having trouble connecting right now. Please try again in a moment. If you're in crisis, please contact emergency services at 995 immediately.",
        timestamp: new Date().toISOString(),
        sentiment: "supportive",
      };

      setMessages((prev) => [...prev, fallbackMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden h-[80vh] flex flex-col"
      >
        {/* Chat Header */}
        <div className="gradient-bg text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1">
                Safe Space Chat
                <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                  🤖 AI-Powered
                </span>
              </h2>
              <p className="opacity-90 text-sm">
                Private & Secure • Available 24/7 • Powered by Google Gemini
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <MessageCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Crisis Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border-l-4 border-red-400 p-4"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="text-sm">
              <span className="font-semibold text-red-800">
                Crisis Support:
              </span>
              <span className="text-red-700 ml-1">
                If you're having thoughts of self-harm, call{" "}
                <span className="font-semibold">1926</span> (Emergency) or{" "}
                <span className="font-semibold">+94-112-729729</span>{" "}
                (Samaritans)
              </span>
            </div>
          </div>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-soft ${
                    message.role === "user"
                      ? "bg-mindcare-light text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user"
                        ? "text-white/70"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl px-4 py-3 shadow-soft">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    MindCare is typing
                  </span>
                  <div className="flex space-x-1 typing-indicator">
                    <div className="w-2 h-2 bg-mindcare-light rounded-full"></div>
                    <div className="w-2 h-2 bg-mindcare-light rounded-full"></div>
                    <div className="w-2 h-2 bg-mindcare-light rounded-full"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-end space-x-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share what's on your mind... (Press Enter to send)"
              disabled={isTyping}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-mindcare-light focus:border-transparent transition-all duration-200 outline-none"
              rows="2"
            />
            <motion.button
              onClick={sendMessage}
              disabled={isTyping || !input.trim()}
              className="bg-mindcare-light text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-medium hover:shadow-large transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Remember: This is a supportive space. Your privacy and wellbeing are
            our priority.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Enhanced Dashboard Component
function Dashboard({ user }) {
  const [stats, setStats] = useState({
    totalConversations: 12,
    totalMessages: 156,
    crisisAlerts: 0,
    averageRating: 4.8,
    lastLogin: new Date().toISOString(),
  });

  const moodData = [
    { day: "Mon", mood: "happy", emoji: "😊" },
    { day: "Tue", mood: "happy", emoji: "😊" },
    { day: "Wed", mood: "neutral", emoji: "😐" },
    { day: "Thu", mood: "happy", emoji: "😊" },
    { day: "Fri", mood: "sad", emoji: "😔" },
    { day: "Sat", mood: "", emoji: "" },
    { day: "Sun", mood: "", emoji: "" },
  ];

  const resources = [
    {
      title: "Crisis Helplines",
      description: "24/7 support: 995 (Emergency), 1800-221-4444 (Samaritans)",
      icon: Phone,
      color: "red",
    },
    {
      title: "Breathing Exercises",
      description: "4-7-8 technique: Inhale 4, Hold 7, Exhale 8",
      icon: Heart,
      color: "green",
    },
    {
      title: "Campus Counseling",
      description: "Free counseling services available at Student Center",
      icon: ExternalLink,
      color: "blue",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-600">
          Here's how your mental health journey is progressing.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Conversations",
            value: stats.totalConversations,
            icon: MessageCircle,
            color: "from-blue-500 to-blue-600",
          },
          {
            label: "Messages",
            value: stats.totalMessages,
            icon: TrendingUp,
            color: "from-green-500 to-green-600",
          },
          {
            label: "Satisfaction",
            value: `${stats.averageRating}/5`,
            icon: Smile,
            color: "from-yellow-500 to-orange-500",
          },
          {
            label: "Crisis Alerts",
            value: stats.crisisAlerts,
            icon: Shield,
            color:
              stats.crisisAlerts > 0
                ? "from-red-500 to-red-600"
                : "from-green-500 to-green-600",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-hover p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
              <div
                className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mood Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Smile className="w-5 h-5 mr-2 text-mindcare-light" />
          Weekly Mood Tracker
        </h3>
        <div className="grid grid-cols-7 gap-4">
          {moodData.map((day, index) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="text-center"
            >
              <p className="text-xs text-gray-500 mb-2">{day.day}</p>
              <div
                className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-lg ${
                  day.mood
                    ? day.mood === "happy"
                      ? "bg-green-100"
                      : day.mood === "neutral"
                      ? "bg-yellow-100"
                      : "bg-red-100"
                    : "bg-gray-100"
                }`}
              >
                {day.emoji}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <ExternalLink className="w-5 h-5 mr-2 text-mindcare-light" />
          Helpful Resources
        </h3>
        <div className="space-y-4">
          {resources.map((resource, index) => (
            <motion.div
              key={resource.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  resource.color === "red"
                    ? "bg-red-100 text-red-600"
                    : resource.color === "green"
                    ? "bg-green-100 text-green-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                <resource.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {resource.title}
                </h4>
                <p className="text-sm text-gray-600">{resource.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// Enhanced Appointments Component
function Appointments({ user }) {
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      counselor: "Dr. Lisa Wong",
      date: "2025-08-20",
      time: "14:00",
      type: "Individual Counseling",
      status: "scheduled",
      specialty: "Anxiety/Depression",
    },
    {
      id: 2,
      counselor: "Dr. Michael Tan",
      date: "2025-08-25",
      time: "10:00",
      type: "Group Therapy",
      status: "confirmed",
      specialty: "Stress Management",
    },
  ]);

  const [showBooking, setShowBooking] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Your Appointments
          </h1>
          <p className="text-gray-600">Manage your counseling sessions</p>
        </div>
        <motion.button
          onClick={() => setShowBooking(!showBooking)}
          className="btn-primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Calendar className="w-4 h-4 mr-2" />
          {showBooking ? "Cancel" : "Book Appointment"}
        </motion.button>
      </motion.div>

      {/* Booking Form */}
      <AnimatePresence>
        {showBooking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Book New Appointment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select className="input-field">
                <option>Select Counselor</option>
                <option>Dr. Lisa Wong - Anxiety/Depression</option>
                <option>Dr. Michael Tan - Stress Management</option>
                <option>Dr. Sarah Lee - Crisis Intervention</option>
              </select>
              <input type="date" className="input-field" />
              <select className="input-field">
                <option>Select Time</option>
                <option>09:00 AM</option>
                <option>10:00 AM</option>
                <option>11:00 AM</option>
                <option>02:00 PM</option>
                <option>03:00 PM</option>
                <option>04:00 PM</option>
              </select>
              <motion.button
                className="bg-green-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Book Now
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appointments List */}
      <div className="space-y-4">
        {appointments.map((appointment, index) => (
          <motion.div
            key={appointment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-hover p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-mindcare-light rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {appointment.counselor}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {appointment.specialty}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(appointment.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{appointment.time}</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span>{appointment.type}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    appointment.status
                  )}`}
                >
                  {appointment.status.toUpperCase()}
                </span>
                <motion.button
                  className="text-mindcare-light hover:text-mindcare-dark transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ExternalLink className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* No appointments message */}
      {appointments.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card p-12 text-center"
        >
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No appointments scheduled
          </h3>
          <p className="text-gray-600 mb-6">
            Book your first appointment to get started with professional
            support.
          </p>
          <button onClick={() => setShowBooking(true)} className="btn-primary">
            <Calendar className="w-4 h-4 mr-2" />
            Book Your First Appointment
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Render the app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MentalHealthCompanion />
  </React.StrictMode>
);

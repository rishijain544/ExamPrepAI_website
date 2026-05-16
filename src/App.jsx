import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster, toast } from 'sonner';
import { Skeleton, ResultsSkeleton, HistorySkeleton } from './components/Skeleton';
import { 
  FileText, 
  Upload, 
  Settings, 
  Brain, 
  GraduationCap,
  RefreshCw,
  Zap, 
  BarChart3, 
  BookOpen, 
  Plus, 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  RefreshCcw, 
  Download, 
  Volume2, 
  Lightbulb, 
  Menu,
  Key,
  Shield,
  ShieldCheck,
  Clock,
  Trophy,
  Target,
  Layout,
  Layers,
  Sparkles,
  Search,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Github,
  Twitter,
  Linkedin,
  LogOut,
  User,
  Star,
  Activity,
  History,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Timer
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
// db import removed (now consolidated)

// --- Theme Constants ---
const COLORS = {
  bg: "#0B0F19",
  surface: "#0F172A", // slate-900
  card: "#1E293B",    // slate-800
  border: "#334155",  // slate-700
  primary: "#8B5CF6", // violet-500
  secondary: "#22D3EE", // cyan-400
  success: "#10B981", // emerald-500
  danger: "#EF4444",  // red-500
  text: "#F8FAFC",    // slate-50
  muted: "#94A3B8"    // slate-400
};

// --- Framer Motion Variants ---
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// --- Models & Config ---
const MODEL_NAME = "gemini-3-flash-preview";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SYSTEM_INSTRUCTION = `You are ExamPrepAI. Analyze study material and return ONLY JSON.
CRITICAL: Translate ALL generated text to requested language. 
Derive content directly from provided text. Format: strict valid JSON. No prose.`;

const getPrompt = (numQuestions, difficulty, language, genOptions) => `Language: ${language}
Level: ${difficulty}
Generate (if requested):
${genOptions.quiz ? `- ${numQuestions} MCQs with topics` : ""}
${genOptions.flashcards ? `- 10 Flashcards` : ""}
${genOptions.summary ? `- Summary (overview, concepts, points)` : ""}
${genOptions.notes ? `- Notes (topic-wise)` : ""}
${genOptions.formulas ? `- Formula/Def sheet` : ""}
${genOptions.roadmap ? `- 7-day Study Plan` : ""}

JSON Schema (omit non-requested):
{
  "quiz": [{"id": 1, "question": "", "options": {"A": "", "B": "", "C": "", "D": ""}, "answer": "A", "explanation": "", "topic": ""}],
  "flashcards": [{"id": 1, "term": "", "definition": "", "example": ""}],
  "summary": {"overview": "", "keyConcepts": [], "importantPoints": []},
  "shortNotes": [{"title": "", "points": []}],
  "formulas": [{"name": "", "formula": "", "description": ""}],
  "studyPlan": [{"day": 1, "tasks": []}],
  "analytics": {"complexity": "Low/Medium/High", "estimatedStudyTime": "", "focalPoints": []}
}`;

export default function App() {
  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // --- States ---
  const [file, setFile] = useState(null);
  const [textSource, setTextSource] = useState('');
  const [sourceType, setSourceType] = useState('file'); // 'file' or 'text'
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('quiz');
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState({});
  const [history, setHistory] = useState([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [language, setLanguage] = useState('English');
  const [quizMode, setQuizMode] = useState('Practice');
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [streakCorrect, setStreakCorrect] = useState(0);
  const [streakIncorrect, setStreakIncorrect] = useState(0);
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(true);
  const [adaptationMessage, setAdaptationMessage] = useState(null);
  const [genOptions, setGenOptions] = useState({
    quiz: true,
    flashcards: true,
    summary: true,
    notes: true,
    formulas: true,
    roadmap: true
  });

  const timerRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        fetchHistory(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async (userId) => {
    setIsHistoryLoading(true);
    try {
      const q = query(
        collection(db, 'quizResults'),
        where('userId', '==', userId),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      setHistory(historyData);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      toast.error("Cloud Sync Failed", {
        description: "We couldn't retrieve your previous sessions. Your current progress will still be saved locally."
      });
      handleFirestoreError(err, OperationType.LIST, 'quizResults');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (quizMode === 'Exam' && !quizFinished && results?.quiz) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [quizMode, quizFinished, results]);

  const handleFileChange = (uploadedFile) => {
    if (!uploadedFile) return;
    
    // Security: Validate file size
    if (uploadedFile.size > MAX_FILE_SIZE) {
      toast.error("File Intelligence Error", {
        description: `This data packet is too large (${(uploadedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed is 10MB.`
      });
      setFile(null);
      return;
    }

    // Security: Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
    if (!allowedTypes.includes(uploadedFile.type) && !uploadedFile.name.endsWith('.pdf')) {
      toast.error("Format Protocol Mismatch", {
        description: "Only PDF, JPEG, PNG, WEBP, and plain text files are supported for neural analysis."
      });
      setFile(null);
      return;
    }
    
    setError(null);
    setFile(uploadedFile);
    toast.success("Data Source Locked", {
      description: `${uploadedFile.name} ready for synthesis.`
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Auto-detect or use selected language mapping
      const langMap = {
        'English': 'en-US',
        'Hindi': 'hi-IN',
        'Spanish': 'es-ES',
        'French': 'fr-FR',
        'German': 'de-DE',
        'Japanese': 'ja-JP',
        'Hinglish': 'hi-IN',
        'Bengali': 'bn-IN',
        'Tamil': 'ta-IN',
        'Gujarati': 'gu-IN',
        'Marathi': 'mr-IN',
        'Telugu': 'te-IN',
        'Kannada': 'kn-IN',
        'Malayalam': 'ml-IN',
        'Punjabi': 'pa-IN'
      };
      
      if (langMap[language]) {
        utterance.lang = langMap[language];
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const downloadText = (content, filename) => {
    const element = document.createElement("a");
    const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const blob = new Blob([fileContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // --- API Logic ---
  const generateStudyMaterial = async () => {
    if (sourceType === 'file' && !file) {
      setError("Please upload a study material first.");
      return;
    }
    if (sourceType === 'text' && !textSource.trim()) {
      setError("Please enter some text content first.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);
    setResults(null);
    setScore(0);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuestionTimes({});
    setQuestionStartTime(Date.now());
    setQuizFinished(false);
    setTimer(0);

    try {
      const prompt = getPrompt(numQuestions, difficulty, language, genOptions);
      let fileData = null;

      if (sourceType === 'file') {
        const base64Data = await fileToBase64(file);
        fileData = {
          mimeType: file.type || 'application/pdf',
          data: base64Data
        };
      }

      console.log(`[AI] Generating content via backend...`);
      
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60s timeout

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          prompt,
          systemInstruction: SYSTEM_INSTRUCTION,
          modelName: MODEL_NAME,
          sourceType,
          fileData,
          textSource,
          temperature: 0.2
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errMessage = "Failed to generate content";
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const errData = await response.json();
            if (errData.code === 'QUOTA_EXCEEDED') {
              throw new Error("Neural Engine is cooling down (Quota Exceeded). Please wait a moment and try again.");
            }
            errMessage = errData.error || errMessage;
          } catch (e) {
            errMessage = `Server error (${response.status}): Invalid JSON response`;
          }
        } else {
          try {
            const text = await response.text();
            console.error("Non-JSON error response:", text);
            // Check for common Vercel/Proxy errors
            if (text.includes("The page could not be found") || text.includes("404")) {
              errMessage = "Intelligence Engine Offline: The API route was not found. Please check if the backend is properly deployed.";
            } else if (text.includes("504") || text.includes("Timeout")) {
              errMessage = "Intelligence Engine Timeout: The request took too long. Try with smaller material.";
            } else {
              errMessage = `Server error (${response.status}): ${response.statusText}`;
            }
          } catch (e) {
            errMessage = `Server error (${response.status}): ${response.statusText}`;
          }
        }
        throw new Error(errMessage);
      }
      
      const data = await response.json();
      setResults(data);
      setAnalytics({
        ...(data.analytics || {}),
        attempted: 0,
        accuracy: 0,
        timeSpent: 0
      });
      
      // Set active tab to the first available content
      if (data.quiz && data.quiz.length > 0) setActiveTab('quiz');
      else if (data.flashcards && data.flashcards.length > 0) setActiveTab('flashcards');
      else if (data.summary) setActiveTab('summary');
      else if (data.shortNotes && data.shortNotes.length > 0) setActiveTab('notes');
      else setActiveTab('analytics');

    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError') {
        err.message = "Neural synthesis timed out. The engine is experiencing high latency. Please retry.";
      }
      const errorMessage = err.message || "Failed to generate content. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage.includes("Quota") ? "Neural Engine Cooling" : "Intelligence Engine Failure", {
        description: errorMessage,
        action: errorMessage.includes("Quota") ? null : {
          label: "Retry",
          onClick: () => generateStudyMaterial()
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setScore(0);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuestionTimes({});
    setQuestionStartTime(Date.now());
    setQuizFinished(false);
    setTimer(0);
    setStreakCorrect(0);
    setStreakIncorrect(0);
    setAdaptationMessage(null);
    setIsAdapting(false);
  };

  const adaptDifficulty = async (newDifficulty) => {
    if ((sourceType === 'file' && !file) || (sourceType === 'text' && !textSource.trim()) || isAdapting) return;
    
    setIsAdapting(true);
    setAdaptationMessage(`Adapting to your performance: Switching to ${newDifficulty} mode...`);
    setDifficulty(newDifficulty);

    try {
      const remainingCount = results.quiz.length - (currentQuestionIndex + 1);
      if (remainingCount <= 0) return;

      const adaptPrompt = `Switching to ${newDifficulty} mode. Generate ${remainingCount} NEW MCQs from material at ${newDifficulty} level.
Language: ${language}.
Format: {"quiz": [{"question": "", "options": {"A": "", "B": "", "C": "", "D": ""}, "answer": "A", "explanation": "", "topic": ""}]}`;

      let fileData = null;
      if (sourceType === 'file') {
        const base64Data = await fileToBase64(file);
        fileData = {
          mimeType: file.type || 'application/pdf',
          data: base64Data
        };
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: adaptPrompt,
          systemInstruction: SYSTEM_INSTRUCTION,
          modelName: MODEL_NAME,
          sourceType,
          fileData,
          textSource,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to adapt difficulty");
      }

      const data = await response.json();
      if (data.quiz) {
        const newQuiz = [...results.quiz];
        // Replace future questions with adapted ones
        for (let i = 0; i < data.quiz.length; i++) {
          newQuiz[currentQuestionIndex + 1 + i] = {
            ...data.quiz[i],
            id: currentQuestionIndex + 2 + i
          };
        }
        setResults(prev => ({ ...prev, quiz: newQuiz }));
      }
    } catch (err) {
      console.error("Adaptation failed:", err);
      toast.error("Adaptive Sync Lost", {
        description: "We couldn't update the difficulty. Continuing with current level."
      });
    } finally {
      setIsAdapting(false);
      setTimeout(() => setAdaptationMessage(null), 3000);
    }
  };

  const handleAnswer = (optionKey) => {
    if (quizFinished || isAdapting) return;
    
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    setQuestionTimes(prev => ({ ...prev, [currentQuestionIndex]: timeTaken }));
    
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionKey }));
    
    const isCorrect = optionKey === results.quiz[currentQuestionIndex].answer;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      const newStreak = streakCorrect + 1;
      setStreakCorrect(newStreak);
      setStreakIncorrect(0);
      
      // Adaptation: 5 Correct in a row -> Harder
      if (newStreak === 5 && adaptiveEnabled) {
        const nextDiff = difficulty === 'Easy' ? 'Medium' : (difficulty === 'Medium' ? 'Hard' : 'Expert');
        if (nextDiff !== difficulty) {
          adaptDifficulty(nextDiff);
          setStreakCorrect(0);
        }
      }
    } else {
      const newStreak = streakIncorrect + 1;
      setStreakIncorrect(newStreak);
      setStreakCorrect(0);
      
      // Adaptation: 3 Incorrect in a row -> Easier
      if (newStreak === 3 && adaptiveEnabled) {
        const nextDiff = difficulty === 'Expert' ? 'Hard' : (difficulty === 'Hard' ? 'Medium' : 'Easy');
        if (nextDiff !== difficulty) {
          adaptDifficulty(nextDiff);
          setStreakIncorrect(0);
        }
      }
    }
  };

  const calculateFinalAnalytics = async () => {
    const accuracy = parseFloat(((score / results.quiz.length) * 100).toFixed(1));
    const topicStats = {};
    
    results.quiz.forEach((q, idx) => {
      const topic = q.topic || 'General';
      if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
      topicStats[topic].total += 1;
      if (answers[idx] === q.answer) topicStats[topic].correct += 1;
    });

    const weakAreas = Object.entries(topicStats)
      .filter(([_, stats]) => (stats.correct / stats.total) < 0.7)
      .map(([topic]) => topic);

    const quizResult = {
      userId: user.uid,
      materialName: file.name,
      score,
      totalQuestions: results.quiz.length,
      accuracy,
      timeSpent: timer,
      questionTimes,
      topicStats,
      createdAt: serverTimestamp()
    };

    setAnalytics(prev => ({
      ...prev,
      accuracy,
      score,
      total: results.quiz.length,
      weakAreas,
      timeSpent: timer,
      topicStats
    }));

    try {
      await addDoc(collection(db, 'quizResults'), quizResult);
      fetchHistory(user.uid);
      toast.success("Intelligence Logged", {
        description: "Your session performance has been archived successfully."
      });
    } catch (err) {
      console.error("Failed to save result:", err);
      toast.error("Archive Failed", {
        description: "Your performance couldn't be saved to the cloud, but you can still view it in the dashboard."
      });
      handleFirestoreError(err, OperationType.CREATE, 'quizResults');
    }

    setQuizFinished(true);
  };

  // --- Sub-Components ---
  const NavItem = ({ label, target }) => (
    <a href={target} className="text-gray-400 hover:text-white transition-colors text-sm font-medium px-4 py-2">
      {label}
    </a>
  );

  const StatCard = ({ icon: Icon, label, value, color }) => {
    const colorClasses = {
      violet: 'text-violet-400 bg-violet-400/10',
      emerald: 'text-emerald-400 bg-emerald-400/10',
      amber: 'text-amber-400 bg-amber-400/10',
      cyan: 'text-cyan-400 bg-cyan-400/10',
      indigo: 'text-indigo-400 bg-indigo-400/10',
      rose: 'text-rose-400 bg-rose-400/10',
      success: 'text-emerald-400 bg-emerald-400/10',
      danger: 'text-red-400 bg-red-400/10'
    };
    
    // Default to white if color not found
    const textColor = colorClasses[color]?.split(' ')[0] || 'text-white';
    const bgColor = colorClasses[color]?.split(' ')[1] || 'bg-slate-800';

    return (
      <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl flex items-center space-x-4">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none mb-1">{label}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
      </div>
    );
  };

  const GlassCard = ({ children, className = "", hover = true, overflowVisible = false }) => (
    <motion.div 
      whileHover={hover ? { y: -5, scale: 1.01, transition: { duration: 0.3 } } : {}}
      className={`glass-card rounded-[2rem] ${overflowVisible ? "" : "overflow-hidden"} ${className}`}
    >
      {children}
    </motion.div>
  );

  const Button = ({ children, onClick, variant = "primary", className = "", loading = false, disabled = false, animation = "standard" }) => {
    const variants = {
      primary: "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]",
      secondary: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]",
      outline: "bg-transparent border border-slate-700 hover:border-violet-500/50 hover:bg-violet-500/5 text-slate-300",
      ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white"
    };

    return (
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        disabled={disabled || loading}
        className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : children}
      </motion.button>
    );
  };

  // --- Main Render ---
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-20" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.5)] text-white mx-auto mb-10 animate-pulse">
            <Brain size={48} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-2">Syncing Neurons</h2>
          <div className="w-48 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
            <motion.div 
              className="h-full bg-violet-500"
              animate={{ x: [-200, 200] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  const MouseBackground = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
      const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div 
          animate={{ 
            x: mousePos.x * 0.05,
            y: mousePos.y * 0.05,
          }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-600/10 blur-[120px] rounded-full aurora-bg" 
        />
        <motion.div 
          animate={{ 
            x: -mousePos.x * 0.05,
            y: -mousePos.y * 0.05,
          }}
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/10 blur-[120px] rounded-full aurora-bg" 
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
        
        {/* Glow tracking mouse */}
        <motion.div 
          className="absolute w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]"
          animate={{ 
            x: mousePos.x - 200, 
            y: mousePos.y - 200,
          }}
        />
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <Toaster position="top-right" expand={false} richColors closeButton theme="dark" />
      <div className="min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200 bg-[#030712] transition-colors duration-1000 mesh-gradient grid-bg font-sans">
      {/* Cinematic Background Elements */}
      <MouseBackground />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass h-20 flex items-center px-10 justify-between transition-all duration-500 border-b border-white/5">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-4 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] text-white group-hover:rotate-12 transition-transform duration-500">
            <span className="font-black text-xl font-display">E</span>
          </div>
          <span className="text-2xl font-black tracking-tighter text-white font-display">
            ExamPrep<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">AI</span>
          </span>
        </motion.div>

        <div className="hidden md:flex items-center space-x-8">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Features
            </button>
            <a href="#" className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">Open Source</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-[10px]">
                <User size={12} />
              </div>
              <span className="text-[11px] font-bold text-slate-300 truncate max-w-[100px]">
                {user.email.split('@')[0]}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-32 px-6 max-w-7xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-violet-400 text-xs font-black mb-10 shadow-2xl backdrop-blur-xl hover:bg-white/10 transition-colors cursor-default select-none">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_10px_#8b5cf6]" />
            <span className="uppercase tracking-[0.2em]">Next-Gen Learning Engine v2.0</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black font-display leading-[0.95] mb-8 tracking-tighter text-white">
            Transform Notes Into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 glow-text">
              Exam Mastery
            </span>
          </h1>

          <p className="text-slate-400 text-xl md:text-2xl max-w-3xl mx-auto mb-14 leading-relaxed font-medium">
            The elite AI tool for serious students. Upload any material and generate 
            cinematic study assets in seconds. 100% Free. Limitless Potential.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-5 sm:space-y-0 sm:space-x-6 mb-24">
            <Button 
              className="w-full sm:w-auto h-16 px-12 text-xl group relative overflow-hidden" 
              onClick={() => document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Zap size={24} className="fill-current" />
              <span>Get Started Now</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto h-16 px-12 text-xl backdrop-blur-xl group"
              onClick={() => document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' })}
            >
              <Activity size={24} className="text-cyan-400" />
              <span>View Features</span>
            </Button>
          </div>

          {/* Feature Badges Grid */}
          <motion.div 
            initial="initial"
            whileInView="animate"
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-6 gap-6 max-w-5xl mx-auto py-12 px-6 glass rounded-[3rem] border border-white/5"
            id="features-section"
          >
            {[
              { icon: Brain, label: "Neural Quiz", color: "text-violet-400", bg: "bg-violet-400/10" },
              { icon: Layers, label: "Smart Cards", color: "text-cyan-400", bg: "bg-cyan-400/10" },
              { icon: Layout, label: "AI Summary", color: "text-indigo-400", bg: "bg-indigo-400/10" },
              { icon: Target, label: "Formula Lab", color: "text-emerald-400", bg: "bg-emerald-400/10" },
              { icon: Clock, label: "Adapt Path", color: "text-amber-400", bg: "bg-amber-400/10" },
              { icon: BarChart3, label: "Insight Hub", color: "text-rose-400", bg: "bg-rose-400/10" }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                variants={fadeIn}
                whileHover={{ y: -10, scale: 1.05 }}
                className="flex flex-col items-center p-6 rounded-3xl hover:bg-white/5 transition-all cursor-default"
              >
                <div className={`p-4 rounded-2xl ${item.bg} ${item.color} mb-4 shadow-xl`}>
                  <item.icon size={28} />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Main App Container */}
      <main className="max-w-6xl mx-auto px-6 space-y-8 pb-32">
        
        {/* API & Upload Config */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Settings Area */}
          <div className="space-y-8">
            <GlassCard className={`p-8 ${showLangDropdown ? 'z-[60] relative' : ''}`} overflowVisible={true}>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400">
                  <Settings size={18} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Engine Config</h3>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Intelligence Level</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Easy', 'Medium', 'Hard', 'Expert'].map(opt => {
                      const label = opt === 'Medium' ? 'Med' : opt === 'Expert' ? 'Exp' : opt;
                      const isActive = difficulty === opt;
                      return (
                        <button 
                          key={opt}
                          onClick={() => setDifficulty(opt)}
                          className={`py-3 text-[10px] font-black rounded-xl transition-all border ${isActive ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-slate-950/50 border-white/5 hover:border-white/10 text-slate-400'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Question Density</label>
                    <span className="text-[10px] font-black text-violet-400">{numQuestions} MCQ</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="50" 
                    step="1"
                    value={numQuestions} 
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-950/80 rounded-lg appearance-none cursor-pointer accent-violet-600 border border-white/5"
                  />
                  <div className="flex justify-between mt-2 px-1">
                    <span className="text-[8px] font-black text-slate-600">10</span>
                    <span className="text-[8px] font-black text-slate-600">30</span>
                    <span className="text-[8px] font-black text-slate-600">50</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 block">Linguistic Target</label>
                  <div className={`relative ${showLangDropdown ? 'z-50' : 'z-10'}`}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLangDropdown(!showLangDropdown);
                      }}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-violet-500 transition-all font-medium flex items-center justify-between group hover:border-white/10"
                    >
                      <span>{language}</span>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${showLangDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                    {showLangDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-[60] bg-transparent" 
                          onClick={() => setShowLangDropdown(false)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[70] py-2 overflow-hidden"
                        >
                          <div className="max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500/50 scrollbar-track-transparent">
                            {['English', 'Hindi', 'Spanish', 'Hinglish', 'French', 'German', 'Japanese', 'Bengali', 'Tamil', 'Gujarati', 'Marathi', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi'].map(opt => (
                              <button
                                key={opt}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLanguage(opt);
                                  setShowLangDropdown(false);
                                }}
                                className={`w-full px-4 py-3 text-left text-sm transition-all hover:bg-violet-600/20 ${language === opt ? 'text-violet-400 font-bold bg-violet-600/10' : 'text-slate-400'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                    </AnimatePresence>
                  </div>
                </div>

                <button 
                  onClick={() => setAdaptiveEnabled(!adaptiveEnabled)}
                  className="flex items-center justify-between w-full p-4 bg-slate-950/50 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                >
                  <span className="text-xs font-bold text-slate-400">Adaptive Learning</span>
                  <div className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors ${adaptiveEnabled ? 'bg-violet-600' : 'bg-slate-800'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${adaptiveEnabled ? 'ml-auto' : 'ml-0'}`} />
                  </div>
                </button>
              </div>
            </GlassCard>

            <GlassCard className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <Layers size={18} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Output Modules</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'quiz', label: 'Interactive Quiz', icon: Brain },
                  { id: 'flashcards', label: 'Smart Flashcards', icon: Target },
                  { id: 'summary', label: 'Exec Summary', icon: Layout },
                  { id: 'notes', label: 'Concept Map', icon: BookOpen },
                  { id: 'formulas', label: 'Formula Sheet', icon: Zap },
                  { id: 'roadmap', label: 'Study Roadmap', icon: Clock }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setGenOptions(prev => ({ ...prev, [opt.id]: !prev[opt.id] }))}
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${genOptions[opt.id] ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <opt.icon size={16} />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    {genOptions[opt.id] ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Upload & Action */}
          <div className="md:col-span-2 space-y-8" id="upload-section">
            <GlassCard className="p-10 border-violet-500/20">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight mb-1">Knowledge Source</h3>
                  <div className="flex gap-4 mt-4">
                    <button 
                      onClick={() => setSourceType('file')}
                      className={`text-[10px] font-black tracking-widest uppercase pb-1 border-b-2 transition-all ${sourceType === 'file' ? 'text-violet-400 border-violet-400' : 'text-slate-600 border-transparent'}`}
                    >
                      FILE UPLOAD
                    </button>
                    <button 
                      onClick={() => setSourceType('text')}
                      className={`text-[10px] font-black tracking-widest uppercase pb-1 border-b-2 transition-all ${sourceType === 'text' ? 'text-violet-400 border-violet-400' : 'text-slate-600 border-transparent'}`}
                    >
                      PASTE CONTEXT
                    </button>
                  </div>
                </div>
                <div className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[10px] font-black tracking-widest">
                  <ShieldCheck size={14} />
                  SECURE ANALYSIS
                </div>
              </div>

              {sourceType === 'file' ? (
                <>
                  <div 
                    className="border-2 border-dashed border-white/5 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-6 bg-slate-950/20 hover:border-violet-500 transition-all cursor-pointer group"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
                    }}
                    onClick={() => document.getElementById('fileInput').click()}
                  >
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow duration-500"
                    >
                      <Upload size={32} className="text-white" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white mb-2">Drop your study material here</p>
                      <p className="text-sm text-slate-500 max-w-xs mx-auto">Upload PDF, Images, or Notes. Our AI will handle the rest.</p>
                    </div>
                    <input 
                      type="file" 
                      id="fileInput" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e.target.files[0])}
                      accept=".pdf,image/*"
                    />
                  </div>

                  {file && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 flex items-center justify-between w-full bg-violet-600/5 border border-violet-500/20 p-5 rounded-3xl"
                    >
                      <div className="flex items-center space-x-4 overflow-hidden">
                        <div className="p-3 bg-violet-500/20 rounded-2xl text-violet-400">
                          <FileText size={20} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-black truncate text-white">{file.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB • READY TO FORGE</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-3 hover:bg-red-400/10 text-slate-500 hover:text-red-400 transition-all rounded-xl">
                        <X size={20} />
                      </button>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <textarea 
                    value={textSource}
                    onChange={(e) => setTextSource(e.target.value)}
                    placeholder="Paste your notes, article, or lecture transcript here..."
                    className="w-full h-64 bg-slate-950/40 border border-white/5 rounded-[2rem] p-8 text-slate-300 placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50 transition-all text-lg font-medium leading-relaxed resize-none shadow-inner"
                  />
                  <div className="flex justify-between items-center px-4">
                    <p className="text-[10px] font-black text-slate-600 tracking-widest uppercase">{textSource.length} CHARACTERS CAPTURED</p>
                    <button 
                      onClick={() => setTextSource('')}
                      className="text-[10px] font-black text-red-400/50 hover:text-red-400 transition-colors tracking-widest uppercase"
                    >
                      CLEAR INPUT
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>

            <Button 
              className="w-full h-20 text-2xl font-black tracking-tighter shadow-2xl shadow-violet-500/20 glow-button" 
              onClick={generateStudyMaterial}
              loading={loading}
              disabled={sourceType === 'file' ? !file : !textSource.trim()}
            >
              <Sparkles size={28} className="animate-pulse" />
              <span>INITIALIZE INTELLIGENCE ENGINE</span>
            </Button>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3 text-red-500">
                <X size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {loading ? (
            <ResultsSkeleton />
          ) : results ? (
            <motion.div {...fadeIn} className="space-y-8">
              
              {/* Tab Navigation */}
              <div className="flex items-center glass rounded-[2.5rem] p-2 overflow-x-auto no-scrollbar border border-white/5">
                <div className="flex gap-2">
                  {[
                    { id: 'quiz', label: 'INTERACTIVE QUIZ', exists: !!results.quiz, icon: Brain },
                    { id: 'flashcards', label: 'FLASHCARDS', exists: !!results.flashcards, icon: Layers },
                    { id: 'summary', label: 'SMART SUMMARY', exists: !!results.summary, icon: BookOpen },
                    { id: 'notes', label: 'CONCEPT MAP', exists: !!results.shortNotes, icon: Layout },
                    { id: 'formulas', label: 'FORMULA LAB', exists: !!results.formulas, icon: Zap },
                    { id: 'studyPlan', label: 'ROADMAP', exists: !!results.studyPlan, icon: Clock },
                    { id: 'analytics', label: 'ANALYTICS', exists: true, icon: BarChart3 }
                  ].filter(item => item.exists).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black tracking-widest rounded-2xl transition-all whitespace-nowrap ${activeTab === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto hidden sm:flex gap-3 px-4">
                  <div className="h-6 w-px bg-white/10" />
                  <button onClick={() => setQuizMode(quizMode === 'Exam' ? 'Practice' : 'Exam')} className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                    <ShieldCheck size={14} />
                    {quizMode === 'Exam' ? 'EXIT EXAM MODE' : 'ENTER EXAM MODE'}
                  </button>
                </div>
              </div>

              {/* Tab Content Content */}
              <div className="min-h-[600px] glass rounded-[3rem] p-10 shadow-2xl border border-white/5">
                
                {activeTab === 'quiz' && (
                  <div className="space-y-8">
                    {!quizFinished ? (
                      <>
                        {/* SESSION STATS */}
                        <AnimatePresence>
                          {adaptationMessage && (
                            <motion.div
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="mb-6 p-4 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center space-x-3 text-violet-400 font-bold shadow-xl"
                            >
                              <Sparkles className="animate-spin" size={20} />
                              <span>{adaptationMessage}</span>
                            </motion.div>
                          )}
                        </AnimatePresence>

                         <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                          <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-3">Live Score</p>
                            <p className="text-3xl font-black text-emerald-400 font-display">{currentQuestionIndex > 0 ? ((score / currentQuestionIndex) * 100).toFixed(0) : 0}%</p>
                          </div>
                          <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-3">Progress</p>
                            <div className="flex items-center gap-3">
                              <p className="text-3xl font-black text-white font-display">{currentQuestionIndex + 1}/{results.quiz.length}</p>
                              <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-violet-500 h-full" style={{ width: `${((currentQuestionIndex + 1) / results.quiz.length) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                          <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-3">Peak Streak</p>
                            <p className="text-3xl font-black text-cyan-400 font-display">+{streakCorrect}</p>
                          </div>
                          <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-3">Time Remaining</p>
                            <p className={`text-3xl font-black font-display ${quizMode === 'Exam' && (numQuestions * 60 - timer) < 60 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                              {quizMode === 'Exam' ? formatTime(numQuestions * 60 - timer) : '--:--'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                        <div className="lg:col-span-3 space-y-10">
                          <div className="max-w-3xl mx-auto flex flex-col gap-10">
                            <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-[0.3em] font-black">
                              <div className="flex items-center gap-4">
                                <span className="text-violet-400">SESSION // ACTIVE</span>
                                <div className="h-3 w-px bg-white/10" />
                                <span>Question {currentQuestionIndex + 1}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                {quizMode === 'Exam' && (
                                  <div className="flex items-center gap-2 text-red-400 bg-red-400/5 px-3 py-1 rounded-full border border-red-500/10">
                                    <Clock size={12} />
                                    <span>{formatTime(timer)}</span>
                                  </div>
                                )}
                                <span className="bg-white/5 px-3 py-1 rounded-full border border-white/5 text-slate-300">{results.quiz[currentQuestionIndex].topic}</span>
                              </div>
                            </div>

                            <motion.h2 
                              key={currentQuestionIndex}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-3xl md:text-5xl font-black font-display leading-[1.1] text-white tracking-tight"
                            >
                              {results.quiz[currentQuestionIndex].question}
                            </motion.h2>

                            <div className="flex flex-col gap-4">
                              {Object.entries(results.quiz[currentQuestionIndex].options).map(([key, value]) => {
                                const isSelected = answers[currentQuestionIndex] === key;
                                const isCorrect = results.quiz[currentQuestionIndex].answer === key;
                                const showFeedback = quizMode === 'Practice' && answers[currentQuestionIndex];
                                
                                return (
                                  <motion.button
                                    key={key}
                                    whileHover={!answers[currentQuestionIndex] ? { x: 10 } : {}}
                                    disabled={!!answers[currentQuestionIndex]}
                                    onClick={() => handleAnswer(key)}
                                    className={`
                                      flex items-center gap-6 p-6 rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden
                                      ${isSelected 
                                        ? (showFeedback ? (isCorrect ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400') : 'bg-violet-600/10 border-violet-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.2)]') 
                                        : (showFeedback && isCorrect ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-400' : 'bg-slate-950/20 border-white/5 hover:border-white/10 text-slate-400')}
                                    `}
                                  >
                                    <div className={`
                                      w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-all duration-500
                                      ${isSelected 
                                        ? (showFeedback ? (isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-violet-600 text-white') 
                                        : 'bg-white/5 text-slate-500 group-hover:bg-violet-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]'}
                                    `}>
                                      {key}
                                    </div>
                                    <span className="text-lg font-bold tracking-tight">{value}</span>
                                    {showFeedback && (
                                      <div className="ml-auto">
                                        {isCorrect ? <Check size={28} className="text-emerald-500" /> : isSelected && <X size={28} className="text-red-500" />}
                                      </div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>

                            {quizMode === 'Practice' && answers[currentQuestionIndex] && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex gap-3"
                              >
                                <div className="text-emerald-500 shrink-0 mt-0.5"><Lightbulb size={18} /></div>
                                <p className="text-xs text-slate-300 italic leading-relaxed">
                                  {results.quiz[currentQuestionIndex].explanation}
                                </p>
                              </motion.div>
                            )}

                            <div className="flex justify-between items-center pt-10">
                              <Button 
                                variant="ghost" 
                                onClick={() => speakText(results.quiz[currentQuestionIndex].question)}
                                className="text-slate-500 hover:text-white text-[10px] uppercase tracking-[0.2em] font-black"
                              >
                                <Volume2 size={20} />
                                <span>Linguistic Audio</span>
                              </Button>

                              <div className="flex gap-6">
                                  {currentQuestionIndex > 0 && (
                                  <Button variant="outline" onClick={() => {
                                    setCurrentQuestionIndex(prev => prev - 1);
                                    setQuestionStartTime(Date.now());
                                  }} className="px-6 h-14 rounded-2xl">
                                    <ChevronLeft size={24} />
                                  </Button>
                                )}
                                {currentQuestionIndex < results.quiz.length - 1 ? (
                                  <Button onClick={() => {
                                    setCurrentQuestionIndex(prev => prev + 1);
                                    setQuestionStartTime(Date.now());
                                  }} className="px-14 h-14 rounded-2xl">
                                    <span>Next Module</span>
                                    <ChevronRight size={20} />
                                  </Button>
                                ) : (
                                  <Button onClick={calculateFinalAnalytics} className="px-14 h-14 rounded-2xl">
                                    <span>Analyze Session</span>
                                    <BarChart3 size={20} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <GlassCard className="p-8" hover={false}>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Performance Radar</h4>
                            <div className="space-y-8">
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Score Matrix</p>
                                  <p className="text-4xl font-black text-white font-display">{score}<span className="text-slate-600">/{currentQuestionIndex + 1}</span></p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Precision</p>
                                  <p className="text-3xl font-mono text-violet-400 font-bold">
                                    {currentQuestionIndex > -1 ? ((score / (Object.keys(answers).length || 1)) * 100).toFixed(0) : 0}%
                                  </p>
                                </div>
                              </div>
                              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                  className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((currentQuestionIndex + 1) / results.quiz.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          </GlassCard>

                          <GlassCard className="p-8" hover={false}>
                            <div className="flex items-center gap-3 mb-6">
                              <Target size={16} className="text-cyan-400" />
                              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Shortcuts</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {[1, 2, 3, 4].map(n => (
                                <div key={n} className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-white/5 text-[10px] font-black group hover:border-violet-500/30 transition-colors">
                                  <span className="text-slate-500 tracking-widest uppercase">KEY [{n}]</span>
                                  <span className="text-violet-400">SELECT OPTION {String.fromCharCode(64 + n)}</span>
                                </div>
                              ))}
                            </div>
                          </GlassCard>
                        </div>
                      </div>
                    </>
                  ) : (
                      <motion.div {...fadeIn} className="max-w-3xl mx-auto text-center space-y-8 py-10">
                        <div className="inline-flex p-6 bg-violet-500/10 rounded-full text-violet-400 mb-4">
                          <Trophy size={80} />
                        </div>
                        <div>
                          <h2 className="text-5xl font-bold mb-2 text-white">Quiz Complete!</h2>
                          <p className="text-slate-400">You've mastered these concepts inspired by your notes.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <StatCard icon={Target} label="Accuracy" value={`${analytics.accuracy}%`} color="indigo" />
                          <StatCard icon={Check} label="Correct" value={`${score}/${results.quiz.length}`} color="success" />
                          <StatCard icon={Clock} label="Time" value={formatTime(timer)} color="amber" />
                        </div>

                        <GlassCard className="p-8 text-left">
                          <h4 className="text-lg font-bold mb-4 text-white">Performance Insights</h4>
                          <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Strong Topics</p>
                                <div className="flex flex-wrap gap-2">
                                    {results.quiz.map(q => q.topic).filter((v, i, a) => v && a.indexOf(v) === i && !analytics.weakAreas.includes(v)).map(topic => (
                                        <span key={topic} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">{topic}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Needs Improvement</p>
                                <div className="flex flex-wrap gap-2">
                                    {analytics.weakAreas.map(topic => (
                                        <span key={topic} className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold">{topic}</span>
                                    ))}
                                </div>
                            </div>
                          </div>
                        </GlassCard>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Button className="w-full sm:w-auto px-8" onClick={resetQuiz}>
                            <RefreshCcw size={18} />
                            <span>Retry Quiz</span>
                          </Button>
                          <Button variant="outline" className="w-full sm:w-auto px-8" onClick={() => downloadText(results.quiz, 'quiz-results.txt')}>
                            <Download size={18} />
                            <span>Download Results</span>
                          </Button>
                          <Button variant="secondary" className="w-full sm:w-auto px-8" onClick={() => setActiveTab('analytics')}>
                            <BarChart3 size={18} />
                            <span>View Detailed Dashboard</span>
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}                {activeTab === 'flashcards' && results.flashcards && (
                  <div className="max-w-3xl mx-auto flex flex-col gap-10 py-10">
                    <div className="relative h-[500px] perspective-2000">
                      <motion.div
                        className="w-full h-full relative preserve-3d cursor-pointer"
                        initial={false}
                        animate={{ 
                          rotateY: isFlipped ? 180 : 0,
                          scale: 1
                        }}
                        whileHover={{ 
                          scale: 1.05,
                          transition: { type: "spring", stiffness: 400, damping: 10 }
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ 
                          rotateY: { type: "spring", stiffness: 100, damping: 15 },
                          default: { duration: 0.5 }
                        }}
                        onClick={() => setIsFlipped(!isFlipped)}
                      >
                        {/* Front */}
                        <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center shadow-[0_40px_100px_rgba(139,92,246,0.3)] border-4 border-white/10 overflow-hidden ring-px ring-white/20">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)]" />
                          <div className="absolute top-0 left-0 w-full h-full bg-grid-white opacity-5" />
                          
                          <motion.span 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/10 px-4 py-1.5 rounded-full text-violet-200 uppercase tracking-[0.4em] font-black text-[10px] mb-12 border border-white/10"
                          >
                            NEURAL CONCEPT
                          </motion.span>
                          
                          <motion.h3 
                            layout
                            className="text-4xl md:text-6xl font-black text-white font-display leading-tight tracking-tighter glow-text"
                          >
                            {results.flashcards[flashcardIndex]?.term}
                          </motion.h3>
                          
                          <div className="mt-16 flex items-center gap-4 text-white/40 group-hover:text-white/80 transition-colors animate-pulse">
                            <div className="h-px w-8 bg-white/20" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">REVEAL DATA</span>
                            <div className="h-px w-8 bg-white/20" />
                          </div>
                        </div>

                        {/* Back */}
                        <div className="absolute inset-0 backface-hidden glass border-4 border-violet-500/30 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center shadow-3xl rotateY-180 ring-1 ring-violet-500/20 overflow-y-auto no-scrollbar">
                          <span className="text-slate-500 uppercase tracking-[0.5em] font-black text-[10px] mb-10">DEFINITION_DECODED</span>
                          
                          <motion.p 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: isFlipped ? 1 : 0, scale: isFlipped ? 1 : 0.9 }}
                            transition={{ delay: 0.3 }}
                            className="text-2xl md:text-3xl text-white leading-relaxed font-bold mb-10 tracking-tight"
                          >
                            {results.flashcards[flashcardIndex]?.definition}
                          </motion.p>
                          
                          {results.flashcards[flashcardIndex]?.example && (
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: isFlipped ? 1 : 0, y: isFlipped ? 0 : 20 }}
                              transition={{ delay: 0.5 }}
                              className="bg-white/5 border border-white/10 p-8 rounded-3xl max-w-lg backdrop-blur-3xl shadow-inner"
                            >
                                <p className="text-cyan-400 text-[10px] font-black mb-3 uppercase tracking-widest">REAL-WORLD CONTEXT</p>
                                <p className="text-slate-400 text-lg italic leading-relaxed font-medium">"{results.flashcards[flashcardIndex]?.example}"</p>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    </div>

                    <div className="flex items-center justify-between px-4">
                      <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        SEQUENCE ID <span className="text-violet-400 ml-2">[{flashcardIndex + 1}/{results.flashcards.length}]</span>
                      </div>
                      <div className="flex gap-4">
                        <Button 
                          variant="outline" 
                          disabled={flashcardIndex === 0}
                          onClick={() => { setFlashcardIndex(prev => prev - 1); setIsFlipped(false); }}
                          className="w-16 h-16 rounded-2xl p-0"
                        >
                          <ChevronLeft size={28} />
                        </Button>
                        <Button 
                          variant="outline" 
                          disabled={flashcardIndex === results.flashcards.length - 1}
                          onClick={() => { setFlashcardIndex(prev => prev + 1); setIsFlipped(false); }}
                          className="w-16 h-16 rounded-2xl p-0"
                        >
                          <ChevronRight size={28} />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'summary' && results.summary && (
                  <div className="max-w-4xl mx-auto space-y-12 py-10">
                    <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.5em] mb-3">AI GENERATED INSIGHTS</p>
                          <h2 className="text-4xl md:text-6xl font-black font-display text-white tracking-tighter">Smart Summary</h2>
                        </div>
                        <Button variant="outline" onClick={() => downloadText(results.summary, 'notes-summary.txt')} className="h-14 rounded-2xl">
                            <Download size={20} />
                            <span>Export Assets</span>
                        </Button>
                    </div>

                    <GlassCard className="p-12" hover={false}>
                      <div className="prose prose-invert max-w-none space-y-12">
                        <section>
                          <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.5em] mb-6 flex items-center gap-4">
                            <div className="h-px w-12 bg-violet-500/30" />
                             OVERVIEW
                          </h3>
                          <p className="text-2xl text-slate-200 leading-relaxed font-medium">
                            {results.summary.overview}
                          </p>
                        </section>

                        <section>
                            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.5em] mb-8 flex items-center gap-4">
                              <div className="h-px w-12 bg-cyan-500/30" />
                              NEURAL CONCEPTS
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {results.summary.keyConcepts.map((concept, idx) => (
                                    <motion.div 
                                      key={idx} 
                                      whileHover={{ scale: 1.02, x: 5 }}
                                      className="p-8 bg-white/5 border border-white/5 rounded-3xl flex items-center space-x-6 hover:border-cyan-500/30 transition-all shadow-xl"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-xl shrink-0 shadow-inner">
                                            {idx + 1}
                                        </div>
                                        <div className="font-bold text-xl text-slate-100 tracking-tight">{concept}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.5em] mb-8 flex items-center gap-4">
                              <div className="h-px w-12 bg-violet-500/30" />
                              CRITICAL DATA POINTS
                            </h3>
                            <div className="space-y-6">
                                {results.summary.importantPoints.map((point, idx) => (
                                    <motion.div 
                                      key={idx} 
                                      className="flex items-start gap-6 p-6 rounded-3xl bg-slate-950/40 border border-white/5"
                                    >
                                        <div className="mt-2 w-2 h-2 bg-violet-600 rounded-full shrink-0 shadow-[0_0_10px_#8b5cf6]" />
                                        <span className="text-lg text-slate-300 leading-relaxed font-medium">{point}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                      </div>
                    </GlassCard>
                  </div>
                )}
                
                {activeTab === 'notes' && results.shortNotes && (
                  <div className="max-w-4xl mx-auto space-y-12 py-10">
                    <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.5em] mb-3">KNOWLEDGE BASE</p>
                          <h2 className="text-4xl md:text-6xl font-black font-display text-white tracking-tighter">Concept Map</h2>
                        </div>
                        <Button variant="outline" onClick={() => downloadText(results.shortNotes, 'study-notes.txt')} className="h-14 rounded-2xl">
                            <Download size={20} />
                            <span>Export Data</span>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                      {results.shortNotes.map((section, idx) => (
                        <div key={idx} className="group">
                          <h3 className="text-xs font-black text-violet-400 uppercase tracking-[0.5em] mb-6 flex items-center gap-4">
                            <div className="h-px w-12 bg-violet-500/30 group-hover:w-20 transition-all duration-700" />
                            {section.title}
                          </h3>
                          <GlassCard className="p-10 border-violet-500/10 hover:border-violet-500/30">
                            <div className="space-y-8">
                              {section.points.map((pt, pidx) => (
                                <motion.div 
                                  key={pidx} 
                                  initial={{ opacity: 0, x: -10 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  transition={{ delay: pidx * 0.1 }}
                                  className="flex gap-8 group/item"
                                >
                                  <div className="mt-3 w-12 h-px bg-white/10 group-hover/item:bg-violet-500 transition-colors shrink-0" />
                                  <p className="text-xl text-slate-300 leading-relaxed font-medium">{pt}</p>
                                </motion.div>
                              ))}
                            </div>
                          </GlassCard>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'formulas' && results.formulas && (
                  <div className="max-w-5xl mx-auto py-10 space-y-12">
                     <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.5em] mb-3">TECHNICAL REFERENCE</p>
                        <h2 className="text-4xl md:text-6xl font-black font-display text-white tracking-tighter">Formula Lab</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {results.formulas.length > 0 ? results.formulas.map((item, idx) => (
                        <GlassCard key={idx} className="p-8 group hover:border-violet-500/30 transition-all flex flex-col gap-8">
                          <div className="flex justify-between items-start">
                            <div className="bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">{item.topic || 'General'}</span>
                            </div>
                            <Zap size={20} className="text-emerald-500/30 group-hover:text-emerald-500 animate-pulse transition-colors" />
                          </div>
                          
                          <div className="space-y-4">
                            <p className="text-2xl font-black text-white font-mono tracking-tight">{item.formula}</p>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{item.name}</p>
                          </div>

                          <div className="mt-auto pt-6 border-t border-white/5">
                             <p className="text-slate-400 text-sm leading-relaxed font-medium italic">"{item.description}"</p>
                          </div>
                        </GlassCard>
                      )) : (
                        <div className="col-span-full py-20 text-center glass rounded-3xl border border-dashed border-white/10">
                          <p className="text-slate-500 font-black tracking-widest uppercase text-xs">No technical formulas identified in this document</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'studyPlan' && results.studyPlan && (
                  <div className="max-w-4xl mx-auto py-10 space-y-12">
                    <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em] mb-3">PERSONALIZED CURRICULUM</p>
                        <h2 className="text-4xl md:text-6xl font-black font-display text-white tracking-tighter">Strategic Roadmap</h2>
                    </div>
                    
                    <div className="relative space-y-16 py-10 before:absolute before:left-8 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                      {results.studyPlan.map((day, idx) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          className="relative pl-24"
                        >
                          <div className="absolute left-0 top-0 w-16 h-16 bg-slate-950 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 font-black text-xl z-10 shadow-[0_0_30px_rgba(245,158,11,0.1)] group hover:scale-110 transition-transform">
                            {idx + 1}
                          </div>
                          <GlassCard className="p-10 border-amber-500/5 hover:border-amber-500/20" hover={false}>
                            <h4 className="text-[10px] font-black mb-8 uppercase tracking-[0.4em] text-amber-500">Day {day.day} // PHASE {idx + 1}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {day.tasks.map((task, tidx) => (
                                <motion.div 
                                  key={tidx} 
                                  whileHover={{ x: 5 }}
                                  className="flex items-center space-x-4 p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/10 transition-all"
                                >
                                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]" />
                                  <span className="text-slate-300 font-medium text-lg tracking-tight">{task}</span>
                                </motion.div>
                              ))}
                            </div>
                          </GlassCard>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'analytics' && analytics && (
                  <div className="max-w-6xl mx-auto py-6 space-y-8">
                    {/* Header Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard icon={Target} label="Core Precision" value={`${analytics.accuracy}%`} color="indigo" />
                      <StatCard icon={Timer} label="Processing Velocity" value={formatTime(analytics.timeSpent)} color="amber" />
                      <StatCard icon={TrendingUp} label="Progress Delta" value={history.length > 1 ? `${(analytics.accuracy - (history[1]?.accuracy || analytics.accuracy)).toFixed(1)}%` : "Initial Log"} color={history.length > 1 && (analytics.accuracy - history[1]?.accuracy) >= 0 ? "success" : "danger"} />
                      <StatCard icon={AlertTriangle} label="Detected Vulnerabilities" value={analytics.weakAreas.length} color="rose" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Topic Accuracy Bar Chart */}
                      <GlassCard className="p-8 lg:col-span-2">
                        <div className="flex justify-between items-center mb-8">
                          <div>
                            <h4 className="text-lg font-bold text-white mb-1">Topic Performance</h4>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Accuracy breakdown by subject matter</p>
                          </div>
                          <BarChart3 className="text-violet-400" size={24} />
                        </div>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Object.entries(analytics.topicStats || {}).map(([name, stats]) => ({
                              name,
                              accuracy: parseFloat(((stats.correct / stats.total) * 100).toFixed(1))
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} unit="%" />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                itemStyle={{ color: '#8b5cf6' }}
                              />
                              <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                                {Object.entries(analytics.topicStats || {}).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8b5cf6' : '#22d3ee'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </GlassCard>

                      {/* Time per Question Analysis */}
                      <GlassCard className="p-8">
                        <div className="flex justify-between items-center mb-8">
                          <div>
                            <h4 className="text-lg font-bold text-white mb-1">Focus Flow</h4>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Time spent per question (s)</p>
                          </div>
                          <Clock className="text-amber-400" size={24} />
                        </div>
                        <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={Object.entries(questionTimes).map(([idx, time]) => ({
                              q: `Q${parseInt(idx) + 1}`,
                              time: parseFloat(time.toFixed(1))
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="q" stroke="#64748b" fontSize={8} />
                              <YAxis stroke="#64748b" fontSize={10} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                              />
                              <Line type="monotone" dataKey="time" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </GlassCard>

                      {/* Mastery Progress Chart */}
                      <GlassCard className="p-8 lg:col-span-3 bg-gradient-to-br from-[#1E293B] to-[#0F172A]">
                        <div className="flex justify-between items-center mb-10">
                          <div>
                            <h4 className="text-xl font-bold text-white mb-2">Mastery Progress over Attempts</h4>
                            <p className="text-sm text-slate-400">Tracking your evolution across multiple study sessions</p>
                          </div>
                          {isHistoryLoading && <Skeleton className="h-6 w-32 rounded-lg" />}
                        </div>
                        <div className="h-[350px] w-full relative">
                          {isHistoryLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-3xl z-10">
                               <Loader2 className="animate-spin text-violet-500" size={40} />
                            </div>
                          ) : history.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 bg-black/10 rounded-3xl border border-dashed border-white/5">
                               <TrendingUp size={48} className="mb-4 opacity-20" />
                               <p className="text-xs font-black uppercase tracking-widest">Awaiting Initial Session Data</p>
                            </div>
                          ) : null}
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...history].reverse().map((h, i) => ({
                              attempt: i + 1,
                              accuracy: h.accuracy,
                              label: h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'Now'
                            }))}>
                              <defs>
                                <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={true} />
                              <XAxis dataKey="attempt" stroke="#64748b" fontSize={10} label={{ value: 'Attempt #', position: 'insideBottom', offset: -5, fill: '#64748b' }} />
                              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '12px' }}
                                itemStyle={{ fontWeight: 'bold' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="accuracy" 
                                stroke="#8b5cf6" 
                                strokeWidth={4} 
                                dot={{ r: 6, fill: '#8b5cf6', stroke: '#1e293b', strokeWidth: 2 }} 
                                activeDot={{ r: 8, strokeWidth: 0 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </GlassCard>

                      <div className="lg:col-span-2 space-y-6">
                        <GlassCard className="p-8">
                          <h4 className="text-lg font-bold mb-6 text-white">Topic Mastery Breakdown</h4>
                          <div className="space-y-4">
                            {Object.entries(analytics.topicStats || {}).map(([topic, stats]) => {
                              const percentage = (stats.correct / stats.total) * 100;
                              return (
                                <div key={topic} className="flex justify-between items-center p-4 bg-slate-950/50 border border-slate-800 rounded-2xl hover:border-violet-500/30 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${percentage > 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {percentage > 70 ? <Check size={16} /> : <AlertTriangle size={16} />}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-white">{topic}</p>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{stats.correct}/{stats.total} Correct</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-lg font-bold ${percentage > 70 ? 'text-emerald-400' : 'text-red-400'}`}>{percentage.toFixed(0)}%</p>
                                    <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                      <div className={`h-full ${percentage > 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </GlassCard>
                      </div>

                      <GlassCard className="p-8 bg-gradient-to-t from-violet-600/10 to-transparent border-violet-500/20">
                          <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-violet-600/20 rounded-full flex items-center justify-center text-violet-400 border border-violet-500/30 animate-pulse">
                              <Star size={40} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-white mb-2">Study Efficiency Score</h4>
                                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                                  {((analytics.accuracy / (analytics.timeSpent / results.quiz.length)) * 10).toFixed(0)} / 100
                                </p>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed italic">
                              "Mastery is not about the hours spent, but the focus refined. Your {Object.keys(analytics.topicStats || {}).length} topic focus areas show high cognitive sync."
                            </p>
                            <Button className="w-full" onClick={() => generateStudyMaterial()}>
                              <RefreshCcw size={18} />
                              <span>Reinforce Learning</span>
                            </Button>
                          </div>
                      </GlassCard>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div {...fadeIn} className="py-40 text-center">
              <div className="inline-flex p-10 bg-gray-800/10 rounded-full text-indigo-500/20 mb-6">
                <Layers size={100} />
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">No Content Yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Upload your study materials to see the magic happen here.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

        {/* Footer section with futuristic clean design */}
        <footer className="mt-40 border-t border-white/5 pt-20 pb-12 relative overflow-hidden backdrop-blur-3xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16">
            <div className="md:col-span-2 space-y-8">
              <div className="flex items-center space-x-3 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-tr from-violet-600 to-cyan-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative bg-black p-2 rounded-lg border border-white/10">
                    <Brain className="text-violet-500" size={28} />
                  </div>
                </div>
                <span className="text-2xl font-black font-display tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
                  EXAM<span className="text-violet-500">PREP</span>AI
                </span>
              </div>
              <p className="text-slate-500 text-lg leading-relaxed max-w-sm">
                Engineering the future of education with hyper-personalized AI learning pathways and neural study synthesis.
              </p>
              <div className="flex space-x-6">
                {[Github, Twitter, Linkedin].map((Icon, idx) => (
                  <motion.a 
                    key={idx}
                    whileHover={{ scale: 1.1, color: '#8b5cf6' }}
                    href="#" 
                    className="text-slate-600 hover:text-white transition-colors p-3 bg-white/5 rounded-2xl border border-white/5"
                  >
                    <Icon size={20} />
                  </motion.a>
                ))}
              </div>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">SYSTEM CORE</h4>
              <ul className="space-y-4">
                {['Neural Quiz', 'Concept Synthesis', 'Mastery Roadmap', 'Asset Lab'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-slate-500 hover:text-violet-400 transition-colors text-sm font-bold tracking-tight">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
               <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">TERMINAL</h4>
               <div className="p-6 bg-white/5 border border-white/5 rounded-3xl">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">SYSTEM STATUS</p>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-slate-300">NEURAL ENGINE ONLINE</span>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">&copy; 2024 ExamPrepAI. All Neural Networks Proprietary.</p>
            <div className="flex gap-8">
               {['TERMS', 'PRIVACY', 'SECURITY'].map(item => (
                 <a key={item} href="#" className="text-[10px] font-black text-slate-600 hover:text-white transition-colors tracking-[0.3em]">{item}</a>
               ))}
            </div>
          </div>
        </footer>

      {/* Global CSS for flip effect */}
      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotateY-180 { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glow-text {
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
        input[type='range']::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }
      `}</style>
      </div>
    </ErrorBoundary>
  );
}

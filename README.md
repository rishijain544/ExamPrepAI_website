<div align="center">

# 🎓 ExamPrepAI

### AI-Powered Exam Preparation Platform

**Turn any lecture PDF or slide image into MCQs, Flashcards, Summaries & more — instantly.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Website-6C63FF?style=for-the-badge)](https://exam-prep-ai-website-fantasyk315-8747s-projects.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-rishijain544-181717?style=for-the-badge&logo=github)](https://github.com/rishijain544/ExamPrepAI_website)
[![Built with Gemini](https://img.shields.io/badge/Powered_by-Gemini_AI-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_DB-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com)

</div>

---

## 🖥️ Screenshots

<div align="center">

<img src="https://github.com/user-attachments/assets/3a0faceb-ddd0-43c5-9366-c9068a47ae5f" width="100%" alt="ExamPrepAI - Hero Landing Page"/>

<br/><br/>

<img src="https://github.com/user-attachments/assets/e47ea7a6-b86b-4dc6-a017-0b023e60fffe" width="100%" alt="ExamPrepAI - Engine Config & Upload"/>

</div>

---

## 🔗 Live Demo

👉 **[https://exam-prep-ai-website-fantasyk315-8747s-projects.vercel.app/](https://exam-prep-ai-website-fantasyk315-8747s-projects.vercel.app/)**

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Firebase Setup](#-firebase-setup)
- [Deployment on Vercel](#-deployment-on-vercel)
- [How It Works](#-how-it-works)
- [Resume Keywords](#-resume-keywords)
- [Author](#-author)

---

## 🧠 About the Project

**ExamPrepAI** is a multimodal AI-powered EdTech web application that helps students study smarter. Upload any lecture PDF or whiteboard image and the AI automatically generates complete study material in seconds.

Built using **Google Gemini Vision API** with a **React + TypeScript** frontend, **Firebase** for authentication and data persistence, and deployed globally on **Vercel**.

> 💡 Built using **Google AI Studio** — demonstrates real-world multimodal AI, prompt engineering, and full-stack deployment skills.

---

## ✨ Features

| Module | Description |
|---|---|
| 🧠 **Neural Quiz** | Interactive MCQs with A/B/C/D options, answer reveal & explanations |
| 🃏 **Smart Cards** | Flashcards with term, definition, and real-world examples |
| 📋 **AI Summary** | Structured executive summary with key takeaways |
| ⚗️ **Formula Lab** | Auto-extracted formulas and equations from slides |
| 🎯 **Adapt Path** | Adaptive learning — difficulty adjusts to your performance |
| 📊 **Insight Hub** | Quiz scores, history, and performance analytics |
| 📄 **PDF Upload** | Upload multi-page lecture PDFs — AI reads every page |
| 🖼️ **Image Upload** | Upload whiteboard photos or slide screenshots |
| 💬 **Paste Context** | Paste raw text directly if you don't have a file |
| 🌐 **Multi-language** | Generate study material in multiple languages |
| 🔐 **Google Auth** | Secure login via Firebase Authentication |
| 📱 **Responsive** | Works on desktop, tablet, and mobile |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI Framework |
| TypeScript | 5.8 | Type Safety |
| Vite | 6 | Build Tool |
| Tailwind CSS | 4 | Styling |
| Lucide React | 0.546 | Icons |
| Motion | 12 | Animations |
| Recharts | 3.8 | Analytics Charts |
| Sonner | 2.0 | Toast Notifications |

### Backend & AI
| Technology | Version | Purpose |
|---|---|---|
| Google Gemini API | `@google/genai` v2.2 | Multimodal Vision AI |
| Express.js | 5 | API Server |
| Node.js + TSX | 4.22 | Server Runtime |
| esbuild | 0.28 | Server Bundler |

### Database & Auth
| Technology | Purpose |
|---|---|
| Firebase Authentication | Google Sign-In / User Management |
| Cloud Firestore | Quiz results, flashcards, user progress |
| Firebase Security Rules | Per-user data access control |

### DevOps
| Technology | Purpose |
|---|---|
| Vercel | Frontend hosting + Serverless API functions |
| GitHub | Version control & CI/CD trigger |

---

## 📁 Project Structure

```
ExamPrepAI_website/
│
├── api/
│   └── index.ts              # Express server — Gemini API integration
│
├── src/
│   ├── components/           # Reusable React components
│   │   ├── ui/               # Base UI components
│   │   ├── quiz/             # Quiz module components
│   │   ├── flashcards/       # Flashcard components
│   │   └── layout/           # Nav, Footer, Layout
│   ├── pages/                # Route-level page components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Firebase config & API utilities
│   └── main.tsx              # React app entry point
│
├── .env.example              # Environment variables template
├── .gitignore
├── firebase-applet-config.json
├── firebase-blueprint.json
├── firestore.rules           # Firestore security rules
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vercel.json               # Vercel deployment config
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm
- Gemini API Key → [Get it free here](https://aistudio.google.com/app/apikey)
- Firebase project → [Create one here](https://console.firebase.google.com)

### Local Setup

**1. Clone the repository**
```bash
git clone https://github.com/rishijain544/ExamPrepAI_website.git
cd ExamPrepAI_website
```

**2. Install dependencies**
```bash
npm install
```

**3. Create environment file**
```bash
cp .env.example .env.local
# Then fill in your API keys (see below)
```

**4. Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` 🎉

---

## 🔑 Environment Variables

Create `.env.local` in the project root:

```env
# ─── Google Gemini API ───────────────────────────────
# Get free at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy_your_key_here

# ─── Firebase Config ────────────────────────────────
# Get from: Firebase Console → Project Settings → Your Apps
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```
**4. Add Vercel domain to authorized domains**
Firebase Console → Authentication → Settings → Authorized domains → Add your Vercel URL

---

## 🌐 Deployment on Vercel

**1. Push to GitHub**
```bash
git add .
git commit -m "deploy ExamPrepAI"
git push origin main
```

**2. Import on Vercel**
- Go to [vercel.com](https://vercel.com) → **Add New Project**
- Import your `ExamPrepAI_website` GitHub repo
- Add all environment variables under **Settings → Environment Variables**
- Click **Deploy** ✅

**3. Redeploy after adding env variables**
Deployments → Redeploy (without cache)

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────────────┐
│                      USER FLOW                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. User logs in with Google  (Firebase Auth)           │
│            ↓                                            │
│  2. Uploads PDF / Image / Pastes text                   │
│            ↓                                            │
│  3. Selects output modules (Quiz, Cards, Summary...)    │
│            ↓                                            │
│  4. Clicks "Initialize Intelligence Engine"             │
│            ↓                                            │
│  5. File sent to /api/generate (Vercel serverless)      │
│            ↓                                            │
│  6. Gemini Vision API reads file (text + visuals)       │
│            ↓                                            │
│  7. Structured JSON returned per selected module        │
│            ↓                                            │
│  8. React renders interactive study material            │
│            ↓                                            │
│  9. Results saved to Firestore for progress tracking    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Available Scripts

```bash
npm run dev      # Start development server (frontend + backend)
npm run build    # Build frontend (Vite) + bundle API (esbuild)
npm run start    # Start production server
npm run lint     # TypeScript type checking
npm run clean    # Remove dist folder
```

---
## 🤝 Contributing

1. Fork the repository
2. Create your branch: `git checkout -b feature/NewFeature`
3. Commit: `git commit -m 'Add NewFeature'`
4. Push: `git push origin feature/NewFeature`
5. Open a Pull Request

---

## 📝 License

Open source under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Rishi Jain**

[![GitHub](https://img.shields.io/badge/GitHub-rishijain544-181717?style=flat-square&logo=github)](https://github.com/rishijain544)
[![Live Demo](https://img.shields.io/badge/Live_App-ExamPrepAI-6C63FF?style=flat-square)](https://exam-prep-ai-website-fantasyk315-8747s-projects.vercel.app/)

---

<div align="center">

Made with ❤️ by Rishi Jain

**⭐ Star this repo if you found it useful! ⭐**

`Google Gemini AI` · `React` · `Firebase` · `Vercel` · `EdTech`

</div>

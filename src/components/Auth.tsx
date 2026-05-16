import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Github, 
  Eye, 
  EyeOff, 
  Loader2,
  Sparkles,
  ShieldCheck,
  Brain
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { toast } from 'sonner';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess?.();
      toast.success(isLogin ? "Session Established" : "Identity Generated", {
        description: `Welcome to the neural network, ${email.split('@')[0]}.`
      });
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message.replace('Firebase: ', '');
      setError(errorMessage);
      toast.error("Authentication Blocked", {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      onAuthSuccess?.();
      toast.success("Quantum Sync Successful", {
        description: `Identity verified via Google. Welcome back, ${result.user.displayName || 'Learner'}.`
      });
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message.replace('Firebase: ', '');
      
      if (err.code === 'auth/unauthorized-domain') {
        errorMessage = "Unauthorized Domain: You need to add this Vercel domain to your Firebase Console -> Authentication -> Settings -> Authorized Domains.";
      }
      
      setError(errorMessage);
      toast.error("Bridge Connection Failed", {
        description: errorMessage,
        duration: 8000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient px-6 relative overflow-hidden font-sans">
      <div className="grid-bg absolute inset-0 opacity-20" />
      <div className="aurora-bg absolute inset-0 opacity-40 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-cyan-400 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)] text-white mx-auto mb-8 relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-white opacity-20 rounded-3xl animate-pulse group-hover:opacity-40 transition-opacity" />
            <Brain size={40} className="relative z-10" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter font-display mb-4">
            {isLogin ? 'Welcome Back' : 'Initialize Access'}
          </h1>
          <p className="text-slate-400 text-lg font-medium tracking-tight">
            {isLogin 
              ? 'Synchronize with your learning data' 
              : 'Join the next generation of study intelligence'}
          </p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-10 shadow-3xl border border-white/10 group hover:border-white/20 transition-all duration-500">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">TERMINAL // EMAIL</label>
              <div className="relative group/input">
                <div className="absolute inset-0 bg-violet-500/5 rounded-2xl blur-sm group-focus-within/input:bg-violet-500/10 transition-all" />
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-violet-400 transition-colors z-10" size={20} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50 transition-all text-base font-medium relative z-0"
                  placeholder="name@nexus.ai"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">ENCRYPTION // PASS</label>
              <div className="relative group/input">
                <div className="absolute inset-0 bg-violet-500/5 rounded-2xl blur-sm group-focus-within/input:bg-violet-500/10 transition-all" />
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-violet-400 transition-colors z-10" size={20} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 rounded-2xl py-5 pl-14 pr-14 text-white placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50 transition-all text-base font-medium relative z-0"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors z-10"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[11px] font-black uppercase tracking-widest text-red-400 bg-red-400/5 p-4 rounded-2xl border border-red-400/20 text-center"
              >
                SYSTEM_ERROR: {error}
              </motion.div>
            )}

            <motion.button 
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-16 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black uppercase tracking-[0.4em] rounded-2xl shadow-[0_10px_30px_rgba(139,92,246,0.2)] disabled:opacity-50 transition-all flex items-center justify-center gap-4 group"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span>{isLogin ? 'ESTABLISH SESSION' : 'INITIALIZE CORE'}</span>
                  <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">
              <span className="bg-[#0f172a] px-6">NEURAL BRIDGES</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <motion.button 
              onClick={handleGoogleSignIn}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
              className="flex items-center justify-center gap-4 w-full h-16 bg-white/5 border border-white/5 rounded-2xl text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] transition-all"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>GOOGLE QUANTUM</span>
            </motion.button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-10">
          {isLogin ? "NEW_USER?" : "EXISTING_USER?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-violet-400 ml-3 hover:text-violet-300 transition-colors border-b border-violet-500/20"
          >
            {isLogin ? 'GENERATE IDENTITY' : 'RESTORE ACCESS'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

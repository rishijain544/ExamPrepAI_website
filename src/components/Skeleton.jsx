import React from 'react';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-800/50 rounded-xl ${className}`}
      {...props}
    />
  );
};

export const ResultsSkeleton = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      {/* Central Loading Message */}
      <div className="absolute inset-x-0 top-1/3 z-20 flex flex-col items-center justify-center text-center">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-24 h-24 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)] text-white mb-8"
        >
          <Brain size={48} className="animate-pulse" />
        </motion.div>
        
        <h3 className="text-3xl font-black text-white font-display tracking-tight mb-3">
          Forging Intelligence...
        </h3>
        <p className="text-slate-400 font-medium max-w-sm">
          The engine is analyzing your material and generating cinematic study assets. Hold on...
        </p>
        <div className="mt-6 flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
          <Loader2 className="animate-spin text-violet-400" size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">Neural Synthesis Active</span>
        </div>
      </div>

      <div className="opacity-10 pointer-events-none">
        <div className="flex items-center glass rounded-[2.5rem] p-2 border border-white/5 space-x-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-2xl" />
          ))}
        </div>
        
        <div className="min-h-[600px] glass rounded-[3rem] p-10 border border-white/5 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4 rounded-xl" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-[2rem]" />
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <div className="flex space-x-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <Skeleton className="h-14 w-40 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HistorySkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-3 w-1/4 rounded opacity-50" />
          </div>
          <Skeleton className="w-16 h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

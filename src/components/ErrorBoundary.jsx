import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full glass p-8 rounded-3xl border border-white/10 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-400">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-slate-400 mb-8 leading-relaxed">
              An unexpected error occurred. Don't worry, your progress is safe.
              Try refreshing the page or clicking the button below.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-violet-600/20"
            >
              <RotateCcw size={18} />
              Retry Everything
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="mt-8 p-4 bg-black/40 rounded-xl text-left border border-white/5 overflow-auto max-h-40">
                <code className="text-xs text-red-300 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ShieldAlert, Sparkles, ArrowRight, Lock, User as UserIcon, ExternalLink, Loader2 } from 'lucide-react';
import { User } from '../types';
import { signIn } from '../lib/auth';

interface LoginScreenProps {
  onLogin: (user: User) => void | Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    const { user, error: authError } = await signIn(username, password);
    if (authError || !user) {
      setError(authError || 'Sign in failed.');
      setLoading(false);
      return;
    }
    await onLogin(user);
    setLoading(false);
  };

  // Quick-fill a username (operators still type their own password).
  const handleQuickFill = (roleUser: string) => {
    setUsername(roleUser);
    setError('');
  };

  return (
    <div className="fixed inset-0 w-screen h-screen login-animated-bg flex items-center justify-center z-50 p-4 overflow-hidden font-sans select-none">
      
      {/* Animated Glowing Light Orbs & Mesh Overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-orange-500/30 to-amber-300/20 blur-[130px] animate-blob-float-1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-orange-500/20 blur-[140px] animate-blob-float-2" />
        <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 blur-[110px] animate-blob-float-3" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.3)_100%)]" />
      </div>

      {/* Main Solid White Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 70, damping: 18 }}
        className="relative z-10 bg-white border border-slate-200/90 rounded-[2.5rem] w-full max-w-md p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.2),0_0_35px_rgba(253,151,7,0.15)] overflow-hidden flex flex-col"
      >
        {/* Brand & Header Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="w-16 h-16 rounded-2xl bg-[#0b1220] border border-slate-100 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0b1220]/20"
          >
            <img
              src="/logo-mark.png"
              alt="SOLE"
              className="w-8 h-8 object-contain"
            />
          </motion.div>
          <img
            src="/logo.png"
            alt="SOLE"
            className="h-8 w-auto mx-auto mb-2"
          />
          <p className="text-slate-500 text-[11px] font-extrabold tracking-[0.2em] uppercase">
            Smart Operations & Logistics Engine
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-orange-500" />
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 text-slate-900 text-sm outline-none transition duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 placeholder-slate-400 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-orange-500" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3.5 pr-11 text-slate-900 text-sm outline-none transition duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 placeholder-slate-400 font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition duration-200 p-1 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3.5 text-xs font-bold"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b1220] hover:bg-[#161f33] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#0b1220]/20 transition-all duration-300 text-sm flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </form>

        {/* Team Quick Access — fills the username, then enter your password */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" /> Team Members
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Tap to fill username</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              { user: 'sina', label: 'Sina', tier: 'Full access' },
              { user: 'masoud', label: 'Masoud', tier: 'Full access' },
              { user: 'tina', label: 'Tina', tier: 'No finance' },
            ]).map(m => (
              <button
                key={m.user}
                type="button"
                onClick={() => handleQuickFill(m.user)}
                className="bg-slate-50 hover:bg-orange-50/80 border border-slate-200/80 hover:border-orange-300 rounded-xl p-2.5 text-left transition duration-200 group cursor-pointer"
              >
                <span className="text-xs font-extrabold text-slate-800 group-hover:text-orange-600 block">{m.label}</span>
                <span className="text-[10px] text-slate-400 font-mono block">{m.tier}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Powered By Footer Link */}
        <div className="mt-5 text-center border-t border-slate-100 pt-3.5">
          <p className="text-[11px] text-slate-500 font-bold tracking-wide">
            Powered By{' '}
            <a
              href="https://onyxx-tech.vercel.app/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 font-black hover:underline transition inline-flex items-center gap-1"
            >
              <span>Onyxx Tech Hub</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </p>
        </div>

      </motion.div>
    </div>
  );
}


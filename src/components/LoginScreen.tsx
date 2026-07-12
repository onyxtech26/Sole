import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.toLowerCase().trim();

    if (trimmedUser === 'admin' && password === 'admin') {
      setError('');
      onLogin({ username: 'admin', role: 'manager' });
    } else {
      setError("❌ Incorrect username or password. Try 'admin/admin'");
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-white flex items-center justify-center z-50 p-4 overflow-hidden font-sans">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="relative z-10 bg-white/40 backdrop-blur-3xl border border-white/50 rounded-3xl w-full max-w-md p-8 md:p-10 shadow-[0_20px_50px_rgba(31,38,135,0.06)]"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20 border border-white/25 animate-bounce">
            <Compass className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-serif">
            SOLE
          </h2>
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-1">Operations Portal Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 tracking-wider uppercase block">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 text-sm outline-none transition duration-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 tracking-wider uppercase block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3.5 pr-10 text-slate-800 text-sm outline-none transition duration-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition duration-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-xs font-bold"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm cursor-pointer"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
}

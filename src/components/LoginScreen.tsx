import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
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
      onLogin({ username: 'Admin', role: 'manager' });
    } else if (trimmedUser === 'staff' && password === 'staff') {
      setError('');
      onLogin({ username: 'Staff User', role: 'staff' });
    } else if (trimmedUser === 'guide' && password === 'guide') {
      setError('');
      onLogin({ username: 'Guide User', role: 'guide' });
    } else {
      setError("❌ Incorrect username or password. Try admin/admin, staff/staff, or guide/guide");
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#f8fafc] flex items-center justify-center z-50 p-4 overflow-hidden font-sans">
      
      {/* Splash Screen Style Ambient Gradient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20">
        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-slate-300 to-orange-200 blur-[90px] animate-blob-float-1" />
        <div className="absolute bottom-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-orange-200 to-amber-100 blur-[90px] animate-blob-float-2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="relative z-10 bg-white/70 backdrop-blur-3xl border border-orange-500/20 rounded-[2.25rem] w-full max-w-md p-8 md:p-10 shadow-[0_0_35px_rgba(253,151,7,0.25),0_10px_30px_rgba(253,151,7,0.15),0_20px_50px_rgba(0,0,0,0.04)]"
      >
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="SOLE"
            className="h-14 w-auto mx-auto mb-4 drop-shadow-sm"
          />
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
              className="w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3.5 text-slate-800 text-sm outline-none transition duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 placeholder-slate-400"
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
                className="w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3.5 pr-10 text-slate-800 text-sm outline-none transition duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#fd9707] transition duration-200"
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
            className="w-full bg-[#0b1220] hover:bg-[#161f33] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/10 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-sm cursor-pointer"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-[11px] text-slate-500 space-y-2">
          <p className="font-bold text-slate-600 uppercase tracking-wider">Demo Accounts</p>
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-white border border-slate-100 rounded-xl p-2 shadow-sm">
              <span className="font-bold block text-slate-700">Admin</span>
              admin / admin
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-2 shadow-sm">
              <span className="font-bold block text-slate-700">Staff</span>
              staff / staff
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-2 shadow-sm">
              <span className="font-bold block text-slate-700">Guide</span>
              guide / guide
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, ShieldCheck } from 'lucide-react';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-charcoal p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-charcoal-elevated border-2 border-gold/30 p-10 rounded-lg shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gold" />
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gold flex items-center justify-center rounded-sm mb-4">
            <ShieldCheck className="w-10 h-10 text-charcoal" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-gold uppercase">
            TASKFLOW <span className="font-light opacity-80 text-white">ACCESS</span>
          </h1>
          <p className="text-[10px] tracking-[0.3em] uppercase opacity-50 mt-2">Operational Identity Verification</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gold uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-3 h-3" /> Personnel ID (Email)
            </label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-white/10 p-3 text-white focus:border-gold outline-none transition-colors"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gold uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-3 h-3" /> Access Protocol (Password)
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-white/10 p-3 text-white focus:border-gold outline-none transition-colors"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-900/50 text-red-500 text-xs font-mono">
              AUTH_ERROR: {error.toUpperCase()}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-charcoal font-bold py-4 uppercase tracking-widest hover:bg-gold/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
            ) : isSignUp ? (
              <><UserPlus className="w-4 h-4" /> Provision Account</>
            ) : (
              <><LogIn className="w-4 h-4" /> Authenticate</>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] text-gray-500 hover:text-gold uppercase tracking-widest transition-colors"
          >
            {isSignUp ? 'Back to Authentication' : 'New Personnel Registration'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

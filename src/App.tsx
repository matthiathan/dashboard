import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppScreen } from './types';
import { supabase } from './lib/supabase';
import VideoScreen from './components/VideoScreen';
import OpsDeskScreen from './components/OpsDeskScreen';
import ChronoScreen from './components/ChronoScreen';
import AuthScreen from './components/AuthScreen';
import { LogOut, Shield } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.VIDEO);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.warn(`Error attempting to enable full-screen mode: ${e.message}`);
      });
      setIsFullscreen(true);
    }
  }, []);

  const nextScreen = useCallback(() => {
    if (!session) {
      setCurrentScreen(AppScreen.AUTH);
      return;
    }

    setCurrentScreen((prev) => {
      if (prev === AppScreen.VIDEO) return AppScreen.TASKS;
      if (prev === AppScreen.TASKS) return AppScreen.ENVIRONMENT;
      if (prev === AppScreen.AUTH) return AppScreen.VIDEO;
      return AppScreen.VIDEO;
    });
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentScreen(AppScreen.AUTH);
  };

  useEffect(() => {
    if (session && (currentScreen === AppScreen.TASKS || currentScreen === AppScreen.ENVIRONMENT)) {
      const timer = setTimeout(() => {
        nextScreen();
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [currentScreen, nextScreen, session]);

  const renderScreen = () => {
    if (!session) {
      return (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full h-full"
        >
          <AuthScreen />
        </motion.div>
      );
    }

    switch (currentScreen) {
      case AppScreen.VIDEO:
        return (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <VideoScreen onComplete={nextScreen} />
          </motion.div>
        );
      case AppScreen.TASKS:
        return (
          <motion.div
            key="tasks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <OpsDeskScreen />
          </motion.div>
        );
      case AppScreen.ENVIRONMENT:
        return (
          <motion.div
            key="environment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <ChronoScreen />
          </motion.div>
        );
      case AppScreen.AUTH:
        // Technically unreachable if session exists, but for safety:
        return <VideoScreen onComplete={nextScreen} />;
      default:
        return null;
    }
  };

  if (isInitializing) {
    return (
      <div className="w-screen h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="landscape-lock w-screen h-screen bg-charcoal overflow-hidden cursor-none"
      onClick={handleFullscreen}
    >
      <div className="ops-container relative h-full flex flex-col">
        {session && (
          <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
            <div className="px-3 py-1 bg-gold/10 border border-gold/20 rounded flex items-center gap-2">
              <Shield className="w-3 h-3 text-gold" />
              <span className="text-[10px] text-white/70 font-mono tracking-tighter uppercase">{session.user.email}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-2 bg-red-900/20 border border-red-900/30 text-red-500 hover:bg-red-900/40 transition-colors rounded cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>

        {/* System Status Bar */}
        <div className="mt-auto pt-8 flex items-center gap-6 opacity-80">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gold whitespace-nowrap">System Live</div>
          <div className="flex-1 h-0.5 bg-white/5 relative overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 h-full bg-gold w-1/3"
            />
          </div>
          <div className="text-[10px] font-mono text-gray-500 tabular-nums uppercase">
            {session ? currentScreen : 'AUTH'} NODE [00:0{Math.floor(Math.random() * 9)}s]
          </div>
        </div>

        {/* Global Progress Line */}
        {session && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gold/20">
            <motion.div 
              key={currentScreen}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="h-full bg-gold"
            />
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-[100] backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-8 border border-gold/30 bg-charcoal-elevated rounded-2xl shadow-2xl"
          >
            <h2 className="text-2xl font-display font-medium text-gold mb-2 tracking-tight">OpsPortal Online</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Tap anywhere to initialize immersive operations dashboard.</p>
            <div className="w-12 h-12 rounded-full border-2 border-gold/20 border-t-gold animate-spin mx-auto" />
          </motion.div>
        </div>
      )}
    </div>
  );
}


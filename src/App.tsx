import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppScreen } from './types';
import { supabase } from './lib/supabase';
import VideoScreen from './components/VideoScreen';
import OpsDeskScreen from './components/OpsDeskScreen';
import CalendarScreen from './components/CalendarScreen';
import ChronoScreen from './components/ChronoScreen';
import WeatherScreen from './components/WeatherScreen';
import TrafficScreen from './components/TrafficScreen';
import AuthScreen from './components/AuthScreen';
import { LogOut } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.VIDEO);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('Session retrieval error (possibly invalid or expired refresh token):', error);
        supabase.auth.signOut().catch(() => {});
        setSession(null);
        setIsInitializing(false);
        setCurrentScreen(AppScreen.AUTH);
        return;
      }
      setSession(session);
      setIsInitializing(false);
      if (session) {
        const hasPlayed = localStorage.getItem(`opsportal_video_played_${session.user.id}`);
        if (hasPlayed === 'true') {
          setCurrentScreen(AppScreen.TASKS);
        } else {
          setCurrentScreen(AppScreen.VIDEO);
        }
      } else {
        setCurrentScreen(AppScreen.AUTH);
      }
    }).catch((err) => {
      console.warn('Unexpected session retrieval fail:', err);
      supabase.auth.signOut().catch(() => {});
      setSession(null);
      setIsInitializing(false);
      setCurrentScreen(AppScreen.AUTH);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // If the session changed but has error, or is signed out
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setCurrentScreen(AppScreen.AUTH);
        return;
      }
      
      setSession(session);
      if (session) {
        const hasPlayed = localStorage.getItem(`opsportal_video_played_${session.user.id}`);
        if (hasPlayed === 'true') {
          setCurrentScreen(AppScreen.TASKS);
        } else {
          setCurrentScreen(AppScreen.VIDEO);
        }
      } else {
        setCurrentScreen(AppScreen.AUTH);
      }
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
      if (prev === AppScreen.VIDEO) {
        localStorage.setItem(`opsportal_video_played_${session.user.id}`, 'true');
        return AppScreen.TASKS;
      }
      if (prev === AppScreen.TASKS) return AppScreen.CALENDAR;
      if (prev === AppScreen.CALENDAR) return AppScreen.CHRONO;
      if (prev === AppScreen.CHRONO) return AppScreen.WEATHER;
      if (prev === AppScreen.WEATHER) return AppScreen.TRAFFIC;
      if (prev === AppScreen.TRAFFIC) return AppScreen.TASKS;
      if (prev === AppScreen.AUTH) return AppScreen.VIDEO;
      return AppScreen.TASKS;
    });
  }, [session]);

  const getScreenDuration = (screen: AppScreen) => {
    return screen === AppScreen.CHRONO ? 20 : 10;
  };

  const handleLogout = async () => {
    if (session) {
      localStorage.removeItem(`opsportal_video_played_${session.user.id}`);
    }
    await supabase.auth.signOut();
    setCurrentScreen(AppScreen.AUTH);
  };

  useEffect(() => {
    if (session && currentScreen !== AppScreen.VIDEO && currentScreen !== AppScreen.AUTH) {
      const delay = getScreenDuration(currentScreen) * 1000;
      const timer = setTimeout(() => {
        nextScreen();
      }, delay);
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
      case AppScreen.CALENDAR:
        return (
          <motion.div
            key="calendar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <CalendarScreen />
          </motion.div>
        );
      case AppScreen.CHRONO:
        return (
          <motion.div
            key="chrono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <ChronoScreen />
          </motion.div>
        );
      case AppScreen.WEATHER:
        return (
          <motion.div
            key="weather"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <WeatherScreen />
          </motion.div>
        );
      case AppScreen.TRAFFIC:
        return (
          <motion.div
            key="traffic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <TrafficScreen />
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
      className="landscape-lock w-full min-h-screen md:h-screen md:w-screen bg-charcoal overflow-x-hidden md:overflow-hidden"
    >
      <div className="ops-container relative min-h-screen md:h-full flex flex-col p-4 md:p-6 pb-12 md:pb-6">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>

        {/* Bottom Bar: System Status Bar + Handled Exit Button on the right */}
        <div className="mt-auto pt-4 md:pt-6 flex flex-row items-center justify-between gap-4 md:gap-6 shrink-0 min-h-[36px]">
          {/* Status section */}
          <div className="flex-1 flex items-center gap-4 md:gap-6 opacity-35 min-w-0">
            <div className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-gold whitespace-nowrap shrink-0">System Live</div>
            <div className="flex-1 h-0.5 bg-white/5 relative overflow-hidden hidden xs:block">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 h-full bg-gold w-1/3"
              />
            </div>
            <div className="text-[8px] md:text-[10px] font-mono text-gray-400 tabular-nums uppercase truncate">
              {session ? currentScreen : 'AUTH'} NODE [00:02s]
            </div>
          </div>

          {/* Clean, professional Exit Node button in the bottom right corner */}
          {session && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="z-50 px-2.5 py-1.5 bg-red-950/30 hover:bg-red-900/30 border border-red-900/40 hover:border-red-500/50 text-red-400 hover:text-red-300 transition-all duration-200 rounded flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase shadow-lg shadow-black/20 cursor-pointer shrink-0"
              title="Exit Operations Node"
            >
              <span>Exit Node</span>
              <LogOut className="w-3 h-3 text-red-500 shrink-0" />
            </button>
          )}
        </div>

        {/* Global Progress Line */}
        {session && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gold/20 flex z-50">
            <motion.div 
              key={currentScreen}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: getScreenDuration(currentScreen), ease: "linear" }}
              className="h-full bg-gold"
            />
          </div>
        )}
      </div>
    </div>
  );
}


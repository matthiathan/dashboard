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
import DashboardScreen from './components/DashboardScreen';
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
          setCurrentScreen(AppScreen.DASHBOARD);
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
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setCurrentScreen(AppScreen.AUTH);
        return;
      }
      
      setSession(session);
      if (session) {
        const hasPlayed = localStorage.getItem(`opsportal_video_played_${session.user.id}`);
        if (hasPlayed === 'true') {
          setCurrentScreen(AppScreen.DASHBOARD);
        } else {
          setCurrentScreen(AppScreen.VIDEO);
        }
      } else {
        setCurrentScreen(AppScreen.AUTH);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const nextScreen = useCallback(() => {
    if (!session) {
      setCurrentScreen(AppScreen.AUTH);
      return;
    }

    setCurrentScreen((prev) => {
      if (prev === AppScreen.VIDEO) {
        localStorage.setItem(`opsportal_video_played_${session.user.id}`, 'true');
        return AppScreen.DASHBOARD;
      }
      if (prev === AppScreen.DASHBOARD) return AppScreen.TASKS;
      if (prev === AppScreen.TASKS) return AppScreen.CALENDAR;
      if (prev === AppScreen.CALENDAR) return AppScreen.CHRONO;
      if (prev === AppScreen.CHRONO) return AppScreen.WEATHER;
      if (prev === AppScreen.WEATHER) return AppScreen.TRAFFIC;
      if (prev === AppScreen.TRAFFIC) return AppScreen.DASHBOARD; // loop back to first screen (Dashboard / Command Grid)
      if (prev === AppScreen.AUTH) return AppScreen.VIDEO;
      return AppScreen.DASHBOARD;
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

  // Automatically cycle through different screens every 10 seconds, ONLY when Full Screen mode is active.
  useEffect(() => {
    if (
      session && 
      isFullscreen &&
      currentScreen !== AppScreen.VIDEO && 
      currentScreen !== AppScreen.AUTH
    ) {
      const timer = setTimeout(() => {
        nextScreen();
      }, 10000); // 10 seconds auto-rotation interval
      return () => clearTimeout(timer);
    }
  }, [currentScreen, nextScreen, session, isFullscreen]);

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
      case AppScreen.DASHBOARD:
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full"
          >
            <DashboardScreen 
              isFullscreenMode={isFullscreen} 
              onToggleFullscreenMode={() => setIsFullscreen(!isFullscreen)} 
            />
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
      <div className={`ops-container relative min-h-screen md:h-full flex flex-col transition-all duration-300 ${
        isFullscreen ? 'p-0 border-0 md:p-0 md:border-0' : 'p-4 md:p-6 pb-12 md:pb-6'
      }`}>
        
        {/* Navigation Tabs Header: Hidden when in full-screen or unauthenticated */}
        {session && currentScreen !== AppScreen.VIDEO && !isFullscreen && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 border-b border-white/5 pb-2.5 shrink-0 z-40 overflow-x-auto no-scrollbar">
            {[
              { id: AppScreen.DASHBOARD, label: 'Command Grid' },
              { id: AppScreen.TASKS, label: 'Tasks Desk' },
              { id: AppScreen.CALENDAR, label: 'Operations Calendar' },
              { id: AppScreen.CHRONO, label: 'Chrono Telemetry' },
              { id: AppScreen.WEATHER, label: 'Weather Station' },
              { id: AppScreen.TRAFFIC, label: 'Transit Dispatch' }
            ].map((tab) => {
              const isActive = currentScreen === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentScreen(tab.id)}
                  className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gold/20 text-gold border border-gold/40 shadow-[0_0_8px_rgba(197,160,89,0.12)] font-black' 
                      : 'bg-white/[0.02] border border-white/5 text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            {renderScreen()}
          </AnimatePresence>
        </div>

        {/* Bottom Bar: System Status Bar + Exit Button; Hidden when in full-screen */}
        {session && currentScreen !== AppScreen.VIDEO && !isFullscreen && (
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
                {currentScreen} NODE [00:02s]
              </div>
            </div>

            {/* Clean, professional Exit Node button in the bottom right corner */}
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
          </div>
        )}

        {/* Global Progress Line - Hidden when on Dashboard, in fullscreen or unauthenticated */}
        {session && currentScreen !== AppScreen.VIDEO && currentScreen !== AppScreen.DASHBOARD && !isFullscreen && (
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

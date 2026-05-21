import { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date?: string;
  created_at?: string;
}

export default function CalendarScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekDays, setCurrentWeekDays] = useState<{ dateStr: string; label: string; dayNum: number; isToday: boolean }[]>([]);

  // Calculate current operational week (Monday to Sunday)
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    // Calculate offset to get back to Monday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const days = [];
    const weekdayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      
      const dateStr = d.toISOString().split('T')[0];
      const isToday = d.toDateString() === today.toDateString();
      days.push({
        dateStr,
        label: weekdayLabels[i],
        dayNum: d.getDate(),
        isToday,
      });
    }

    setCurrentWeekDays(days);
  }, []);

  // Fetch and filter user-specific tasks
  useEffect(() => {
    const fetchWeekTasks = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (sessionError) {
            console.warn('Calendar session error:', sessionError);
            await supabase.auth.signOut().catch(() => {});
          }
          throw new Error('Unauthorized session state. Re-authenticating...');
        }

        const { data, error: dbError } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;

        const rawTasks = Array.isArray(data) ? data : [];

        // Apply matching session id & role filters securely
        const filtered = rawTasks.filter((task: any) => {
          const userIdMatches = !task.user_id || task.user_id === session.user.id;
          const userRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
          const roleMatches = !task.role || !userRole || task.role === userRole;
          return userIdMatches && roleMatches;
        });

        setTasks(filtered);
      } catch (err: any) {
        console.error('Calendar task fetch fail:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeekTasks();
  }, []);

  const getTasksForDay = (dateStr: string) => {
    return tasks.filter((task) => {
      const targetDate = task.due_date || task.created_at || '';
      const taskDatePart = targetDate.split('T')[0];
      return taskDatePart === dateStr;
    });
  };

  const getPriorityStyle = (priority?: string) => {
    const p = String(priority || '').toLowerCase();
    switch (p) {
      case 'high':
      case 'critical':
        return {
          border: 'border-l-4 border-l-red-500',
          badge: 'bg-red-500/10 text-red-400 border border-red-500/20',
          dot: 'bg-red-500',
          bg: 'bg-red-950/10 hover:bg-red-950/20'
        };
      case 'medium':
      case 'normal':
        return {
          border: 'border-l-4 border-l-blue-500',
          badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
          dot: 'bg-blue-500',
          bg: 'bg-blue-950/10 hover:bg-blue-950/20'
        };
      case 'low':
        return {
          border: 'border-l-4 border-l-green-500',
          badge: 'bg-green-500/10 text-green-400 border border-green-500/20',
          dot: 'bg-green-500',
          bg: 'bg-green-950/10 hover:bg-green-950/20'
        };
      default:
        return {
          border: 'border-l-4 border-l-gold',
          badge: 'bg-gold/10 text-gold border border-gold/20',
          dot: 'bg-gold',
          bg: 'bg-gold/5 hover:bg-gold/10'
        };
    }
  };

  const startOfWeekLabel = currentWeekDays[0]?.dateStr 
    ? new Date(currentWeekDays[0].dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    : '';
  const endOfWeekLabel = currentWeekDays[6]?.dateStr 
    ? new Date(currentWeekDays[6].dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="w-full h-full flex flex-col pt-1">
      {/* Dynamic Sub-Header with Status Legend & Date Range */}
      <div className="flex flex-row justify-between items-center bg-charcoal/40 border border-white/5 rounded-lg px-3 py-2 mb-3 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-4 h-4 text-gold shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white">
            Operational Week Checklist
          </span>
          <span className="text-[9px] font-mono opacity-50 hidden sm:inline-block">({startOfWeekLabel} - {endOfWeekLabel})</span>
        </div>
        
        {/* Compact high-contrast legend for fast glances */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-gray-400">
            <span className="w-2 h-2 rounded-full bg-red-500" /> CRITICAL
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-gray-400">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> MEDIUM
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-500" /> LOW
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-red-950/20 rounded-xl border border-red-900/30">
          <ShieldAlert className="w-10 h-10 text-red-500 mb-3" />
          <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-tight">Telemetry Synclink Error</h3>
          <p className="text-gray-400 text-xs max-w-sm font-mono">{error}</p>
        </div>
      ) : (
        /* Weekly Calendar Columns - Beautifully formatted for landscape glances */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-7 landscape:grid-cols-7 gap-2.5 overflow-hidden min-h-0 pb-2">
          {currentWeekDays.map((day, idx) => {
            const dayTasks = getTasksForDay(day.dateStr);
            return (
              <motion.div
                key={day.dateStr}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex flex-col rounded-lg border transition-all duration-300 overflow-hidden relative ${
                  day.isToday 
                    ? 'border-gold bg-gold/[0.02]/90 shadow-[0_0_15px_rgba(230,175,46,0.12)] z-10' 
                    : 'border-white/5 bg-charcoal-elevated/70'
                }`}
              >
                {/* Column Day Indicator Header - Extremely visible */}
                <div className={`p-2 border-b flex justify-between items-center transition-colors shrink-0 ${
                  day.isToday ? 'bg-gold/10 border-gold/45' : 'bg-black/30 border-white/5'
                }`}>
                  <span className={`text-[10px] font-black tracking-widest ${day.isToday ? 'text-gold' : 'text-white/60'}`}>
                    {day.label}
                  </span>
                  <span className={`text-sm font-mono font-black ${day.isToday ? 'text-gold' : 'text-white/80'}`}>
                    {day.dayNum}
                  </span>
                </div>

                {/* Today visual pin on bottom border */}
                {day.isToday && (
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gold" />
                )}

                {/* Day tasks or simple empty placeholder */}
                <div className="flex-1 flex flex-col gap-1.5 p-1.5 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <div className="flex-1 flex items-center justify-center p-2">
                      <div className="w-3.5 h-3.5 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                    </div>
                  ) : dayTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-md p-2 bg-black/10 opacity-30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mb-1 shrink-0" />
                      <span className="text-[8px] font-mono tracking-wider">CLEAR</span>
                    </div>
                  ) : (
                    dayTasks.map((t) => {
                      const style = getPriorityStyle(t.priority);
                      return (
                        <div
                          key={t.id}
                          className={`p-2 rounded-md ${style.border} ${style.bg} transition-all duration-150 flex flex-col justify-between gap-1 shadow-md border-y border-r border-white-[0.02]`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="text-[10px] sm:text-xs font-bold text-white leading-snug tracking-wide line-clamp-2">
                              {t.title}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between text-[8px] font-mono pt-1 text-white/55 border-t border-white/5">
                            <span className="uppercase font-semibold tracking-wider flex items-center gap-0.5">
                              <span className={`w-1 h-1 rounded-full ${style.dot} shrink-0`} />
                              {(t.status || 'pending').replace('_', ' ')}
                            </span>
                            <span className="text-[7px] text-gray-500 shrink-0">
                              #{t.id ? String(t.id).slice(-3).toUpperCase() : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

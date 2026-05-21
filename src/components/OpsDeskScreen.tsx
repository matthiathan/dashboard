import { useEffect, useState } from 'react';
import { Task } from '../types';
import { motion } from 'motion/react';
import { ListTodo, CheckCircle2, CircleDashed, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function OpsDeskScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (sessionError) {
            console.warn('OpsDesk session error:', sessionError);
            await supabase.auth.signOut().catch(() => {});
          }
          throw new Error('No authenticated operational session found. Please login.');
        }

        // Direct query to Supabase tasks table
        const { data, error: dbError } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (dbError) throw dbError;

        const rawTasks = Array.isArray(data) ? data : [];

        // Filter and get the pending and active tasks (status is not resolved/completed)
        const activePendingTasks = rawTasks.filter((task: any) => {
          const status = String(task.status || '').toLowerCase();
          const isPendingOrActive = status === 'pending' || status === 'in_progress' || status === 'active' || status === '';
          
          // Role or user-specific mapping verification
          const userIdMatches = !task.user_id || task.user_id === session.user.id;
          const userRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
          const roleMatches = !task.role || !userRole || task.role === userRole;

          return isPendingOrActive && userIdMatches && roleMatches;
        });

        setTasks(activePendingTasks.slice(0, 6)); 
        setError(null);
      } catch (err: any) {
        console.error('Task fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const getPriorityColor = (priority: string) => {
    const p = String(priority).toLowerCase();
    switch (p) {
      case 'high': case 'critical': return 'bg-red-600 text-white';
      case 'medium': case 'normal': return 'bg-blue-600 text-white';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getPriorityBorder = (priority: string) => {
    const p = String(priority).toLowerCase();
    switch (p) {
      case 'high': case 'critical': return 'border-red-500';
      case 'medium': case 'normal': return 'border-blue-500';
      case 'low': return 'border-green-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <div className="w-full h-full flex flex-col pt-1">
      <div className="flex-1 flex flex-col gap-4 md:gap-6 overflow-y-auto md:overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <h2 className="text-lg md:text-xl font-semibold border-l-4 border-gold pl-3 md:pl-4 uppercase tracking-wider">Active Operations Desk</h2>
          <div className="flex flex-wrap gap-1 md:gap-2 text-[9px] md:text-[10px] font-bold uppercase">
            {loading ? (
              <span className="px-2 py-1 bg-gold/10 text-gold/50 animate-pulse">Syncing...</span>
            ) : error ? (
              <span className="px-2 py-1 bg-red-900/30 text-red-500 border border-red-900 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> DB Offline
              </span>
            ) : (
              <>
                <span className="px-2 py-1 bg-red-900/30 text-red-400 border border-red-900/50">
                  {tasks.filter(t => t.priority === 'high').length} CRITICAL
                </span>
                <span className="px-2 py-1 bg-gold/20 text-gold border border-gold/30">
                  {tasks.filter(t => t.status !== 'resolved').length} ACTIVE
                </span>
              </>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-12 bg-red-950/20 rounded-xl border border-red-900/30">
            <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Data Synchronization Failed</h3>
            <p className="text-gray-400 text-xs max-w-sm font-mono">Unable to connect to the Supabase database. Please check your credentials or network status.</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 md:p-12 bg-gold/5 rounded-xl border border-gold/10">
            <CheckCircle2 className="w-10 h-10 text-gold/30 mb-3" />
            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">No Active Operations</h3>
            <p className="text-gray-400 text-xs max-w-sm font-mono">Your personnel ID has no pending tasks in the current cluster.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto pr-1 md:pr-2">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-charcoal-elevated border-l-4 ${getPriorityBorder(task.priority)} p-4 md:p-6 rounded-r-lg shadow-xl`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getPriorityColor(task.priority)}`}>
                    {task.priority || 'Normal'} Priority
                  </span>
                  <span className="text-[9px] md:text-[10px] text-gray-500 uppercase font-mono">ID: TF-{task.id?.toString().slice(-4) || 'XXXX'}</span>
                </div>
                <h3 className="text-base md:text-lg font-bold mb-1 md:mb-2 text-white line-clamp-1">{task.title}</h3>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-3 md:mb-4 line-clamp-2">{task.description}</p>
                
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <span className="text-xs text-gold font-semibold uppercase flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'resolved' ? 'bg-green-500' : 'bg-gold animate-pulse'}`} />
                    {(task.status || 'pending').replace('_', ' ')}
                  </span>
                  <span className="text-[9px] md:text-[10px] text-gray-500 uppercase">Remote Cluster: Alpha</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

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
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch('/api/tasks', {
          headers: {
            'Authorization': session ? `Bearer ${session.access_token}` : '',
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch operations data');
        const data = await response.json();
        
        const taskData = Array.isArray(data) ? data : (data.tasks || []);
        setTasks(taskData.slice(0, 6)); 
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
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-baseline border-b-2 border-gold pb-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gold flex items-center justify-center rounded-sm">
            <ListTodo className="w-8 h-8 text-charcoal" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-gold uppercase">
              TASKFLOW <span className="font-light opacity-80 text-white">OPSPORTAL</span>
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">Dallmayr Operations Hub</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono text-gold/80 italic">v2.4.0</div>
          <div className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">Authorized Access Only</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold border-l-4 border-gold pl-4 uppercase tracking-wider">Active Operations Desk</h2>
          <div className="flex gap-2 text-[10px] font-bold uppercase">
            {loading ? (
              <span className="px-2 py-1 bg-gold/10 text-gold/50 animate-pulse">Syncing...</span>
            ) : error ? (
              <span className="px-2 py-1 bg-red-900/30 text-red-500 border border-red-900 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> API Offline
              </span>
            ) : (
              <>
                <span className="px-2 py-1 bg-red-900/30 text-red-400 border border-red-900">
                  {tasks.filter(t => t.priority === 'high').length} CRITICAL
                </span>
                <span className="px-2 py-1 bg-gold/20 text-gold border border-gold/40">
                  {tasks.filter(t => t.status !== 'resolved').length} ACTIVE
                </span>
              </>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-red-950/20 rounded-xl border border-red-900/30">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Data Synchronization Failed</h3>
            <p className="text-gray-400 text-sm max-w-sm font-mono">Unable to connect to the remote TaskFlow node. Falling back to local redundant cache.</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gold/5 rounded-xl border border-gold/10">
            <CheckCircle2 className="w-12 h-12 text-gold/30 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">No Active Operations</h3>
            <p className="text-gray-400 text-sm max-w-sm font-mono">Your personnel ID has no pending tasks in the current cluster. All systems are operating within normal parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 overflow-y-auto pr-2">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-charcoal-elevated border-l-4 ${getPriorityBorder(task.priority)} p-6 rounded-r-lg shadow-xl`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${getPriorityColor(task.priority)}`}>
                    {task.priority || 'Normal'} Priority
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-mono">ID: TF-{task.id?.toString().slice(-4) || 'XXXX'}</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white line-clamp-1">{task.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">{task.description}</p>
                
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-xs text-gold font-semibold uppercase flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'resolved' ? 'bg-green-500' : 'bg-gold animate-pulse'}`} />
                    {(task.status || 'pending').replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase">Remote Cluster: Alpha</span>
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

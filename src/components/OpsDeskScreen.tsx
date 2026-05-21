import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Compass, 
  Flame, 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  Activity, 
  RefreshCw, 
  Info, 
  Github, 
  TrendingUp 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Extract 'YOUR_USERNAME' into a constant at the top of the file
const GITHUB_USERNAME = 'mattcoombes247'; 

interface MatrixCell {
  date: Date;
  dateString: string;
  dayOfWeek: number;
  weekIndex: number;
  taskCreatedCount: number;
  taskResolvedCount: number;
  githubCount: number;
  score: number;
}

export default function OpsDeskScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matrixData, setMatrixData] = useState<MatrixCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [telemetry, setTelemetry] = useState({
    total30Days: 0,
    streak: 0,
    busiestDay: { dateStr: 'N/A', count: 0 }
  });

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      // 1. Fetch Supabase session and active tasks
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      let rawTasks: any[] = [];
      if (session) {
        const { data, error: dbError } = await supabase
          .from('tasks')
          .select('*');
        
        if (dbError) {
          console.error("Supabase request error:", dbError);
        } else {
          const unfilteredTasks = Array.isArray(data) ? data : [];
          // Filter tasks according to user session / role constraints like original OpsDeskScreen
          rawTasks = unfilteredTasks.filter((task: any) => {
            const userIdMatches = !task.user_id || task.user_id === session.user.id;
            const userRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
            const roleMatches = !task.role || !userRole || task.role === userRole;
            return userIdMatches && roleMatches;
          });
        }
      } else {
        console.warn('OpsDesk: No authenticated operations session found.');
      }

      // 2. Fetch GitHub Activity from public API
      const githubActivity: Record<string, number> = {};
      try {
        const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events`);
        if (res.ok) {
          const events = await res.json();
          if (Array.isArray(events)) {
            events.forEach((event: any) => {
              if (!event.created_at) return;
              const dateStr = event.created_at.split('T')[0];
              let count = 0;
              
              if (event.type === 'PushEvent') {
                count = event.payload?.commits?.length || 1;
              } else if (event.type === 'CreateEvent' || event.type === 'PullRequestEvent' || event.type === 'IssuesEvent') {
                count = 1;
              }
              
              if (count > 0) {
                githubActivity[dateStr] = (githubActivity[dateStr] || 0) + count;
              }
            });
          }
        } else {
          console.warn(`GitHub API request bypassed or rate-limited. Status: ${res.status}`);
        }
      } catch (gErr) {
        console.error('OpsDesk: GitHub fetch error:', gErr);
      }

      // 3. Process data for last 90 days grid (aligned as 13 columns/weeks of 7 days: 91 cells total)
      const now = new Date();
      // Sunday of the current week
      const currentSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay());

      // Start Sunday: 12 weeks before current week's Sunday
      const startSunday = new Date(currentSunday.getTime());
      startSunday.setDate(currentSunday.getDate() - 12 * 7);

      const cells: MatrixCell[] = [];
      const taskCreatedMap: Record<string, number> = {};
      const taskResolvedMap: Record<string, number> = {};

      rawTasks.forEach((task: any) => {
        if (task.created_at) {
          const cDate = task.created_at.split('T')[0];
          taskCreatedMap[cDate] = (taskCreatedMap[cDate] || 0) + 1;
        }
        if (task.status === 'resolved') {
          const rDateRaw = task.completed_at || task.updated_at || task.due_date || task.created_at;
          if (rDateRaw) {
            const rDate = rDateRaw.split('T')[0];
            taskResolvedMap[rDate] = (taskResolvedMap[rDate] || 0) + 1;
          }
        }
      });

      for (let col = 0; col < 13; col++) {
        for (let row = 0; row < 7; row++) {
          const cellDate = new Date(startSunday.getTime());
          cellDate.setDate(startSunday.getDate() + col * 7 + row);

          const cellDateString = cellDate.toISOString().split('T')[0];
          const taskCreated = taskCreatedMap[cellDateString] || 0;
          const taskResolved = taskResolvedMap[cellDateString] || 0;
          const githubCount = githubActivity[cellDateString] || 0;
          const score = taskCreated + taskResolved + githubCount;

          cells.push({
            date: cellDate,
            dateString: cellDateString,
            dayOfWeek: row,
            weekIndex: col,
            taskCreatedCount: taskCreated,
            taskResolvedCount: taskResolved,
            githubCount: githubCount,
            score: score
          });
        }
      }

      setMatrixData(cells);
      setError(null);

      // Select today's cell by default if available
      const todayStr = now.toISOString().split('T')[0];
      const todayCell = cells.find(c => c.dateString === todayStr);
      if (todayCell) {
        setSelectedCell(todayCell);
      } else if (cells.length > 0) {
        setSelectedCell(cells[cells.length - 1]);
      }

      // Calculate Telemetry Metrics
      const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysAgo = new Date(todayDateObj.getTime());
      thirtyDaysAgo.setDate(todayDateObj.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      // Sum score within last 30 days
      let total30Days = 0;
      cells.forEach(cell => {
        if (cell.dateString >= thirtyDaysAgoStr && cell.dateString <= todayStr) {
          total30Days += cell.score;
        }
      });

      // Busiest Day
      let busiest = { dateStr: 'N/A', count: 0 };
      cells.forEach(cell => {
        if (cell.dateString <= todayStr && cell.score > busiest.count) {
          busiest = {
            dateStr: cell.dateString,
            count: cell.score
          };
        }
      });

      // Active Streak (consecutive days engagement backwards from today or yesterday)
      const sortedPastCells = cells
        .filter(cell => cell.dateString <= todayStr)
        .sort((a, b) => b.dateString.localeCompare(a.dateString));

      let streak = 0;
      if (sortedPastCells.length > 0) {
        let startIndex = 0;
        if (sortedPastCells[0].score === 0) {
          if (sortedPastCells[1] && sortedPastCells[1].score > 0) {
            startIndex = 1;
          } else {
            startIndex = -1;
          }
        }

        if (startIndex !== -1) {
          for (let i = startIndex; i < sortedPastCells.length; i++) {
            if (sortedPastCells[i].score > 0) {
              streak++;
            } else {
              break;
            }
          }
        }
      }

      setTelemetry({
        total30Days,
        streak,
        busiestDay: busiest
      });

    } catch (err: any) {
      console.error('OpsDesk: fetchData matrix failed:', err);
      setError(err.message || 'Database link error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // 5-minute background auto-refresh logic
    const refetchTimer = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(refetchTimer);
    };
  }, []);

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateStringLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return dateStr;
  };

  // Convert flat matrix array into 13 columns of 7 day cells
  const columns: MatrixCell[][] = [];
  for (let i = 0; i < 13; i++) {
    columns.push(matrixData.slice(i * 7, (i + 1) * 7));
  }

  // Calculate Month labels based on first day of each week column
  const monthLabels: (string | null)[] = [];
  let prevMonth = -1;
  if (columns.length === 13) {
    for (let col = 0; col < 13; col++) {
      const sundayOfColCell = columns[col][0];
      if (sundayOfColCell) {
        const sundayOfCol = sundayOfColCell.date;
        const currentMonth = sundayOfCol.getMonth();
        if (currentMonth !== prevMonth) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          monthLabels.push(monthNames[currentMonth]);
          prevMonth = currentMonth;
        } else {
          monthLabels.push(null);
        }
      } else {
        monthLabels.push(null);
      }
    }
  }

  const todayDateStr = new Date().toISOString().split('T')[0];

  const getSvgColorProps = (score: number) => {
    if (score === 0) return { fill: 'rgba(255, 255, 255, 0.05)', stroke: 'rgba(255, 255, 255, 0.02)' };
    if (score <= 2) return { fill: 'rgba(197, 160, 89, 0.30)', stroke: 'rgba(197, 160, 89, 0.15)' };
    if (score <= 4) return { fill: 'rgba(197, 160, 89, 0.60)', stroke: 'rgba(197, 160, 89, 0.25)' };
    return { fill: 'rgba(197, 160, 89, 1.0)', stroke: 'rgba(197, 160, 89, 1.0)' };
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden min-h-0 select-none">
      
      {/* Top Header Matching the Aesthetic of the App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-[clamp(14px,2.2vh,18px)] font-bold border-l-4 border-gold pl-3 uppercase tracking-wider font-display">
            Taskflow OpsPortal
          </h2>
          <span className="text-[clamp(8px,1vh,10px)] text-gray-500 font-mono pl-3 mt-0.5 uppercase tracking-widest flex items-center gap-1">
            <Activity className="w-3 h-3 text-gold" /> System Engagement Metrics
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-1.5 px-2.5 py-1 bg-charcoal border border-white/5 hover:border-gold/30 text-[9px] tracking-wider uppercase font-mono text-gray-400 hover:text-white rounded transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-2.5 h-2.5 text-gold ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing' : 'Reload'}
          </button>
          <span className="px-2 py-0.5 bg-gold/10 text-gold border border-gold/15 rounded text-[9px] font-mono select-none uppercase font-bold tracking-wider">
            {GITHUB_USERNAME}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-2 my-1 bg-red-950/20 text-red-400 border border-red-900/40 rounded text-[10px] font-mono flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span>Operational database connectivity warning: {error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-0">
          <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin mb-3" />
          <span className="text-[10px] font-mono uppercase text-gray-500 tracking-widest animate-pulse">
            Compiles matrix timeline registries...
          </span>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-3 my-2 justify-between">
          
          {/* Main Matrix Panel */}
          <div className="bg-charcoal px-3 py-3 sm:px-4 sm:py-4 rounded-xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col gap-2 flex-grow min-h-0 justify-center">
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
            
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5 shrink-0">
              <span className="text-[clamp(8.5px,1.3vh,11px)] font-black uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-gold" strokeWidth={2.5} /> Contribution Activity Matrix
              </span>
              <span className="text-[8px] tracking-widest font-mono text-gray-500 uppercase select-none">90-Day Telemetry Grid</span>
            </div>

            {/* SVG Matrix Contribution Graph Container */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2">
              <svg 
                viewBox="0 0 320 145" 
                className="w-full max-h-[22vh] md:max-h-[24vh] min-h-[100px] h-full text-white/90"
                id="ops-matrix-svg"
              >
                {/* Month Labels */}
                {monthLabels.map((lbl, idx) => {
                  if (!lbl) return null;
                  return (
                    <text
                      key={`month-lbl-${idx}`}
                      x={30 + idx * 21}
                      y="14"
                      className="fill-white/30 font-mono text-[7px] font-bold uppercase tracking-wider select-none text-left"
                    >
                      {lbl}
                    </text>
                  );
                })}

                {/* Day of Week Row Labels - Compact standard presentation */}
                <text x="22" y="32" textAnchor="end" className="fill-gray-500 font-mono text-[7px] font-black uppercase select-none">Sun</text>
                <text x="22" y="52" textAnchor="end" className="fill-gray-500 font-mono text-[7px] font-black uppercase select-none">Tue</text>
                <text x="22" y="72" textAnchor="end" className="fill-gray-500 font-mono text-[7px] font-black uppercase select-none">Thu</text>
                <text x="22" y="92" textAnchor="end" className="fill-gray-500 font-mono text-[7px] font-black uppercase select-none">Sat</text>

                {/* Grid Day Cells */}
                {columns.map((colCells, colIdx) => (
                  <g key={`col-g-${colIdx}`}>
                    {colCells.map((cell, rowIdx) => {
                      const isFuture = cell.dateString > todayDateStr;
                      const isSelected = selectedCell && selectedCell.dateString === cell.dateString;
                      const colorProps = getSvgColorProps(cell.score);
                      
                      const cellX = 30 + colIdx * 21;
                      const cellY = 24 + rowIdx * 10;
                      const cellW = 18;
                      const cellH = 8;

                      return (
                        <g key={`cell-g-${cell.dateString}`}>
                          <rect
                            x={cellX}
                            y={cellY}
                            width={cellW}
                            height={cellH}
                            rx="1.5"
                            fill={isFuture ? 'rgba(255,255,255,0.01)' : colorProps.fill}
                            stroke={isFuture ? 'rgba(255,255,255,0.02)' : colorProps.stroke}
                            strokeWidth="0.75"
                            className={`transition-all duration-250 ${
                              isFuture 
                                ? 'cursor-not-allowed opacity-20' 
                                : 'cursor-pointer hover:stroke-gold hover:stroke-1 hover:brightness-125'
                            }`}
                            onClick={() => !isFuture && setSelectedCell(cell)}
                            onMouseEnter={() => !isFuture && setSelectedCell(cell)}
                          />
                          {/* Selected Highlighting Ring */}
                          {isSelected && (
                            <rect
                              x={cellX - 1.5}
                              y={cellY - 1.5}
                              width={cellW + 3}
                              height={cellH + 3}
                              rx="2"
                              fill="none"
                              stroke="#C5A059"
                              strokeWidth="1.25"
                              strokeDasharray="1.5 1"
                              className="animate-[spin_10s_linear_infinite]"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                ))}

                {/* SVG Legend */}
                <text x="148" y="137" textAnchor="end" className="fill-gray-500 font-mono text-[7px] uppercase font-bold select-none">Less</text>
                <rect x="154" y="131" width="10" height="7" rx="1" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="0.5" />
                <rect x="168" y="131" width="10" height="7" rx="1" fill="rgba(197, 160, 89, 0.3)" stroke="rgba(197, 160, 89, 0.15)" strokeWidth="0.5" />
                <rect x="182" y="131" width="10" height="7" rx="1" fill="rgba(197, 160, 89, 0.6)" stroke="rgba(197, 160, 89, 0.25)" strokeWidth="0.5" />
                <rect x="196" y="131" width="10" height="7" rx="1" fill="rgba(197, 160, 89, 1.0)" stroke="rgba(197, 160, 89, 1.0)" strokeWidth="0.5" />
                <text x="212" y="137" textAnchor="start" className="fill-gray-500 font-mono text-[7px] uppercase font-bold select-none">More</text>
              </svg>
            </div>

            {/* Selected Cell Breakdown Log Panel */}
            <div className="p-2 sm:p-2.5 bg-white/[0.015] border border-white/5 rounded-xl flex flex-row items-center justify-between gap-3 min-h-[44px] sm:min-h-[50px] transition-all duration-300 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  className="w-3.5 h-3 px-1 rounded-[1.5px] shrink-0" 
                  style={selectedCell ? { backgroundColor: getSvgColorProps(selectedCell.score).fill, border: `1px solid ${getSvgColorProps(selectedCell.score).stroke}` } : { backgroundColor: 'rgba(255,255,255,0.05)' }} 
                />
                <div className="truncate min-w-0">
                  <span className="text-[9px] font-black tracking-widest text-gold font-mono uppercase block leading-none">
                    {selectedCell ? `OPERATIONAL DETAILS FOR ${formatDateLabel(selectedCell.date)}` : 'GRID TELEMETRY ACTIVE'}
                  </span>
                  {selectedCell ? (
                    <div className="text-[10px] text-gray-300 font-mono mt-1 flex flex-wrap gap-x-3 gap-y-0.5 leading-none">
                      <span>Total Engagements: <strong className="text-white font-black">{selectedCell.score}</strong></span>
                      <span className="opacity-75">Tasks Created: <strong>{selectedCell.taskCreatedCount}</strong></span>
                      <span className="opacity-75">Tasks Resolved: <strong>{selectedCell.taskResolvedCount}</strong></span>
                      <span className="opacity-75">Commits/Pushes: <strong>{selectedCell.githubCount}</strong></span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono block mt-1 animate-pulse leading-none">
                      Interact with any timeline block grid to reveal metrics...
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 hidden xs:block">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1 select-none leading-none">
                  <Clock className="w-2.5 h-2.5 text-gold/60" /> Live Registry Feed
                </span>
              </div>
            </div>

          </div>

          {/* Sleek 'Telemetry' Summary Cards - Row block of 3 aligned horizontally to preserve height */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            
            {/* Card 1: Total Activity */}
            <div className="bg-charcoal-elevated/85 border border-white/5 rounded-xl p-2 sm:p-3 flex flex-col justify-between shadow-xl relative overflow-hidden h-[60px] sm:h-[75px]">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              <span className="text-[clamp(7.5px,1.1vh,9.5px)] font-bold tracking-widest text-gray-400 uppercase font-mono block select-none truncate">
                Total (30 Days)
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[clamp(16px,2.8vh,24px)] font-bold font-display text-white tabular-nums leading-none">
                  {loading ? '---' : telemetry.total30Days}
                </span>
                <span className="text-[8px] text-gold font-mono font-black uppercase tracking-wider leading-none">score</span>
              </div>
            </div>

            {/* Card 2: Current Streak */}
            <div className="bg-charcoal-elevated/85 border border-white/5 rounded-xl p-2 sm:p-3 flex flex-col justify-between shadow-xl relative overflow-hidden h-[60px] sm:h-[75px]">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              <span className="text-[clamp(7.5px,1.1vh,9.5px)] font-bold tracking-widest text-gray-400 uppercase font-mono block flex items-center gap-1 select-none truncate">
                <Flame className="w-3 h-3 text-gold animate-pulse shrink-0" strokeWidth={2.5} /> Streak
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-[clamp(16px,2.8vh,24px)] font-bold font-display text-gold tabular-nums leading-none">
                  {loading ? '---' : telemetry.streak}
                </span>
                <span className="text-[8px] text-white/90 font-mono font-black uppercase tracking-wider leading-none">Days</span>
              </div>
            </div>

            {/* Card 3: Busiest Day */}
            <div className="bg-charcoal-elevated/85 border border-white/5 rounded-xl p-2 sm:p-3 flex flex-col justify-between shadow-xl relative overflow-hidden h-[60px] sm:h-[75px]">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              <span className="text-[clamp(7.5px,1.1vh,9.5px)] font-bold tracking-widest text-gray-400 uppercase font-mono block select-none truncate">
                Peak Workload
              </span>
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-[clamp(11px,1.8vh,15px)] font-bold font-display text-white truncate uppercase leading-none">
                  {loading ? '---' : telemetry.busiestDay.dateStr !== 'N/A' ? formatDateStringLabel(telemetry.busiestDay.dateStr) : 'N/A'}
                </span>
                {!loading && telemetry.busiestDay.count > 0 && (
                  <span className="text-[7.5px] text-gold font-mono font-bold shrink-0 select-none leading-none">
                    ({telemetry.busiestDay.count}x)
                  </span>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

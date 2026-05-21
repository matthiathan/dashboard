import { useEffect, useState } from 'react';
import { Compass, Clock, Globe2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function ChronoScreen() {
  const [time, setTime] = useState(new Date());

  // Tick clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatZonetime = (date: Date, timeZone: string) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone
    });
  };

  const formatZoneDate = (date: Date, timeZone: string) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone
    }).toUpperCase();
  };

  const getZoneHMS = (date: Date, timeZone: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      timeZone
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
    return { hour, minute, second };
  };

  const zones = [
    {
      id: 'sast',
      title: 'South Africa (MSY)',
      region: 'SAST — Midrand Gateway',
      timeZone: 'Africa/Johannesburg',
      color: 'border-gold text-gold bg-gold/5',
      accent: 'text-gold-accent',
      accentHex: '#E6AF2E',
      flag: 'ZA'
    },
    {
      id: 'cet',
      title: 'Germany (HQ)',
      region: 'CET/CEST — Munich Sector',
      timeZone: 'Europe/Berlin',
      color: 'border-blue-500 text-blue-400 bg-blue-500/5',
      accent: 'text-blue-400',
      accentHex: '#60A5FA',
      flag: 'DE'
    },
    {
      id: 'gst',
      title: 'Dubai Office',
      region: 'GST — Jumeirah Cluster',
      timeZone: 'Asia/Dubai',
      color: 'border-purple-500 text-purple-400 bg-purple-500/5',
      accent: 'text-purple-400',
      accentHex: '#C084FC',
      flag: 'AE'
    }
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden min-h-0 select-none">
      {/* Grid of Analog Clocks - Always side-by-side using 3 columns */}
      <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 md:gap-5 overflow-hidden min-h-0 pb-1">
        {zones.map((zone, idx) => {
          const { hour, minute, second } = getZoneHMS(time, zone.timeZone);
          const zoneTimeStr = formatZonetime(time, zone.timeZone);
          const zoneDateStr = formatZoneDate(time, zone.timeZone);

          const secondDeg = second * 6;
          const minuteDeg = minute * 6 + second * 0.1;
          const hourDeg = (hour % 12) * 30 + minute * 0.5;
          
          return (
            <motion.div
              key={zone.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`flex flex-col justify-between bg-charcoal-elevated/90 border rounded-xl p-2.5 sm:p-4 relative overflow-hidden shadow-2xl transition-all duration-300 min-h-0 h-full ${
                zone.id === 'sast' ? 'border-gold/30 bg-gold/[0.01]' : 'border-white/5'
              }`}
            >
              {/* Outer light indicators */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              
              {/* Card Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5 shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Globe2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${zone.accent} shrink-0`} />
                  <span className="text-[clamp(8.5px,1.4vh,11px)] font-bold text-white uppercase tracking-wider truncate">
                    {zone.id === 'sast' ? 'S. Africa' : zone.id === 'cet' ? 'Germany' : 'Dubai'}
                  </span>
                </div>
                <span className="text-[clamp(7.5px,1.2vh,9.5px)] font-mono px-1 py-0.2 rounded bg-black/40 text-gray-400 font-bold shrink-0">
                  {zone.flag}
                </span>
              </div>

              {/* SVG Analog Clock Section */}
              <div className="flex-1 flex items-center justify-center my-2 sm:my-3 min-h-0 relative">
                <div className="relative w-full h-full max-h-[18vh] aspect-square flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" className="max-w-[140px] max-h-[140px]">
                    {/* Clock Face */}
                    <circle cx="50" cy="50" r="46" fill="rgba(0,0,0,0.4)" stroke="currentColor" className="text-white/10" strokeWidth="2.5" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke={zone.accentHex} strokeWidth="1" className="opacity-10" strokeDasharray="1 3" />
                    
                    {/* Hour Markings (12 ticks) */}
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30 * Math.PI) / 180;
                      const isQuarter = i % 3 === 0;
                      const rStart = isQuarter ? 37 : 40;
                      const rEnd = 43;
                      const x1 = 50 + rStart * Math.sin(angle);
                      const y1 = 50 - rStart * Math.cos(angle);
                      const x2 = 50 + rEnd * Math.sin(angle);
                      const y2 = 50 - rEnd * Math.cos(angle);
                      
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isQuarter ? zone.accentHex : '#FFFFFF'}
                          strokeWidth={isQuarter ? '1.5' : '0.75'}
                          className={isQuarter ? 'opacity-85' : 'opacity-25'}
                        />
                      );
                    })}

                    {/* Hour Hand */}
                    <line
                      x1="50"
                      y1="50"
                      x2={50 + 22 * Math.sin((hourDeg * Math.PI) / 180)}
                      y2={50 - 22 * Math.cos((hourDeg * Math.PI) / 180)}
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Minute Hand */}
                    <line
                      x1="50"
                      y1="50"
                      x2={50 + 32 * Math.sin((minuteDeg * Math.PI) / 180)}
                      y2={50 - 32 * Math.cos((minuteDeg * Math.PI) / 180)}
                      stroke="#E5E7EB"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="opacity-90"
                    />

                    {/* Second Hand */}
                    <line
                      x1="50"
                      y1="50"
                      x2={50 + 38 * Math.sin((secondDeg * Math.PI) / 180)}
                      y2={50 - 38 * Math.cos((secondDeg * Math.PI) / 180)}
                      stroke="#EF4444"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />

                    {/* Center dots/connections */}
                    <circle cx="50" cy="50" r="3.5" fill={zone.accentHex} />
                    <circle cx="50" cy="50" r="1.2" fill="#000000" />
                  </svg>
                </div>
              </div>

              {/* Date Elements and Digital representation underneath */}
              <div className="border-t border-white/5 pt-1.5 text-center flex flex-col gap-0.5 shrink-0">
                {/* Short Digital Representation */}
                <span className="font-mono text-[clamp(11px,1.9vh,15px)] font-bold tracking-tight text-white/50">
                  {zoneTimeStr.slice(0, 5)}
                  <span className="text-[clamp(8px,1.3vh,11px)] text-gray-500 font-normal ml-0.5">
                    {zoneTimeStr.slice(6, 8)}
                  </span>
                </span>
                
                {/* Full Date Underneath */}
                <span className={`text-[clamp(8px,1.3vh,12px)] font-bold tracking-wide leading-tight truncate ${zone.accent}`}>
                  {zoneDateStr.replace(', 2026', '')}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

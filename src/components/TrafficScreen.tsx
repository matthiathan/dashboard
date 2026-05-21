import { useEffect, useState } from 'react';
import { Compass, Navigation, AlertTriangle, Route, Clock, ArrowRight, ShieldAlert, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

import { Destination } from '../hooks/useDashboardSettings';

interface TrafficScreenProps {
  destList: Destination[];
}

export default function TrafficScreen({ destList }: TrafficScreenProps) {
  const [time, setTime] = useState(new Date());
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  
  const DEFAULT_COORDS = { lat: -25.9964, lng: 28.1306 }; // Midrand

  const destinations = destList;

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGeoStatus('granted');
      },
      (error) => {
        console.warn('Geolocation failed/denied, fallback to Midrand Node.', error);
        setUserCoords(DEFAULT_COORDS);
        setGeoStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  const calculateRoadStats = (dest: Destination) => {
    const startLat = userCoords?.lat ?? DEFAULT_COORDS.lat;
    const startLng = userCoords?.lng ?? DEFAULT_COORDS.lng;

    // Haversine formula
    const R = 6371; // km
    const dLat = (dest.lat - startLat) * Math.PI / 180;
    const dLon = (dest.lng - startLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(startLat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const straightLineKm = R * c;
    const roadKm = Math.round(straightLineKm * 1.35 * 10) / 10; // 1.35x road factor

    // duration at average 75km/h
    const baseDurationMins = (roadKm / 75) * 60;

    const hour = time.getHours();
    let trafficFactor = 1.1; // Baseline
    let status: 'FLOWING' | 'MODERATE' | 'CONGESTED' = 'FLOWING';
    let alertText = 'Standard clear highway flow';

    // Peak model for Johannesburg
    if (hour >= 7 && hour <= 9) {
      trafficFactor = 1.85;
      status = 'CONGESTED';
      alertText = 'High Backlog at N1 William Nicol / Beyers Naudé intersections';
    } else if (hour >= 16 && hour <= 18) {
      trafficFactor = 2.1;
      status = 'CONGESTED';
      alertText = 'Severe commuter peak congestion exiting Concrete Highway';
    } else if (hour >= 12 && hour <= 14) {
      trafficFactor = 1.3;
      status = 'MODERATE';
      alertText = 'Standard midday school/delivery rush delays';
    }

    const finalDurationMins = Math.max(Math.round(baseDurationMins * trafficFactor), 3);
    const delayMins = Math.max(finalDurationMins - Math.round(baseDurationMins), 0);

    return {
      distance: roadKm,
      duration: finalDurationMins,
      delay: delayMins,
      status,
      alertText
    };
  };

  return (
    <div className="w-full h-full flex flex-col pt-1">
      {/* Routes Display (next to each other in landscape) */}
      <div className="flex-1 grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6 lg:gap-8 overflow-y-auto pb-4 pr-1">
        {destinations.map((dest, idx) => {
          const stats = calculateRoadStats(dest);
          const delayColor = stats.status === 'CONGESTED' 
            ? 'border-red-500 text-red-400 bg-red-950/20' 
            : stats.status === 'MODERATE' 
            ? 'border-gold text-gold bg-gold/5' 
            : 'border-green-500 text-green-400 bg-green-950/10';

          return (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-charcoal-elevated border border-white/5 p-6 rounded-xl flex flex-col justify-between shadow-2xl relative overflow-hidden"
            >
              {/* Top alert banner */}
              <div className={`absolute top-0 left-0 w-full h-1 ${
                stats.status === 'CONGESTED' ? 'bg-red-500' : stats.status === 'MODERATE' ? 'bg-gold' : 'bg-green-500'
              }`} />

              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-white tracking-wide uppercase">{dest.name}</h3>
                    <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-gold/60" />
                      {dest.address}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${delayColor}`}>
                    {stats.status}
                  </span>
                </div>

                {/* Progress bar simulation visual */}
                <div className="w-full bg-black/40 h-1 rounded-full relative overflow-hidden my-1">
                  <div className={`h-full rounded-full ${
                    stats.status === 'CONGESTED' ? 'bg-red-500' : stats.status === 'MODERATE' ? 'bg-gold' : 'bg-green-500'
                  }`} style={{ width: stats.status === 'CONGESTED' ? '90%' : stats.status === 'MODERATE' ? '50%' : '25%' }} />
                </div>

                {/* Grid metrics */}
                <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/5 text-center font-mono">
                  <div className="flex flex-col justify-center">
                    <span className="text-[8px] text-gray-600 uppercase tracking-wider">Distance</span>
                    <span className="text-sm md:text-base font-extrabold text-gold mt-0.5">{stats.distance} km</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[8px] text-gray-600 uppercase tracking-wider">Time (ETA)</span>
                    <span className="text-sm md:text-base font-extrabold text-white mt-0.5">{stats.duration} min</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[8px] text-gray-600 uppercase tracking-wider">Backlogs</span>
                    <span className="text-sm md:text-base font-extrabold text-red-500 mt-0.5">
                      {stats.delay > 0 ? `+${stats.delay}m` : '0 min'}
                    </span>
                  </div>
                </div>

                {/* Route Instruction */}
                <div className="p-3 bg-black/40 rounded border border-white/5 text-left flex items-start gap-2.5">
                  <Route className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[8px] text-gray-500 uppercase font-semibold block font-mono">Dispatcher Suggested Route</span>
                    <p className="text-[10px] text-white/80 leading-normal font-medium mt-0.5">{dest.baseRoute}</p>
                  </div>
                </div>
              </div>

              {/* Warnings and caution info */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-start gap-2 text-xs font-mono">
                {stats.status === 'CONGESTED' ? (
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-gold/60 shrink-0" />
                )}
                <div className="text-left">
                  <div className="text-[8px] text-gray-600 uppercase font-bold">Dynamic Road Intelligence</div>
                  <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{stats.alertText}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, Cloud, CloudRain, CloudLightning, Wind, Thermometer, MapPin, 
  ListTodo, CheckCircle2, Clock, AlertTriangle, Calendar, Navigation, 
  Map, Eye, EyeOff, LayoutGrid, Info, Compass, X, Search
} from 'lucide-react';

interface WeatherInfo {
  temp: number;
  code: number;
  windSpeed: number;
  humidity: number;
  isDay: boolean;
}

import { Destination } from '../hooks/useDashboardSettings';

interface DashboardScreenProps {
  isFullscreenMode: boolean;
  onToggleFullscreenMode: () => void;
  destList: Destination[];
  onUpdateNodeLocation: (nodeIndex: number, newName: string, lat: number, lng: number) => void;
}

const getRouteSuggestion = (lat: number, lng: number) => {
  const isNorth = lat < -25.9964;
  const isEast = lng > 28.1306;
  if (isNorth && isEast) return "N1 Northbound → R21 Expressway";
  if (isNorth && !isEast) return "N1 Northbound → N14 West";
  if (!isNorth && isEast) return "M1 Southbound → N3 Eastern Bypass";
  return "M1 Southbound → N1 Western Bypass";
};

export default function DashboardScreen({ 
  isFullscreenMode, 
  onToggleFullscreenMode, 
  destList, 
  onUpdateNodeLocation 
}: DashboardScreenProps) {
  // Full-screen widget auto-rotation state
  const [activeWidgetIdx, setActiveWidgetIdx] = useState<number>(0);

  useEffect(() => {
    if (!isFullscreenMode) {
      setActiveWidgetIdx(0);
      return;
    }

    const interval = setInterval(() => {
      setActiveWidgetIdx((prev) => (prev + 1) % 5);
    }, 10000); // 10 seconds auto-rotation interval

    return () => {
      clearInterval(interval);
    };
  }, [isFullscreenMode]);

  // Shared States/Coordinates for Data Sync
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  
  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  
  // Weather state
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Time ticker
  const [time, setTime] = useState(new Date());

  const DEFAULT_COORDS = { lat: -25.9964, lng: 28.1306 }; // Midrand

  // Modal map coordinate states
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedDestIndex, setSelectedDestIndex] = useState<number | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalAddress, setModalAddress] = useState('');
  const [modalCoords, setModalCoords] = useState({ lat: -25.9964, lng: 28.1306 });

  // Free & Open-Source Nominatim/Photon Geocoding Integration
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    const delayDebounceFn = setTimeout(async () => {
      try {
        // Query OpenStreetMap Nominatim API (with standard addressdetails and limit=5)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`;
        
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Taskflow-OpsPortal/1.0 (mattcoombes247@gmail.com)'
          }
        });

        if (!response.ok) {
          throw new Error('Nominatim returned error status');
        }

        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const results = data.map((item: any) => {
            const road = item.address?.road || '';
            const suburb = item.address?.suburb || '';
            const city = item.address?.city || item.address?.town || item.address?.village || '';
            const nameCandidate = item.name || road || suburb || city || 'Search Result';
            return {
              name: nameCandidate,
              address: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            };
          });
          setSearchResults(results);
        } else {
          // Fallback to Photon API if Nominatim returned empty results
          await fallbackToPhoton(searchQuery);
        }
      } catch (err: any) {
        console.warn('Nominatim query failed or rate-limited. Activating active Photon API failover:', err);
        await fallbackToPhoton(searchQuery);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // 500ms Debounce limit to adhere to Osm Nominatim requirements

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fallbackToPhoton = async (query: string) => {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Photon API returned error status');
      }
      const data = await response.json();
      if (data && data.features && Array.isArray(data.features)) {
        const results = data.features.map((feat: any) => {
          const props = feat.properties || {};
          const geom = feat.geometry || {};
          const coords = geom.coordinates || [0, 0]; // Photon returns geojson coordinates as [longitude, latitude]
          
          const parts = [
            props.name,
            props.street,
            props.city || props.town || props.district,
            props.state,
            props.country
          ].filter(Boolean);
          
          return {
            name: props.name || props.street || 'Search Result',
            address: parts.join(', '),
            lat: coords[1],
            lng: coords[0]
          };
        });
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error('All open-source geocoders exhausted:', err);
      setSearchError('Geocoding search service is currently offline');
    }
  };

  const handleSelectSearchResult = (result: { name: string; address: string; lat: number; lng: number }) => {
    setModalName(result.name);
    setModalAddress(result.address);
    setModalCoords({ lat: result.lat, lng: result.lng });

    if (selectedDestIndex !== null) {
      onUpdateNodeLocation(selectedDestIndex, result.name, result.lat, result.lng);
    }

    setIsMapModalOpen(false);
    setSelectedDestIndex(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const MAP_BOUNDS = {
    minLng: 27.70,
    maxLng: 28.45,
    minLat: -25.70, // north (top)
    maxLat: -26.35  // south (bottom)
  };

  const PRESETS = [
    { name: 'O.R. Tambo Airport', address: 'Kempton Park, Gauteng', lat: -26.1367, lng: 28.2411, baseRoute: 'R21 Expressway' },
    { name: 'Sandton City Terminal', address: 'Rivonia Rd, Sandton', lat: -26.1075, lng: 28.0567, baseRoute: 'M1 Southbound' },
    { name: 'Pretoria Hub', address: 'Union Buildings, Pretoria', lat: -25.7424, lng: 28.2118, baseRoute: 'N1 Northbound' },
    { name: 'Rosebank Central', address: 'Oxford Rd, Rosebank', lat: -26.1442, lng: 28.0431, baseRoute: 'M1 → Grayston' },
    { name: 'Soweto Grand Towers', address: 'Orlando East, Soweto', lat: -26.2538, lng: 27.9255, baseRoute: 'N1 Western Bypass' },
    { name: 'Centurion Tech Park', address: 'John Vorster Dr, Centurion', lat: -25.8640, lng: 28.2122, baseRoute: 'N1 Danie Joubert' }
  ];

  const openMapForWidget = (idx: number) => {
    setSelectedDestIndex(idx);
    const dest = destList[idx];
    setModalName(dest.name);
    setModalAddress(dest.address);
    setModalCoords({ lat: dest.lat, lng: dest.lng });
    setIsMapModalOpen(true);
  };

  const handleConfirmLocation = () => {
    if (selectedDestIndex === null) return;
    const updatedName = modalName || 'Custom Waypoint';
    const updatedLat = modalCoords.lat;
    const updatedLng = modalCoords.lng;

    onUpdateNodeLocation(selectedDestIndex, updatedName, updatedLat, updatedLng);

    setIsMapModalOpen(false);
    setSelectedDestIndex(null);
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    const lngVal = MAP_BOUNDS.minLng + (x / width) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
    const latVal = MAP_BOUNDS.minLat + (y / height) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);

    setModalCoords({
      lat: Math.round(latVal * 10000) / 10000,
      lng: Math.round(lngVal * 10000) / 10000
    });
  };

  // Geolocation Setup
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setUserCoords(DEFAULT_COORDS);
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
        console.warn('Dashboard location fallback to Midrand:', error);
        setUserCoords(DEFAULT_COORDS);
        setGeoStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // Time Sync
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Weather
  useEffect(() => {
    const fetchWeather = async (showLoading = false) => {
      const lat = userCoords?.lat ?? DEFAULT_COORDS.lat;
      const lng = userCoords?.lng ?? DEFAULT_COORDS.lng;

      try {
        if (showLoading) {
          setWeatherLoading(true);
        }
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );
        const data = await res.json();
        setWeather({
          temp: data.current_weather.temperature,
          code: data.current_weather.weathercode,
          windSpeed: data.current_weather.windspeed,
          humidity: 62, // Standard average fallback
          isDay: data.current_weather.is_day === 1
        });
      } catch (err) {
        console.error('Weather fetching failure', err);
      } finally {
        if (showLoading) {
          setWeatherLoading(false);
        }
      }
    };

    fetchWeather(true);
    const timer = setInterval(() => {
      fetchWeather(false);
    }, 300000); // 5 mins
    return () => clearInterval(timer);
  }, [userCoords]);

  // Fetch Tasks
  useEffect(() => {
    const fetchTasks = async (showLoading = false) => {
      try {
        if (showLoading) {
          setTasksLoading(true);
        }
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('Unauthenticated operational state.');
        }

        const { data, error: dbError } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;

        const rawTasks = Array.isArray(data) ? data : [];

        // Filter active tasks
        const activePendingTasks = rawTasks.filter((task: any) => {
          const status = String(task.status || '').toLowerCase();
          const isPendingOrActive = status === 'pending' || status === 'in_progress' || status === 'active' || status === '';
          
          const userIdMatches = !task.user_id || task.user_id === session.user.id;
          const userRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
          const roleMatches = !task.role || !userRole || task.role === userRole;

          return isPendingOrActive && userIdMatches && roleMatches;
        });

        setTasks(activePendingTasks);
        setTasksError(null);
      } catch (err: any) {
        console.error('Task fetch error:', err);
        setTasksError(err.message);
      } finally {
        if (showLoading) {
          setTasksLoading(false);
        }
      }
    };

    fetchTasks(true);

    const timer = setInterval(() => {
      fetchTasks(false);
    }, 300000); // Poll exactly every 5 minutes (300,000 ms)

    return () => clearInterval(timer);
  }, []);

  // Helper styling for priorities
  const getPriorityStyle = (priority: string) => {
    const p = String(priority).toLowerCase();
    switch (p) {
      case 'high':
      case 'critical':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-400',
          dot: 'bg-red-500',
          border: 'border-l-4 border-l-red-500'
        };
      case 'medium':
      case 'normal':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-500',
          border: 'border-l-4 border-l-blue-500'
        };
      case 'low':
      default:
        return {
          bg: 'bg-green-500/10 border-green-500/30 text-green-400',
          dot: 'bg-green-500',
          border: 'border-l-4 border-l-green-500'
        };
    }
  };

  // Weather Rendering Helpers
  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-10 h-10 text-yellow-500 animate-spin-slow" />;
    if (code <= 3) return <Cloud className="w-10 h-10 text-gray-400" />;
    if (code <= 67) return <CloudRain className="w-10 h-10 text-blue-400 animate-pulse" />;
    if (code <= 99) return <CloudLightning className="w-10 h-10 text-purple-400" />;
    return <Wind className="w-10 h-10 text-white" />;
  };

  const getWeatherLabel = (code: number) => {
    if (code === 0) return 'CLEAR';
    if (code <= 3) return 'PARTLY CLOUDY';
    if (code <= 67) return 'RAIN SHOWERS';
    if (code <= 99) return 'STORMS';
    return 'OVERCAST';
  };

  // Traffic Commute Calculations
  const calculateCommute = (dest: Destination) => {
    const startLat = userCoords?.lat ?? DEFAULT_COORDS.lat;
    const startLng = userCoords?.lng ?? DEFAULT_COORDS.lng;

    const R = 6371; // Earth's radius in km
    const dLat = (dest.lat - startLat) * Math.PI / 180;
    const dLon = (dest.lng - startLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(startLat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = Math.round(R * c * 1.35 * 10) / 10; // adjusted road distance factor

    const minsBase = (distanceKm / 75) * 60;
    const hour = time.getHours();
    
    let multiplier = 1.1;
    let status: 'FLOWING' | 'MODERATE' | 'CONGESTED' = 'FLOWING';

    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      multiplier = 1.9;
      status = 'CONGESTED';
    } else if (hour >= 12 && hour <= 14) {
      multiplier = 1.35;
      status = 'MODERATE';
    }

    const durationMins = Math.max(Math.round(minsBase * multiplier), 4);
    const delayMins = Math.max(durationMins - Math.round(minsBase), 0);

    return { distanceKm, durationMins, delayMins, status };
  };

  // Simple upcoming dates calculation
  const getFormattedDay = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dayNum: d.getDate(),
      dateStr: d.toISOString().split('T')[0]
    };
  };

  const nextThreeDays = [0, 1, 2].map(getFormattedDay);

  return (
    <div className="w-full h-full flex flex-col pt-1 relative">
      
      {/* Dynamic Screen Action Bar - Always responsive & absolute or neat block */}
      <div className="flex flex-row items-center justify-between bg-charcoal-elevated/80 border border-white/5 rounded-lg px-3 py-2.5 mb-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutGrid className="w-4 h-4 text-gold shrink-0" />
          <h1 className="text-xs sm:text-sm font-black tracking-widest uppercase text-white truncate">
            COMMAND DASHBOARD
          </h1>
          <span className="hidden xs:inline-block px-1.5 py-0.5 bg-gold/10 text-[8px] sm:text-[9px] text-gold rounded font-mono border border-gold/20">
            SYSTEM GRID
          </span>
        </div>

        {/* Full-Screen Toggle Action Button */}
        <button
          onClick={onToggleFullscreenMode}
          className="px-2.5 py-1 bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/60 text-gold text-[9px] sm:text-[10px] font-bold tracking-wider uppercase rounded flex items-center gap-1.5 transition-all cursor-pointer transition-colors"
          title={isFullscreenMode ? "Exit Full-Screen" : "Toggle Full-Screen Layout"}
        >
          {isFullscreenMode ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Compact View</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Render Mode: Standard Bento Grid vs Always-On Centered Display */}
      {isFullscreenMode ? (
        <div className="flex-1 w-full flex flex-col justify-center items-center pb-4 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeWidgetIdx === 0 && (
              <motion.div
                key="fs-weather"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="max-w-xl w-full flex-1 bg-charcoal-elevated border border-gold/20 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[300px]"
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gold" />
                
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold tracking-widest text-gold uppercase flex items-center gap-2">
                    <Compass className="w-4 h-4 text-gold animate-spin-slow" /> Env Sensors
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase select-none">
                    {geoStatus === 'granted' ? 'GPS COORDINATES' : 'MIDRAND NODE'}
                  </span>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row items-center justify-around py-6 gap-6">
                  {weatherLoading ? (
                    <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
                  ) : weather ? (
                    <>
                      <div className="flex items-center gap-6">
                        <div className="scale-150 p-2">
                          {getWeatherIcon(weather.code)}
                        </div>
                        <div>
                          <div className="text-5xl sm:text-6xl font-black font-display tracking-tight text-white tabular-nums">
                            {Math.round(weather.temp)}°C
                          </div>
                          <div className="text-[11px] font-mono font-bold tracking-wider text-gold mt-1">
                            {getWeatherLabel(weather.code)}
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:block h-20 w-[1px] bg-white/10" />

                      <div className="flex flex-col gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Wind className="w-4 h-4 text-gold/60" strokeWidth={2.5} />
                          <span className="text-gray-300">Wind Speed:</span>
                          <span className="font-mono font-bold text-white tabular-nums">{weather.windSpeed} km/h</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Thermometer className="w-4 h-4 text-gold/60" strokeWidth={2.5} />
                          <span className="text-gray-300">Humidity:</span>
                          <span className="font-mono font-bold text-white tabular-nums">{weather.humidity}% RH</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="w-4 h-4 text-gold/60" strokeWidth={2.5} />
                          <span className="text-gray-300">Station Node:</span>
                          <span className="font-mono text-white/80">[Dallmayr Station Terminal]</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 font-mono">Sensors unresponsive</div>
                  )}
                </div>

                <div className="text-[10px] text-gray-500 border-t border-white/5 pt-3 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5 font-bold"><MapPin className="w-3.5 h-3.5 text-gold" /> Dallmayr Station Terminal</span>
                  <span className="text-[8px] tracking-widest text-gold text-right">[STATION OK]</span>
                </div>
              </motion.div>
            )}

            {activeWidgetIdx === 1 && (
              <motion.div
                key="fs-tasks"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="max-w-xl w-full flex-1 bg-charcoal-elevated border border-gold/20 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[300px]"
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gold" />
                
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold tracking-widest text-gold uppercase flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-gold" /> Operational Tasks
                  </span>
                  <span className="text-[9px] font-mono text-gold rounded border border-gold/25 px-2 py-0.5 bg-gold/10 font-bold tracking-wider">
                    {tasks.length} ACTIVE
                  </span>
                </div>

                <div className="flex-1 flex flex-col gap-2 py-5 justify-center overflow-y-auto max-h-[220px] custom-scrollbar">
                  {tasksLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
                    </div>
                  ) : tasksError ? (
                    <div className="flex items-center gap-3 p-4 bg-red-950/20 text-red-400 border border-red-900/40 rounded-xl text-xs font-mono">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>Telemetry error linking tasks context tracker.</span>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/5 rounded-xl opacity-50 py-10">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mb-2 animate-bounce" />
                      <span className="text-xs text-white font-mono font-bold uppercase tracking-widest">ALL OPERATIONS DEPLOYMENTS CLEAR</span>
                    </div>
                  ) : (
                    tasks.slice(0, 4).map((task) => {
                      const style = getPriorityStyle(task.priority);
                      return (
                        <div 
                          key={task.id}
                          className={`p-3.5 rounded-xl border border-white/5 ${style.border} flex items-center justify-between gap-4 bg-white/[0.015] hover:bg-white/[0.03] transition-colors`}
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{task.title}</h4>
                            <p className="text-[10px] text-gray-400 truncate font-mono mt-1">{task.description}</p>
                          </div>
                          <span className={`text-[9px] font-mono select-none px-2.5 py-1 rounded-md ${style.bg} font-black uppercase text-center shrink-0`}>
                            {task.priority || 'LOW'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="text-[10px] text-gray-500 border-t border-white/5 pt-3 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-1.5"><Info className="w-4 h-4 text-gold/60" /> Live Synchronized Desk</span>
                  <span className="text-gold uppercase tracking-widest text-[8px] font-bold">[Level-2 Access]</span>
                </div>
              </motion.div>
            )}

            {activeWidgetIdx === 2 && (
              <motion.div
                key="fs-calendar"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="max-w-xl w-full flex-1 bg-charcoal-elevated border border-gold/20 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[300px]"
              >
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gold" />
                
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold tracking-widest text-gold uppercase flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold" /> Calendar Operations
                  </span>
                  <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">WEEK OUTLOOK</span>
                </div>

                <div className="flex-1 flex flex-col gap-3 py-4 justify-center">
                  {nextThreeDays.map((day) => {
                    const dayTasks = tasks.filter((task) => {
                      const targetDate = task.due_date || task.created_at || '';
                      return targetDate.split('T')[0] === day.dateStr;
                    });

                    return (
                      <div 
                        key={day.dateStr}
                        className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white-[0.03] text-sm hover:border-white/10 transition-colors"
                      >
                        <div className="px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-lg text-center w-14 shrink-0 shadow-inner">
                          <div className="text-[9px] font-black text-gold tracking-widest">{day.name}</div>
                          <div className="text-sm font-black text-white mt-0.5">{day.dayNum}</div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {dayTasks.length === 0 ? (
                            <span className="text-[11px] text-gray-600 font-mono italic">No deadlines set</span>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {dayTasks.slice(0, 2).map((t) => (
                                <div key={t.id} className="text-xs font-bold text-white truncate flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-gold inline-block shrink-0" />
                                  <span className="truncate">{t.title}</span>
                                </div>
                              ))}
                              {dayTasks.length > 2 && (
                                <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-wider">
                                  + {dayTasks.length - 2} OTHER SCHEDULED ITEMS
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] text-gray-500 border-t border-white/5 pt-3 flex items-center gap-1.5 font-mono">
                  <Clock className="w-4 h-4 text-gold/60" />
                  <span>Gauteng Cluster Standard Time</span>
                </div>
              </motion.div>
            )}

            {(activeWidgetIdx === 3 || activeWidgetIdx === 4) && (() => {
              const idx = activeWidgetIdx === 3 ? 0 : 1;
              const dest = destList[idx];
              const stats = calculateCommute(dest);
              const isCongested = stats.status === 'CONGESTED';
              const isModerate = stats.status === 'MODERATE';
              const colorClass = isCongested 
                ? 'border-red-500/35 bg-red-950/15 text-red-400' 
                : isModerate 
                ? 'border-gold/35 bg-gold/10 text-gold' 
                : 'border-green-500/25 bg-green-950/15 text-green-400';

              return (
                <motion.div
                  key={`fs-traffic-${idx}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className={`max-w-xl w-full flex-1 bg-charcoal-elevated border-2 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[300px] ${colorClass}`}
                >
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gold" />
                  
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="text-xs font-bold tracking-widest text-gold uppercase flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-gold" /> Transit Dispatcher
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 font-bold uppercase tracking-wider">
                      COMMUTE FLOWS — TRANSIT {idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-center py-5">
                    <div>
                      <h5 className="text-lg sm:text-xl font-black tracking-wider text-white uppercase truncate">
                        {dest.name}
                      </h5>
                      <span className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-1 truncate select-none">
                        <MapPin className="w-3.5 h-3.5 text-gold/50 shrink-0" />
                        <span className="truncate">{dest.baseRoute}</span>
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 pt-5">
                      <span className="text-5xl sm:text-6xl font-mono font-black text-white leading-none tracking-tight animate-pulse">
                        {stats.durationMins}
                      </span>
                      <span className="text-xs text-gray-400 font-black font-mono tracking-widest uppercase">MINS</span>
                      {stats.delayMins > 0 && (
                        <span className="text-[10px] text-red-400 font-mono font-bold bg-red-500/10 px-2 py-0.5 border border-red-500/20 ml-auto rounded-md">
                          +{stats.delayMins} min delay
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono border-t border-white/5 pt-3 mt-4 font-bold text-gray-400">
                      <span className="text-white bg-white/5 px-2.5 py-0.5 rounded border border-white/5">{stats.distanceKm} KM</span>
                      <span className={`uppercase px-2.5 py-0.5 rounded border ${
                        isCongested ? 'bg-red-500/15 border-red-500/20 text-red-400' : isModerate ? 'bg-gold/15 border-gold/20 text-gold' : 'bg-green-500/15 border-green-500/20 text-green-400'
                      }`}>{stats.status}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-500 border-t border-white/5 pt-3 flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1.5">
                      <Map className="w-4 h-4 text-gold/60" /> Route calculations
                    </span>
                    <span className="text-[8px] text-gold font-bold bg-gold/5 border border-gold/25 px-2 rounded select-none">
                      LOCKED ON CAPTURE
                    </span>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Navigation Control Dot Buttons */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 select-none flex-wrap">
            {[
              { label: 'Sensors', icon: Compass },
              { label: 'Tasks', icon: ListTodo },
              { label: 'Calendar', icon: Calendar },
              { label: 'Traffic 1', icon: Navigation },
              { label: 'Traffic 2', icon: Navigation }
            ].map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === activeWidgetIdx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveWidgetIdx(idx)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'bg-gold/20 border-gold/40 text-gold scale-105 font-bold shadow-[0_0_12px_rgba(197,160,89,0.15)] font-mono' 
                      : 'bg-white/[0.01] border-white/5 text-gray-500 scale-95 hover:bg-white/5 hover:text-white/60 font-mono'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] tracking-wider uppercase hidden sm:inline-block">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Grid: Fully optimized with 1 col on mobile, 12 cols on desktop/tablets */
        <div className="flex-1 w-full overflow-y-auto pb-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            
            {/* Widget 1: Weather widget (Span 4 on large, Span 1 on mid) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-4 bg-charcoal-elevated border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden h-[185px] xs:h-[195px] md:h-auto"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gold/50" />
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-gold" /> Env Sensors
                </span>
                <span className="text-[9px] font-mono text-gray-500">
                  {geoStatus === 'granted' ? 'GPS COORDINATES' : 'MIDRAND NODE'}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-around py-3">
                {weatherLoading ? (
                  <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                ) : weather ? (
                  <>
                    <div className="flex items-center gap-3">
                      {getWeatherIcon(weather.code)}
                      <div>
                        <div className="text-2xl sm:text-3xl font-black font-display tracking-tighter text-white tabular-nums">
                          {Math.round(weather.temp)}°C
                        </div>
                        <div className="text-[9px] font-mono font-bold tracking-wider text-gold">{getWeatherLabel(weather.code)}</div>
                      </div>
                    </div>

                    <div className="h-10 w-[1px] bg-white/10" />

                    <div className="flex flex-col gap-1.5 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Wind className="w-3 h-3 text-gold/60" />
                        <span className="font-mono text-white/90">{weather.windSpeed} km/h</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Thermometer className="w-3 h-3 text-gold/60" />
                        <span className="font-mono text-white/90">{weather.humidity}% RH</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-500 font-mono">Sensors unresponsive</div>
                )}
              </div>

              <div className="text-[8px] text-left text-gray-500 border-t border-white/5 pt-1.5 flex items-center gap-1 font-mono">
                <MapPin className="w-2.5 h-2.5 text-gold" />
                <span>Dallmayr Station Terminal</span>
              </div>
            </motion.div>

            {/* Widget 2: Tasks List widget (Span 8 on large) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="lg:col-span-8 bg-charcoal-elevated border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden min-h-[220px]"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gold/50" />
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-gold" /> Operational Tasks
                </span>
                <span className="text-[9px] font-mono text-gold rounded border border-gold/15 px-1.5 bg-gold/5">
                  {tasks.length} ACTIVE
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1.5 py-3 overflow-y-auto max-h-[160px] custom-scrollbar">
                {tasksLoading ? (
                  <div className="flex-1 flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                  </div>
                ) : tasksError ? (
                  <div className="flex items-center gap-2 p-3 bg-red-950/20 text-red-400 border border-red-900/40 rounded-lg text-[10px] font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Telemetry error linking tasks context tracker.</span>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-white/5 rounded-lg opacity-40">
                    <CheckCircle2 className="w-6 h-6 text-green-500 mb-1" />
                    <span className="text-[10px] font-mono">ALL OPERATIONS DEPLOYMENTS CLEAR</span>
                  </div>
                ) : (
                  tasks.slice(0, 3).map((task) => {
                    const style = getPriorityStyle(task.priority);
                    return (
                      <div 
                        key={task.id}
                        className={`p-2 rounded border border-white/5 ${style.border} flex items-center justify-between gap-3 bg-white/[0.015]`}
                      >
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-bold text-white truncate">{task.title}</h4>
                          <p className="text-[9px] text-gray-500 truncate font-mono mt-0.5">{task.description}</p>
                        </div>
                        <span className={`text-[8px] font-mono select-none px-1.5 py-0.5 rounded ${style.bg} font-black uppercase text-center shrink-0`}>
                          {task.priority || 'LOW'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="text-[8px] text-gray-500 border-t border-white/5 pt-1.5 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1"><Info className="w-3 h-3 text-gold/60" /> Live Synchronized Desk</span>
                <span className="text-gold uppercase tracking-widest">[Level-2 Access]</span>
              </div>
            </motion.div>

            {/* Widget 3: Weekly Calendar (Span 6 on large) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-6 bg-charcoal-elevated border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden min-h-[220px]"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gold/50" />
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold" /> Calendar Operations
                </span>
                <span className="text-[9px] font-mono text-gray-500">WEEK OUTLOOK</span>
              </div>

              {/* Upcoming Days timeline grid */}
              <div className="flex-1 flex flex-col gap-2 py-3 justify-center">
                {nextThreeDays.map((day) => {
                  const dayTasks = tasks.filter((task) => {
                    const targetDate = task.due_date || task.created_at || '';
                    return targetDate.split('T')[0] === day.dateStr;
                  });

                  return (
                    <div 
                      key={day.dateStr}
                      className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white-[0.03] text-[11px]"
                    >
                      <div className="px-2 py-1 bg-gold/10 border border-gold/20 rounded text-center w-11 shrink-0">
                        <div className="text-[8px] font-extrabold text-gold tracking-widest">{day.name}</div>
                        <div className="text-xs font-black text-white">{day.dayNum}</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {dayTasks.length === 0 ? (
                          <span className="text-[10px] text-gray-600 font-mono italic">No deadlines set</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {dayTasks.slice(0, 1).map((t) => (
                              <div key={t.id} className="text-[10px] font-bold text-white truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block shrink-0" />
                                <span className="truncate">{t.title}</span>
                              </div>
                            ))}
                            {dayTasks.length > 1 && (
                              <span className="text-[8px] font-mono text-gold font-bold">
                                + {dayTasks.length - 1} OTHER SCHEDULED ITEMS
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[8px] text-gray-500 border-t border-white/5 pt-1.5 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-gold/60" />
                <span>Gauteng Cluster Standard Time</span>
              </div>
            </motion.div>

            {/* Widget 4: Traffic Commute Statuses (Span 6 on large, handles BOTH destinations in bento layout) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-6 bg-charcoal-elevated border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden min-h-[220px]"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gold/50" />
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-gold" /> Transit Dispatcher
                </span>
                <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">COMMUTE FLOWS</span>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 min-h-0">
                {destList.map((dest, idx) => {
                  const stats = calculateCommute(dest);
                  const isCongested = stats.status === 'CONGESTED';
                  const isModerate = stats.status === 'MODERATE';
                  const colorClass = isCongested 
                    ? 'border-red-900/50 bg-red-950/10 text-red-400' 
                    : isModerate 
                    ? 'border-gold/30 bg-gold/5 text-gold' 
                    : 'border-green-900/30 bg-green-950/10 text-green-400';

                  return (
                    <div 
                      key={dest.id}
                      onClick={() => {
                        if (!isFullscreenMode) {
                          openMapForWidget(idx);
                        }
                      }}
                      className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${colorClass} ${
                        !isFullscreenMode 
                          ? 'cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all duration-200 group relative' 
                          : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <h5 className="text-[10px] sm:text-[11px] font-black tracking-wide text-white uppercase truncate">
                            {dest.name}
                          </h5>
                          {!isFullscreenMode && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-gold/20 text-gold text-[7px] font-mono font-bold px-1 rounded border border-gold/30 uppercase tracking-widest leading-normal shrink-0 scale-90 translate-x-1">
                              EDIT
                            </span>
                          )}
                        </div>
                        <span className="text-[7.5px] text-gray-500 font-mono flex items-center gap-0.5 mt-0.5 truncate select-none">
                          <MapPin className="w-2.5 h-2.5 text-gold/50 shrink-0" />
                          <span className="truncate">{dest.baseRoute}</span>
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-xl font-mono font-black text-white leading-none">
                          {stats.durationMins}
                        </span>
                        <span className="text-[8px] text-gray-400 font-bold font-mono">MINS</span>
                        {stats.delayMins > 0 && (
                          <span className="text-[8px] text-red-400 font-mono font-bold bg-red-500/10 px-1 border border-red-500/15 ml-auto rounded">
                            +{stats.delayMins} min delay
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[7.5px] font-mono border-t border-white/5 pt-1 mt-1 font-bold text-gray-400">
                        <span>{stats.distanceKm} KM</span>
                        <span className="uppercase">{stats.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[8px] text-gray-500 border-t border-white/5 pt-1.5 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1">
                  <Map className="w-3 h-3 text-gold/60" /> route calculations
                </span>
                <span className="text-[8px] text-gold font-bold">
                  {!isFullscreenMode ? 'INTERACTIVE RE-ROUTE' : 'LOCKED ON CAPTURE'}
                </span>
              </div>
            </motion.div>

          </div>
        </div>
      )}

      {/* Dynamic Tactical Map Selector Modal */}
      <AnimatePresence>
        {isMapModalOpen && selectedDestIndex !== null && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111111] border border-gold/30 rounded-xl overflow-hidden max-w-2xl w-full p-4 sm:p-5 shadow-[0_0_50px_rgba(197,160,89,0.15)] flex flex-col gap-4 max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-black tracking-widest text-gold uppercase flex items-center gap-1.5">
                    <Compass className="w-4 h-4 animate-spin-slow text-gold" strokeWidth={3} /> TRANSIT DISPATCH CONTROL
                  </h3>
                  <p className="text-[8px] sm:text-[9px] text-gray-400 font-mono mt-0.5">
                    RE-ROUTING NODE: <span className="text-white font-bold">{destList[selectedDestIndex]?.name.toUpperCase()}</span>
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsMapModalOpen(false);
                    setSelectedDestIndex(null);
                  }}
                  className="p-1 hover:bg-white/5 rounded border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preset Shortcuts */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[8px] font-bold font-mono text-gray-500 uppercase tracking-widest">GAUTENG HUB PRESETS:</span>
                <div className="flex flex-wrap gap-1">
                  {PRESETS.map((p) => {
                    const isSelected = Math.abs(modalCoords.lat - p.lat) < 0.005 && Math.abs(modalCoords.lng - p.lng) < 0.005;
                    return (
                      <button
                        key={p.name}
                        onClick={() => {
                          setModalName(p.name);
                          setModalAddress(p.address);
                          setModalCoords({ lat: p.lat, lng: p.lng });
                        }}
                        className={`px-2 py-1 rounded text-[8px] font-mono border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gold/20 text-gold border-gold'
                            : 'bg-white/[0.015] text-white/50 border-white/5 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {p.name.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Map Canvas and Pin Editor */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 overflow-y-auto no-scrollbar min-h-0">
                {/* Visual Map Workspace (Span 7) */}
                <div className="md:col-span-8 bg-black border border-white/5 rounded-lg overflow-hidden relative flex flex-col h-[180px] sm:h-[220px]">
                  <div className="absolute top-2 left-2 z-10 bg-black/80 px-2 py-0.5 border border-white/10 text-[7px] font-mono text-gray-400 rounded uppercase pointer-events-none">
                    Interactive Grid Scope
                  </div>
                  <div className="absolute bottom-2 right-2 z-10 bg-black/80 px-2 py-0.5 border border-white/10 text-[7px] font-mono text-gold rounded uppercase pointer-events-none">
                    Point to Lock Custom Coordinates
                  </div>

                  {/* SVG Map Graphic */}
                  <svg 
                    onClick={handleMapClick}
                    className="w-full h-full cursor-crosshair bg-black/40 select-none"
                    viewBox="0 0 500 300"
                  >
                    {/* Map Grid Pattern Lines */}
                    <defs>
                      <pattern id="modal-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#modal-grid)" />

                    {/* Concentric Signal Rings from user GPS coordinate or Midrand default center node */}
                    <circle cx="250" cy="150" r="40" fill="none" stroke="rgba(197,160,89,0.06)" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="250" cy="150" r="90" fill="none" stroke="rgba(197,160,89,0.04)" strokeWidth="1" strokeDasharray="5 5" />
                    <circle cx="250" cy="150" r="140" fill="none" stroke="rgba(197,160,89,0.03)" strokeWidth="1" />

                    {/* Custom Highway Lines layout (Tactical stylized routes) */}
                    <path d="M 50,-50 Q 150,100 250,150 T 450,350" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" strokeDasharray="2 3" />
                    <path d="M -50,150 L 550,150" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    <path d="M 250,-50 L 250,350" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                    {/* Preset Locations Pin Indicators plotted on SVG */}
                    {PRESETS.map((p, idx) => {
                      const pctLng = (p.lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
                      const pctLat = (p.lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
                      const pinX = pctLng * 500;
                      const pinY = pctLat * 300;
                      return (
                        <g key={idx}>
                          <circle cx={pinX} cy={pinY} r="3" fill="rgba(255,255,255,0.15)" />
                          <text x={pinX + 6} y={pinY + 3} fill="rgba(255,255,255,0.3)" fontSize="6" fontFamily="monospace">
                            {p.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}

                    {/* Central Dispatch Station Node (Midrand) */}
                    <circle cx="250" cy="150" r="5" fill="#c5a059" className="animate-pulse" />
                    <circle cx="250" cy="150" r="12" fill="none" stroke="#c5a059" strokeWidth="1" opacity="0.3" className="animate-ping-slow" />
                    <text x="260" y="153" fill="#c5a059" fontSize="7" fontWeight="bold" fontFamily="monospace" className="select-none">
                      MIDRAND CENTRAL STN
                    </text>

                    {/* Current Custom Pin Coordinate (Mapped to viewport) */}
                    {(() => {
                      const pctLng = (modalCoords.lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
                      const pctLat = (modalCoords.lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
                      const pinX = Math.max(10, Math.min(490, pctLng * 500));
                      const pinY = Math.max(10, Math.min(290, pctLat * 300));

                      return (
                        <g>
                          <circle cx={pinX} cy={pinY} r="16" fill="none" stroke="#c5a059" strokeWidth="1" strokeDasharray="2 2" className="animate-spin-slow" opacity="0.7" />
                          <circle cx={pinX} cy={pinY} r="6" fill="rgba(197,160,89,0.3)" />
                          <circle cx={pinX} cy={pinY} r="2" fill="#ffffff" />
                          <line x1={pinX - 10} y1={pinY} x2={pinX + 10} y2={pinY} stroke="#c5a059" strokeWidth={1} />
                          <line x1={pinX} y1={pinY - 10} x2={pinX} y2={pinY + 10} stroke="#c5a059" strokeWidth={1} />
                          
                          <rect x={pinX > 250 ? pinX - 100 : pinX + 12} y={pinY - 15} width="90" height="16" rx="3" fill="rgba(0,0,0,0.85)" stroke="#c5a059" strokeWidth="0.5" />
                          <text x={pinX > 250 ? pinX - 95 : pinX + 17} y={pinY - 5} fill="#ffffff" fontSize="6.5" fontWeight="bold" fontFamily="monospace">
                            TARGET PIN LOCKED
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Pin Meta Fields Panel (Span 5) */}
                <div className="md:col-span-4 flex flex-col justify-between gap-3 text-left">
                  <div className="flex flex-col gap-3">
                    {/* Custom Free Open-Source Autocomplete Search Input */}
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[9px] font-bold font-mono text-gold uppercase flex items-center gap-1">
                        <Search className="w-3 h-3 text-gold" style={{ strokeWidth: 3 }} /> SEARCH VIA GEOMETERS (OSM / PHOTON)
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search address or landmark... (e.g. Pretoria)"
                          className="w-full bg-black border border-gold/40 hover:border-gold/60 focus:border-gold focus:ring-2 focus:ring-gold/20 shadow-[0_0_10px_rgba(197,160,89,0.15)] rounded p-2.5 pr-8 text-xs text-gold font-mono placeholder:text-gold/30 outline-none transition-all duration-300"
                        />
                        {searchLoading && (
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Dropdown Results list styled strictly to existing telemetry aesthetic */}
                      {searchResults.length > 0 && (
                        <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-charcoal-elevated border border-gold/30 backdrop-blur-md rounded-lg shadow-2xl max-h-[140px] overflow-y-auto custom-scrollbar flex flex-col min-w-0">
                          {searchResults.map((result, rIdx) => (
                            <button
                              key={rIdx}
                              type="button"
                              onClick={() => handleSelectSearchResult(result)}
                              className="w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex flex-col gap-0.5 outline-none focus:bg-white/5"
                            >
                              <span className="text-white text-[11px] font-bold font-mono truncate">
                                {result.name}
                              </span>
                              <span className="text-gray-400 text-[8.5px] font-sans truncate">
                                {result.address}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
                        <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-[#111111]/95 border border-white/5 backdrop-blur-md rounded-lg p-2 text-center text-[9px] font-mono text-gray-500">
                          No transit destinations matched
                        </div>
                      )}

                      {searchError && (
                        <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-[#111111]/95 border border-red-900/40 backdrop-blur-md rounded-lg p-2 text-center text-[9px] font-mono text-red-400">
                          {searchError}
                        </div>
                      )}
                    </div>

                    {/* Name Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold font-mono text-gray-400 uppercase">Destination Name</label>
                      <input 
                        type="text" 
                        value={modalName}
                        onChange={(e) => setModalName(e.target.value)}
                        placeholder="e.g. Randburg Warehouse"
                        className="w-full bg-black border border-white/10 hover:border-white/20 focus:border-gold/50 rounded p-2 text-xs text-white font-mono placeholder:opacity-40 outline-none"
                      />
                    </div>

                    {/* Address Input */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold font-mono text-gray-400 uppercase">Deployment Address</label>
                      <input 
                        type="text" 
                        value={modalAddress}
                        onChange={(e) => setModalAddress(e.target.value)}
                        placeholder="e.g. Witkoppen Road, Fourways"
                        className="w-full bg-black border border-white/10 hover:border-white/20 focus:border-gold/50 rounded p-2 text-xs text-white font-mono placeholder:opacity-40 outline-none"
                      />
                    </div>

                    {/* Coordinates Readout */}
                    <div className="p-2 border border-white/5 bg-black/40 rounded flex flex-col gap-1">
                      <span className="text-[8px] font-bold font-mono text-gray-500 uppercase">SYSTEM FEED READOUT:</span>
                      <div className="flex items-center justify-between text-[9px] font-mono text-white/90">
                        <span>LATITUDE:</span>
                        <span className="text-gold font-bold">{modalCoords.lat.toFixed(4)}° S</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-white/90">
                        <span>LONGITUDE:</span>
                        <span className="text-gold font-bold">{modalCoords.lng.toFixed(4)}° E</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-white/90 truncate">
                        <span>PROPOSED:</span>
                        <span className="text-gray-400 truncate max-w-[110px]" title={getRouteSuggestion(modalCoords.lat, modalCoords.lng)}>
                          {getRouteSuggestion(modalCoords.lat, modalCoords.lng)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[8px] font-mono text-gray-500 bg-white/[0.01] border border-dashed border-white/5 p-2 rounded leading-tight">
                    * Interactive pin placement uses real-time linear GPS mapping vectors in Centurion, Pretoria, and JHB.
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="border-t border-white/5 pt-3 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => {
                    setIsMapModalOpen(false);
                    setSelectedDestIndex(null);
                  }}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-[10px] font-bold font-mono tracking-wider uppercase rounded hover:text-white cursor-pointer transition-colors"
                >
                  ABORT RE-ROUTE
                </button>
                <button
                  onClick={handleConfirmLocation}
                  className="px-4 py-2 bg-gold/20 hover:bg-gold/30 border border-gold text-gold hover:text-white text-[10px] font-bold font-mono tracking-wider uppercase rounded shadow-lg shadow-gold/5 cursor-pointer transition-colors"
                >
                  DISPATCH ROUTE PIN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

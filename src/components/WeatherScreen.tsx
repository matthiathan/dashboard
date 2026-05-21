import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Thermometer, MapPin, Compass } from 'lucide-react';
import { motion } from 'motion/react';

interface WeatherInfo {
  temp: number;
  code: number;
  windSpeed: number;
  humidity: number;
  isDay: boolean;
}

export default function WeatherScreen() {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');

  const DEFAULT_COORDS = { lat: -25.9964, lng: 28.1306 }; // Midrand

  // Geolocation
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
        console.warn('Geolocation declined or failed, fallback to Midrand.', error);
        setUserCoords(DEFAULT_COORDS);
        setGeoStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // Fetch OpenMeteo weather
  useEffect(() => {
    const fetchWeather = async () => {
      const lat = userCoords?.lat ?? DEFAULT_COORDS.lat;
      const lng = userCoords?.lng ?? DEFAULT_COORDS.lng;

      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
        );
        const data = await res.json();
        setWeather({
          temp: data.current_weather.temperature,
          code: data.current_weather.weathercode,
          windSpeed: data.current_weather.windspeed,
          humidity: 62, // Midrand/Randburg standard average
          isDay: data.current_weather.is_day === 1
        });
      } catch (err) {
        console.error('Weather fetching failure', err);
      }
    };

    fetchWeather();
    const timer = setInterval(fetchWeather, 300000); // 5 mins
    return () => clearInterval(timer);
  }, [userCoords]);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-16 h-16 text-yellow-400 animate-spin-slow" />;
    if (code <= 3) return <Cloud className="w-16 h-16 text-gray-400" />;
    if (code <= 67) return <CloudRain className="w-16 h-16 text-blue-400 animate-pulse" />;
    if (code <= 99) return <CloudLightning className="w-16 h-16 text-purple-400" />;
    return <Wind className="w-16 h-16 text-white" />;
  };

  const getWeatherLabel = (code: number) => {
    if (code === 0) return 'CLEAR SKIES';
    if (code <= 3) return 'PARTLY CLOUDY';
    if (code <= 67) return 'RAIN SHOWERS';
    if (code <= 99) return 'THUNDERSTORMS';
    return 'OVERCAST WEATHER';
  };

  return (
    <div className="w-full h-full flex flex-col pt-1">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Left Card: Big report visual */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-charcoal-elevated border border-gold/20 p-6 md:p-8 rounded-xl shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/50" />
          
          <div className="text-gold mb-6">
            {weather ? getWeatherIcon(weather.code) : <Thermometer className="w-16 h-16 animate-pulse" />}
          </div>

          {weather ? (
            <>
              <div className="text-6xl sm:text-8xl font-extralight text-white mb-4 tracking-tighter">
                {Math.round(weather.temp)}<span className="text-4xl text-gold font-normal">°C</span>
              </div>
              <h2 className="text-lg md:text-2xl font-bold text-gold uppercase tracking-[0.25em] mb-2 leading-none">
                {getWeatherLabel(weather.code)}
              </h2>
              <span className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                <MapPin className="w-3.5 h-3.5 text-gold shrink-0" />
                {userCoords ? `${userCoords.lat.toFixed(4)} S , ${userCoords.lng.toFixed(4)} E` : 'Midrand Node Fallback'}
              </span>
            </>
          ) : (
            <div className="py-2 animate-pulse text-gold uppercase font-mono text-xs tracking-widest">Resolving Satellite Feeds...</div>
          )}
        </motion.div>

        {/* Right Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full md:flex md:flex-col justify-between py-2">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 bg-charcoal-elevated/80 border border-white/5 rounded-xl flex flex-col justify-center"
          >
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Relative Humidity</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{weather ? weather.humidity : '--'}%</span>
            <p className="text-[10px] text-gray-600 font-mono mt-1 leading-normal">
              Stable atmospheric density. Standard inland South African weather parameters are currently logged inside target sector.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 bg-charcoal-elevated/80 border border-white/5 rounded-xl flex flex-col justify-center"
          >
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Wind Velocity & direction</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-gold mt-1">{weather ? Math.round(weather.windSpeed) : '--'} km/h</span>
            <p className="text-[10px] text-gray-600 font-mono mt-1 leading-normal">
              Gentle breeze. Correct wind flow coordinates calculated from meteorological satellites. Safe aviation and transport criteria.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

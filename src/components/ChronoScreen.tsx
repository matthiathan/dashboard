import { useEffect, useState } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Wind, Thermometer, MapPin } from 'lucide-react';

interface WeatherInfo {
  temp: number;
  code: number;
}

export default function ChronoScreen() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-25.9964&longitude=28.1306&current_weather=true'
        );
        const data = await res.json();
        setWeather({
          temp: data.current_weather.temperature,
          code: data.current_weather.weathercode,
        });
      } catch (err) {
        console.error('Weather fetch failed', err);
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 300000); // 5 mins
    return () => clearInterval(weatherTimer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Africa/Johannesburg'
    }).toUpperCase();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Africa/Johannesburg'
    });
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-16 h-16 text-yellow-400" />;
    if (code <= 3) return <Cloud className="w-16 h-16 text-gray-400" />;
    if (code <= 67) return <CloudRain className="w-16 h-16 text-blue-400" />;
    if (code <= 99) return <CloudLightning className="w-16 h-16 text-purple-400" />;
    return <Wind className="w-16 h-16 text-white" />;
  };

  const getWeatherLabel = (code: number) => {
    if (code === 0) return 'CLEAR SKIES';
    if (code <= 3) return 'PARTLY CLOUDY';
    if (code <= 67) return 'PRECIPITATION';
    if (code <= 99) return 'ELECTRICAL STORM';
    return 'UNCERTAIN';
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-baseline border-b-2 border-gold pb-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gold flex items-center justify-center rounded-sm">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-charcoal" fill="currentColor">
              <path d="M21 16.5C21 16.88 20.79 17.21 20.47 17.38L12.57 21.82C12.41 21.94 12.21 22 12 22C11.79 22 11.59 21.94 11.43 21.82L3.53 17.38C3.21 17.21 3 16.88 3 16.5V7.5C3 7.12 3.21 6.79 3.53 6.62L11.43 2.18C11.59 2.06 11.79 2 12 2C12.21 2 12.41 2.06 12.57 2.18L20.47 6.62C20.79 6.79 21 7.12 21 7.5V16.5Z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter text-gold uppercase">
              TASKFLOW <span className="font-light opacity-80 text-white">OPSPORTAL</span>
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase opacity-50">Dallmayr Operations Hub</p>
          </div>
        </div>
        <div className="text-right"> 
          <div className="text-5xl font-light tracking-tight text-gold tabular-nums">{formatTime(time)}</div>
          <div className="text-[10px] tracking-widest uppercase opacity-60">SAST — MIDRAND, GAUTENG</div>
        </div>
      </div>

      <div className="flex-1 flex gap-10 overflow-hidden">
        <div className="flex-1 flex flex-col gap-6 justify-center">
            <div className="flex items-center gap-2 text-gold/60 mb-8">
              <span className="h-px w-12 bg-gold/40" />
              <span className="text-[10px] tracking-[0.4em] font-mono uppercase">Precision Chronometry</span>
            </div>
            <h2 className="text-[8rem] font-display font-light leading-none tracking-tighter text-white tabular-nums">
              {formatTime(time)}
            </h2>
            <div className="flex flex-col mt-4">
              <span className="text-2xl font-display text-gold/80 tracking-widest">{formatDate(time)}</span>
              <span className="text-xs font-mono text-white/20 mt-2 uppercase">Precision Node: Midrand Observatory</span>
            </div>
        </div>

        <div className="w-80 flex flex-col gap-6">
          <div className="bg-charcoal-elevated p-8 rounded-lg border border-white/5 flex-1 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gold/30" />
            
            <div className="text-gold mb-6">
              {weather ? getWeatherIcon(weather.code) : <Thermometer className="w-16 h-16 animate-pulse" />}
            </div>
            
            {weather ? (
              <>
                <div className="text-6xl font-extralight mb-2 text-white">
                  {Math.round(weather.temp)}<span className="text-3xl text-gold">°C</span>
                </div>
                <div className="text-lg font-medium text-gold uppercase tracking-widest mb-1">
                  {getWeatherLabel(weather.code)}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">HUMIDITY: 64% | WIND: 12KM/H</div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-gold/20 border-t-gold animate-spin" />
                <span className="text-[8px] font-mono text-white/20 tracking-widest">FETCHING DATA...</span>
              </div>
            )}

            <div className="w-full h-[1px] bg-white/10 my-8"></div>
            
            <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-4">Core Telemetry</div>
            <div className="flex items-center gap-3 w-full p-3 bg-black/40 rounded border border-white/5">
              <div className="w-10 h-10 bg-gold/10 rounded flex items-center justify-center border border-gold/20">
                <MapPin className="w-5 h-5 text-gold" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-white uppercase">Midrand Hub</div>
                <div className="text-[9px] text-gray-600 uppercase">Sector 2.4 - North Gateway</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

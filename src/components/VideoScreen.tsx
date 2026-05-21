import { useEffect, useRef } from 'react';

interface VideoScreenProps {
  onComplete: () => void;
}

export default function VideoScreen({ onComplete }: VideoScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
    }
  }, []);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-105" // Subtle zoom for immersion
        autoPlay
        muted
        playsInline
        onEnded={onComplete}
        onError={onComplete}
      >
        <source src="/wireframe.mp4" type="video/mp4" />
      </video>

      {/* Skip Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="absolute top-6 right-6 z-30 px-3 py-1 bg-gold/10 border border-gold/30 hover:bg-gold/20 text-gold font-mono text-[9px] md:text-[10px] tracking-widest uppercase rounded cursor-pointer transition-all"
      >
        Skip
      </button>

      {/* Interface Overlays */}
      <div className="absolute inset-0 pointer-events-none ring-[1px] ring-gold/20 inset-ring-inherit" />
      
      <div className="absolute top-10 left-10 z-20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-gold font-mono text-[10px] tracking-[0.5em] uppercase">
            Core System Parsing
          </span>
        </div>
        <div className="mt-2 h-px w-48 bg-gradient-to-r from-gold/50 to-transparent" />
        <div className="mt-4 flex gap-8">
            <div className="flex flex-col">
                <span className="text-[8px] text-white/30 uppercase tracking-widest">Buffer</span>
                <span className="text-[10px] text-white/60 font-mono">98.4%</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] text-white/30 uppercase tracking-widest">Sync</span>
                <span className="text-[10px] text-white/60 font-mono">STABLE</span>
            </div>
        </div>
      </div>

      <div className="absolute bottom-10 right-10 z-20 text-right flex flex-col items-end">
        <div className="flex gap-4 mb-4">
            <div className="h-6 w-px bg-white/10" />
            <div className="h-4 w-px bg-white/10" />
            <div className="h-8 w-px bg-gold/50" />
            <div className="h-5 w-px bg-white/10" />
        </div>
        <span className="text-white/20 font-mono text-[8px] uppercase tracking-widest">Optical Node 04_ZA</span>
      </div>
    </div>
  );
}


import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoScreenProps {
  onComplete: () => void;
}

export default function VideoScreen({ onComplete }: VideoScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlayingReverse, setIsPlayingReverse] = useState(false);
  const [playCount, setPlayCount] = useState(0);

  // Desired duration for each half (forward/reverse) to reach 1m total
  const DESIRED_HALF_DURATION = 30; 

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleMetadata = () => {
        // Calculate playback rate to make it 30s
        // rate = actual_duration / desired_duration
        const rate = video.duration / DESIRED_HALF_DURATION;
        video.playbackRate = Math.max(rate, 0.05); // Support very slow speeds
      };
      
      video.addEventListener('loadedmetadata', handleMetadata);
      // If already loaded
      if (video.duration) handleMetadata();
      
      return () => video.removeEventListener('loadedmetadata', handleMetadata);
    }
  }, []);

  // For reverse playback loop
  useEffect(() => {
    if (!isPlayingReverse) return;

    let frameId: number;
    let lastTime = performance.now();
    const video = videoRef.current;
    if (!video) return;

    // Fixed decrement rate per second
    const reverseRate = video.duration / DESIRED_HALF_DURATION;

    const reverseLoop = (now: number) => {
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      if (video) {
        const newTime = video.currentTime - (deltaTime * reverseRate);
        if (newTime <= 0) {
          video.currentTime = 0;
          setIsPlayingReverse(false);
          onComplete();
          return;
        }
        video.currentTime = newTime;
      }
      frameId = requestAnimationFrame(reverseLoop);
    };

    frameId = requestAnimationFrame(reverseLoop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlayingReverse, onComplete]);

  const handleVideoEnded = () => {
    if (playCount === 0) {
      setPlayCount(1);
      setIsPlayingReverse(true);
    }
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-105" // Subtle zoom for immersion
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnded}
      >
        <source src="/wireframe.mp4" type="video/mp4" />
      </video>

      {/* Interface Overlays */}
      <div className="absolute inset-0 pointer-events-none ring-[1px] ring-gold/20 inset-ring-inherit" />
      
      <div className="absolute top-10 left-10 z-20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-gold font-mono text-[10px] tracking-[0.5em] uppercase">
            {isPlayingReverse ? 'Neural Pattern Reverse' : 'Core System Parsing'}
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

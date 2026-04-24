// src/renderer/src/components/GlobalAudioPlayer.tsx
import { useState, useEffect, useRef } from 'react';

interface Track {
  url: string;
  title: string;
  volume: number;
  loop: boolean;
  isPlaying: boolean;
  restartTrigger: number;
}

function TrackItem({ track, updateTrack, removeTrack }: { track: Track, updateTrack: any, removeTrack: any }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = track.volume;
      audioRef.current.loop = track.loop;
      
      if (track.isPlaying) {
        audioRef.current.play().catch(e => {
          console.warn("Autoplay bloqueado:", e);
          updateTrack(track.url, { isPlaying: false });
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [track.isPlaying, track.volume, track.loop]);

  useEffect(() => {
    if (track.restartTrigger > 0 && audioRef.current) {
      audioRef.current.currentTime = 0;
      if (!track.isPlaying) updateTrack(track.url, { isPlaying: true });
    }
  }, [track.restartTrigger]);

  return (
    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 group hover:border-slate-600 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${track.isPlaying ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>🎵</div>
      <div className="flex-1 overflow-hidden">
        <p className={`text-xs font-bold truncate ${track.isPlaying ? 'text-slate-200' : 'text-slate-500'}`}>{track.title}</p>
        <div className="w-full bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
          {track.isPlaying && <div className="bg-blue-500 h-full w-full animate-[pulse_1s_ease-in-out_infinite]"></div>}
        </div>
      </div>
      <button onClick={() => updateTrack(track.url, { restartTrigger: Date.now() })} className="text-slate-500 hover:text-white transition" title="Reiniciar do zero">⏮</button>
      <button onClick={() => updateTrack(track.url, { isPlaying: !track.isPlaying })} className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition ${track.isPlaying ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
        {track.isPlaying ? '⏸' : '▶'}
      </button>
      <button onClick={() => removeTrack(track.url)} className="text-slate-600 hover:text-red-400 ml-1 transition" title="Remover do Mixer">✕</button>
      <audio ref={audioRef} src={track.url} onEnded={() => { if (!track.loop) updateTrack(track.url, { isPlaying: false }); }} />
    </div>
  );
}

export function GlobalAudioPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const MAX_TRACKS = 4;

  // 1. O PULSO & A COLINHA NA MEMÓRIA SÍNCRONA
  useEffect(() => {
    const playingUrls = tracks.filter(t => t.isPlaying).map(t => t.url);
    
    // 👇 A MÁGICA: Guarda na memória da janela para os módulos lerem ao nascer!
    (window as any).__globalAudioPlayingUrls = playingUrls;

    const interval = setInterval(() => {
      window.dispatchEvent(new CustomEvent('global-audio-status', { detail: { playingUrls } }));
    }, 500); 
    return () => clearInterval(interval);
  }, [tracks]);

  // 2. A CENTRAL DE EVENTOS
  useEffect(() => {
    const handleAdd = (e: Event) => {
      const { url, title, volume, loop, restart } = (e as CustomEvent).detail;
      setTracks(prev => {
        const existingTrack = prev.find(t => t.url === url);
        if (existingTrack) return prev.map(t => t.url === url ? { ...t, isPlaying: true, restartTrigger: restart ? Date.now() : t.restartTrigger, volume, loop } : t);
        const newTrack: Track = { url, title, volume, loop, isPlaying: true, restartTrigger: restart ? Date.now() : 0 };
        if (prev.length >= MAX_TRACKS) return [...prev.slice(1), newTrack]; 
        return [...prev, newTrack];
      });
    };

    const handlePause = (e: Event) => {
      const { url } = (e as CustomEvent).detail;
      setTracks(prev => prev.map(t => t.url === url ? { ...t, isPlaying: false } : t));
    };

    const handleUpdate = (e: Event) => {
      const { url, volume, loop } = (e as CustomEvent).detail;
      setTracks(prev => prev.map(t => t.url === url ? { ...t, volume, loop } : t));
    };

    // 👇 NOVA LÓGICA DO TOGGLE (A fonte da verdade) 👇
    const handleToggle = (e: Event) => {
      const { url, title, volume, loop } = (e as CustomEvent).detail;
      setTracks(prev => {
        const existingTrack = prev.find(t => t.url === url);
        if (existingTrack) return prev.map(t => t.url === url ? { ...t, isPlaying: !t.isPlaying } : t);
        const newTrack: Track = { url, title, volume, loop, isPlaying: true, restartTrigger: 0 };
        if (prev.length >= MAX_TRACKS) return [...prev.slice(1), newTrack];
        return [...prev, newTrack];
      });
    };

    window.addEventListener('add-global-track', handleAdd);
    window.addEventListener('pause-global-track', handlePause);
    window.addEventListener('update-global-track', handleUpdate);
    window.addEventListener('toggle-global-track', handleToggle);

    return () => {
      window.removeEventListener('add-global-track', handleAdd);
      window.removeEventListener('pause-global-track', handlePause);
      window.removeEventListener('update-global-track', handleUpdate);
      window.removeEventListener('toggle-global-track', handleToggle);
    };
  }, []);

  const updateTrack = (url: string, updates: Partial<Track>) => setTracks(prev => prev.map(t => t.url === url ? { ...t, ...updates } : t));
  const removeTrack = (url: string) => setTracks(prev => prev.filter(t => t.url !== url));

  if (tracks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 p-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-2 z-[999] w-80 animate-in slide-in-from-bottom-10 fade-in">
      <div className="flex justify-between items-center px-1 mb-1 border-b border-slate-800 pb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Mixer de Áudio
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{tracks.length}/{MAX_TRACKS}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tracks.map(track => <TrackItem key={track.url} track={track} updateTrack={updateTrack} removeTrack={removeTrack} />)}
      </div>
    </div>
  );
}
// src/renderer/src/core/audio/GlobalAudioPlayer.tsx
import { useState, useEffect, useRef } from 'react';
import { moduleEventBus } from '../events/moduleEventBus';

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
      
      {/* O motor de áudio fica aqui dentro, e agora NUNCA será desmontado! */}
      <audio ref={audioRef} src={track.url} onEnded={() => { if (!track.loop) updateTrack(track.url, { isPlaying: false }); }} />
    </div>
  );
}

export function GlobalAudioPlayer() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const MAX_TRACKS = 4;

  const [isMinimized, setIsMinimized] = useState(false);
  
  const [position, setPosition] = useState({ 
    x: window.innerWidth > 400 ? window.innerWidth - 350 : 20, 
    y: window.innerHeight > 300 ? window.innerHeight - 250 : 20 
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasDraggedOut, setHasDraggedOut] = useState(false); 
  
  const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);

  // --- NOVA LÓGICA DE MINIMIZAR ANCORADA NA DIREITA ---
  // w-80 = 320px | w-14 = 56px | Diferença = 264px
  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(true);
    setPosition(prev => ({ ...prev, x: prev.x + 264 }));
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasDraggedOut) {
      setIsMinimized(false);
      // O Math.max garante que, se estiver muito perto da borda esquerda, não vai vazar da tela
      setPosition(prev => ({ ...prev, x: Math.max(0, prev.x - 264) }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDraggedOut(false);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setHasDraggedOut(true);

      const maxX = window.innerWidth - (isMinimized ? 56 : 320); 
      const maxY = window.innerHeight - (isMinimized ? 56 : 100);

      setPosition({ 
        x: Math.max(0, Math.min(maxX, dragRef.current.initialX + dx)), 
        y: Math.max(0, Math.min(maxY, dragRef.current.initialY + dy)) 
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - (isMinimized ? 56 : 320)),
        y: Math.min(prev.y, window.innerHeight - (isMinimized ? 56 : 100))
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized]);


  // 1. O PULSO & A COLINHA NA MEMÓRIA SÍNCRONA
  useEffect(() => {
    const playingUrls = tracks.filter(t => t.isPlaying).map(t => t.url);
    (window as any).__globalAudioPlayingUrls = playingUrls;

    const interval = setInterval(() => {
      moduleEventBus.emitGlobalAudioStatus({ playingUrls });
    }, 500);

    return () => clearInterval(interval);
  }, [tracks]);

  // 2. A CENTRAL DE EVENTOS
  useEffect(() => {
    const offAdd = moduleEventBus.onAddGlobalTrack(({ url, title, volume, loop, restart }) => {
      setTracks(prev => {
        const existingTrack = prev.find(t => t.url === url);

        if (existingTrack) {
          return prev.map(t =>
            t.url === url
              ? {
                  ...t,
                  isPlaying: true,
                  restartTrigger: restart ? Date.now() : t.restartTrigger,
                  volume: volume ?? t.volume,
                  loop: loop ?? t.loop
                }
              : t
          );
        }

        const newTrack: Track = {
          url,
          title: title || 'Trilha',
          volume: volume ?? 1,
          loop: loop ?? true,
          isPlaying: true,
          restartTrigger: restart ? Date.now() : 0
        };

        if (prev.length >= MAX_TRACKS) return [...prev.slice(1), newTrack];
        return [...prev, newTrack];
      });
    });

    const offPause = moduleEventBus.onPauseGlobalTrack(({ url }) => {
      setTracks(prev =>
        prev.map(t => t.url === url ? { ...t, isPlaying: false } : t)
      );
    });

    const offUpdate = moduleEventBus.onUpdateGlobalTrack(({ url, volume, loop }) => {
      setTracks(prev =>
        prev.map(t =>
          t.url === url
            ? {
                ...t,
                volume: volume ?? t.volume,
                loop: loop ?? t.loop
              }
            : t
        )
      );
    });

    const offToggle = moduleEventBus.onToggleGlobalTrack(({ url, title, volume, loop }) => {
      setTracks(prev => {
        const existingTrack = prev.find(t => t.url === url);

        if (existingTrack) {
          return prev.map(t =>
            t.url === url ? { ...t, isPlaying: !t.isPlaying } : t
          );
        }

        const newTrack: Track = {
          url,
          title: title || 'Trilha',
          volume: volume ?? 1,
          loop: loop ?? true,
          isPlaying: true,
          restartTrigger: 0
        };

        if (prev.length >= MAX_TRACKS) return [...prev.slice(1), newTrack];
        return [...prev, newTrack];
      });
    });

    return () => {
      offAdd();
      offPause();
      offUpdate();
      offToggle();
    };
  }, []);

  const updateTrack = (url: string, updates: Partial<Track>) => setTracks(prev => prev.map(t => t.url === url ? { ...t, ...updates } : t));
  const removeTrack = (url: string) => setTracks(prev => prev.filter(t => t.url !== url));

  if (tracks.length === 0) return null;

  return (
    <div 
      className={`fixed z-[999] transition-opacity duration-200 ${isDragging ? 'opacity-90' : 'opacity-100'}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* --- MODO MINIMIZADO (Oculto via CSS quando expandido) --- */}
      <button
        onMouseDown={handleMouseDown}
        onClick={handleExpand}
        className={`w-14 h-14 bg-slate-900 border-2 border-emerald-500 rounded-full shadow-[0_5px_15px_rgba(16,185,129,0.3)] items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-800 transition-colors relative group ${isMinimized ? 'flex animate-in zoom-in-95' : 'hidden'}`}
        title="Abrir Mixer de Áudio"
      >
        <span className="text-2xl relative z-10">🎵</span>
        {tracks.some(t => t.isPlaying) && (
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30"></span>
        )}
        <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-slate-900">
          {tracks.length}
        </span>
      </button>

      {/* --- MODO EXPANDIDO (Oculto via CSS quando minimizado, mantendo o áudio vivo!) --- */}
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex-col gap-2 w-80 overflow-hidden ${!isMinimized ? 'flex animate-in fade-in' : 'hidden'}`}>
        
        <div 
          onMouseDown={handleMouseDown}
          className="flex justify-between items-center px-4 py-2 bg-slate-800/80 cursor-grab active:cursor-grabbing border-b border-slate-800 select-none group"
          title="Clique e segure para arrastar"
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
            <span className="opacity-50 group-hover:opacity-100">⋮⋮</span> Mixer de Áudio
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-mono">{tracks.length}/{MAX_TRACKS}</span>
            <button 
              onClick={handleMinimize}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition cursor-pointer"
              title="Minimizar"
            >
              <span className="mb-2 font-bold text-lg">_</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 p-3 pt-1">
          {tracks.map(track => <TrackItem key={track.url} track={track} updateTrack={updateTrack} removeTrack={removeTrack} />)}
        </div>
      </div>
    </div>
  );
}
// src/renderer/src/components/AudioModule.tsx
import { AudioModule as AudioModuleType, RpgModule } from '../types/rpg';
import { useState, useRef, useEffect } from 'react';

interface Props {
  moduleData: AudioModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function AudioModule({ moduleData, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Referência para arquivos locais
  const audioRef = useRef<HTMLAudioElement>(null);
  // NOVA: Referência para o YouTube
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const url = moduleData.data.urlOrPath || "";
  
  // Lógica simples para descobrir se é YouTube ou MP3 Local
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

 // Efeito para sincronizar o Volume e o Play/Pause
  useEffect(() => {
    // 1. Controle do HTML5 (Arquivos Locais)
    if (audioRef.current && !isYouTube) {
      audioRef.current.volume = moduleData.data.volume; // HTML5 usa de 0.0 a 1.0
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Erro ao tocar local:", e));
      } else {
        audioRef.current.pause();
      }
    }

    // 2. Controle do YouTube (Via Mensagem para o Iframe)
    if (iframeRef.current && isYouTube) {
      const targetWindow = iframeRef.current.contentWindow;
      if (targetWindow) {
        const youtubeVolume = Math.round(moduleData.data.volume * 100);

        // 1º Dá o Play/Pause
        targetWindow.postMessage(JSON.stringify({
          event: 'command',
          func: isPlaying ? 'playVideo' : 'pauseVideo',
          args: []
        }), '*');

        // 2º Força o volume logo em seguida
        targetWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'setVolume',
          args: [youtubeVolume]
        }), '*');
      } 
    }
  }, [isPlaying, moduleData.data.volume, url, isYouTube]);

  // Função para extrair o ID do vídeo do YouTube
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!moduleData.isActive) return null;

  return (
    <div className="border border-slate-700 bg-slate-800 p-4 rounded-md shadow-md mb-4 focus-within:border-emerald-500 focus-within:shadow-emerald-900/20">
      
      {/* --- CABEÇALHO E CONTROLES DE EDIÇÃO (Iguais aos de antes) --- */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-blue-400">🎵</span>
          <input 
            type="text"
            value={moduleData.name}
            onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
            className="bg-transparent text-blue-400 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-blue-800"
            placeholder="Nome da Trilha (Ex: Música de Batalha)"
          />
        </div>
        {/* BOTÃO DE MINIMIZAR AQUI */}
        <button onClick={() => onUpdate(moduleData.id, { isMinimized: !moduleData.isMinimized })} className="text-slate-500 hover:text-blue-400 px-2 py-1 rounded transition text-sm font-bold">
          {moduleData.isMinimized ? '▼' : '▲'}
        </button>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="text-slate-400 hover:text-white text-sm bg-slate-700 px-2 py-1 rounded"
        >
          {isEditing ? 'Ocultar Configurações' : '⚙️ Configurar'}
        </button>
      </div>
      {/* --- CONTEÚDO VISUAL (ESCONDE QUANDO MINIMIZADO) --- */}
      {!moduleData.isMinimized && (
        <>
          {isEditing && (
            <div className="bg-slate-900 p-3 rounded mb-3 border border-slate-700 space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">URL (YouTube) ou Caminho Local</label>
                <input 
                  type="text"
                  value={moduleData.data.urlOrPath}
                  onChange={(e) => onUpdate(moduleData.id, { 
                    data: { ...moduleData.data, urlOrPath: e.target.value } 
                  })}
                  className="w-full bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Ex: C:/musicas/batalha.mp3 ou https://youtube..."
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Volume: {Math.round(moduleData.data.volume * 100)}%</label>
                  <input 
                    type="range" min="0" max="1" step="0.05"
                    value={moduleData.data.volume}
                    onChange={(e) => onUpdate(moduleData.id, { 
                      data: { ...moduleData.data, volume: parseFloat(e.target.value) } 
                    })}
                    className="w-full accent-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={moduleData.data.loop}
                    onChange={(e) => onUpdate(moduleData.id, { 
                      data: { ...moduleData.data, loop: e.target.checked } 
                    })}
                    className="accent-blue-500"
                  />
                  Repetir (Loop)
                </label>
              </div>
            </div>
          )}

          {/* --- VISÃO DO MESTRE (O Play) --- */}
          <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!url}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition
                ${isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'} 
                disabled:bg-slate-700 disabled:cursor-not-allowed`}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs text-slate-400 truncate">
                {url ? url : 'Nenhuma fonte definida.'}
              </p>
            </div>
          </div>
        </>
      )}

          {/* --- O MOTOR NATIVO INVISÍVEL --- */}
          <div className="hidden">
            {isYouTube && getYouTubeId(url) ? (
              /* Motor 1: Iframe sempre montado. O autoplay inicial é 0. */
              <iframe 
                ref={iframeRef} 
                width="0" height="0" 
                src={`https://www.youtube.com/embed/${getYouTubeId(url)}?enablejsapi=1&autoplay=0&loop=${moduleData.data.loop ? 1 : 0}&playlist=${getYouTubeId(url)}`} 
                allow="autoplay" 
                onLoad={() => {
                  // Assim que o iframe carrega, injeta o volume correto antes mesmo de tocar
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(JSON.stringify({
                      event: 'command',
                      func: 'setVolume',
                      args: [Math.round(moduleData.data.volume * 100)]
                    }), '*');
                  }
                }}
              />
            ) : !isYouTube && url ? (
              /* Motor 2: Áudio Nativo para arquivos Locais (MP3, WAV) */
              <audio 
                ref={audioRef} 
                src={url} 
                loop={moduleData.data.loop} 
              />
            ) : null}
          </div>

    </div>
  );
}
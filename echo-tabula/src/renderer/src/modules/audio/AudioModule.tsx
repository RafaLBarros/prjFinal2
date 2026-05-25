// src/renderer/src/components/AudioModule.tsx
import { AudioModule as AudioModuleType, RpgModule } from '../../types/rpg';
import { useState, useEffect } from 'react';
import { moduleEventBus } from '../../core/events/moduleEventBus';

interface Props {
  moduleData: AudioModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function AudioModule({ moduleData, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const url = moduleData.data.urlOrPath || "";

  // 👇 LÊ A COLINHA NA INICIALIZAÇÃO! (Fim da amnésia visual) 👇
  const [isGloballyPlaying, setIsGloballyPlaying] = useState(() => {
    const playingUrls = (window as any).__globalAudioPlayingUrls || [];
    return playingUrls.includes(url);
  });

  useEffect(() => {
    return moduleEventBus.onGlobalAudioStatus(({ playingUrls }) => {
      setIsGloballyPlaying(playingUrls.includes(url));
    });
  }, [url]);

  useEffect(() => {
    if (url) {
      moduleEventBus.updateGlobalTrack({
        url,
        volume: moduleData.data.volume,
        loop: moduleData.data.loop
      });
    }
  }, [moduleData.data.volume, moduleData.data.loop, url]);

  // --- FUNÇÕES DE CONTROLE REMOTO ---
  const handlePlayToggle = () => {
    moduleEventBus.toggleGlobalTrack({
      url,
      title: moduleData.name,
      volume: moduleData.data.volume,
      loop: moduleData.data.loop
    });
  };

  const handleRestart = () => {
    moduleEventBus.addGlobalTrack({
      url,
      title: moduleData.name,
      volume: moduleData.data.volume,
      loop: moduleData.data.loop,
      restart: true
    });
  };

  useEffect(() => {
    return moduleEventBus.onModuleAction(({ targetId, action }) => {
      if (targetId !== moduleData.id) return;

      if (action === 'play') {
        moduleEventBus.addGlobalTrack({
          url,
          title: moduleData.name,
          volume: moduleData.data.volume,
          loop: moduleData.data.loop
        });
      }

      if (action === 'pause') {
        moduleEventBus.pauseGlobalTrack({ url });
      }

      if (action === 'toggle') handlePlayToggle();
      if (action === 'restart') handleRestart();
    });
  }, [moduleData.id, url, moduleData.name, moduleData.data.volume, moduleData.data.loop]);

  const importAudio = async () => {
    try {
      setIsLoading(true);
      const result = await window.api.importAsset();

      if (result?.success && typeof result.fileName === 'string') {
        onUpdate(moduleData.id, {
          data: {
            ...moduleData.data,
            urlOrPath: `rpg://asset/${encodeURIComponent(result.fileName)}`
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromVault = async () => {
    try {
      setIsLoading(true);
      const result = await window.api.selectFromVault();

      if (result?.success && typeof result.fileName === 'string') {
        onUpdate(moduleData.id, {
          data: {
            ...moduleData.data,
            urlOrPath: `rpg://asset/${encodeURIComponent(result.fileName)}`
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!moduleData.isActive) return null;

  return (
    <div id={`module-${moduleData.id}`} className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-blue-500 focus-within:shadow-blue-900/20">
      <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-blue-400">🎵</span>
          <input type="text" value={moduleData.name} onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })} className="bg-transparent text-blue-400 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-blue-800" placeholder="Nome da Trilha" />
        </div>
        <button onClick={() => onUpdate(moduleData.id, { isMinimized: !moduleData.isMinimized })} className="text-slate-500 hover:text-blue-400 px-2 py-1 rounded text-sm font-bold">{moduleData.isMinimized ? '▼' : '▲'}</button>
        <button onClick={() => setIsEditing(!isEditing)} className="text-slate-400 hover:text-white text-sm bg-slate-700 px-2 py-1 rounded ml-2">{isEditing ? 'Ocultar Config' : '⚙️ Configurar'}</button>
      </div>

      {!moduleData.isMinimized && (
        <div className="p-4 flex flex-col gap-3">
          {isEditing && (
            <div className="bg-slate-900 p-4 rounded mb-3 border border-slate-700 space-y-4">
              <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Cofre de Mídia</label>
                <div className="flex gap-2">
                  <button onClick={importAudio} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-2 px-3 rounded shadow transition">📥 Importar Novo</button>
                  <button onClick={selectFromVault} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 px-3 rounded border border-slate-600 transition">🗃️ Escolher do Cofre</button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Caminho ou URL</label>
                <input type="text" value={url} onChange={(e) => onUpdate(moduleData.id, { data: { ...moduleData.data, urlOrPath: e.target.value } })} className="w-full bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Volume: {Math.round(moduleData.data.volume * 100)}%</label>
                  <input type="range" min="0" max="1" step="0.05" value={moduleData.data.volume} onChange={(e) => onUpdate(moduleData.id, { data: { ...moduleData.data, volume: parseFloat(e.target.value) } })} className="w-full accent-blue-500" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={moduleData.data.loop} onChange={(e) => onUpdate(moduleData.id, { data: { ...moduleData.data, loop: e.target.checked } })} className="accent-blue-500" /> Loop
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-800 shadow-inner">
            <button onClick={handleRestart} disabled={!url} className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition flex-shrink-0 bg-slate-700 hover:bg-blue-600 text-white disabled:bg-slate-800 disabled:opacity-50 shadow" title="Reiniciar áudio do zero">⏮</button>
            <button 
              onClick={handlePlayToggle} disabled={!url}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg transition flex-shrink-0
                ${isGloballyPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'} 
                disabled:bg-slate-700 disabled:opacity-50`}
            >
              {isLoading && isGloballyPlaying ? '⏳' : isGloballyPlaying ? '⏸' : '▶'}
            </button>
            <div className="flex-1 overflow-hidden pl-2">
              <p className="text-xs text-slate-400 truncate">{url ? url : 'Nenhuma mídia.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
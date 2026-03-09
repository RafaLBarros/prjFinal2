// src/renderer/src/components/AudioModule.tsx
import { AudioModule as AudioModuleType, RpgModule } from '../types/rpg';

interface Props {
  moduleData: AudioModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function AudioModule({ moduleData, onUpdate }: Props) {
  if (!moduleData.isActive) return null;

  return (
    <div className="border border-slate-700 bg-slate-800 p-4 rounded-md shadow-md mb-4 flex justify-between items-center">
      <div>
        <input 
          type="text"
          value={moduleData.name}
          onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
          className="bg-transparent text-emerald-400 font-bold focus:outline-none focus:bg-slate-700 px-2 py-1 rounded w-full transition"
          placeholder="Nome do Módulo..."
        />
        <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">
          Fonte: {moduleData.data.urlOrPath}
        </p>
      </div>
      
      {/* Um botão falso por enquanto, implementaremos o react-player na Fase 3 */}
      <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 transition">
        ▶ Play (Vol: {moduleData.data.volume * 100}%)
      </button>
    </div>
  );
}
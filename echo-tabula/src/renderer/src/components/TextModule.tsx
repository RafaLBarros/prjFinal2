// src/renderer/src/components/TextModule.tsx
import { TextModule as TextModuleType, RpgModule } from '../types/rpg';

interface Props {
  moduleData: TextModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function TextModule({ moduleData, onUpdate }: Props) {
  if (!moduleData.isActive) return null;

  return (
    <div className="border border-slate-700 bg-slate-800 p-4 rounded-md shadow-md">
      
      {/* O NOME DO MÓDULO AGORA É EDITÁVEL */}
      <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
        <span className="text-emerald-400">📝</span>
        <input 
          type="text"
          value={moduleData.name}
          onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
          className="bg-transparent text-emerald-400 font-bold focus:outline-none focus:bg-slate-700 px-2 py-1 rounded w-full transition"
          placeholder="Nome do Módulo..."
        />
      </div>

      {/* O CONTEÚDO TAMBÉM ATUALIZA O ESTADO GLOBAL */}
      <textarea 
        className="w-full h-32 bg-slate-900 text-slate-200 p-3 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none resize-none"
        value={moduleData.data.content}
        onChange={(e) => onUpdate(moduleData.id, { 
          data: { ...moduleData.data, content: e.target.value } 
        })}
        placeholder="Escreva suas notas aqui..."
      />
    </div>
  );
}
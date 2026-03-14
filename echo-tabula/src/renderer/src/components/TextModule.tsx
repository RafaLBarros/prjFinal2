// src/renderer/src/components/TextModule.tsx
import { TextModule as TextModuleType, RpgModule } from '../types/rpg';
import MDEditor from '@uiw/react-md-editor';

interface Props {
  moduleData: TextModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function TextModule({ moduleData, onUpdate }: Props) {
  if (!moduleData.isActive) return null;

  return (
    // O data-color-mode="dark" força o editor a combinar com o nosso tema!
    <div className="border border-slate-700 bg-slate-900 rounded-md shadow-md mb-4 overflow-hidden" data-color-mode="dark">
      
      {/* --- CABEÇALHO DO MÓDULO --- */}
      <div className="flex items-center gap-2 p-3 bg-slate-800 border-b border-slate-700">
        <span className="text-emerald-400">📝</span>
        <input 
          type="text"
          value={moduleData.name}
          onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
          className="bg-transparent text-emerald-400 font-bold focus:outline-none focus:bg-slate-700 px-2 py-1 rounded w-full transition"
          placeholder="Título da Nota (Ex: Ficha do Boss)"
        />
      </div>

      {/* --- EDITOR MARKDOWN ROBUSTO --- */}
      <div className="p-2">
        <MDEditor
          value={moduleData.data.content}
          onChange={(value) => onUpdate(moduleData.id, { 
            data: { ...moduleData.data, content: value || "" } 
          })}
          preview="live" // Mostra o código de um lado e o resultado bonito do outro
          height={300}   // Altura padrão
          visibleDragbar={false} // Remove a barrinha de arrastar embaixo para ficar mais limpo
          style={{ backgroundColor: 'transparent', border: 'none' }}
        />
      </div>

    </div>
  );
}
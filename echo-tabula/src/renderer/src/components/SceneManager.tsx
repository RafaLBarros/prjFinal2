// src/renderer/src/components/SceneManager.tsx
import { CampaignNode, RpgModule, TextModule as TextType, AudioModule as AudioType, PdfCropModule as PdfType } from '../types/rpg';
import { TextModule } from './TextModule';
import { AudioModule } from './AudioModule';
import { PdfModule } from './PdfModule';

interface Props {
  scene: CampaignNode;
  onUpdateModules: (sceneId: string, newModules: RpgModule[]) => void;
}

export function SceneManager({ scene, onUpdateModules }: Props) {
  // Garante que a cena sempre tenha um array de módulos para trabalharmos
  const modules = scene.modules || [];

  // --- FUNÇÕES DE CRUD DOS MÓDULOS ---

  // 1. Atualiza um módulo específico (Repassado para os componentes filhos)
  const handleUpdateModule = (moduleId: string, updatedFields: Partial<RpgModule>) => {
    const newModules = modules.map(mod => 
      mod.id === moduleId ? { ...mod, ...updatedFields } as RpgModule : mod
    );
    onUpdateModules(scene.id, newModules);
  };

  // 2. Remove um módulo da tela
  const handleDeleteModule = (moduleId: string) => {
    const newModules = modules.filter(mod => mod.id !== moduleId);
    onUpdateModules(scene.id, newModules);
  };

  // 3. Adiciona um módulo novinho em folha
  const handleAddModule = (type: RpgModule['type']) => {
    const newId = Math.random().toString(36).substr(2, 9);
    let newModule: RpgModule;

    // Cria a estrutura padrão dependendo do tipo que o Mestre clicou
    if (type === 'text') {
      newModule = { id: newId, type: 'text', name: 'Nova Anotação', isActive: true, data: { content: '<p>Comece a digitar...</p>' } } as TextType;
    } else if (type === 'audio') {
      newModule = { id: newId, type: 'audio', name: 'Nova Trilha Sonora', isActive: true, data: { urlOrPath: '', volume: 0.5, loop: true } } as AudioType;
    } else {
      newModule = { id: newId, type: 'pdf_crop', name: 'Novo Manuscrito', isActive: true, data: { filePath: '', page: 1 } } as PdfType;
    }

    onUpdateModules(scene.id, [...modules, newModule]);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-6 relative">
      
      {/* CABEÇALHO DA CENA */}
      <div className="mb-8 border-b border-slate-700/50 pb-4">
        <h2 className="text-3xl font-bold text-slate-200">{scene.name}</h2>
        <p className="text-slate-500 text-sm mt-1">Configure os elementos desta cena.</p>
      </div>

      {/* ÁREA DE MÓDULOS RENDERIZADOS */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 pb-32">
        {modules.length === 0 ? (
          <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-700 rounded-xl">
            <p>O palco está vazio.</p>
            <p className="text-sm mt-2">Adicione seu primeiro módulo usando os botões abaixo.</p>
          </div>
        ) : (
          modules.map(mod => (
            <div key={mod.id} className="relative group">
              {/* Renderiza o Componente correto baseado no tipo */}
              {mod.type === 'text' && <TextModule moduleData={mod as TextType} onUpdate={handleUpdateModule} />}
              {mod.type === 'audio' && <AudioModule moduleData={mod as AudioType} onUpdate={handleUpdateModule} />}
              {mod.type === 'pdf_crop' && <PdfModule moduleData={mod as PdfType} onUpdate={handleUpdateModule} />}
              
              {/* Botão flutuante de deletar módulo (Aparece ao passar o mouse) */}
              <button 
                onClick={() => handleDeleteModule(mod.id)}
                className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Remover Módulo"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* BARRA INFERIOR: ADICIONAR MÓDULOS */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-slate-600 p-2 rounded-2xl shadow-2xl flex gap-2">
        <button onClick={() => handleAddModule('text')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700 rounded-xl transition text-emerald-400 font-medium">
          <span className="text-xl">📝</span> Texto
        </button>
        <div className="w-px bg-slate-700 my-2"></div>
        <button onClick={() => handleAddModule('audio')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700 rounded-xl transition text-blue-400 font-medium">
          <span className="text-xl">🎵</span> Áudio
        </button>
        <div className="w-px bg-slate-700 my-2"></div>
        <button onClick={() => handleAddModule('pdf_crop')} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700 rounded-xl transition text-red-400 font-medium">
          <span className="text-xl">📕</span> Livro/PDF
        </button>
      </div>

    </div>
  );
}
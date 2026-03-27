// src/renderer/src/components/SceneManager.tsx
import { CampaignNode, RpgModule, TextModule as TextType, AudioModule as AudioType, PdfCropModule as PdfType } from '../types/rpg';
import { TextModule } from './TextModule';
import { AudioModule } from './AudioModule';
import { PdfModule } from './PdfModule';
import { useState } from 'react';

interface Props {
  scene: CampaignNode;
  onUpdateModules: (sceneId: string, newModules: RpgModule[]) => void;
  // NOVA FUNÇÃO AQUI:
  onRenameScene: (sceneId: string, newName: string) => void;
}

export function SceneManager({ scene, onUpdateModules, onRenameScene }: Props) {
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
      newModule = { id: newId, type: 'text', name: 'Nova Anotação', isActive: true, data: { content: '' } } as TextType;
    } else if (type === 'audio') {
      newModule = { id: newId, type: 'audio', name: 'Nova Trilha Sonora', isActive: true, data: { urlOrPath: '', volume: 0.5, loop: true } } as AudioType;
    } else {
      newModule = { id: newId, type: 'pdf_crop', name: 'Novo Manuscrito', isActive: true, data: { filePath: '', page: 1 } } as PdfType;
    }

    onUpdateModules(scene.id, [...modules, newModule]);
  };

  // --- ESTADOS DO DRAG & DROP ---
  const [draggableModuleId, setDraggableModuleId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // --- NOVA FUNÇÃO: REORDENAR MÓDULOS ---
  const handleReorderModules = (draggedId: string, targetId: string, position: 'before' | 'after') => {
    if (draggedId === targetId) return; // Não faz nada se soltar no mesmo lugar

    const oldIndex = modules.findIndex(m => m.id === draggedId);
    if (oldIndex === -1) return;

    const newModules = [...modules];
    // 1. Arranca o módulo da posição original
    const [draggedItem] = newModules.splice(oldIndex, 1); 

    // 2. Descobre qual é a nova posição do alvo (já que o array encolheu)
    const newTargetIndex = newModules.findIndex(m => m.id === targetId);
    
    // 3. Costura o módulo no lugar novo
    if (position === 'before') {
      newModules.splice(newTargetIndex, 0, draggedItem);
    } else {
      newModules.splice(newTargetIndex + 1, 0, draggedItem);
    }

    onUpdateModules(scene.id, newModules);
  };

return (
    // 1. Mudamos o max-w-4xl para limites expansivos e aumentamos o padding lateral (px-8 lg:px-16)
    <div className="flex flex-col h-full w-full max-w-6xl 2xl:max-w-7xl mx-auto px-8 lg:px-16 py-8 relative">
      
      {/* CABEÇALHO DA CENA */}
      <div className="mb-8 border-b border-slate-700/50 pb-4 shrink-0 group">
        <input
          type="text"
          value={scene.name}
          onChange={(e) => onRenameScene(scene.id, e.target.value)}
          className="w-full bg-transparent text-4xl font-bold text-slate-200 tracking-wide outline-none border-b-2 border-transparent focus:border-emerald-500 transition-colors placeholder:text-slate-700"
          placeholder="Nome da Cena..."
        />
        <p className="text-slate-500 text-base mt-2">Configure os elementos desta cena.</p>
      </div>

      {/* ÁREA DE MÓDULOS RENDERIZADOS */}
      <div className="flex-1 overflow-y-auto pt-6 pl-10 lg:pl-16 pr-4 lg:pr-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 pb-32">
        {modules.length === 0 ? (
          <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-700 rounded-xl transition-all hover:border-slate-600 hover:bg-slate-800/20">
            <p className="text-lg">O palco está vazio.</p>
            <p className="text-sm mt-2">Adicione seu primeiro módulo usando os botões abaixo.</p>
          </div>
        ) : (
          modules.map(mod => (
            <div 
              key={mod.id} 
              // A MÁGICA: O módulo só é arrastável se o mouse estiver em cima da alça!
              draggable={draggableModuleId === mod.id}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('moduleId', mod.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Calcula se o mouse está na metade de cima ou de baixo do módulo
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                if (y < rect.height / 2) {
                  setDropPosition('before');
                } else {
                  setDropPosition('after');
                }
                setDropTargetId(mod.id);
              }}
              onDragLeave={() => {
                setDropTargetId(null);
                setDropPosition(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const draggedId = e.dataTransfer.getData('moduleId');
                if (draggedId && draggedId !== mod.id && dropPosition) {
                  handleReorderModules(draggedId, mod.id, dropPosition);
                }
                // Limpa os estados visuais após soltar
                setDropTargetId(null);
                setDropPosition(null);
                setDraggableModuleId(null);
              }}
              className={`relative group transition-all duration-300 rounded-lg -ml-10 lg:-ml-16 ${
                // Feedback visual de onde o módulo vai cair (Sombra verde em cima ou embaixo)
                dropTargetId === mod.id && dropPosition === 'before' ? 'shadow-[0_-4px_0_0_#10b981] mt-4' : ''
              } ${
                dropTargetId === mod.id && dropPosition === 'after' ? 'shadow-[0_4px_0_0_#10b981] mb-4' : ''
              } hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10`}
            >
              
              {/* --- A ALÇA DE ARRASTAR (GRIP) --- */}
              <div 
                onMouseEnter={() => setDraggableModuleId(mod.id)}
                onMouseLeave={() => setDraggableModuleId(null)}
                className="absolute -left-6 lg:-left-10 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-2 text-slate-600 hover:text-emerald-400 transition-opacity flex flex-col gap-[3px]"
                title="Segure para reordenar"
              >
                {/* Desenhando os pontinhos do Grip */}
                <div className="w-1.5 h-1.5 bg-current rounded-full" />
                <div className="w-1.5 h-1.5 bg-current rounded-full" />
                <div className="w-1.5 h-1.5 bg-current rounded-full" />
                <div className="w-1.5 h-1.5 bg-current rounded-full" />
              </div>

              {/* Renderiza o Componente correto baseado no tipo */}
              {mod.type === 'text' && <TextModule moduleData={mod as TextType} onUpdate={handleUpdateModule} />}
              {mod.type === 'audio' && <AudioModule moduleData={mod as AudioType} onUpdate={handleUpdateModule} />}
              {mod.type === 'pdf_crop' && <PdfModule moduleData={mod as PdfType} onUpdate={handleUpdateModule} />}
              
              {/* Botão flutuante de deletar módulo */}
              <button 
                onClick={() => handleDeleteModule(mod.id)}
                className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100 flex items-center justify-center font-bold"
                title="Remover Módulo"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* BARRA INFERIOR: ADICIONAR MÓDULOS */}
      {/* 3. Aumentamos levemente o tamanho da barra inferior para combinar com a tela cheia */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur border border-slate-600 p-2.5 rounded-2xl shadow-2xl flex gap-3 z-50 transition-transform hover:scale-105">
        <button onClick={() => handleAddModule('text')} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-700 rounded-xl transition text-emerald-400 font-medium text-sm">
          <span className="text-xl">📝</span> Texto
        </button>
        <div className="w-px bg-slate-700 my-2"></div>
        <button onClick={() => handleAddModule('audio')} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-700 rounded-xl transition text-blue-400 font-medium text-sm">
          <span className="text-xl">🎵</span> Áudio
        </button>
        <div className="w-px bg-slate-700 my-2"></div>
        <button onClick={() => handleAddModule('pdf_crop')} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-700 rounded-xl transition text-red-400 font-medium text-sm">
          <span className="text-xl">📕</span> Livro/PDF
        </button>
      </div>

    </div>
  );
}
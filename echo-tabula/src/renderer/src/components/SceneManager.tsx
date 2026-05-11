// src/renderer/src/components/SceneManager.tsx
import { CampaignNode, RpgModule, TextModule as TextType, AudioModule as AudioType, PdfCropModule as PdfType, EncounterModule as EncounterType, DiceRollerModule as DiceRollerType} from '../types/rpg';
import { TextModule } from './TextModule';
import { AudioModule } from './AudioModule';
import { PdfModule } from './PdfModule';
import { EncounterModule } from './EncounterModule';
import { DiceRollerModule } from './DiceRollerModule';
import { useState, useRef } from 'react';

interface Props {
  scene: CampaignNode;
  campaignNodes: CampaignNode[]; // 👈 A NOVA PROPRIEDADE AQUI
  onUpdateModules: (sceneId: string, newModules: RpgModule[]) => void;
  onRenameScene: (sceneId: string, newName: string) => void;
}

export function SceneManager({ scene, campaignNodes, onUpdateModules, onRenameScene }: Props) {
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
    } else if (type === 'pdf_crop'){
      newModule = { id: newId, type: 'pdf_crop', name: 'Novo Manuscrito', isActive: true, data: { filePath: '', page: 1 } } as PdfType;
    }else if (type === 'encounter') {
      newModule = { id: newId, type: 'encounter', name: 'Novo Combate', isActive: true, data: { round: 1, currentTurnId: null, combatants: [] } } as EncounterType;
    } else {
      newModule = { id: newId, type: 'dice_roller', name: 'Mesa de Dados', isActive: true, data: { presets: [] } } as DiceRollerType;
    }
    onUpdateModules(scene.id, [...modules, newModule]);
  };

  // --- ESTADOS DO DRAG & DROP ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggableModuleId, setDraggableModuleId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);

  // 👇 NOVOS ESTADOS PARA EXCLUSÃO INTELIGENTE
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);

  // 👇 NOVA FUNÇÃO: Avalia se o módulo tem dados preciosos
  const hasValuableContent = (mod: RpgModule) => {
    if (mod.type === 'text') return mod.data.content !== '' && mod.data.content !== '<p></p>';
    if (mod.type === 'audio') return !!mod.data.urlOrPath;
    if (mod.type === 'pdf_crop') return !!mod.data.filePath;
    if (mod.type === 'encounter') return mod.data.combatants && mod.data.combatants.length > 0;
    if (mod.type === 'dice_roller') return mod.data.presets && mod.data.presets.length > 0;
    return false;
  };
  

  // --- NOVA FUNÇÃO: AUTO-SCROLL NAS BORDAS ---
  const handleAutoScroll = (clientY: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Pega as medidas exatas da div na tela do monitor
    const { top, bottom } = container.getBoundingClientRect();
    const threshold = 80; // A zona de ativação (80px perto da borda)
    const scrollSpeed = 8; // Velocidade da rolagem (aumente se quiser mais rápido)

    if (clientY < top + threshold) {
      container.scrollTop -= scrollSpeed; // Rola para cima
    } else if (clientY > bottom - threshold) {
      container.scrollTop += scrollSpeed; // Rola para baixo
    }
  };


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
      <div 
        ref={scrollContainerRef} // <-- A REF PLUGADA AQUI
        onDragOver={(e) => {
          e.preventDefault();
          if (draggableModuleId) handleAutoScroll(e.clientY); // Escuta o scroll no fundo vazio
        }}
        className="flex-1 overflow-y-auto pt-6 pl-10 lg:pl-16 pr-4 lg:pr-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 pb-32"
      >
        {modules.length === 0 ? (
          <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-700 rounded-xl transition-all hover:border-slate-600 hover:bg-slate-800/20">
            <p className="text-lg">O palco está vazio.</p>
            <p className="text-sm mt-2">Adicione seu primeiro módulo usando os botões abaixo.</p>
          </div>
        ) : (
          modules.map(mod => {
            
            // 👇 SEÇÃO 1: O MÓDULO FANTASMA 👇
            if (mod.isFloated) {
              return (
                <div key={mod.id} className="border-2 border-dashed border-slate-700 bg-slate-900/30 p-6 rounded-lg flex flex-col items-center justify-center gap-3 animate-in fade-in transition-all hover:border-emerald-500/50 group shadow-inner">
                  <span className="text-3xl opacity-40 group-hover:opacity-100 transition-opacity group-hover:animate-bounce">👻</span>
                  <p className="text-slate-400 text-sm font-medium">
                    A janela <strong className="text-emerald-400">{mod.name}</strong> está desencaixada.
                  </p>
                  <button 
                    onClick={() => handleUpdateModule(mod.id, { isFloated: false })}
                    className="px-4 py-2 bg-slate-800 border border-slate-600 hover:bg-emerald-600 hover:border-emerald-500 text-slate-300 hover:text-white rounded shadow transition-colors text-xs font-bold uppercase tracking-wider mt-2"
                  >
                    📥 Devolver para a Cena
                  </button>
                </div>
              );
            }

            // 👇 SEÇÃO 2: O MÓDULO NORMAL (COM BOTÃO DE DESENCAIXAR) 👇
            return (
              <div 
                key={mod.id} 
                draggable={draggableModuleId === mod.id}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData('moduleId', mod.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  handleAutoScroll(e.clientY);

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
                  setDropTargetId(null);
                  setDropPosition(null);
                  setDraggableModuleId(null);
                }}
                className={`flex items-start gap-2 group transition-all duration-300 rounded-lg ${
                  dropTargetId === mod.id && dropPosition === 'before' ? 'shadow-[0_-4px_0_0_#10b981] mt-4' : ''
                } ${
                  dropTargetId === mod.id && dropPosition === 'after' ? 'shadow-[0_4px_0_0_#10b981] mb-4' : ''
                }`}
              >
                
                {/* --- A ALÇA DE ARRASTAR (GRIP) --- */}
                <div 
                  onMouseEnter={() => setDraggableModuleId(mod.id)}
                  onMouseLeave={() => setDraggableModuleId(null)}
                  className="flex items-start pt-5 w-6 shrink-0 opacity-30 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-400 hover:text-emerald-400 transition-opacity"
                  title="Segure para reordenar"
                >
                  <div className="grid grid-cols-2 gap-[3px] pointer-events-none">
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                    <div className="w-1.5 h-1.5 bg-current rounded-full" />
                  </div>
                </div>

                {/* --- O MÓDULO E OS BOTÕES NO TOPO --- */}
                <div className="flex-1 relative min-w-0 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10 rounded-md z-10 hover:z-30 focus-within:z-[60]">
                  
                  {mod.type === 'text' && (
                    <TextModule moduleData={mod as TextType} allModules={modules} campaignNodes={campaignNodes} currentSceneId={scene.id} onUpdate={handleUpdateModule} />
                  )}
                  {mod.type === 'audio' && <AudioModule moduleData={mod as AudioType} onUpdate={handleUpdateModule} />}
                  {mod.type === 'pdf_crop' && <PdfModule moduleData={mod as PdfType} onUpdate={handleUpdateModule} />}
                  {mod.type === 'encounter' && <EncounterModule moduleData={mod as EncounterType} onUpdate={handleUpdateModule} />}
                  {mod.type === 'dice_roller' && <DiceRollerModule moduleData={mod as DiceRollerType} onUpdate={handleUpdateModule} />}

                  <button 
                    onClick={() => handleUpdateModule(mod.id, { isFloated: true })}
                    className="absolute -top-3 right-8 bg-slate-700 hover:bg-blue-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100 flex items-center justify-center font-bold z-10 border-2 border-slate-800"
                    title="Desencaixar Janela (Pop-up Flutuante)"
                  >
                    🗗
                  </button>

                  {/* 👇 BOTÃO ATUALIZADO COM A INTELIGÊNCIA 👇 */}
                  <button 
                    onClick={() => {
                      if (hasValuableContent(mod)) setModuleToDelete(mod.id);
                      else handleDeleteModule(mod.id); // Se estiver vazio, apaga direto!
                    }}
                    className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100 flex items-center justify-center font-bold z-10 border-2 border-slate-800"
                    title="Remover Módulo"
                  >
                    ✕
                  </button>

                  {/* 👇 NOVO MODAL INLINE: Sobrepõe o módulo se precisar confirmar 👇 */}
                  {moduleToDelete === mod.id && (
                    <div className="absolute inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm rounded-md flex items-center justify-center border-2 border-red-500/50 animate-in fade-in zoom-in-95">
                      <div className="text-center flex flex-col items-center gap-3 p-4">
                        <span className="text-4xl animate-bounce">⚠️</span>
                        <div>
                          <p className="text-slate-200 text-base font-bold">Este módulo possui conteúdo salvo.</p>
                          <p className="text-slate-400 text-sm">Deseja realmente excluí-lo?</p>
                        </div>
                        <div className="flex gap-3 mt-2">
                          <button 
                            onClick={() => setModuleToDelete(null)} 
                            className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition font-bold"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => { handleDeleteModule(mod.id); setModuleToDelete(null); }} 
                            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition font-bold shadow-lg shadow-red-900/50"
                          >
                            Sim, Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })
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
        <div className="w-px bg-slate-700 my-2"></div>
        <button 
          onClick={() => handleAddModule('encounter')} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-700 rounded-xl transition text-amber-500 font-medium text-sm">
          <span className="text-xl">⚔️</span> Combate
        </button>
        <div className="w-px bg-slate-700 my-2"></div>
        <button 
          onClick={() => handleAddModule('dice_roller')} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-700 rounded-xl transition text-indigo-600 font-medium text-sm">
          <span className="text-xl">🎲</span> Dados
        </button>
      </div>

    </div>
  );
}
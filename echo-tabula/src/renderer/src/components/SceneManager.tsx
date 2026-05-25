// src/renderer/src/components/SceneManager.tsx
import { CampaignNode, RpgModule, TextModule as TextType, AudioModule as AudioType, PdfCropModule as PdfType, EncounterModule as EncounterType, DiceRollerModule as DiceRollerType} from '../types/rpg';
import { TextModule } from './TextModule';
import { AudioModule } from './AudioModule';
import { PdfModule } from './PdfModule';
import { EncounterModule } from './EncounterModule';
import { DiceRollerModule } from './DiceRollerModule';
import { useState } from 'react';

// IMPORTAÇÕES DO DND-KIT
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  scene: CampaignNode;
  campaignNodes: CampaignNode[];
  onUpdateModules: (sceneId: string, newModules: RpgModule[]) => void;
  onRenameScene: (sceneId: string, newName: string) => void;
}

// ============================================================================
// COMPONENTE WRAPPER: O Item Ordenável (Sortable Module)
// ============================================================================
function SortableModuleWrapper({ 
  mod, 
  allModules,
  campaignNodes,
  currentSceneId,
  onUpdateModule, 
  onDeleteModule, 
  moduleToDelete, 
  setModuleToDelete,
  hasValuableContent 
}: { 
  mod: RpgModule, 
  allModules: RpgModule[],
  campaignNodes: CampaignNode[],
  currentSceneId: string,
  onUpdateModule: (id: string, updates: Partial<RpgModule>) => void,
  onDeleteModule: (id: string) => void,
  moduleToDelete: string | null,
  setModuleToDelete: (id: string | null) => void,
  hasValuableContent: (mod: RpgModule) => boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  // Se o módulo foi "desencaixado" (Pop-up Flutuante)
  if (mod.isFloated) {
    return (
      <div ref={setNodeRef} style={style} className="border-2 border-dashed border-slate-700 bg-slate-900/30 p-6 rounded-lg flex flex-col items-center justify-center gap-3 animate-in fade-in transition-all hover:border-emerald-500/50 shadow-inner">
         <span className="text-3xl opacity-40 animate-pulse">👻</span>
         <p className="text-slate-400 text-sm font-medium">
           A janela <strong className="text-emerald-400">{mod.name}</strong> está desencaixada.
         </p>
         <button 
           onClick={() => onUpdateModule(mod.id, { isFloated: false })}
           className="px-4 py-2 bg-slate-800 border border-slate-600 hover:bg-emerald-600 hover:border-emerald-500 text-slate-300 hover:text-white rounded shadow transition-colors text-xs font-bold uppercase tracking-wider mt-2"
         >
           📥 Devolver para a Cena
         </button>
      </div>
    );
  }

  // Módulo Normal Ancorado
  return (
    <div ref={setNodeRef} style={style} className={`flex items-start gap-2 group transition-all duration-300 rounded-lg ${isDragging ? 'ring-2 ring-emerald-500/50 shadow-2xl scale-[1.01]' : ''}`}>
      
      {/* --- A ALÇA DE ARRASTAR (GRIP) --- */}
      <div 
        {...attributes} 
        {...listeners} 
        className="flex items-start pt-5 w-6 shrink-0 opacity-30 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-400 hover:text-emerald-400 transition-opacity focus:outline-none"
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

      {/* --- O MÓDULO EM SI --- */}
      <div className="flex-1 relative min-w-0 transition-transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10 rounded-md z-10 hover:z-30 focus-within:z-[300]">
        
        {mod.type === 'text' && <TextModule moduleData={mod as TextType} allModules={allModules} campaignNodes={campaignNodes} currentSceneId={currentSceneId} onUpdate={onUpdateModule} />}
        {mod.type === 'audio' && <AudioModule moduleData={mod as AudioType} onUpdate={onUpdateModule} />}
        {mod.type === 'pdf_crop' && <PdfModule moduleData={mod as PdfType} onUpdate={onUpdateModule} />}
        {mod.type === 'encounter' && <EncounterModule moduleData={mod as EncounterType} onUpdate={onUpdateModule} />}
        {mod.type === 'dice_roller' && <DiceRollerModule moduleData={mod as DiceRollerType} onUpdate={onUpdateModule} />}

        {/* Botão Flutuar */}
        <button 
          onClick={() => onUpdateModule(mod.id, { isFloated: true })}
          className="absolute -top-3 right-8 bg-slate-700 hover:bg-blue-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100 flex items-center justify-center font-bold z-10 border-2 border-slate-800"
          title="Desencaixar Janela (Pop-up Flutuante)"
        >
          🗗
        </button>

        {/* Botão Excluir */}
        <button 
          onClick={() => {
            if (hasValuableContent(mod)) setModuleToDelete(mod.id);
            else onDeleteModule(mod.id); 
          }}
          className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100 flex items-center justify-center font-bold z-10 border-2 border-slate-800"
          title="Remover Módulo"
        >
          ✕
        </button>

        {/* Modal de Exclusão */}
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
                  onClick={() => { onDeleteModule(mod.id); setModuleToDelete(null); }} 
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
}

// ============================================================================
// GERENCIADOR DE CENA PRINCIPAL
// ============================================================================
export function SceneManager({ scene, campaignNodes, onUpdateModules, onRenameScene }: Props) {
  const modules = scene.modules || [];

  // --- CRUD BÁSICO ---
  const handleUpdateModule = (moduleId: string, updatedFields: Partial<RpgModule>) => {
    const newModules = modules.map(mod => mod.id === moduleId ? { ...mod, ...updatedFields } as RpgModule : mod);
    onUpdateModules(scene.id, newModules);
  };

  const handleDeleteModule = (moduleId: string) => {
    const newModules = modules.filter(mod => mod.id !== moduleId);
    onUpdateModules(scene.id, newModules);
  };

  const handleAddModule = (type: RpgModule['type']) => {
    const newId = Math.random().toString(36).substr(2, 9);
    let newModule: RpgModule;

    if (type === 'text') newModule = { id: newId, type: 'text', name: 'Nova Anotação', isActive: true, data: { content: '' } } as TextType;
    else if (type === 'audio') newModule = { id: newId, type: 'audio', name: 'Nova Trilha Sonora', isActive: true, data: { urlOrPath: '', volume: 0.5, loop: true } } as AudioType;
    else if (type === 'pdf_crop') newModule = { id: newId, type: 'pdf_crop', name: 'Novo Manuscrito', isActive: true, data: { filePath: '', page: 1 } } as PdfType;
    else if (type === 'encounter') newModule = { id: newId, type: 'encounter', name: 'Novo Combate', isActive: true, data: { round: 1, currentTurnId: null, combatants: [] } } as EncounterType;
    else newModule = { id: newId, type: 'dice_roller', name: 'Mesa de Dados', isActive: true, data: { presets: [] } } as DiceRollerType;
    
    onUpdateModules(scene.id, [...modules, newModule]);
  };

  // --- CONTROLE DE ESTADOS LOCAIS ---
  const [moduleToDelete, setModuleToDelete] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const hasValuableContent = (mod: RpgModule) => {
    if (mod.type === 'text') return mod.data.content !== '' && mod.data.content !== '<p></p>';
    if (mod.type === 'audio') return !!mod.data.urlOrPath;
    if (mod.type === 'pdf_crop') return !!mod.data.filePath;
    if (mod.type === 'encounter') return mod.data.combatants && mod.data.combatants.length > 0;
    if (mod.type === 'dice_roller') return mod.data.presets && mod.data.presets.length > 0;
    return false;
  };

  // --- CONFIGURAÇÃO DO DND-KIT ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const oldIndex = modules.findIndex(mod => mod.id === active.id);
      const newIndex = modules.findIndex(mod => mod.id === over.id);
      const reorderedModules = arrayMove(modules, oldIndex, newIndex);
      onUpdateModules(scene.id, reorderedModules);
    }
  };

  // Define qual módulo está voando agora (para criar a sombra no DragOverlay)
  const activeModule = modules.find(m => m.id === activeDragId);

  return (
    <div className="flex flex-col h-full w-full max-w-6xl 2xl:max-w-7xl mx-auto px-8 lg:px-16 py-8 relative">
      
      {/* CABEÇALHO */}
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

      {/* ÁREA SORTABLE PRINCIPAL */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto pt-6 pl-10 lg:pl-16 pr-4 lg:pr-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 pb-32">
          {modules.length === 0 ? (
            <div className="text-center py-20 text-slate-600 border-2 border-dashed border-slate-700 rounded-xl transition-all hover:border-slate-600 hover:bg-slate-800/20">
              <p className="text-lg">O palco está vazio.</p>
              <p className="text-sm mt-2">Adicione seu primeiro módulo usando os botões abaixo.</p>
            </div>
          ) : (
            <SortableContext items={modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
              {modules.map(mod => (
                <SortableModuleWrapper 
                  key={mod.id} 
                  mod={mod}
                  allModules={modules}
                  campaignNodes={campaignNodes}
                  currentSceneId={scene.id}
                  onUpdateModule={handleUpdateModule}
                  onDeleteModule={handleDeleteModule}
                  moduleToDelete={moduleToDelete}
                  setModuleToDelete={setModuleToDelete}
                  hasValuableContent={hasValuableContent}
                />
              ))}
            </SortableContext>
          )}
        </div>

        {/* SOMBRA VIRTUAL (O que você segura ao arrastar) */}
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
        }}>
          {activeModule ? (
             <div className="bg-slate-800 border border-emerald-500 rounded-xl p-4 shadow-2xl flex items-center gap-4 transform scale-105 opacity-90 cursor-grabbing ring-4 ring-emerald-500/20 w-80">
                <span className="text-2xl">
                  {activeModule.type === 'text' && '📝'}
                  {activeModule.type === 'audio' && '🎵'}
                  {activeModule.type === 'pdf_crop' && '📕'}
                  {activeModule.type === 'encounter' && '⚔️'}
                  {activeModule.type === 'dice_roller' && '🎲'}
                </span>
                <span className="text-slate-200 font-bold truncate">Mover {activeModule.name}...</span>
             </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* BARRA INFERIOR */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/95 backdrop-blur border border-slate-600 p-2.5 rounded-2xl shadow-2xl flex gap-3 z-20 transition-transform hover:scale-105">
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
        <button onClick={() => handleAddModule('encounter')} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-700 rounded-xl transition text-amber-500 font-medium text-sm">
          <span className="text-xl">⚔️</span> Combate
        </button>
        <div className="w-px bg-slate-700 my-2"></div>
        <button onClick={() => handleAddModule('dice_roller')} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-700 rounded-xl transition text-indigo-600 font-medium text-sm">
          <span className="text-xl">🎲</span> Dados
        </button>
      </div>

    </div>
  );
}
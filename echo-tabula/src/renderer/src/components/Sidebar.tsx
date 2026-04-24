// src/renderer/src/components/Sidebar.tsx
import { useState } from 'react';
import { CampaignNode } from '../types/rpg';
import packageJson from '../../../../package.json';

interface SidebarProps {
  nodes: CampaignNode[];
  activeSceneId: string | null;
  onSelectScene: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onAddNode: (parentId: string | null, type: 'folder' | 'scene') => void;
  onDeleteNode: (id: string) => void;
  onMoveNode: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void;
  onRenameNode: (id: string, newName: string) => void;
  onTogglePin: (id: string) => void; // 👈 NOVA FUNÇÃO PARA FIXAR
  level?: number; 
}

// --- FUNÇÃO AUXILIAR: Encontrar todas as cenas fixadas ---
const getPinnedScenes = (nodes: CampaignNode[]): CampaignNode[] => {
  let pinned: CampaignNode[] = [];
  for (const node of nodes) {
    if (node.type === 'scene' && node.isPinned) {
      pinned.push(node);
    }
    if (node.children) {
      pinned = pinned.concat(getPinnedScenes(node.children));
    }
  }
  return pinned;
};

function SidebarNode({ node, props }: { node: CampaignNode, props: SidebarProps }) {
  const { activeSceneId, onSelectScene, onToggleFolder, onAddNode, onDeleteNode, onMoveNode, onRenameNode, onTogglePin, level = 0 } = props;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const handleSaveRename = () => {
    setIsEditing(false);
    if (editName.trim() !== '' && editName !== node.name) {
      onRenameNode(node.id, editName.trim());
    } else {
      setEditName(node.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveRename();
    if (e.key === 'Escape') { setIsEditing(false); setEditName(node.name); }
  };

  const dragClass = dragPosition === 'before' ? 'shadow-[0_-2px_0_0_#3b82f6] z-10' :
                    dragPosition === 'after'  ? 'shadow-[0_2px_0_0_#3b82f6] z-10' :
                    dragPosition === 'inside' ? 'bg-blue-600/30 ring-1 ring-blue-500 z-10' : '';

  return (
    <div className="flex flex-col relative">
      <div 
        draggable={!isEditing}
        onDragStart={(e) => {
          if (isEditing) { e.preventDefault(); return; }
          e.stopPropagation();
          e.dataTransfer.setData('nodeId', node.id);
        }}
        onDragOver={(e) => {
          e.preventDefault(); 
          e.stopPropagation();
          if (isEditing) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top; 

          if (y < rect.height * 0.25) {
            setDragPosition('before'); 
          } else if (y > rect.height * 0.75) {
            setDragPosition('after');  
          } else if (node.type === 'folder') {
            setDragPosition('inside'); 
          } else {
            setDragPosition('after');  
          }
        }}
        onDragLeave={() => setDragPosition(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragPosition(null);
          
          const draggedId = e.dataTransfer.getData('nodeId');
          if (draggedId !== node.id && dragPosition) {
            onMoveNode(draggedId, node.id, dragPosition);
          }
        }}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={`flex items-center justify-between py-1.5 pr-2 rounded transition-all ${
          !isEditing ? 'cursor-grab active:cursor-grabbing group' : ''
        } ${dragClass} ${
          activeSceneId === node.id && !dragPosition 
            ? 'bg-emerald-600/20 text-emerald-400' 
            : dragPosition ? '' : 'text-slate-300 hover:bg-slate-800 focus-within:bg-slate-800'
        }`}
        onClick={() => {
          if (isEditing) return;
          node.type === 'scene' ? onSelectScene(node.id) : onToggleFolder(node.id);
        }}
        onDoubleClick={() => setIsEditing(true)}
      >
        <div className="flex items-center gap-2 truncate overflow-hidden w-full">
          <span className="text-sm opacity-80 pointer-events-none shrink-0">
            {node.type === 'folder' ? (node.isOpen ? '📂' : '📁') : '📜'}
          </span>
          
          {isEditing ? (
            <input 
              autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename} onKeyDown={handleKeyDown}
              className="bg-slate-950 text-emerald-400 text-sm px-1 py-0 w-full outline-none border border-emerald-500 rounded"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm truncate select-none pointer-events-none">{node.name}</span>
          )}
        </div>

        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            
            {/* 👇 BOTÃO DE FIXAR CENA AQUI 👇 */}
            {node.type === 'scene' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onTogglePin(node.id); }} 
                className={`text-xs p-1 transition-colors ${node.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
                title={node.isPinned ? "Desafixar Cena" : "Fixar Cena no Topo"}
              >
                📌
              </button>
            )}

            {node.type === 'folder' && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onAddNode(node.id, 'folder'); }} className="text-xs text-slate-500 hover:text-emerald-400 p-1">+📂</button>
                <button onClick={(e) => { e.stopPropagation(); onAddNode(node.id, 'scene'); }} className="text-xs text-slate-500 hover:text-emerald-400 p-1">+📜</button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }} className="text-xs text-slate-500 hover:text-red-400 p-1 ml-1">🗑️</button>
          </div>
        )}
      </div>

      {node.type === 'folder' && node.isOpen && node.children && (
        <Sidebar {...props} nodes={node.children} level={level + 1} />
      )}
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  const isRoot = props.level === undefined || props.level === 0;
  
  // Se for a raiz, extraímos as cenas fixadas!
  const pinnedScenes = isRoot ? getPinnedScenes(props.nodes) : [];

  return (
    <div className={`w-full flex flex-col gap-[2px] ${isRoot ? 'h-full' : ''}`}>
      
      {/* 👇 1. SESSÃO DE CENAS FIXADAS (SÓ APARECE NA RAIZ) 👇 */}
      {isRoot && pinnedScenes.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider mb-1 px-2 flex items-center gap-2">
            <span>Acesso Rápido</span>
          </div>
          <div className="flex flex-col gap-[2px]">
            {pinnedScenes.map(scene => (
              <div 
                key={`pinned-${scene.id}`}
                onClick={() => props.onSelectScene(scene.id)}
                className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors group ${
                  props.activeSceneId === scene.id ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm shrink-0">📌</span>
                  <span className="text-sm truncate">{scene.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); props.onTogglePin(scene.id); }} 
                  className="hidden group-hover:block text-xs text-slate-500 hover:text-slate-300 p-1"
                  title="Desafixar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {/* Linha divisória */}
          <div className="h-px bg-slate-700/50 mx-2 mt-3 mb-1" />
        </div>
      )}

      {/* 2. A ÁRVORE PRINCIPAL DE PASTAS E CENAS */}
      <div className="flex flex-col gap-[2px]">
        {props.nodes.map((node) => (
          <SidebarNode key={node.id} node={node} props={props} />
        ))}
      </div>

      {/* 3. A VERSÃO */}
      {isRoot && (
        <div className="mt-auto pb-2 pt-10 w-full flex justify-center">
          <span className="text-[10px] text-slate-500/50 font-mono font-bold select-none pointer-events-none">
            v{packageJson.version}
          </span>
        </div>
      )}
      
    </div>
  );
}
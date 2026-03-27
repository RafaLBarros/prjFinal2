// src/renderer/src/components/Sidebar.tsx
import { useState } from 'react';
import { CampaignNode } from '../types/rpg';

interface SidebarProps {
  nodes: CampaignNode[];
  activeSceneId: string | null;
  onSelectScene: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onAddNode: (parentId: string | null, type: 'folder' | 'scene') => void;
  onDeleteNode: (id: string) => void;
  // ATUALIZAMOS A FUNÇÃO DE MOVER AQUI:
  onMoveNode: (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void;
  onRenameNode: (id: string, newName: string) => void;
  level?: number; 
}

function SidebarNode({ node, props }: { node: CampaignNode, props: SidebarProps }) {
  const { activeSceneId, onSelectScene, onToggleFolder, onAddNode, onDeleteNode, onMoveNode, onRenameNode, level = 0 } = props;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  
  // NOVO: Estado para saber ONDE o drag está acontecendo
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

  // Lógica visual do Drop (Sombras Azuis sem quebrar o layout)
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
        // A MÁGICA DA MATEMÁTICA ACONTECE AQUI:
        onDragOver={(e) => {
          e.preventDefault(); 
          e.stopPropagation();
          if (isEditing) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top; // Posição Y do mouse dentro do elemento

          if (y < rect.height * 0.25) {
            setDragPosition('before'); // Mouse no topo (25%)
          } else if (y > rect.height * 0.75) {
            setDragPosition('after');  // Mouse no fundo (25%)
          } else if (node.type === 'folder') {
            setDragPosition('inside'); // Mouse no meio de uma pasta
          } else {
            setDragPosition('after');  // Mouse no meio de uma cena (cenas não recebem itens dentro)
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
  return (
    <div className="w-full flex flex-col gap-[2px]">
      {props.nodes.map((node) => (
        <SidebarNode key={node.id} node={node} props={props} />
      ))}
    </div>
  );
}
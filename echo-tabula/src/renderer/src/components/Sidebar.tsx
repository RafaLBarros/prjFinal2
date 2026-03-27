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
  onMoveNode: (draggedId: string, targetFolderId: string | null) => void;
  onRenameNode: (id: string, newName: string) => void; // <--- NOVA FUNÇÃO
  level?: number; 
}

// --- SUBCOMPONENTE: UM ITEM ÚNICO DA ÁRVORE ---
// Criamos isso para que cada item tenha seu próprio estado "isEditing" isolado.
function SidebarNode({ node, props }: { node: CampaignNode, props: SidebarProps }) {
  const { activeSceneId, onSelectScene, onToggleFolder, onAddNode, onDeleteNode, onMoveNode, onRenameNode, level = 0 } = props;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);

  // Função que salva o novo nome
  const handleSaveRename = () => {
    setIsEditing(false);
    if (editName.trim() !== '' && editName !== node.name) {
      onRenameNode(node.id, editName.trim());
    } else {
      setEditName(node.name); // Reverte se o usuário deixar em branco
    }
  };

  // Permite salvar com "Enter" ou cancelar com "Esc"
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveRename();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(node.name);
    }
  };

  return (
    <div className="flex flex-col">
      <div 
        draggable={!isEditing} // Bloqueia o arrasto enquanto digita
        onDragStart={(e) => {
          if (isEditing) { e.preventDefault(); return; }
          e.stopPropagation();
          e.dataTransfer.setData('nodeId', node.id);
        }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedId = e.dataTransfer.getData('nodeId');
          if (node.type === 'folder' && draggedId !== node.id) {
            onMoveNode(draggedId, node.id);
          }
        }}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={`flex items-center justify-between py-1.5 pr-2 rounded group transition-colors ${
          !isEditing ? 'cursor-grab active:cursor-grabbing' : ''
        } ${
          activeSceneId === node.id 
            ? 'bg-emerald-600/20 text-emerald-400' 
            : 'text-slate-300 hover:bg-slate-800 focus-within:bg-slate-800'
        }`}
        // Clique simples (Abre/Seleciona) ou Clique Duplo (Edita)
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
          
          {/* MODO EDIÇÃO vs MODO LEITURA */}
          {isEditing ? (
            <input 
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename} // Salva ao clicar fora
              onKeyDown={handleKeyDown}
              className="bg-slate-950 text-emerald-400 text-sm px-1 py-0 w-full outline-none border border-emerald-500 rounded"
              onClick={(e) => e.stopPropagation()} // Evita que o clique no input selecione a cena
            />
          ) : (
            <span className="text-sm truncate select-none pointer-events-none">{node.name}</span>
          )}
        </div>

        {/* Ações (Esconde se estiver digitando) */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            {node.type === 'folder' && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onAddNode(node.id, 'folder'); }} className="text-xs text-slate-500 hover:text-emerald-400 p-1" title="Nova Subpasta">+📂</button>
                <button onClick={(e) => { e.stopPropagation(); onAddNode(node.id, 'scene'); }} className="text-xs text-slate-500 hover:text-emerald-400 p-1" title="Nova Cena">+📜</button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }} className="text-xs text-slate-500 hover:text-red-400 p-1 ml-1" title="Excluir">🗑️</button>
          </div>
        )}
      </div>

      {/* A MÁGICA RECURSIVA (Subpastas) */}
      {node.type === 'folder' && node.isOpen && node.children && (
        <Sidebar 
          {...props} // Repassa todas as funções de controle (incluindo o rename)
          nodes={node.children} 
          level={level + 1} 
        />
      )}
    </div>
  );
}

// --- COMPONENTE PRINCIPAL (O Orquestrador da Lista) ---
export function Sidebar(props: SidebarProps) {
  return (
    <div className="w-full flex flex-col gap-1">
      {props.nodes.map((node) => (
        <SidebarNode key={node.id} node={node} props={props} />
      ))}
    </div>
  );
}
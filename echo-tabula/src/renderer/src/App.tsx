// src/renderer/src/App.tsx
import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CampaignNode } from './types/rpg';
import { SceneManager } from './components/SceneManager';

export default function App() {
  // O Estado da nossa Árvore de Pastas (Exemplo Inicial)
  const [tree, setTree] = useState<CampaignNode[]>([
    {
      id: 'f1', type: 'folder', name: '🗺️ Locais', isOpen: true,
      children: [
        { id: 's1', type: 'scene', name: 'Taverna do Javali' },
        { id: 's2', type: 'scene', name: 'Castelo do Rei' }
      ]
    },
    { id: 's3', type: 'scene', name: 'Regras da Casa' }
  ]);

  const [activeSceneId, setActiveSceneId] = useState<string | null>('s1');

  // --- FUNÇÕES DE CONTROLE DA ÁRVORE ---

  const handleToggleFolder = (targetId: string) => {
    // Uma função recursiva para encontrar a pasta e inverter o 'isOpen' dela
    const toggleNode = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.map(node => {
        if (node.id === targetId && node.type === 'folder') {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setTree(toggleNode(tree));
  };

  const handleAddNode = (parentId: string | null, type: 'folder' | 'scene') => {
    const newNode: CampaignNode = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      name: type === 'folder' ? 'Nova Pasta' : 'Nova Cena',
      ...(type === 'folder' ? { isOpen: true, children: [] } : {})
    };

    if (parentId === null) {
      // Adiciona na raiz
      setTree([...tree, newNode]);
    } else {
      // Adiciona dentro de uma pasta específica
      const addNodeToParent = (nodes: CampaignNode[]): CampaignNode[] => {
        return nodes.map(node => {
          if (node.id === parentId && node.type === 'folder') {
            return { ...node, isOpen: true, children: [...(node.children || []), newNode] };
          }
          if (node.children) {
            return { ...node, children: addNodeToParent(node.children) };
          }
          return node;
        });
      };
      setTree(addNodeToParent(tree));
    }
  };

  // --- NOVA FUNÇÃO: DELETAR NÓ ---
  const handleDeleteNode = (targetId: string) => {
    const deleteFromTree = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes
        .filter(node => node.id !== targetId) // Se for o ID alvo, ele é excluído aqui
        .map(node => {
          if (node.children) {
            return { ...node, children: deleteFromTree(node.children) }; // Vasculha as subpastas
          }
          return node;
        });
    };
    setTree(deleteFromTree(tree));
    if (activeSceneId === targetId) setActiveSceneId(null); // Limpa o palco se excluiu a cena atual
  };

  // --- FUNÇÃO ATUALIZADA: MOVER NÓ COM REORDENAÇÃO ---
  const handleMoveNode = (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside' = 'inside') => {
    let draggedNode: CampaignNode | null = null;

    // Etapa 1: Arranca o nó de onde ele estava
    const removeNode = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.filter(node => {
        if (node.id === draggedId) { draggedNode = node; return false; }
        if (node.children) node.children = removeNode(node.children);
        return true;
      });
    };

    let newTree = removeNode([...tree]);
    if (!draggedNode) return;

    // Etapa 2: Costura o nó no lugar novo
    if (targetId === null) {
      newTree.push(draggedNode); // Fundo vazio = Raiz
    } else {
      const insertNode = (nodes: CampaignNode[]): CampaignNode[] => {
        const result: CampaignNode[] = [];
        
        for (const node of nodes) {
          if (node.id === targetId) {
            // Se for pra colocar ANTES, empurra na lista primeiro
            if (position === 'before') result.push(draggedNode!);
            
            // Se for DENTRO, coloca nos filhos
            if (position === 'inside' && node.type === 'folder') {
              result.push({ ...node, isOpen: true, children: [...(node.children || []), draggedNode!] });
            } else {
              result.push(node); // Mantém o nó atual na lista
            }

            // Se for DEPOIS, empurra na lista depois
            if (position === 'after') result.push(draggedNode!);
            
          } else {
            // Se não é o alvo, só continua vasculhando
            if (node.children) {
              result.push({ ...node, children: insertNode(node.children) });
            } else {
              result.push(node);
            }
          }
        }
        return result;
      };
      newTree = insertNode(newTree);
    }

    setTree(newTree);
  };

  // --- NOVA FUNÇÃO: RENOMEAR NÓ ---
  const handleRenameNode = (targetId: string, newName: string) => {
    const renameInTree = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.map(node => {
        if (node.id === targetId) {
          return { ...node, name: newName }; // Atualiza o nome aqui!
        }
        if (node.children) {
          return { ...node, children: renameInTree(node.children) }; // Vasculha subpastas
        }
        return node;
      });
    };
    setTree(renameInTree(tree));
  };

  // Procura na árvore a cena que está selecionada no momento
  const getActiveScene = (nodes: CampaignNode[]): CampaignNode | null => {
    for (const node of nodes) {
      if (node.id === activeSceneId && node.type === 'scene') return node;
      if (node.children) {
        const found = getActiveScene(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const activeScene = activeSceneId ? getActiveScene(tree) : null;

  // Quando o SceneManager altera um módulo, salvamos de volta na árvore
  const handleUpdateSceneModules = (sceneId: string, newModules: any[]) => {
    const updateModulesInTree = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.map(node => {
        if (node.id === sceneId && node.type === 'scene') {
          return { ...node, modules: newModules };
        }
        if (node.children) {
          return { ...node, children: updateModulesInTree(node.children) };
        }
        return node;
      });
    };
    setTree(updateModulesInTree(tree));
  };

  return (
    // Layout Principal: Flexbox que ocupa a tela toda (h-screen)
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* --- BARRA LATERAL (Esquerda) --- */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h1 className="font-bold text-emerald-500 tracking-wider text-sm uppercase">Echo Tabula</h1>
          <div className="flex gap-1">
            <button onClick={() => handleAddNode(null, 'folder')} className="text-slate-400 hover:text-emerald-400 p-1" title="Nova Pasta Raiz">+📂</button>
            <button onClick={() => handleAddNode(null, 'scene')} className="text-slate-400 hover:text-emerald-400 p-1" title="Nova Cena Raiz">+📜</button>
          </div>
        </div>
        
        {/* A área da lista recebe eventos de Drop para enviar arquivos para a Raiz */}
        <div 
          className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 h-full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('nodeId');
            if(draggedId) handleMoveNode(draggedId, null, 'inside'); // <-- Atualizado aqui
          }}
        >
          <Sidebar 
            nodes={tree} 
            activeSceneId={activeSceneId}
            onSelectScene={setActiveSceneId}
            onToggleFolder={handleToggleFolder}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onMoveNode={handleMoveNode}
            onRenameNode={handleRenameNode} // <-- A nova propriedade plugada aqui!
          />
        </div>
      </div>

      {/* --- PALCO PRINCIPAL (Direita) --- */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5 relative">
        {activeScene ? (
          <SceneManager 
            scene={activeScene} 
            onUpdateModules={handleUpdateSceneModules} 
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-600 italic">Selecione uma cena no menu lateral para começar.</p>
          </div>
        )}
      </div>

    </div>
  );
}
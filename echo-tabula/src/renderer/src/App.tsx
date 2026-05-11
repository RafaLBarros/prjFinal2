// src/renderer/src/App.tsx
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
// 👇 CORREÇÃO 1: Adicionado o RpgModule na importação 👇
import { CampaignNode, RpgModule } from './types/rpg';
import { SceneManager } from './components/SceneManager';
import { GlobalAudioPlayer } from './components/GlobalAudioPlayer';
// 👇 CORREÇÃO 2: Importação do nosso novo gerenciador de janelas 👇
import { FloatingModuleManager } from './components/FloatingModuleManager';

export default function App() {
  
  // A árvore agora começa completamente vazia!
  const [tree, setTree] = useState<CampaignNode[]>([]);

  const [activeSceneId, setActiveSceneId] = useState<string | null>('s1');

  // --- NOVOS ESTADOS DO GERENCIADOR DE CAMPANHA ---
  const [currentFile, setCurrentFile] = useState<string | null>(null); 
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [campaignList, setCampaignList] = useState<string[]>([]);
  const [newSaveName, setNewSaveName] = useState('');

  // Status visual para o usuário saber que está seguro
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [saveError, setSaveError] = useState(''); 

  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [editingCampaignName, setEditingCampaignName] = useState('');

// 👇 NOVO: Guarda o ID do item que o usuário quer excluir na sidebar
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  // Estado de Importação e Exportação
  const [isProcessingIO, setIsProcessingIO] = useState(false);

  // --- O DESPERTADOR (AUTO-LOAD NO INÍCIO) ---
  useEffect(() => {
    const loadLastCampaign = async () => {
      const lastFile = localStorage.getItem('lastCampaign');
      
      if (lastFile) {
        const result = await window.api.loadCampaign(lastFile);
        if (result.success && result.content) {
          try {
            const loadedTree = JSON.parse(result.content);
            setTree(loadedTree);
            setCurrentFile(lastFile);
            setActiveSceneId(null);
          } catch (e) {
            localStorage.removeItem('lastCampaign'); 
          }
        } else {
          localStorage.removeItem('lastCampaign');
        }
      }
    };

    loadLastCampaign();
  }, []); 

  // --- O MOTOR DO AUTO-SAVE (DEBOUNCE) CORRIGIDO ---
  useEffect(() => {
    if (!currentFile) return;

    const timeoutId = setTimeout(async () => {
      setSaveStatus('saving');
      
      const dataToSave = JSON.stringify(tree, null, 2);
      const result = await window.api.saveCampaign(currentFile, dataToSave);
      
      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000); 
      }
    }, 1500); 

    return () => clearTimeout(timeoutId);
  }, [tree]); 

  // Garante que o input de renomear esteja sempre atualizado com o arquivo atual
  useEffect(() => {
    if (currentFile) {
      setEditingCampaignName(currentFile.replace('.json', ''));
    }
  }, [currentFile]);

  //USE EFFECT PARA TROCAR DE CENA VIA MÓDULOS (O OUVIDO BIÔNICO)
  useEffect(() => {
    const handleCrossSceneTeleport = (e: Event) => {
      const customEvent = e as CustomEvent;
      // 👇 Agora ele escuta se é pra rodar em 2º plano (preventScroll)
      const { targetId, action, payload, preventScroll } = customEvent.detail;
      
      // Verifica se a ação veio com um bilhete de "Troca de Cena"
      if (payload?.targetSceneId && payload.targetSceneId !== activeSceneId) {
        
        // ========================================================
        // 👇 O NOVO MOTOR DE BACKGROUND (ÁUDIO SEM MUDAR DE TELA) 👇
        // ========================================================
        if (preventScroll === true || preventScroll === 'true') {
          
          // Função recursiva que RETORNA o módulo (TypeScript adora isso)
          const findModuleInTree = (nodes: CampaignNode[], id: string): RpgModule | null => {
            for (const node of nodes) {
              if (node.type === 'scene' && node.modules) {
                const m = node.modules.find(mod => mod.id === id);
                if (m) return m;
              }
              if (node.children) {
                const found = findModuleInTree(node.children, id);
                if (found) return found;
              }
            }
            return null;
          };

          // Agora o TypeScript sabe exatamente o que é o foundModule!
          const foundModule = findModuleInTree(tree, targetId);

          if (foundModule && foundModule.type === 'audio') {
            // Traduz o comando do botão para o idioma do Mixer Global
            let globalAction = 'toggle-global-track';
            if (action === 'play') globalAction = 'add-global-track';
            if (action === 'pause') globalAction = 'pause-global-track';
            if (action === 'restart') globalAction = 'add-global-track'; 

            // Dá o Play/Pause direto na caixa de som flutuante!
            window.dispatchEvent(new CustomEvent(globalAction, {
              detail: {
                url: foundModule.data.urlOrPath,
                title: foundModule.name,
                volume: foundModule.data.volume,
                loop: foundModule.data.loop,
                restart: action === 'restart'
              }
            }));
          }

          return; // 🛑 ABORTA A VIAGEM! O Mestre continua na tela atual tranquilamente.
        }

        // ========================================================
        // --- VIAGEM NORMAL (Se a caixa não estiver marcada) ---
        // ========================================================
        setActiveSceneId(payload.targetSceneId);
        
        let attempts = 0;
        
        const tryDispatch = () => {
          const targetEl = document.getElementById(`module-${targetId}`);
          if (targetEl) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('rpg-module-action', {
                detail: { targetId, action, payload }
              }));
            }, 50);
          } else if (attempts < 20) {
            attempts++;
            setTimeout(tryDispatch, 50);
          }
        };

        setTimeout(tryDispatch, 50);
      }
    };

    window.addEventListener('rpg-module-action', handleCrossSceneTeleport);
    return () => window.removeEventListener('rpg-module-action', handleCrossSceneTeleport);
  }, [activeSceneId, tree]); // 👈 ATENÇÃO: Adicionei o 'tree' aqui para ele achar as músicas sempre atualizadas!

  // --- FUNÇÕES DE CONTROLE DA ÁRVORE ---

  const handleToggleFolder = (targetId: string) => {
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
      setTree([...tree, newNode]);
    } else {
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

  // 1. Apenas abre o modal de confirmação
  const handleDeleteNode = (targetId: string) => {
    setNodeToDelete(targetId);
  };

  // 2. Executa a exclusão de fato
  const executeDeleteNode = () => {
    if (!nodeToDelete) return;

    const deleteFromTree = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes
        .filter(node => node.id !== nodeToDelete) 
        .map(node => {
          if (node.children) {
            return { ...node, children: deleteFromTree(node.children) }; 
          }
          return node;
        });
    };
    
    setTree(deleteFromTree(tree));
    if (activeSceneId === nodeToDelete) setActiveSceneId(null); 
    setNodeToDelete(null); // Fecha o modal
  };

  // --- FUNÇÃO AUXILIAR: DETECTOR DE PARADOXO ---
  const isDescendant = (treeNodes: CampaignNode[], draggedId: string, targetId: string): boolean => {
    const findNode = (nodes: CampaignNode[], id: string): CampaignNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const draggedNode = findNode(treeNodes, draggedId);
    
    if (!draggedNode || !draggedNode.children) return false;

    const checkChildren = (children: CampaignNode[]): boolean => {
      for (const child of children) {
        if (child.id === targetId) return true;
        if (child.children && checkChildren(child.children)) return true;
      }
      return false;
    };

    return checkChildren(draggedNode.children);
  };

  // --- FUNÇÃO ATUALIZADA: MOVER NÓ COM REORDENAÇÃO ---
  const handleMoveNode = (draggedId: string, targetId: string | null, position: 'before' | 'after' | 'inside' = 'inside') => {
    
    if (draggedId === targetId) return;
    if (targetId && isDescendant(tree, draggedId, targetId)) {
      console.warn("Ação bloqueada: Uma pasta não pode ser movida para dentro de seus próprios filhos.");
      return; 
    }
    
    let draggedNode: CampaignNode | null = null;

    const removeNode = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.filter(node => {
        if (node.id === draggedId) { draggedNode = node; return false; }
        if (node.children) node.children = removeNode(node.children);
        return true;
      });
    };

    let newTree = removeNode([...tree]);
    if (!draggedNode) return;

    if (targetId === null) {
      newTree.push(draggedNode); 
    } else {
      const insertNode = (nodes: CampaignNode[]): CampaignNode[] => {
        const result: CampaignNode[] = [];
        
        for (const node of nodes) {
          if (node.id === targetId) {
            if (position === 'before') result.push(draggedNode!);
            
            if (position === 'inside' && node.type === 'folder') {
              result.push({ ...node, isOpen: true, children: [...(node.children || []), draggedNode!] });
            } else {
              result.push(node); 
            }

            if (position === 'after') result.push(draggedNode!);
            
          } else {
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

  const handleRenameNode = (targetId: string, newName: string) => {
    const renameInTree = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.map(node => {
        if (node.id === targetId) {
          return { ...node, name: newName }; 
        }
        if (node.children) {
          return { ...node, children: renameInTree(node.children) }; 
        }
        return node;
      });
    };
    setTree(renameInTree(tree));
  };

  const handleTogglePin = (targetId: string) => {
    const togglePinInTree = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.map(node => {
        if (node.id === targetId) {
          return { ...node, isPinned: !node.isPinned };
        }
        if (node.children) {
          return { ...node, children: togglePinInTree(node.children) };
        }
        return node;
      });
    };
    setTree(togglePinInTree(tree));
  };


  // --- FUNÇÕES DE GERENCIAMENTO DE CAMPANHA ---

  const handleNewCampaignClick = () => {
    setNewSaveName('');
    setSaveError(''); 
    setIsSaveOpen(true);
  };

  const executeNewCampaign = async (fileName: string) => {
    const safeName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

    const listResult = await window.api.listCampaigns();
    
    if (listResult.success && listResult.files) {
      if (listResult.files.includes(safeName)) {
        setSaveError('⚠️ Já existe uma campanha com este nome. Escolha outro.');
        return;
      }
    }

    const emptyTree: CampaignNode[] = [];
    const dataToSave = JSON.stringify(emptyTree, null, 2);
    
    const result = await window.api.saveCampaign(fileName, dataToSave);
    
    if (result.success && result.fileName) {
      setTree(emptyTree);
      setActiveSceneId(null);
      setCurrentFile(result.fileName);
      setIsSaveOpen(false);

      localStorage.setItem('lastCampaign', result.fileName);
    }
  };

  const handleOpenLoadClick = async () => {
    const result = await window.api.listCampaigns();
    if (result.success) {
      setCampaignList(result.files);
      setIsLoadOpen(true);
    }
  };

  const executeLoad = async (fileName: string) => {
    const result = await window.api.loadCampaign(fileName);
    if (result.success && result.content) {
      try {
        const loadedTree = JSON.parse(result.content);
        setTree(loadedTree);
        setCurrentFile(fileName);
        setActiveSceneId(null);
        setIsLoadOpen(false);

        localStorage.setItem('lastCampaign', fileName);
      } catch (e) {
        alert("Arquivo corrompido.");
      }
    }
  };

  const executeDelete = async (fileName: string) => {
    const result = await window.api.deleteCampaign(fileName);
    if (result.success) {
      setCampaignList(prev => prev.filter(f => f !== fileName));
      setCampaignToDelete(null); 
      
      if (currentFile === fileName) {
        setTree([]);
        setActiveSceneId(null);
        setCurrentFile(null);

        localStorage.removeItem('lastCampaign');
      }
    } else {
      alert(`Erro ao excluir: ${result.error}`);
    }
  };

  const executeRenameCampaign = async () => {
    if (!currentFile || !editingCampaignName.trim()) {
      setEditingCampaignName(currentFile?.replace('.json', '') || '');
      return;
    }

    const safeNewName = `${editingCampaignName.trim()}.json`;
    if (safeNewName === currentFile) return; 

    const result = await window.api.renameCampaign(currentFile, safeNewName);
    
    if (result.success && result.fileName) {
      setCurrentFile(result.fileName);
      localStorage.setItem('lastCampaign', result.fileName);
    } else {
      alert(result.error);
      setEditingCampaignName(currentFile.replace('.json', ''));
    }
  };

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

  // --- FUNÇÕES DE EXPORTAÇÃO E IMPORTAÇÃO ---
  const handleExportCampaign = async () => {
    if (!currentFile) return;
    
    setIsProcessingIO(true);
    // Mandamos para o backend o nome do arquivo JSON e a árvore atual para ele caçar os assets
    const result = await window.api.exportCampaign(currentFile, tree); 
    setIsProcessingIO(false);
    
    if (result.success) {
      setSaveStatus('saved'); // Dá um feedback visual rápido
    } else if (result.error !== 'Cancelado pelo usuário') {
      alert(`Erro ao exportar: ${result.error}`);
    }
  };

  const handleImportCampaign = async () => {
    setIsProcessingIO(true);
    const result = await window.api.importCampaign();
    setIsProcessingIO(false);
    
    if (result.success && result.fileName) {
      // Se importou com sucesso, já carregamos a campanha na tela para o mestre ver!
      executeLoad(result.fileName);
    } else if (result.error !== 'Cancelado pelo usuário') {
      alert(`Erro ao importar: ${result.error}`);
    }
  };

  const handleChangeNodeIcon = (targetId: string, newIcon: string) => {
    const updateIconInTree = (nodes: CampaignNode[]): CampaignNode[] => {
      return nodes.map(node => {
        if (node.id === targetId) {
          return { ...node, icon: newIcon };
        }
        if (node.children) {
          return { ...node, children: updateIconInTree(node.children) };
        }
        return node;
      });
    };
    setTree(updateIconInTree(tree));
  };

  // 👇 CORREÇÃO 3: Função Global usando o setTree correto! 👇
  const handleUpdateModuleGlobal = (sceneId: string, moduleId: string, updatedFields: Partial<RpgModule>) => {
    setTree(prevNodes => {
      const newTree = JSON.parse(JSON.stringify(prevNodes)); // Cópia segura da árvore
      
      const updateNode = (nodes: CampaignNode[]) => {
        for (let node of nodes) {
          if (node.id === sceneId && node.type === 'scene' && node.modules) {
            node.modules = node.modules.map(m => m.id === moduleId ? ({ ...m, ...updatedFields } as RpgModule) : m);
            return true; // Achou e atualizou! Para a busca.
          }
          if (node.children && updateNode(node.children)) return true;
        }
        return false;
      };
      
      updateNode(newTree);
      return newTree;
    });
  };


  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* --- BARRA LATERAL (Esquerda) --- */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="font-bold text-emerald-500 tracking-wider text-sm uppercase">Echo Tabula</h1>
            
            <div className="flex gap-2 items-center">
              {saveStatus === 'saving' && <span className="text-[10px] text-emerald-400 animate-pulse font-medium">Salvando...</span>}
              {saveStatus === 'saved' && <span className="text-[10px] text-slate-500 font-medium">Salvo</span>}
              {isProcessingIO && <span className="text-[10px] text-blue-400 animate-pulse font-medium">Processando...</span>}
              
              <button onClick={handleImportCampaign} disabled={isProcessingIO} className="text-slate-400 hover:text-blue-400 transition-colors text-lg disabled:opacity-50" title="Importar Pacote (.tabula)">
                📥
              </button>

              <div className="w-px h-4 bg-slate-700 mx-1"></div>

              <button onClick={handleOpenLoadClick} className="text-slate-400 hover:text-blue-400 transition-colors" title="Abrir Campanha">
                📂
              </button>
              <button onClick={handleNewCampaignClick} className="text-slate-400 hover:text-emerald-400 transition-colors text-lg" title="Nova Campanha">
                ➕
              </button>
            </div>
          </div>

          {currentFile && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md focus-within:border-emerald-500 focus-within:shadow-md transition-all group">
              <span className="text-sm">📖</span>
              <input
                type="text"
                value={editingCampaignName}
                onChange={(e) => setEditingCampaignName(e.target.value)}
                onBlur={executeRenameCampaign} 
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} 
                className="bg-transparent text-xs text-slate-300 font-medium w-full focus:outline-none focus:text-emerald-400 transition-colors"
                title="Clique para renomear"
              />
              <span className="text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">✎</span>
            </div>
          )}
          
          {currentFile && (
            <div className="flex gap-2">
              <button onClick={() => handleAddNode(null, 'folder')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition border border-slate-700 font-medium">
                + Pasta
              </button>
              <button onClick={() => handleAddNode(null, 'scene')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition border border-slate-700 font-medium">
                + Cena
              </button>

              <button 
                onClick={handleExportCampaign} 
                disabled={isProcessingIO}
                className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1.5 rounded transition border border-indigo-500/50 text-xs font-bold disabled:opacity-50"
                title="Exportar Campanha para Backup"
              >
                📤 Exportar
              </button>

            </div>
          )}
        </div>
        
        <div 
          className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 h-full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('nodeId');
            if(draggedId) handleMoveNode(draggedId, null, 'inside'); 
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
            onRenameNode={handleRenameNode}
            onTogglePin={handleTogglePin} 
            onChangeIcon={handleChangeNodeIcon}
          />
        </div>
      </div>

      {/* --- PALCO PRINCIPAL (Direita) --- */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeScene ? (
          <SceneManager 
            scene={activeScene} 
            campaignNodes={tree} 
            onUpdateModules={handleUpdateSceneModules}
            onRenameScene={handleRenameNode}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-600 italic">Selecione uma cena no menu lateral para começar.</p>
          </div>
        )}
      </div>

      {/* ================= MODAIS FLUTUANTES ================= */}
      
      {isSaveOpen && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 flex flex-col gap-4">
            <h3 className="text-xl font-bold text-emerald-400">Criar Nova Campanha</h3>
            <p className="text-sm text-slate-400">Dê um nome para o seu novo grimório. Ele será salvo automaticamente.</p>
            <input 
              autoFocus
              type="text" 
              value={newSaveName}
              onChange={(e) => {
                setNewSaveName(e.target.value);
                setSaveError(''); 
              }}
              placeholder="Ex: A_Mina_Perdida"
              className={`bg-slate-950 border ${saveError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'} text-slate-200 p-2 rounded focus:outline-none transition-colors`}
              onKeyDown={(e) => e.key === 'Enter' && newSaveName.trim() && executeNewCampaign(newSaveName.trim())}
            />
            
            {saveError && (
              <p className="text-red-400 text-sm animate-pulse">{saveError}</p>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setIsSaveOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white transition">Cancelar</button>
              <button 
                onClick={() => newSaveName.trim() && executeNewCampaign(newSaveName.trim())} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoadOpen && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-[500px] flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-4">
              <h3 className="text-xl font-bold text-blue-400">Cofre de Campanhas</h3>
              <button onClick={() => setIsLoadOpen(false)} className="text-slate-400 hover:text-red-400 text-xl font-bold">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
              {campaignList.length === 0 ? (
                <p className="text-slate-500 text-center py-10 italic">Nenhuma campanha encontrada no cofre.</p>
              ) : (
                campaignList.map(file => (
                  <div 
                    key={file} 
                    className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-700/30 border border-transparent rounded-lg transition group"
                  >
                    {campaignToDelete === file ? (
                      <div className="flex-1 flex justify-between items-center text-red-400 bg-red-950/30 -m-3 p-3 rounded-lg border border-red-900/50">
                        <span className="text-sm font-bold flex items-center gap-2">
                          <span>⚠️</span> Excluir permanentemente?
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setCampaignToDelete(null)} 
                            className="px-3 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => executeDelete(file)} 
                            className="px-3 py-1 text-xs text-white bg-red-600 hover:bg-red-500 font-medium rounded transition"
                          >
                            Sim, Excluir
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => executeLoad(file)}
                        >
                          <span className="text-2xl opacity-80 group-hover:opacity-100 transition">📖</span>
                          <span className="text-slate-300 font-medium group-hover:text-blue-300 transition truncate">
                            {file.replace('.json', '')}
                          </span>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            setCampaignToDelete(file);
                          }} 
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition"
                          title="Excluir Campanha"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 👇 NOVO MODAL: Confirmação de Exclusão da Barra Lateral 👇 */}
      {nodeToDelete && (
        <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl w-96 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-xl font-bold">Excluir Item</h3>
            </div>
            <p className="text-sm text-slate-400">
              Tem certeza que deseja excluir? Se for uma pasta, <strong className="text-slate-200">todo o conteúdo dentro dela</strong> será perdido permanentemente.
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button 
                onClick={() => setNodeToDelete(null)} 
                className="px-4 py-2 text-slate-400 hover:text-white transition font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteNode} 
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded transition shadow-lg shadow-red-900/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👇 CORREÇÃO 4: A nossa central de janelas flutuantes foi plugada aqui! 👇 */}
      <FloatingModuleManager 
        tree={tree} 
        onUpdateModuleGlobal={handleUpdateModuleGlobal} 
      />

      {/* O MINI-PLAYER DO SPOTIFY FICA AQUI */}
      <GlobalAudioPlayer />

    </div>
  );
}
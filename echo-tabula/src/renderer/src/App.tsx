// src/renderer/src/App.tsx
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CampaignNode } from './types/rpg';
import { SceneManager } from './components/SceneManager';

export default function App() {
  
  // A árvore agora começa completamente vazia!
  const [tree, setTree] = useState<CampaignNode[]>([]);

  const [activeSceneId, setActiveSceneId] = useState<string | null>('s1');

  // --- NOVOS ESTADOS DO GERENCIADOR DE CAMPANHA ---
  const [currentFile, setCurrentFile] = useState<string | null>(null); // Lembra o nome do arquivo atual
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [campaignList, setCampaignList] = useState<string[]>([]);
  const [newSaveName, setNewSaveName] = useState('');

  // NOVO: Status visual para o usuário saber que está seguro
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [saveError, setSaveError] = useState(''); // <-- NOVO ESTADO DE ERRO

  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [editingCampaignName, setEditingCampaignName] = useState('');

  // --- O DESPERTADOR (AUTO-LOAD NO INÍCIO) ---
  useEffect(() => {
    const loadLastCampaign = async () => {
      // 1. Pergunta à memória do navegador qual foi a última campanha
      const lastFile = localStorage.getItem('lastCampaign');
      
      if (lastFile) {
        // 2. Tenta carregar do disco
        const result = await window.api.loadCampaign(lastFile);
        if (result.success && result.content) {
          try {
            const loadedTree = JSON.parse(result.content);
            setTree(loadedTree);
            setCurrentFile(lastFile);
            setActiveSceneId(null);
          } catch (e) {
            // Se o arquivo corrompeu, apaga a memória para não travar o app
            localStorage.removeItem('lastCampaign'); 
          }
        } else {
          // Se o arquivo foi deletado por fora do app, apaga a memória
          localStorage.removeItem('lastCampaign');
        }
      }
    };

    loadLastCampaign();
  }, []); // <-- O array vazio garante que isso só rode UMA VEZ ao abrir o app!

  // --- O MOTOR DO AUTO-SAVE (DEBOUNCE) CORRIGIDO ---
  useEffect(() => {
    // Se não tem arquivo aberto, não tem onde salvar
    if (!currentFile) return;

    // O CRONÔMETRO COMEÇA AQUI
    // Ele espera 1.5 segundos de silêncio absoluto no teclado antes de agir
    const timeoutId = setTimeout(async () => {
      
      // Agora sim! O aviso só aparece quando ele de fato vai mandar para o disco
      setSaveStatus('saving');
      
      const dataToSave = JSON.stringify(tree, null, 2);
      const result = await window.api.saveCampaign(currentFile, dataToSave);
      
      if (result.success) {
        setSaveStatus('saved');
        // Volta para 'idle' (escondido) após 2 segundos
        setTimeout(() => setSaveStatus('idle'), 2000); 
      }
    }, 1500); // 1.5 segundos de espera

    // Se você digitar qualquer coisa antes de dar 1.5s, ele cancela o save anterior e zera o relógio!
    return () => clearTimeout(timeoutId);
  }, [tree]); // Observamos apenas a Árvore de dados agora

  // Garante que o input de renomear esteja sempre atualizado com o arquivo atual
  useEffect(() => {
    if (currentFile) {
      setEditingCampaignName(currentFile.replace('.json', ''));
    }
  }, [currentFile]);

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

  // --- FUNÇÃO AUXILIAR: DETECTOR DE PARADOXO ---
  const isDescendant = (treeNodes: CampaignNode[], draggedId: string, targetId: string): boolean => {
    // 1. Acha o nó que está sendo arrastado
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
    
    // Se o nó não foi achado ou não tem filhos (é uma cena), é impossível gerar paradoxo
    if (!draggedNode || !draggedNode.children) return false;

    // 2. Vasculha todos os filhos (e netos) para ver se o alvo está lá dentro
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
    
    // 🛡️ O ESCUDO ANTI-PARADOXO ENTRA AQUI!
    // Se o usuário soltar a pasta nela mesma, ou dentro de um filho dela, a ação é cancelada.
    if (draggedId === targetId) return;
    if (targetId && isDescendant(tree, draggedId, targetId)) {
      console.warn("Ação bloqueada: Uma pasta não pode ser movida para dentro de seus próprios filhos.");
      return; 
    }
    
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

  // --- FUNÇÕES DE GERENCIAMENTO DE CAMPANHA ---

  const handleNewCampaignClick = () => {
    setNewSaveName('');
    setSaveError(''); // <-- Limpa qualquer erro antigo
    setIsSaveOpen(true);
  };

  const executeNewCampaign = async (fileName: string) => {
    // 1. Padroniza o nome para a verificação (garante que tem o .json no final)
    const safeName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

    // 2. Olha para dentro do Cofre de Campanhas ANTES de fazer qualquer coisa
    const listResult = await window.api.listCampaigns();
    
    if (listResult.success && listResult.files) {
      // 3. Se o nome já existir na lista, bloqueia tudo e avisa o usuário!
      if (listResult.files.includes(safeName)) {
        // Substituímos o alert nativo pela nossa mensagem de estado!
        setSaveError('⚠️ Já existe uma campanha com este nome. Escolha outro.');
        return;
      }
    }

    // 4. Se passou pela segurança, cria a campanha vazia normalmente
    const emptyTree: CampaignNode[] = [];
    const dataToSave = JSON.stringify(emptyTree, null, 2);
    
    // 5. Salva no disco
    const result = await window.api.saveCampaign(fileName, dataToSave);
    
    if (result.success && result.fileName) {
      // 6. Atualiza a tela
      setTree(emptyTree);
      setActiveSceneId(null);
      setCurrentFile(result.fileName);
      setIsSaveOpen(false);

      localStorage.setItem('lastCampaign', result.fileName);
    }
  };

  const handleOpenLoadClick = async () => {
    // Pede pro Backend a lista de arquivos e abre o modal
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
      // Remove da lista visual instantaneamente
      setCampaignList(prev => prev.filter(f => f !== fileName));
      setCampaignToDelete(null); // Fecha o modo de exclusão
      
      // Se o usuário excluiu a campanha que está aberta agora, limpamos a tela
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
      // Se o usuário tentar deixar vazio, a gente reverte pro nome original
      setEditingCampaignName(currentFile?.replace('.json', '') || '');
      return;
    }

    const safeNewName = `${editingCampaignName.trim()}.json`;
    if (safeNewName === currentFile) return; // Se o nome for igual, não faz nada

    const result = await window.api.renameCampaign(currentFile, safeNewName);
    
    if (result.success && result.fileName) {
      // Atualiza o estado e a memória do navegador!
      setCurrentFile(result.fileName);
      localStorage.setItem('lastCampaign', result.fileName);
    } else {
      // Se der erro (ex: nome duplicado), avisa e reverte o texto
      alert(result.error);
      setEditingCampaignName(currentFile.replace('.json', ''));
    }
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
        <div className="p-4 border-b border-slate-800 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="font-bold text-emerald-500 tracking-wider text-sm uppercase">Echo Tabula</h1>
            
            <div className="flex gap-3 items-center">
              {/* O Feedback visual do Autosave */}
              {saveStatus === 'saving' && <span className="text-[10px] text-emerald-400 animate-pulse font-medium">Salvando...</span>}
              {saveStatus === 'saved' && <span className="text-[10px] text-slate-500 font-medium">Salvo</span>}
              
              <button onClick={handleOpenLoadClick} className="text-slate-400 hover:text-blue-400 transition-colors" title="Abrir Campanha (Load)">
                📂
              </button>
              {/* Mudamos de Salvar para Nova Campanha */}
              <button onClick={handleNewCampaignClick} className="text-slate-400 hover:text-emerald-400 transition-colors text-lg" title="Nova Campanha">
                ➕
              </button>
            </div>
          </div>

          {/* Nome do arquivo atual em destaque e EDITÁVEL */}
          {currentFile && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-md focus-within:border-emerald-500 focus-within:shadow-md transition-all group">
              <span className="text-sm">📖</span>
              <input
                type="text"
                value={editingCampaignName}
                onChange={(e) => setEditingCampaignName(e.target.value)}
                onBlur={executeRenameCampaign} // Salva automaticamente quando clica fora
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} // Salva ao dar Enter
                className="bg-transparent text-xs text-slate-300 font-medium w-full focus:outline-none focus:text-emerald-400 transition-colors"
                title="Clique para renomear"
              />
              <span className="text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">✎</span>
            </div>
          )}
          
          {/* Botões grandes de criar Nova Pasta e Cena (só aparecem se tiver campanha aberta) */}
          {currentFile && (
            <div className="flex gap-2">
              <button onClick={() => handleAddNode(null, 'folder')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition border border-slate-700 font-medium">
                + Pasta
              </button>
              <button onClick={() => handleAddNode(null, 'scene')} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 rounded transition border border-slate-700 font-medium">
                + Cena
              </button>
            </div>
          )}
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
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeScene ? (
          <SceneManager 
            scene={activeScene} 
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
      
      {/* MODAL DE NOVA CAMPANHA */}
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
                setSaveError(''); // Se o usuário começou a digitar para corrigir, o erro some!
              }}
              placeholder="Ex: A_Mina_Perdida"
              className={`bg-slate-950 border ${saveError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-emerald-500'} text-slate-200 p-2 rounded focus:outline-none transition-colors`}
              onKeyDown={(e) => e.key === 'Enter' && newSaveName.trim() && executeNewCampaign(newSaveName.trim())}
            />
            
            {/* A Mensagem de Erro Condicional */}
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

      {/* MODAL DE CARREGAR (O Explorador de Arquivos Interno) */}
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
                    {/* SE ESTIVER EM MODO DE EXCLUSÃO, MOSTRA A CONFIRMAÇÃO */}
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
                      /* SE NÃO ESTIVER, MOSTRA O VISUAL NORMAL DE ABRIR */
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
                        
                        {/* BOTÃO DE LIXEIRA */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Impede que o clique carregue a campanha
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

    </div>
  );
}
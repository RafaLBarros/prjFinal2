// src/renderer/src/components/TextModule.tsx
import { useState, useEffect, useRef } from 'react';
import { TextModule as TextModuleType, RpgModule, CampaignNode } from '../types/rpg';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageResize from 'tiptap-extension-resize-image';
import { ActionLink } from './ActionLink';

interface MenuBarProps {
  editor: Editor | null;
  allModules: RpgModule[];
  currentModuleId: string;
  campaignNodes: CampaignNode[];
  currentSceneId: string;
}

// --- SUBCOMPONENTE: A BARRA DE FERRAMENTAS ---
const MenuBar = ({ editor, allModules, currentModuleId, campaignNodes, currentSceneId }: MenuBarProps) => {
  const [, forceUpdate] = useState({});
  
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(currentSceneId);
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkPayload, setLinkPayload] = useState<{ bookmarkId?: string, presetId?: string } | null>(null);
  const [linkAction, setLinkAction] = useState('toggle');
  
  // 👇 NOVO ESTADO PARA O ÍCONE DA CORRENTE 👇
  const [linkIcon, setLinkIcon] = useState('🔗');

  const menuRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    if (!editor) return;
    const handleTransaction = () => forceUpdate({});
    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

  useEffect(() => {
    if (showLinkMenu) setSelectedSceneId(currentSceneId);
  }, [showLinkMenu, currentSceneId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLinkMenu(false);
      }
    };
    if (showLinkMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLinkMenu]);

  if (!editor) return null;

  const MenuButton = ({ onClick, isActive, title, icon }: any) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition ${
        isActive ? 'bg-emerald-600 text-white shadow-inner shadow-black/20' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
    </button>
  );

  const handleAddImage = async () => {
    if (window.api && window.api.importImage) {
      const result = await window.api.importImage();
      if (result.success && result.fileName) {
        (editor.chain().focus() as any).setImage({ src: `rpg://${result.fileName}` }).run();
        return;
      }
    }
    const url = window.prompt('URL da imagem (Cole um link http...):');
    if (url) {
      (editor.chain().focus() as any).setImage({ src: url }).run();
    }
  };

  const getScenes = (nodes: CampaignNode[], path = ''): any[] => {
    let scenes: any[] = [];
    nodes.forEach(node => {
      const newPath = path ? `${path} / ${node.name}` : node.name;
      if (node.type === 'scene') {
        scenes.push({ id: node.id, name: node.name, path: newPath, modules: node.modules || [] });
      }
      if (node.children) scenes = [...scenes, ...getScenes(node.children, newPath)];
    });
    return scenes;
  };
  
  const allScenes = getScenes(campaignNodes);
  const activeTargetScene = allScenes.find(s => s.id === selectedSceneId);
  
  let availableModules: RpgModule[] = [];
  if (selectedSceneId === currentSceneId) {
    availableModules = allModules.filter(m => m.id !== currentModuleId);
  } else if (activeTargetScene) {
    availableModules = activeTargetScene.modules;
  }

  const selectedModule = availableModules.find(m => m.id === linkTargetId);

  // Paleta de Ícones Rápidos
  const QUICK_ICONS = ['🔗', '⚡', '🎵', '⚔️', '🎲', '📕', '👁️', '💬', '🎒', '🔥'];

  return (
    <div className={`flex flex-wrap gap-1 p-1 border-b border-slate-700 bg-slate-900/50 relative transition-all ${showLinkMenu ? 'z-50' : 'z-10'}`}>
      <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito (Ctrl+B)" icon="B" />
      <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico (Ctrl+I)" icon="I" />
      <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Tachado" icon="S" />
      <div className="w-px h-6 bg-slate-700 mx-1 self-center" /> 
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Título Grande (#)" icon="H1" />
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Subtítulo (##)" icon="H2" />
      <div className="w-px h-6 bg-slate-700 mx-1 self-center" /> 
      <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista Tópicos (-)" icon="• Lista" />
      <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista Numerada (1.)" icon="1. Lista" />
      <div className="w-px h-6 bg-slate-700 mx-1 self-center" /> 
      <MenuButton onClick={handleAddImage} isActive={editor.isActive('image')} title="Inserir Imagem" icon="🖼️" />
      <div className="w-px h-6 bg-slate-700 mx-1 self-center" /> 

      <div className="relative" ref={menuRef}>
        <MenuButton 
          onClick={() => setShowLinkMenu(!showLinkMenu)} 
          isActive={showLinkMenu} 
          title="Inserir Link Interativo de Módulo" 
          icon="🔗 Conectar" 
        />

        {showLinkMenu && (
          <div className="absolute top-full mt-2 left-0 w-80 bg-slate-800 border border-slate-600 shadow-[0_15px_50px_rgba(0,0,0,0.8)] rounded-md p-4 z-[100] flex flex-col gap-3">
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>📍</span> Cena Alvo:
              </label>
              <select 
                value={selectedSceneId} 
                onChange={(e) => {
                  setSelectedSceneId(e.target.value);
                  setLinkTargetId(''); 
                  setLinkPayload(null);
                  setLinkAction('toggle');
                }}
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-2 rounded focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {allScenes.map(scene => (
                  <option key={scene.id} value={scene.id}>
                    {scene.path} {scene.id === currentSceneId ? '(Atual)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>🧩</span> Módulo Alvo:
              </label>
              <select 
                value={linkTargetId} 
                onChange={(e) => {
                  setLinkTargetId(e.target.value);
                  setLinkPayload(null);
                  setLinkAction('toggle');
                }}
                className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-2 rounded focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="" disabled>
                  {availableModules.length > 0 ? "Selecione um módulo..." : "Nenhum módulo nesta cena."}
                </option>
                {availableModules.map(mod => {
                  let icon = '📦';
                  if (mod.type === 'audio') icon = '🎵';
                  else if (mod.type === 'pdf_crop') icon = '📕';
                  else if (mod.type === 'dice_roller') icon = '🎲';
                  else if (mod.type === 'encounter') icon = '⚔️';
                  else if (mod.type === 'text') icon = '📝';
                  
                  return (
                    <option key={mod.id} value={mod.id}>
                      {icon} {mod.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedModule?.type === 'pdf_crop' && (
              <div className="flex flex-col gap-1 bg-slate-900/50 p-2 border border-slate-700 rounded rounded-l-none border-l-2 border-l-red-500">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marca-Página:</label>
                <select 
                  value={linkPayload?.bookmarkId || ''} 
                  onChange={(e) => setLinkPayload({ bookmarkId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="" disabled>Selecione um atalho do livro...</option>
                  {selectedModule.data.bookmarks?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name} (Pág {b.page})</option>
                  ))}
                </select>
              </div>
            )}

            {selectedModule?.type === 'dice_roller' && (
              <div className="flex flex-col gap-1 bg-slate-900/50 p-2 border border-slate-700 rounded rounded-l-none border-l-2 border-l-indigo-500">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ataque/Rolagem:</label>
                <select 
                  value={linkPayload?.presetId || ''} 
                  onChange={(e) => setLinkPayload({ presetId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="" disabled>Selecione um preset salvo...</option>
                  {selectedModule.data.presets?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedModule?.type === 'audio' && (
              <div className="flex flex-col gap-1 bg-slate-900/50 p-2 border border-slate-700 rounded rounded-l-none border-l-2 border-l-blue-500">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ação do Áudio:</label>
                <select 
                  value={linkAction} 
                  onChange={(e) => setLinkAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="toggle">Tocar / Pausar (Alternar)</option>
                  <option value="play">Somente Tocar</option>
                  <option value="pause">Somente Pausar</option>
                  <option value="restart">Reiniciar do Zero</option>
                </select>
              </div>
            )}

            {/* 👇 NOVA SEÇÃO DE ÍCONE E TEXTO 👇 */}
            <div className="flex flex-col gap-2 bg-slate-950 p-2 rounded border border-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ícone:</label>
                <div className="flex flex-wrap gap-1">
                  {QUICK_ICONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setLinkIcon(emoji)}
                      className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${linkIcon === emoji ? 'bg-emerald-600 text-white shadow-inner' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Texto do Botão:</label>
                <input 
                  type="text"
                  placeholder="Ex: Rolar Percepção"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700">
              <button 
                onClick={() => setShowLinkMenu(false)}
                className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (!linkTargetId || !linkLabel) return;
                  
                  let actionCommand = 'toggle';
                  if (selectedModule?.type === 'audio') actionCommand = linkAction;
                  if (selectedModule?.type === 'pdf_crop') actionCommand = 'openBookmark';
                  if (selectedModule?.type === 'dice_roller') actionCommand = 'rollPreset';
                  if (selectedModule?.type === 'encounter') actionCommand = 'openEncounter';
                  if (selectedModule?.type === 'text') actionCommand = 'focusModule';

                  const finalPayload = { 
                    ...(linkPayload || {}), 
                    targetSceneId: selectedSceneId 
                  };

                  editor.chain().focus().insertContent({
                    type: 'actionLink',
                    attrs: { 
                      targetId: linkTargetId, 
                      action: actionCommand, 
                      label: linkLabel,
                      payload: JSON.stringify(finalPayload),
                      icon: linkIcon // 👈 MANDAMOS O ÍCONE PARA O TIPTAP SALVAR!
                    }
                  }).run();

                  setShowLinkMenu(false);
                  setLinkLabel('');
                  setLinkTargetId('');
                  setLinkPayload(null);
                  setLinkIcon('🔗'); // 👈 Reseta para o padrão
                }}
                disabled={!linkTargetId || !linkLabel || 
                  (selectedModule?.type === 'pdf_crop' && !linkPayload?.bookmarkId) ||
                  (selectedModule?.type === 'dice_roller' && !linkPayload?.presetId)
                }
                className="flex-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-emerald-900/20"
              >
                Inserir Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
interface Props {
  moduleData: TextModuleType;
  allModules?: RpgModule[]; 
  campaignNodes?: CampaignNode[]; // 👈 Nova Propriedade
  currentSceneId?: string;        // 👈 Nova Propriedade
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function TextModule({ moduleData, allModules = [], campaignNodes = [], currentSceneId = '', onUpdate }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Comece a digitar os segredos da campanha...', emptyEditorClass: 'is-editor-empty' }),
      ActionLink,
      ImageResize.configure({
        inline: false, allowBase64: true, 
        HTMLAttributes: { class: 'rounded-md border border-slate-700 shadow-md my-4 max-w-full transition-shadow' },
      } as any),
    ],
    content: moduleData.data.content,
    onUpdate: ({ editor }) => onUpdate(moduleData.id, { data: { ...moduleData.data, content: editor.getHTML() } }),
    editorProps: { attributes: { class: 'focus:outline-none min-h-[150px]' } },
  });

  if (!moduleData.isActive) return null;

  return (
    <div id={`module-${moduleData.id}`} className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-emerald-500 focus-within:shadow-emerald-900/20">
      <style>{`
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: #475569; pointer-events: none; height: 0; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid #10b981; }
        .image-resizer { border: 1px solid #10b981 !important; }
        .image-resizer__handler { background-color: #10b981 !important; border: 1px solid #064e3b !important; }
      `}</style>

      <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-emerald-400">📝</span>
          <input 
            type="text" value={moduleData.name} onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
            className="bg-transparent text-emerald-400 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-emerald-700"
            placeholder="Título da Nota..."
          />
        </div>
        <button onClick={() => onUpdate(moduleData.id, { isMinimized: !moduleData.isMinimized })} className="text-slate-500 hover:text-emerald-400 px-2 py-1 rounded transition text-sm font-bold">
          {moduleData.isMinimized ? '▼' : '▲'}
        </button>
      </div>

      {!moduleData.isMinimized && (
        <>
          <MenuBar 
            editor={editor} 
            allModules={allModules} 
            currentModuleId={moduleData.id} 
            campaignNodes={campaignNodes} 
            currentSceneId={currentSceneId} 
          />
          <div className="p-5">
            <EditorContent editor={editor} className="prose prose-invert prose-emerald max-w-none prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-300" />
          </div>
        </>
      )}
    </div>
  );
}
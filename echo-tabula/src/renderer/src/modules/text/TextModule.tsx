// src/renderer/src/modules/text/TextModule.tsx
import { useState, useEffect, useRef } from 'react';
import { TextModule as TextModuleType, RpgModule, CampaignNode } from '../../types/rpg';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageResize from 'tiptap-extension-resize-image';
import { ActionLink } from './ActionLink';
import { SearchableSelect } from '../../components/SearchableSelect';

interface MenuBarProps {
  editor: Editor | null;
  allModules: RpgModule[];
  currentModuleId: string;
  campaignNodes: CampaignNode[];
  currentSceneId: string;
  onOverlayOpenChange?: (isOpen: boolean) => void;
}

// Menu de formatação e inserção de links interativos.
const MenuBar = ({
  editor,
  allModules,
  currentModuleId,
  campaignNodes,
  currentSceneId,
  onOverlayOpenChange
}: MenuBarProps) => {
  const [, forceUpdate] = useState({});
  
  const [showLinkMenu, setShowLinkMenu] = useState(false);

  useEffect(() => {
    onOverlayOpenChange?.(showLinkMenu);

    return () => {
      onOverlayOpenChange?.(false);
    };
  }, [showLinkMenu, onOverlayOpenChange]);

  const [selectedSceneId, setSelectedSceneId] = useState<string>(currentSceneId);
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkPayload, setLinkPayload] = useState<{ bookmarkId?: string, presetId?: string } | null>(null);
  const [linkAction, setLinkAction] = useState('toggle');
  const [linkIcon, setLinkIcon] = useState('🔗');
  
  const [preventScroll, setPreventScroll] = useState(false);

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
      if (!document.body.contains(event.target as Node)) return;
      
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLinkMenu(false);
      }
    };
    if (showLinkMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLinkMenu]);

  const getScenes = (nodes: CampaignNode[], path = ''): any[] => {
    let scenes: any[] = [];
    nodes.forEach(node => {
      const newPath = path ? `${path} / ${node.name}` : node.name;
      if (node.type === 'scene') scenes.push({ id: node.id, name: node.name, path: newPath, modules: node.modules || [] });
      if (node.children) scenes = [...scenes, ...getScenes(node.children, newPath)];
    });
    return scenes;
  };
  
  const allScenes = getScenes(campaignNodes);
  const activeTargetScene = allScenes.find(s => s.id === selectedSceneId);
  
  let availableModules: RpgModule[] = [];
  if (selectedSceneId === currentSceneId) availableModules = allModules.filter(m => m.id !== currentModuleId);
  else if (activeTargetScene) availableModules = activeTargetScene.modules;

  const selectedModule = availableModules.find(m => m.id === linkTargetId);

  // Ajusta as opções do menu de link dinamicamente com base no tipo do módulo selecionado.
  useEffect(() => {
    if (selectedModule?.type === 'audio') {
      setPreventScroll(true);
      setLinkAction('toggle');
    } else if (selectedModule?.type === 'dice_roller') {
      setPreventScroll(false);
      setLinkAction('rollPreset');
    } else {
      setPreventScroll(false);
      setLinkAction('toggle');
    }
  }, [selectedModule]);

  if (!editor) return null;

  const MenuButton = ({ onClick, isActive, title, icon }: any) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`px-2 py-1 rounded text-sm font-medium transition ${isActive ? 'bg-emerald-600 text-white shadow-inner shadow-black/20' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
    >
      {icon}
    </button>
  );

  const handleAddImage = async () => {
    if (window.api && window.api.importImage) {
      const result = await window.api.importImage();
      if (result.success && result.fileName) {
        (editor.chain().focus() as any).setImage({
          src: `rpg://asset/${encodeURIComponent(result.fileName)}`
        }).run();
        return;
      }
    }
    const url = window.prompt('URL da imagem (Cole um link http...):');
    if (url) (editor.chain().focus() as any).setImage({ src: url }).run();
  };

  const QUICK_ICONS = ['🔗', '⚡', '🎵', '⚔️', '🎲', '📕', '👁️', '💬', '🎒', '🔥'];

  return (
    <div className={`flex flex-wrap gap-1 p-1 border-b border-slate-700 bg-slate-900/50 relative transition-all overflow-visible ${showLinkMenu ? 'z-[1000]' : 'z-10'}`}>
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
          <div className="absolute top-full mt-2 left-0 w-80 bg-slate-800 border border-slate-600 shadow-[0_15px_50px_rgba(0,0,0,0.8)] rounded-md p-4 z-[2000] flex flex-col gap-3">
            
            {/* BUSCA DE CENA */}
            <div className="flex flex-col gap-1 relative z-[60]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>📍</span> Cena Alvo:</label>
              <SearchableSelect 
                options={allScenes.map(s => ({ id: s.id, label: s.id === currentSceneId ? `${s.path} (Atual)` : s.path }))}
                value={selectedSceneId}
                onChange={(val) => { setSelectedSceneId(val); setLinkTargetId(''); setLinkPayload(null); setLinkAction('toggle'); }}
                placeholder="Pesquise uma cena..."
              />
            </div>

            {/* BUSCA DE MÓDULO */}
            <div className="flex flex-col gap-1 relative z-[50]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><span>🧩</span> Módulo Alvo:</label>
              <SearchableSelect 
                options={availableModules.map(m => {
                  let i = '📦';
                  if (m.type === 'audio') i = '🎵'; else if (m.type === 'pdf_crop') i = '📕'; else if (m.type === 'dice_roller') i = '🎲'; else if (m.type === 'encounter') i = '⚔️'; else if (m.type === 'text') i = '📝';
                  return { id: m.id, label: `${i} ${m.name}` };
                })}
                value={linkTargetId}
                onChange={(val) => { setLinkTargetId(val); setLinkPayload(null); setLinkAction('toggle'); }}
                placeholder={availableModules.length > 0 ? "Pesquise um módulo..." : "Nenhum módulo nesta cena."}
                disabled={availableModules.length === 0}
              />
            </div>

            {selectedModule?.type === 'pdf_crop' && (
              <div className="flex flex-col gap-1 bg-slate-900/50 p-2 border border-slate-700 rounded rounded-l-none border-l-2 border-l-red-500 relative z-[40]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marca-Página:</label>
                <SearchableSelect 
                  options={selectedModule.data.bookmarks?.map((b: any) => ({ id: b.id, label: `${b.name} (Pág ${b.page})` })) || []}
                  value={linkPayload?.bookmarkId || ''}
                  onChange={(val) => setLinkPayload({ bookmarkId: val })}
                  placeholder="Pesquise um atalho..."
                />
              </div>
            )}

            {selectedModule?.type === 'dice_roller' && (
              <div className="flex flex-col gap-2 bg-slate-900/50 p-2 border border-slate-700 rounded rounded-l-none border-l-2 border-l-indigo-500 relative z-[30]">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ataque/Preset:</label>
                  <SearchableSelect 
                    options={selectedModule.data.presets?.map((p: any) => ({ id: p.id, label: p.name })) || []}
                    value={linkPayload?.presetId || ''}
                    onChange={(val) => setLinkPayload({ presetId: val })}
                    placeholder="Pesquise um preset..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-2 mb-1">Ação do Link:</label>
                  <select value={linkAction} onChange={(e) => setLinkAction(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="rollPreset">Rolar Imediatamente</option>
                    <option value="focusModule">Apenas Rolar Tela até o Módulo</option>
                  </select>
                </div>
              </div>
            )}

            {selectedModule?.type === 'audio' && (
              <div className="flex flex-col gap-1 bg-slate-900/50 p-2 border border-slate-700 rounded rounded-l-none border-l-2 border-l-blue-500">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ação do Áudio:</label>
                <select value={linkAction} onChange={(e) => setLinkAction(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-blue-500 cursor-pointer">
                  <option value="toggle">Tocar / Pausar</option><option value="play">Somente Tocar</option><option value="pause">Somente Pausar</option><option value="restart">Reiniciar do Zero</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-2 bg-slate-950 p-2 rounded border border-slate-700 mt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ícone:</label>
                <div className="flex flex-wrap gap-1">
                  {QUICK_ICONS.map(emoji => (
                    <button key={emoji} onClick={() => setLinkIcon(emoji)} className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${linkIcon === emoji ? 'bg-emerald-600 text-white shadow-inner' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'}`}>{emoji}</button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Texto do Botão:</label>
                <input type="text" placeholder="Ex: Rolar Percepção" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded border border-slate-700">
              <input
                type="checkbox"
                id="preventScroll"
                checked={preventScroll}
                onChange={(e) => setPreventScroll(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-500 bg-slate-800 border-slate-600 rounded cursor-pointer"
              />
              <label htmlFor="preventScroll" className="text-[10px] text-slate-400 cursor-pointer select-none leading-tight">
                Executar em 2º plano <br/><span className="text-slate-500">(Não rolar a tela até o módulo)</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button onClick={() => setShowLinkMenu(false)} className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition font-medium">Cancelar</button>
              <button 
                onClick={() => {
                  if (!linkTargetId || !linkLabel) return;
                  
                  let actionCommand = 'toggle';
                  if (selectedModule?.type === 'audio') actionCommand = linkAction;
                  if (selectedModule?.type === 'pdf_crop') actionCommand = 'openBookmark';
                  if (selectedModule?.type === 'dice_roller') actionCommand = linkAction; 
                  if (selectedModule?.type === 'encounter') actionCommand = 'openEncounter';
                  if (selectedModule?.type === 'text') actionCommand = 'focusModule';

                  const finalPayload = { ...(linkPayload || {}), targetSceneId: selectedSceneId };

                  editor.chain().focus().insertContent({
                    type: 'actionLink',
                    attrs: { 
                      targetId: linkTargetId, 
                      action: actionCommand, 
                      label: linkLabel,
                      payload: JSON.stringify(finalPayload),
                      icon: linkIcon,
                      preventScroll: preventScroll
                    }
                  }).run();

                  setShowLinkMenu(false); setLinkLabel(''); setLinkTargetId(''); setLinkPayload(null); setLinkIcon('🔗');
                }}
                disabled={!linkTargetId || !linkLabel || (selectedModule?.type === 'pdf_crop' && !linkPayload?.bookmarkId) || (selectedModule?.type === 'dice_roller' && !linkPayload?.presetId)}
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

// Componente principal do módulo de texto, que inclui o editor e o menu de formatação.
interface Props {
  moduleData: TextModuleType;
  allModules?: RpgModule[];
  campaignNodes?: CampaignNode[];
  currentSceneId?: string;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
  onContentUpdate?: (id: string, updatedFields: Partial<RpgModule>) => void;
  onOverlayOpenChange?: (isOpen: boolean) => void;
}

const normalizeRpgAssetUrls = (html: string) => {
  return html.replace(/src="rpg:\/\/(?!asset\/)([^"]+)"/g, (_match, fileName) => {
    const cleanFileName = decodeURIComponent(fileName)
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')

    return `src="rpg://asset/${encodeURIComponent(cleanFileName)}"`
  })
}

export function TextModule({
  moduleData,
  allModules = [],
  campaignNodes = [],
  currentSceneId = '',
  onUpdate,
  onContentUpdate,
  onOverlayOpenChange
}: Props) {

  const [draftName, setDraftName] = useState(moduleData.name);

  // Sincroniza o nome do módulo com o estado local para edição.
  useEffect(() => {
    setDraftName(moduleData.name);
  }, [moduleData.name]);

  const commitName = () => {
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      setDraftName(moduleData.name);
      return;
    }

    if (trimmedName !== moduleData.name) {
      onUpdate(moduleData.id, { name: trimmedName });
    }
  };

  const updateContent = onContentUpdate ?? onUpdate;

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
    content: normalizeRpgAssetUrls(moduleData.data.content),
    onUpdate: ({ editor }) => {
      const normalizedHtml = normalizeRpgAssetUrls(editor.getHTML());

      updateContent(moduleData.id, {
        data: {
          ...moduleData.data,
          content: normalizedHtml
        }
      });
    },
    editorProps: { attributes: { class: 'focus:outline-none min-h-[150px]' } },
  });

  if (!moduleData.isActive) return null;

  return (
    <div id={`module-${moduleData.id}`} className="relative overflow-visible border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-emerald-500 focus-within:shadow-emerald-900/20">
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
            type="text" 
            value={draftName} 
            onChange={(e) => setDraftName(e.target.value)} 
            onBlur={commitName} 
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();

              if (e.key === 'Escape') {
                setDraftName(moduleData.name);
                e.currentTarget.blur();
              }
            }}
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
            onOverlayOpenChange={onOverlayOpenChange}
          />
          <div className="p-5">
            <EditorContent editor={editor} className="prose prose-invert prose-emerald max-w-none prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-300" />
          </div>
        </>
      )}
    </div>
  );
}
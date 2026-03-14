// src/renderer/src/components/TextModule.tsx
import { TextModule as TextModuleType, RpgModule } from '../types/rpg';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// --- SUBCOMPONENTE: A BARRA DE FERRAMENTAS ---
const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  // Uma função auxiliar para desenhar os botões bonitinhos
  const MenuButton = ({ onClick, isActive, title, icon }: any) => (
    <button
      onClick={onClick}
      title={title} // ISSO AQUI CRIA O TOOLTIP!
      className={`px-2 py-1 rounded text-sm font-medium transition ${
        isActive 
          ? 'bg-emerald-600 text-white' 
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 p-1 border-b border-slate-700 bg-slate-900/50">
      <MenuButton 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        isActive={editor.isActive('bold')} 
        title="Negrito (Ctrl+B)" icon="B" 
      />
      <MenuButton 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        isActive={editor.isActive('italic')} 
        title="Itálico (Ctrl+I)" icon="I" 
      />
      <MenuButton 
        onClick={() => editor.chain().focus().toggleStrike().run()} 
        isActive={editor.isActive('strike')} 
        title="Tachado (Ctrl+Shift+X)" icon="S" 
      />
      
      <div className="w-px h-6 bg-slate-700 mx-1 self-center" /> {/* Divisor */}

      <MenuButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
        isActive={editor.isActive('heading', { level: 1 })} 
        title="Título Grande (#)" icon="H1" 
      />
      <MenuButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
        isActive={editor.isActive('heading', { level: 2 })} 
        title="Subtítulo (##)" icon="H2" 
      />
      
      <div className="w-px h-6 bg-slate-700 mx-1 self-center" /> {/* Divisor */}

      <MenuButton 
        onClick={() => editor.chain().focus().toggleBulletList().run()} 
        isActive={editor.isActive('bulletList')} 
        title="Lista de Tópicos (-)" icon="• Lista" 
      />
      <MenuButton 
        onClick={() => editor.chain().focus().toggleOrderedList().run()} 
        isActive={editor.isActive('orderedList')} 
        title="Lista Numerada (1.)" icon="1. Lista" 
      />
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
interface Props {
  moduleData: TextModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function TextModule({ moduleData, onUpdate }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: moduleData.data.content,
    onUpdate: ({ editor }) => {
      onUpdate(moduleData.id, { 
        data: { ...moduleData.data, content: editor.getHTML() } 
      });
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[150px]',
      },
    },
  });

  if (!moduleData.isActive) return null;

  return (
    <div className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-emerald-500 focus-within:shadow-emerald-900/20">
      
      <div className="flex items-center gap-2 p-3 border-b border-slate-700/50 bg-slate-800/50">
        <span className="text-emerald-400">📝</span>
        <input 
          type="text"
          value={moduleData.name}
          onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
          className="bg-transparent text-emerald-400 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-emerald-700"
          placeholder="Título da Nota..."
        />
      </div>

      {/* A BARRA DE FERRAMENTAS ENTRA AQUI! */}
      <MenuBar editor={editor} />

      <div className="p-5">
        <EditorContent 
          editor={editor} 
          className="prose prose-invert prose-emerald max-w-none prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-300" 
        />
      </div>

    </div>
  );
}
// src/renderer/src/components/ActionLink.tsx
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

const ActionLinkComponent = (props: any) => {
  // 👇 AGORA RECEBEMOS O ICONE TAMBÉM! 👇
  const { targetId, action, label, payload, icon } = props.node.attrs;

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('rpg-module-action', {
      detail: { 
        targetId, 
        action, 
        payload: payload ? JSON.parse(payload) : null 
      }
    }));

    setTimeout(() => {
      const targetElement = document.getElementById(`module-${targetId}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        targetElement.classList.add('ring-4', 'ring-emerald-500', 'ring-opacity-50', 'transition-all');
        setTimeout(() => {
          targetElement.classList.remove('ring-4', 'ring-emerald-500', 'ring-opacity-50');
        }, 1500);

        if (action === 'rollPreset') {
          setTimeout(() => {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 800); 
        }
      }
    }, 150); 
  };

  return (
    <NodeViewWrapper className="inline-block mx-1 align-middle">
      <button
        onClick={handleClick}
        contentEditable={false}
        className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold hover:bg-emerald-600/40 hover:scale-105 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
        title={`Ação: ${action} | Módulo: ${targetId}`}
      >
        {/* 👇 O ÍCONE ENTRA AQUI (Com fallback para a corrente) 👇 */}
        <span className="text-[10px]">{icon || '🔗'}</span>
        <span>{label}</span>
      </button>
    </NodeViewWrapper>
  );
};

export const ActionLink = Node.create({
  name: 'actionLink',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      targetId: { default: null },
      action: { default: 'toggle' },
      label: { default: 'Ação' },
      payload: { default: null }, 
      icon: { default: '🔗' }, // 👈 NOVO ATRIBUTO REGISTRADO AQUI
    };
  },

  parseHTML() {
    return [{ tag: 'rpg-action-link' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['rpg-action-link', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ActionLinkComponent);
  },
});
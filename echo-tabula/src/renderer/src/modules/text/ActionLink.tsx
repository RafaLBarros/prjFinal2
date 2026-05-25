// src/renderer/src/modules/text/ActionLink.tsx
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { moduleEventBus } from '../../core/events/moduleEventBus';

const ActionLinkComponent = (props: any) => {
  const { targetId, action, label, payload, icon, preventScroll } = props.node.attrs;

  const handleClick = () => {
    // Emite o evento global para que o módulo alvo possa reagir à ação.
    moduleEventBus.emitModuleAction({
      targetId,
      action,
      payload: payload ? JSON.parse(payload) : null,
      preventScroll
    });

    if (preventScroll === true || preventScroll === 'true') {
      return; 
    }

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
      icon: { default: '🔗' }, 
      
      preventScroll: { 
        default: false,
        parseHTML: element => element.getAttribute('data-prevent-scroll') === 'true',
        renderHTML: attributes => {
          if (!attributes.preventScroll) return {};
          return { 'data-prevent-scroll': 'true' };
        }
      },
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
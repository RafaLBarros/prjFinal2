// src/renderer/src/components/ActionLink.tsx
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';

const ActionLinkComponent = (props: any) => {
  // Agora recebemos um "payload" opcional (para o ID do marca-página ou dado)
  const { targetId, action, label, payload } = props.node.attrs;

  const handleClick = () => {
    // 1. O Grito no Megafone 
    window.dispatchEvent(new CustomEvent('rpg-module-action', {
      detail: { 
        targetId, 
        action, 
        payload: payload ? JSON.parse(payload) : null 
      }
    }));

    // 2. O Deslize Inicial (Após o React tirar o isMinimized)
    setTimeout(() => {
      const targetElement = document.getElementById(`module-${targetId}`);
      if (targetElement) {
        // Rola até o módulo
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Efeito visual do anel piscando
        targetElement.classList.add('ring-4', 'ring-emerald-500', 'ring-opacity-50', 'transition-all');
        setTimeout(() => {
          targetElement.classList.remove('ring-4', 'ring-emerald-500', 'ring-opacity-50');
        }, 1500);

        // 🎥 A CÂMERA DINÂMICA ENTRA AQUI 🎥
        // Se for a rolagem de dados, sabemos que após 700ms a caixa vai crescer.
        // Aos 800ms, damos um segundo ajuste de câmera super suave para focar no resultado!
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
        className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-xs font-bold hover:bg-emerald-600/40 hover:scale-105 transition cursor-pointer flex items-center gap-1 shadow-sm"
        title={`Ação: ${action} | Módulo: ${targetId}`}
      >
        <span>▶</span> {label}
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
      payload: { default: null }, // O novo pacote de dados para o PDF/Dados
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
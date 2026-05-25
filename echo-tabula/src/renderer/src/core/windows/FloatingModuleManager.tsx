// src/renderer/src/core/windows/FloatingModuleManager.tsx

import { useState, useEffect, useRef } from 'react';
import { CampaignNode, RpgModule, TextModule as TextType, AudioModule as AudioType, PdfCropModule as PdfType, EncounterModule as EncounterType, DiceRollerModule as DiceRollerType } from '../../types/rpg';
import { TextModule } from '../../modules/text';
import { AudioModule } from '../../modules/audio';
import { PdfModule } from '../../modules/pdf';
import { EncounterModule } from '../../modules/encounter';
import { DiceRollerModule } from '../../modules/dice';

interface Props {
  tree: CampaignNode[];
  onUpdateModuleGlobal: (sceneId: string, moduleId: string, updatedFields: Partial<RpgModule>) => void;
}

interface FloatedItem {
  sceneId: string;
  sceneModules: RpgModule[];
  module: RpgModule;
}

// Janela Flutuante para Módulos.
function FloatingWindow({ item, tree, onUpdateModuleGlobal }: { item: FloatedItem, tree: CampaignNode[], onUpdateModuleGlobal: any }) {
  const { sceneId, sceneModules, module } = item;
  
  const [position, setPosition] = useState({ 
    x: window.innerWidth / 2 - 250 + (Math.random() * 40), 
    y: 100 + (Math.random() * 40) 
  });
  
  const [size, setSize] = useState({ w: 500, h: 400 });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);
  
  const resizeRef = useRef<{ startX: number, startY: number, startW: number, startH: number, startPosX: number, startPosY: number, dir: string } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y };
  };

  const handleResizeStart = (e: React.MouseEvent, dir: string) => {
    e.stopPropagation(); 
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
      startPosX: position.x,
      startPosY: position.y,
      dir
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Lógica de Arrastar.
      if (isDragging && dragRef.current) {
        setPosition({
          x: Math.max(0, dragRef.current.initialX + (e.clientX - dragRef.current.startX)),
          y: Math.max(0, dragRef.current.initialY + (e.clientY - dragRef.current.startY))
        });
      } 
      // Redimensionar de acordo com a borda arrastada.
      else if (isResizing && resizeRef.current) {
        const { startX, startY, startW, startH, startPosX, startPosY, dir } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newW = startW;
        let newH = startH;
        let newX = startPosX;
        let newY = startPosY;

        const MIN_W = 300;
        const MIN_H = 150;

        // Borda Direita
        if (dir.includes('e')) newW = Math.max(MIN_W, startW + dx);
        // Borda Inferior
        if (dir.includes('s')) newH = Math.max(MIN_H, startH + dy);
        // Borda Esquerda
        if (dir.includes('w')) {
          newW = Math.max(MIN_W, startW - dx);
          if (newW > MIN_W) newX = startPosX + dx;
        }
        // Borda Superior
        if (dir.includes('n')) {
          newH = Math.max(MIN_H, startH - dy);
          if (newH > MIN_H) newY = startPosY + dy;
        }

        setSize({ w: newW, h: newH });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing]);

  const handleUpdate = (id: string, fields: Partial<RpgModule>) => {
    onUpdateModuleGlobal(sceneId, id, fields);
  };

  let icon = '📦';
  if (module.type === 'audio') icon = '🎵';
  else if (module.type === 'pdf_crop') icon = '📕';
  else if (module.type === 'dice_roller') icon = '🎲';
  else if (module.type === 'encounter') icon = '⚔️';
  else if (module.type === 'text') icon = '📝';

  return (
    <div 
      className={`fixed shadow-[0_30px_60px_rgba(0,0,0,0.6)] rounded-lg flex flex-col bg-slate-950 border border-slate-600 focus-within:z-[999] transition-opacity ${isDragging || isResizing ? 'opacity-90 z-[999]' : 'opacity-100 z-[900]'}`}
      style={{ left: position.x, top: position.y, width: size.w, height: size.h }}
      onMouseDownCapture={(e) => {
        const allWindows = document.querySelectorAll('.rpg-floating-window');
        allWindows.forEach(w => (w as HTMLElement).style.zIndex = '900');
        e.currentTarget.style.zIndex = '999';
      }}
    >
      {/* Bordas Laterais */}
      <div onMouseDown={(e) => handleResizeStart(e, 'n')} className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize z-50" />
      <div onMouseDown={(e) => handleResizeStart(e, 's')} className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize z-50" />
      <div onMouseDown={(e) => handleResizeStart(e, 'e')} className="absolute top-2 right-0 bottom-2 w-1.5 cursor-e-resize z-50" />
      <div onMouseDown={(e) => handleResizeStart(e, 'w')} className="absolute top-2 left-0 bottom-2 w-1.5 cursor-w-resize z-50" />
      {/* Quinas */}
      <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-50" />
      <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-50" />
      <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-50" />
      <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-50" />

      {/* CABEÇALHO */}
      <div 
        onMouseDown={handleMouseDown}
        className="bg-slate-800 border-b border-slate-700 px-3 py-2 cursor-grab active:cursor-grabbing flex justify-between items-center rounded-t-lg group select-none shrink-0"
      >
        <span className="text-xs font-bold text-slate-300 flex items-center gap-2 pointer-events-none">
          <span>{icon}</span> {module.name}
        </span>
        <button 
          onClick={() => handleUpdate(module.id, { isFloated: false })}
          className="text-slate-500 hover:text-red-400 hover:bg-slate-700 w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer"
          title="Devolver para a cena"
          onMouseDown={(e) => e.stopPropagation()} 
        >
          ✕
        </button>
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 overflow-auto bg-slate-900 rounded-b-lg scrollbar-thin scrollbar-thumb-slate-700 relative">
        <div className="p-4 min-w-[768px] min-h-max pointer-events-auto">
          {module.type === 'text' && <TextModule moduleData={module as TextType} allModules={sceneModules} campaignNodes={tree} currentSceneId={sceneId} onUpdate={handleUpdate} />}
          {module.type === 'audio' && <AudioModule moduleData={module as AudioType} onUpdate={handleUpdate} />}
          {module.type === 'pdf_crop' && <PdfModule moduleData={module as PdfType} onUpdate={handleUpdate} />}
          {module.type === 'encounter' && <EncounterModule moduleData={module as EncounterType} onUpdate={handleUpdate} />}
          {module.type === 'dice_roller' && <DiceRollerModule moduleData={module as DiceRollerType} onUpdate={handleUpdate} />}
        </div>
      </div>
    </div>
  );
}

// Componente que percorre a arvore para renderizar modulos flutuantes.
export function FloatingModuleManager({ tree, onUpdateModuleGlobal }: Props) {
  
  // Localiza recursivamente módulos desencaixados na árvore da campanha.
  const getFloatedModules = (nodes: CampaignNode[]): FloatedItem[] => {
    let items: FloatedItem[] = [];
    nodes.forEach(node => {
      if (node.type === 'scene' && node.modules) {
        node.modules.forEach(mod => {
          if (mod.isFloated) {
            items.push({ sceneId: node.id, sceneModules: node.modules || [], module: mod });
          }
        });
      }
      if (node.children) {
        items = [...items, ...getFloatedModules(node.children)];
      }
    });
    return items;
  };

  const floatedItems = getFloatedModules(tree);

  if (floatedItems.length === 0) return null;

  return (
    <>
      {floatedItems.map(item => (
        <FloatingWindow 
          key={`float-${item.module.id}`} 
          item={item} 
          tree={tree} 
          onUpdateModuleGlobal={onUpdateModuleGlobal} 
        />
      ))}
    </>
  );
}
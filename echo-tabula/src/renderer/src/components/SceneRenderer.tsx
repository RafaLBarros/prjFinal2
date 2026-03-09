// src/renderer/src/components/SceneRenderer.tsx
import { RpgModule } from '../types/rpg';
import { TextModule } from './TextModule';
import { AudioModule } from './AudioModule';

interface Props {
  modules: RpgModule[];
  onUpdateModule: (id: string, updatedFields: Partial<RpgModule>) => void; // <-- Adicionamos aqui
}

export function SceneRenderer({ modules, onUpdateModule }: Props) {
  // Se a cena não tiver módulos, avisamos o usuário
  if (!modules || modules.length === 0) {
    return <p className="text-slate-500 italic">Esta cena ainda está vazia.</p>;
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-3xl mx-auto">
      {modules.map((module) => {
        // A FÁBRICA: Olhamos o 'type' e retornamos o componente correto
        switch (module.type) {
          case 'text':
            return <TextModule key={module.id} moduleData={module} onUpdate={onUpdateModule} />; // <-- Repassamos
          
          case 'audio':
            return <AudioModule key={module.id} moduleData={module} onUpdate={onUpdateModule} />; // <-- Repassamos
            
          case 'pdf_crop':
            // Ainda não implementamos este, então retornamos um aviso provisório
            return (
              <div key={module.id} className="border border-red-900 bg-red-950 p-4 rounded text-red-200 mb-4">
                Em breve: Módulo de Imagem/PDF
              </div>
            );

          default: {
            // Se o arquivo JSON estiver corrompido no HD e tiver um "type: 'magia'", 
            // ele vai cair aqui. Fazemos um cast seguro (as any) apenas para extrair um ID de fallback
            // e não quebrar o React.
            const unknownModule = module as any;
            const fallbackId = unknownModule.id || Math.random().toString();
            
            return (
              <div key={fallbackId} className="border border-red-900 bg-red-950 p-4 rounded text-red-200 mb-4">
                ⚠️ Erro: Tipo de módulo "{unknownModule.type || 'desconhecido'}" não é suportado pelo sistema.
              </div>
            );
          }
        }
      })}
    </div>
  );
}
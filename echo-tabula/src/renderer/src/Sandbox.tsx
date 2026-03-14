// src/renderer/src/Sandbox.tsx
import { useState } from 'react';
import { RpgModule, AudioModule as AudioModuleType } from './types/rpg'; // Adicionamos a importação específica do Áudio
import { AudioModule } from './components/AudioModule';

export function Sandbox() {
  // Criamos um dado falso (mock) apenas para testar o módulo
  const [mockData, setMockData] = useState<AudioModuleType>({
    id: 'teste-123',
    name: 'Módulo de Teste',
    type: 'audio', // Mudaremos dependendo do que estivermos testando
    isActive: true,
    data: {
      urlOrPath: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Lofi hip hop radio
      volume: 0.5,
      loop: true
    }
  });

  // A função que simula a via de mão dupla (Two-Way Data Binding)
  const handleUpdate = (id: string, updatedFields: Partial<RpgModule>) => {
    setMockData((prev) => ({ ...prev, ...updatedFields }) as AudioModuleType);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-10 flex flex-col items-center">
      <h1 className="text-2xl text-slate-400 mb-8 font-mono">🧪 Bancada de Testes Isolada</h1>
      
      <div className="w-full max-w-xl">
        {/* Aqui plugaremos o módulo puro */}
        <AudioModule moduleData={mockData} onUpdate={handleUpdate} />
      </div>

      <div className="mt-10 w-full max-w-xl p-4 bg-black text-green-500 font-mono text-sm rounded">
        <p className="text-slate-500 mb-2">// Estado em Tempo Real (O que o módulo está devolvendo):</p>
        <pre>{JSON.stringify(mockData, null, 2)}</pre>
      </div>
    </div>
  );
}
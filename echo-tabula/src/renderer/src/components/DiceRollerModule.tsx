// src/renderer/src/components/DiceRollerModule.tsx
import { DiceRollerModule as DiceModuleType, RpgModule, DicePreset } from '../types/rpg';
import { useState, useEffect } from 'react';

interface Props {
  moduleData: DiceModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

interface RollResult {
  total: number;
  modifier: number;
  details: { face: number; rolls: number[] }[];
}

export function DiceRollerModule({ moduleData, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);

  // --- ESTADOS DO MOTOR ---
  const [diceCounts, setDiceCounts] = useState<Record<number, number>>({
    4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0, 100: 0
  });
  const [modifier, setModifier] = useState<number>(0);
  const [isRolling, setIsRolling] = useState(false);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);

  // --- ESTADO DO NOVO PRESET ---
  const [newPresetName, setNewPresetName] = useState('');

  const diceFaces = [4, 6, 8, 10, 12, 20, 100];
  const presets: DicePreset[] = moduleData.data.presets || [];

  // --- O OUVIDO BIÔNICO (Barramento de Eventos) ---
  
  useEffect(() => {
    const handleModuleAction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { targetId, action, payload } = customEvent.detail;

      if (targetId !== moduleData.id) return;

      if (action === 'rollPreset' && payload?.presetId) {
        const targetPreset = presets.find(p => p.id === payload.presetId);
        
        if (targetPreset) {
          // 1. Carrega os dados do preset na mesa visualmente
          setDiceCounts(targetPreset.dice);
          setModifier(targetPreset.modifier);
          
          // 2. Avisa o Pai para expandir o módulo caso esteja minimizado
          if (moduleData.isMinimized) {
            onUpdate(moduleData.id, { isMinimized: false });
          }

          // 3. (MÁGICA EXTRA) - Simula o clique no botão de rolar usando os dados do preset!
          // Fazemos um setTimeout rapidinho pra dar tempo do React atualizar a mesa visualmente
          setTimeout(() => {
            setIsRolling(true);
            setRollResult(null); 
            
            setTimeout(() => {
              let grandTotal = 0;
              const details: { face: number; rolls: number[] }[] = [];
        
              diceFaces.forEach(face => {
                const count = targetPreset.dice[face];
                if (count > 0) {
                  const rolls: number[] = [];
                  for (let i = 0; i < count; i++) {
                    const roll = Math.floor(Math.random() * face) + 1;
                    rolls.push(roll);
                    grandTotal += roll;
                  }
                  details.push({ face, rolls });
                }
              });
        
              grandTotal += targetPreset.modifier;
              setRollResult({ total: grandTotal, modifier: targetPreset.modifier, details });
              setIsRolling(false); 
            }, 600); // O tempo da animação dos dados
          }, 100); 
        }
      }
    };

    window.addEventListener('rpg-module-action', handleModuleAction);
    return () => window.removeEventListener('rpg-module-action', handleModuleAction);
  }, [moduleData.id, moduleData.isMinimized, presets, onUpdate]); 
  // 👆 FIM DO BLOCO ADICIONADO 👆

  // --- FUNÇÕES DA MESA ---
  const handleAddDie = (face: number) => {
    setDiceCounts(prev => ({ ...prev, [face]: prev[face] + 1 }));
  };

  const handleRemoveDie = (e: React.MouseEvent, face: number) => {
    e.preventDefault(); 
    setDiceCounts(prev => ({ ...prev, [face]: Math.max(0, prev[face] - 1) }));
  };

  const clearTable = () => {
    setDiceCounts({ 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0, 100: 0 });
    setModifier(0);
    setRollResult(null);
  };

  // --- FUNÇÕES DE PRESET (A FASE 3) ---
  const hasDiceOnTable = Object.values(diceCounts).some(count => count > 0);

  const handleSavePreset = () => {
    if (!newPresetName.trim() || !hasDiceOnTable) return;

    const newPreset: DicePreset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      dice: { ...diceCounts } as DicePreset['dice'], // Copia exata do que está na mesa
      modifier: modifier
    };

    onUpdate(moduleData.id, {
      data: { ...moduleData.data, presets: [...presets, newPreset] }
    });

    setNewPresetName(''); // Limpa o campo de nome
  };

  const handleRemovePreset = (presetId: string) => {
    const updatedPresets = presets.filter(p => p.id !== presetId);
    onUpdate(moduleData.id, {
      data: { ...moduleData.data, presets: updatedPresets }
    });
  };

  // Quando clica no Preset, ele joga todos os dados na mesa de uma vez!
  const loadPreset = (preset: DicePreset) => {
    setDiceCounts(preset.dice);
    setModifier(preset.modifier);
    setRollResult(null); // Limpa o resultado antigo para não confundir
  };

  // --- O MOTOR DE ROLAGEM ---
  const executeRoll = () => {
    if (!hasDiceOnTable) return;

    setIsRolling(true);
    setRollResult(null); 

    setTimeout(() => {
      let grandTotal = 0;
      const details: { face: number; rolls: number[] }[] = [];

      diceFaces.forEach(face => {
        const count = diceCounts[face];
        if (count > 0) {
          const rolls: number[] = [];
          for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * face) + 1;
            rolls.push(roll);
            grandTotal += roll;
          }
          details.push({ face, rolls });
        }
      });

      grandTotal += modifier;

      setRollResult({ total: grandTotal, modifier, details });
      setIsRolling(false); 
    }, 600);
  };

  if (!moduleData.isActive) return null;

  return (
    <div id={`module-${moduleData.id}`}className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-indigo-500 focus-within:shadow-indigo-900/20">
      
      {/* ANIMAÇÃO */}
      <style>{`
        @keyframes diceShake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-5deg); }
          20% { transform: translate(-3px, 0px) rotate(5deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(5deg); }
          50% { transform: translate(-1px, 2px) rotate(-5deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-5deg); }
          80% { transform: translate(-1px, -1px) rotate(5deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-5deg); }
        }
        .rolling-dice { animation: diceShake 0.3s infinite; }
      `}</style>

      {/* CABEÇALHO PADRONIZADO */}
      <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-indigo-400">🎲</span>
          <input 
            type="text"
            value={moduleData.name}
            onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })}
            className="bg-transparent text-indigo-400 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-indigo-800"
            placeholder="Mesa de Dados"
          />
        </div>
        <button onClick={() => onUpdate(moduleData.id, { isMinimized: !moduleData.isMinimized })} className="text-slate-500 hover:text-indigo-400 px-2 py-1 rounded transition text-sm font-bold">
          {moduleData.isMinimized ? '▼' : '▲'}
        </button>
        <button onClick={() => setIsEditing(!isEditing)} className="text-slate-400 hover:text-white text-sm bg-slate-700 px-2 py-1 rounded ml-2">
          {isEditing ? 'Ocultar Presets' : '⚙️ Presets'}
        </button>
      </div>

      {!moduleData.isMinimized && (
        <div className="p-4 flex flex-col gap-5">
          
          {/* --- A FÁBRICA DE PRESETS (FASE 3) --- */}
          {isEditing && (
            <div className="bg-slate-900 p-4 rounded border border-slate-700 shadow-inner flex flex-col gap-3">
              <h4 className="text-sm font-bold text-indigo-400 mb-1">Salvar Rolagem Atual</h4>
              
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <input 
                    type="text" 
                    value={newPresetName} 
                    onChange={e => setNewPresetName(e.target.value)} 
                    placeholder="Nome do Ataque (Ex: Espada de Ícaro)" 
                    className="w-full bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-indigo-500 focus:outline-none" 
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  />
                </div>
                <button 
                  onClick={handleSavePreset} 
                  disabled={!newPresetName.trim() || !hasDiceOnTable} 
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded transition"
                  title={!hasDiceOnTable ? "Adicione dados à mesa primeiro!" : "Salvar Preset"}
                >
                  Salvar
                </button>
              </div>

              {/* LISTA DE PRESETS SALVOS */}
              <div className="flex flex-wrap gap-2 mt-2">
                {presets.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum preset salvo nesta mesa.</p>
                ) : (
                  presets.map(p => (
                    <div key={p.id} className="flex items-center bg-slate-800 border border-slate-600 rounded-full overflow-hidden shadow-sm group hover:border-indigo-500 transition-colors">
                      <button 
                        onClick={() => loadPreset(p)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white hover:bg-slate-700 transition"
                      >
                        {p.name}
                      </button>
                      <button 
                        onClick={() => handleRemovePreset(p.id)}
                        className="px-2 py-1.5 bg-slate-800 border-l border-slate-700 hover:bg-red-900/80 text-slate-500 hover:text-red-400 transition"
                        title="Remover Preset"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- A MESA DE DADOS (Área Principal) --- */}
          <div className="flex flex-col items-center bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-inner relative">
            
            <button onClick={clearTable} className="absolute top-3 right-3 text-xs text-slate-500 hover:text-red-400 transition underline">
              Limpar Mesa
            </button>

            <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-bold">Escolha os Dados</p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {diceFaces.map(face => {
                const count = diceCounts[face];
                const isSelected = count > 0;
                
                return (
                  <button
                    key={face}
                    onClick={() => handleAddDie(face)}
                    onContextMenu={(e) => handleRemoveDie(e, face)}
                    className={`relative w-14 h-14 flex items-center justify-center rounded-lg font-black text-lg transition-all transform hover:scale-105 active:scale-95 select-none
                      ${isRolling ? 'rolling-dice pointer-events-none' : ''} 
                      ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 border-2 border-indigo-400' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-indigo-300'}`}
                    title="Botão Esquerdo: Adicionar | Botão Direito: Remover"
                  >
                    D{face}
                    {isSelected && (
                      <span className="absolute -top-2 -right-2 bg-amber-500 text-amber-950 w-5 h-5 rounded-full text-xs flex items-center justify-center shadow font-black border-2 border-slate-900">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 w-full max-w-md bg-slate-900 p-2 rounded-full border border-slate-800 shadow-md">
              <div className="flex items-center pl-4 gap-2">
                <span className="text-slate-400 font-bold text-sm">Bônus</span>
                <input 
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(Number(e.target.value) || 0)}
                  className="w-16 bg-slate-950 border border-slate-700 text-indigo-400 font-black text-center p-1.5 rounded focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={executeRoll}
                disabled={isRolling || !hasDiceOnTable}
                className={`flex-1 font-black text-lg uppercase tracking-wider py-2 px-6 rounded-full transition-all shadow-lg
                  ${isRolling ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-900/50 hover:shadow-indigo-500/50'}`}
              >
                {isRolling ? 'Rolando...' : 'Rolar os Dados!'}
              </button>
            </div>

            {/* --- EXIBIÇÃO DO RESULTADO --- */}
            {rollResult && !isRolling && (
              <div className="mt-6 w-full max-w-md animate-in zoom-in-95 fade-in duration-200">
                <div className="bg-indigo-950/40 border border-indigo-500/50 rounded-xl p-4 flex flex-col items-center shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                  <p className="text-indigo-300 text-sm font-bold uppercase tracking-widest mb-1">Resultado Total</p>
                  <h1 className="text-6xl font-black text-white mb-4 drop-shadow-md">{rollResult.total}</h1>
                  <div className="w-full bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                    <p className="text-xs text-slate-500 mb-2 font-mono uppercase">Detalhamento:</p>
                    <div className="flex flex-col gap-1 text-sm">
                      {rollResult.details.map((group, idx) => (
                        <div key={idx} className="flex items-center justify-between font-mono">
                          <span className="text-indigo-400 font-bold">D{group.face}</span>
                          <span className="text-slate-300">[{group.rolls.join(', ')}]</span>
                        </div>
                      ))}
                      {rollResult.modifier !== 0 && (
                        <div className="flex items-center justify-between font-mono pt-1 border-t border-slate-800/80 mt-1">
                          <span className="text-slate-500 font-bold">Bônus</span>
                          <span className={rollResult.modifier > 0 ? "text-emerald-400" : "text-red-400"}>
                            {rollResult.modifier > 0 ? '+' : ''}{rollResult.modifier}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
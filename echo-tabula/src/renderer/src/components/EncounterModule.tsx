// src/renderer/src/components/EncounterModule.tsx
import { EncounterModule as EncounterModuleType, RpgModule, Combatant, CombatantEffect } from '../types/rpg';
import { useState, useEffect } from 'react';

interface Props {
  moduleData: EncounterModuleType;
  onUpdate: (id: string, updatedFields: Partial<RpgModule>) => void;
}

export function EncounterModule({ moduleData, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newInitiative, setNewInitiative] = useState('');
  const [newHp, setNewHp] = useState('');
  const [newMaxHp, setNewMaxHp] = useState('');
  const [newFaction, setNewFaction] = useState<'enemy' | 'ally' | 'player'>('enemy');

  const [addingEffectTo, setAddingEffectTo] = useState<string | null>(null);
  const [newEffName, setNewEffName] = useState('');
  const [newEffDur, setNewEffDur] = useState('');
  const [turnAlerts, setTurnAlerts] = useState<{ name: string; alerts: string[] } | null>(null);

  const combatants: Combatant[] = moduleData.data.combatants || [];

  // 👇 ADICIONE ESTE BLOCO AQUI 👇
  // --- O OUVIDO BIÔNICO (Barramento de Eventos) ---

  useEffect(() => {
    const handleModuleAction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { targetId, action } = customEvent.detail;

      // Se o grito não for pra esse módulo, ignora
      if (targetId !== moduleData.id) return;

      // Se a ação for "abrir combate", nós expandimos o módulo
      if (action === 'openEncounter') {
        if (moduleData.isMinimized) {
          onUpdate(moduleData.id, { isMinimized: false });
        }
      }
    };

    window.addEventListener('rpg-module-action', handleModuleAction);
    return () => window.removeEventListener('rpg-module-action', handleModuleAction);
  }, [moduleData.id, moduleData.isMinimized, onUpdate]);
  // 👆 FIM DO BLOCO 👆

  const handleAddCombatant = () => {
    if (!newName.trim() || !newInitiative.trim()) return;

    const newCombatant: Combatant = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      initiative: Number(newInitiative),
      hp: newHp ? Number(newHp) : undefined,
      maxHp: newMaxHp ? Number(newMaxHp) : (newHp ? Number(newHp) : undefined),
      faction: newFaction,
      isDefeated: false,
      effects: []
    };

    const updatedList = [...combatants, newCombatant].sort((a, b) => b.initiative - a.initiative);
    onUpdate(moduleData.id, { data: { ...moduleData.data, combatants: updatedList } });

    setNewName('');
    setNewInitiative('');
    setNewHp('');
    setNewMaxHp('');
  };

  const handleRemoveCombatant = (idToRemove: string) => {
    const updatedList = combatants.filter(c => c.id !== idToRemove);
    onUpdate(moduleData.id, { data: { ...moduleData.data, combatants: updatedList } });
  };

  const handleNextTurn = () => {
    if (combatants.length === 0) return;

    const currentIndex = combatants.findIndex(c => c.id === moduleData.data.currentTurnId);
    let nextIndex = currentIndex + 1;
    let nextRound = moduleData.data.round;

    let safeLoop = 0;
    while (safeLoop <= combatants.length) {
      if (nextIndex >= combatants.length) {
        nextIndex = 0;
        nextRound += 1; 
      }
      if (!combatants[nextIndex].isDefeated) {
        break;
      }
      nextIndex++;
      safeLoop++;
    }

    const nextCombatant = combatants[nextIndex];
    const activeAlerts: string[] = [];

    const updatedEffects = nextCombatant.effects.map(eff => {
      const newDuration = eff.duration - 1;
      
      if (newDuration > 0) {
        activeAlerts.push(`⚠️ ${eff.name} (${newDuration} rodada${newDuration > 1 ? 's' : ''} restante${newDuration > 1 ? 's' : ''})`);
        return { ...eff, duration: newDuration };
      } else {
        activeAlerts.push(`✅ ${eff.name} dissipou!`);
        return null; 
      }
    }).filter(Boolean) as CombatantEffect[];

    const updatedCombatants = combatants.map((c, idx) => 
      idx === nextIndex ? { ...c, effects: updatedEffects } : c
    );

    if (activeAlerts.length > 0) {
      setTurnAlerts({ name: nextCombatant.name, alerts: activeAlerts });
    } else {
      setTurnAlerts(null); 
    }

    onUpdate(moduleData.id, {
      data: { 
        ...moduleData.data, 
        currentTurnId: nextCombatant.id, 
        round: nextRound,
        combatants: updatedCombatants 
      }
    });
  };

  const handleUpdateHp = (id: string, newHpString: string) => {
    const hpValue = parseInt(newHpString, 10);
    const updatedList = combatants.map(c => {
      if (c.id === id) {
        const isDefeated = !isNaN(hpValue) && hpValue <= 0;
        return { ...c, hp: isNaN(hpValue) ? undefined : hpValue, isDefeated };
      }
      return c;
    });
    onUpdate(moduleData.id, { data: { ...moduleData.data, combatants: updatedList } });
  };

  const toggleDefeated = (id: string) => {
    const updatedList = combatants.map(c => 
      c.id === id ? { ...c, isDefeated: !c.isDefeated } : c
    );
    onUpdate(moduleData.id, { data: { ...moduleData.data, combatants: updatedList } });
  };

  const handleAddEffect = (id: string) => {
    if (!newEffName.trim() || !newEffDur.trim() || Number(newEffDur) < 1) return;

    const newEffect: CombatantEffect = {
      id: crypto.randomUUID(),
      name: newEffName.trim(),
      duration: Number(newEffDur)
    };

    const updatedList = combatants.map(c => 
      c.id === id ? { ...c, effects: [...c.effects, newEffect] } : c
    );

    onUpdate(moduleData.id, { data: { ...moduleData.data, combatants: updatedList } });
    
    setNewEffName('');
    setNewEffDur('');
    setAddingEffectTo(null);
  };

  const handleRemoveEffect = (combatantId: string, effectId: string) => {
    const updatedList = combatants.map(c => {
      if (c.id === combatantId) {
        return { ...c, effects: c.effects.filter(e => e.id !== effectId) };
      }
      return c;
    });
    onUpdate(moduleData.id, { data: { ...moduleData.data, combatants: updatedList } });
  };

  const toggleFaction = () => {
    if (newFaction === 'enemy') setNewFaction('ally');
    else if (newFaction === 'ally') setNewFaction('player');
    else setNewFaction('enemy');
  };

  if (!moduleData.isActive) return null;

  return (
    <div id={`module-${moduleData.id}`} className="border border-slate-700 bg-slate-800 rounded-md shadow-md mb-4 flex flex-col transition-all focus-within:border-emerald-500 focus-within:shadow-emerald-900/20">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-amber-500">⚔️</span>
          <input type="text" value={moduleData.name} onChange={(e) => onUpdate(moduleData.id, { name: e.target.value })} className="bg-transparent text-amber-500 font-bold focus:outline-none px-2 py-1 rounded w-full transition placeholder:text-amber-800" placeholder="Nome do Combate..." />
        </div>
        <button onClick={() => onUpdate(moduleData.id, { isMinimized: !moduleData.isMinimized })} className="text-slate-500 hover:text-amber-400 px-2 py-1 rounded transition text-sm font-bold">
          {moduleData.isMinimized ? '▼' : '▲'}
        </button>
        <button onClick={() => setIsEditing(!isEditing)} className="text-slate-400 hover:text-white text-sm bg-slate-700 px-2 py-1 rounded ml-2">
          {isEditing ? 'Ocultar Recrutamento' : '➕ Adicionar'}
        </button>
      </div>

      {!moduleData.isMinimized && (
        <div className="p-4 flex flex-col gap-4">
          
          {isEditing && (
             <div className="bg-slate-900 p-4 rounded border border-slate-700 shadow-inner flex flex-col gap-3">
             <h4 className="text-sm font-bold text-amber-500 mb-1">Recrutar para a Batalha</h4>
             <div className="flex flex-wrap gap-2 items-end">
               <div className="flex-1 min-w-[120px]">
                 <label className="block text-xs text-slate-400 mb-1">Nome</label>
                 <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Aranha" className="w-full bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-amber-500 focus:outline-none" />
               </div>
               <div className="w-20">
                 <label className="block text-xs text-slate-400 mb-1">Iniciativa</label>
                 <input type="number" value={newInitiative} onChange={e => setNewInitiative(e.target.value)} placeholder="Ex: 18" className="w-full bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-amber-500 focus:outline-none" />
               </div>
               <div className="w-20">
                 <label className="block text-xs text-slate-400 mb-1">HP (Opc)</label>
                 <input type="number" value={newHp} onChange={e => setNewHp(e.target.value)} placeholder="Ex: 20" className="w-full bg-slate-800 text-slate-200 text-sm p-2 rounded border border-slate-600 focus:border-amber-500 focus:outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAddCombatant()} />
               </div>
               <button onClick={handleAddCombatant} disabled={!newName || !newInitiative} className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded transition">
                 Incluir
               </button>
             </div>
             
             <div className="mt-1">
                <button 
                  onClick={toggleFaction}
                  className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors border shadow-sm ${
                    newFaction === 'enemy' ? 'bg-red-900/30 text-red-400 border-red-500/50 hover:bg-red-900/50' :
                    newFaction === 'ally' ? 'bg-blue-900/30 text-blue-400 border-blue-500/50 hover:bg-blue-900/50' :
                    'bg-emerald-900/30 text-emerald-400 border-emerald-500/50 hover:bg-emerald-900/50'
                  }`}
                >
                  {newFaction === 'enemy' ? '💀 Inimigo' : newFaction === 'ally' ? '🛡️ Aliado (NPC)' : '👑 Jogador'}
                </button>
             </div>
           </div>
          )}

          {/* BARRA DE TEMPO */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏳</span>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tempo de Combate</span>
                <span className="text-lg font-black text-amber-500">Rodada {moduleData.data.round}</span>
              </div>
            </div>
            
            <button onClick={handleNextTurn} disabled={combatants.length === 0} className="bg-amber-600 hover:bg-amber-500 text-white font-black px-6 py-2 rounded-full shadow-lg shadow-amber-900/50 hover:shadow-amber-900/80 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              Próximo Turno ▶
            </button>
          </div>

          {/* ALERTAS */}
          {turnAlerts && (
            <div className="bg-amber-950/80 border border-amber-500 p-3 rounded-md shadow-lg animate-in slide-in-from-top-2 flex gap-3 items-start">
              <span className="text-2xl animate-bounce">⚠️</span>
              <div>
                <h5 className="font-bold text-amber-400 mb-1 uppercase text-sm tracking-wider">Lembretes para: {turnAlerts.name}</h5>
                <ul className="text-sm text-amber-100/90 font-medium space-y-1">
                  {turnAlerts.alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* LISTA DE INICIATIVA */}
          <div className="flex flex-col gap-2">
            {combatants.length === 0 ? (
              <p className="text-slate-500 italic text-center py-4">Nenhum combatente no campo de batalha.</p>
            ) : (
              combatants.map((c) => {
                const isMyTurn = moduleData.data.currentTurnId === c.id;
                
                // Lógica de cores baseada 100% na Facção
                const rowStyle = c.isDefeated 
                  ? 'opacity-40 grayscale border-slate-600 bg-slate-900'
                  : c.faction === 'player' ? 'bg-emerald-900/20 border-emerald-500'
                  : c.faction === 'ally' ? 'bg-blue-900/20 border-blue-500'
                  : 'bg-red-900/10 border-red-500';

                const nameStyle = c.isDefeated
                  ? 'line-through text-slate-500'
                  : c.faction === 'player' ? 'text-emerald-300'
                  : c.faction === 'ally' ? 'text-blue-300'
                  : 'text-red-300';
                
                return (
                  <div 
                    key={c.id} 
                    className={`flex flex-col p-2 pl-3 rounded shadow-sm transition-all border-l-4 ${rowStyle}
                      ${isMyTurn ? 'ring-2 ring-amber-500 shadow-amber-500/30 scale-[1.01] bg-slate-700/80' : 'hover:bg-slate-700/30'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-black text-slate-400 w-8 text-center">{c.initiative}</span>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className={`font-bold text-lg ${nameStyle}`}>
                              {c.name} {c.isDefeated && '💀'}
                            </span>
                            {isMyTurn && !c.isDefeated && (
                              <span className="text-[10px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full animate-pulse ml-2">TURNO ATUAL</span>
                            )}
                          </div>
                          
                          {c.effects.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.effects.map(eff => (
                                <span key={eff.id} className="group relative bg-amber-900/50 text-amber-200 border border-amber-700/50 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-default">
                                  {eff.name} ({eff.duration})
                                  <button onClick={() => handleRemoveEffect(c.id, eff.id)} className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition" title="Remover efeito">✕</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {c.maxHp !== undefined && (
                          <div className="flex items-center bg-slate-900 rounded border border-slate-700 overflow-hidden focus-within:border-amber-500 transition mr-2">
                            <input type="number" value={c.hp === undefined ? '' : c.hp} onChange={(e) => handleUpdateHp(c.id, e.target.value)} className="w-14 bg-transparent text-center font-mono font-bold text-slate-200 focus:outline-none p-1" title="Edite o HP" />
                            <span className="text-slate-500 font-mono text-sm pr-2 select-none">/ {c.maxHp}</span>
                          </div>
                        )}
                        
                        <button onClick={() => setAddingEffectTo(addingEffectTo === c.id ? null : c.id)} className="text-slate-400 hover:text-amber-400 px-2 py-1 rounded transition text-sm bg-slate-900 border border-slate-700" title="Adicionar Buff/Debuff">
                          ✨ Efeito
                        </button>
                        
                        <div className="flex items-center border-l border-slate-700 pl-2 gap-1">
                          <button onClick={() => toggleDefeated(c.id)} className="text-slate-500 hover:text-amber-400 px-2 py-1 rounded transition text-sm" title={c.isDefeated ? "Reviver" : "Marcar como Derrotado"}>{c.isDefeated ? '💖' : '💀'}</button>
                          <button onClick={() => handleRemoveCombatant(c.id)} className="text-slate-600 hover:text-red-500 px-2 py-1 rounded transition text-sm" title="Remover do combate">✕</button>
                        </div>
                      </div>
                    </div>

                    {addingEffectTo === c.id && (
                      <div className="mt-2 ml-11 bg-slate-900 p-2 rounded border border-amber-900/50 flex gap-2 items-center w-max animate-in fade-in">
                        <input autoFocus type="text" value={newEffName} onChange={e => setNewEffName(e.target.value)} placeholder="Nome (Ex: Benção)" className="w-32 bg-slate-950 text-xs text-slate-200 p-1.5 rounded border border-slate-700 focus:border-amber-500 focus:outline-none" />
                        <input type="number" value={newEffDur} onChange={e => setNewEffDur(e.target.value)} placeholder="Rodadas (Ex: 3)" className="w-24 bg-slate-950 text-xs text-slate-200 p-1.5 rounded border border-slate-700 focus:border-amber-500 focus:outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAddEffect(c.id)} />
                        <button onClick={() => handleAddEffect(c.id)} disabled={!newEffName || !newEffDur} className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded font-bold transition">Add</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}
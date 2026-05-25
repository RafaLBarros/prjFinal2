// src/renderer/src/types/rpg.ts

export interface BaseModule {
  id: string;
  name: string;
  isActive: boolean;
  isMinimized?: boolean;
  isFloated?: boolean;
}

// Os Módulos

export interface TextModule extends BaseModule {
  type: 'text';        // O identificador fixo deste módulo
  data: {
    content: string;   // O texto real salvo (pode ser Markdown)
  };
}

export interface AudioModule extends BaseModule {
  type: 'audio';       // O identificador fixo deste módulo
  data: {
    urlOrPath: string; // Caminho
    volume: number;    // Um valor de 0.0 a 1.0
    loop: boolean;     // Se deve repetir infinitamente
  };
}

export interface PdfCropModule extends BaseModule {
  type: 'pdf_crop';
  data: {
    filePath: string;
    page: number;
    bookmarks?: { id: string; name: string; page: number }[];
  };
}

export interface CombatantEffect {
  id: string;
  name: string;
  duration: number;
}

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp?: number; 
  maxHp?: number; 
  faction: 'enemy' | 'ally' | 'player'; 
  isDefeated: boolean; 
  effects: CombatantEffect[]; 
}

export interface EncounterModule extends BaseModule {
  type: 'encounter';
  data: {
    round: number; 
    currentTurnId: string | null; 
    combatants: Combatant[];
  };
}


export interface DicePreset {
  id: string;
  name: string;
  dice: {
    d4: number;
    d6: number;
    d8: number;
    d10: number;
    d12: number;
    d20: number;
    d100: number;
  };
  modifier: number; 
  mode?: 'sum' | 'highest' | 'lowest';
}

export interface DiceRollerModule extends BaseModule {
  type: 'dice_roller';
  data: {
    presets: DicePreset[];
  };
}

// União discriminada dos módulos disponíveis na aplicação.
export type RpgModule = TextModule | AudioModule | PdfCropModule | EncounterModule | DiceRollerModule; 



// A Cena
export interface Scene {
  id: string;
  title: string;      
  description: string; 
  
  
  modules: RpgModule[]; 
}

export type NodeType = 'folder' | 'scene';

// Estrutura hierárquica da campanha, composta por pastas e cenas.
export interface CampaignNode {
  id: string;
  type: NodeType;
  name: string;
  isOpen?: boolean;
  children?: CampaignNode[];
  isPinned?: boolean;
  icon?: string;
  modules?: RpgModule[]; 
}
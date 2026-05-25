export type ModuleAction =
  | 'toggle'
  | 'play'
  | 'pause'
  | 'restart'
  | 'openBookmark'
  | 'rollPreset'
  | 'focusModule'
  | 'openEncounter';

export interface ModuleActionEvent {
  targetId: string;
  action: ModuleAction | string;
  payload?: unknown;
  preventScroll?: boolean | string;
}

export interface GlobalTrackEvent {
  url: string;
  title?: string;
  volume?: number;
  loop?: boolean;
  restart?: boolean;
}

export interface GlobalAudioStatusEvent {
  playingUrls: string[];
}

function emit<T>(eventName: string, detail: T) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function on<T>(eventName: string, handler: (detail: T) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<T>).detail);
  };

  window.addEventListener(eventName, listener);

  return () => {
    window.removeEventListener(eventName, listener);
  };
}

export const moduleEventBus = {
  emitModuleAction(detail: ModuleActionEvent) {
    emit<ModuleActionEvent>('rpg-module-action', detail);
  },

  onModuleAction(handler: (detail: ModuleActionEvent) => void) {
    return on<ModuleActionEvent>('rpg-module-action', handler);
  },

  addGlobalTrack(detail: GlobalTrackEvent) {
    emit<GlobalTrackEvent>('add-global-track', detail);
  },

  pauseGlobalTrack(detail: Pick<GlobalTrackEvent, 'url'>) {
    emit<Pick<GlobalTrackEvent, 'url'>>('pause-global-track', detail);
  },

  updateGlobalTrack(detail: Pick<GlobalTrackEvent, 'url' | 'volume' | 'loop'>) {
    emit('update-global-track', detail);
  },

  toggleGlobalTrack(detail: GlobalTrackEvent) {
    emit<GlobalTrackEvent>('toggle-global-track', detail);
  },

  emitGlobalAudioStatus(detail: GlobalAudioStatusEvent) {
    emit<GlobalAudioStatusEvent>('global-audio-status', detail);
  },

  onGlobalAudioStatus(handler: (detail: GlobalAudioStatusEvent) => void) {
    return on<GlobalAudioStatusEvent>('global-audio-status', handler);
  },

  onAddGlobalTrack(handler: (detail: GlobalTrackEvent) => void) {
    return on<GlobalTrackEvent>('add-global-track', handler);
  },

  onPauseGlobalTrack(handler: (detail: Pick<GlobalTrackEvent, 'url'>) => void) {
    return on<Pick<GlobalTrackEvent, 'url'>>('pause-global-track', handler);
  },

  onUpdateGlobalTrack(handler: (detail: Pick<GlobalTrackEvent, 'url' | 'volume' | 'loop'>) => void) {
    return on<Pick<GlobalTrackEvent, 'url' | 'volume' | 'loop'>>('update-global-track', handler);
  },

  onToggleGlobalTrack(handler: (detail: GlobalTrackEvent) => void) {
    return on<GlobalTrackEvent>('toggle-global-track', handler);
  }
};
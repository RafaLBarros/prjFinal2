import { useCallback, useState } from 'react';

interface UseHistoryStateOptions {
  maxHistory?: number;
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistoryState<T>(
  initialState: T,
  options: UseHistoryStateOptions = {}
) {
  const { maxHistory = 30 } = options;

  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const setState = useCallback((nextState: T | ((prev: T) => T)) => {
    setHistory(prevHistory => {
      const nextPresent =
        typeof nextState === 'function'
          ? (nextState as (prev: T) => T)(prevHistory.present)
          : nextState;

      return {
        ...prevHistory,
        present: nextPresent
      };
    });
  }, []);

  const commit = useCallback((nextState: T | ((prev: T) => T)) => {
    setHistory(prevHistory => {
      const nextPresent =
        typeof nextState === 'function'
          ? (nextState as (prev: T) => T)(prevHistory.present)
          : nextState;

      const newPast = [...prevHistory.past, prevHistory.present];
      const limitedPast =
        newPast.length > maxHistory
          ? newPast.slice(newPast.length - maxHistory)
          : newPast;

      return {
        past: limitedPast,
        present: nextPresent,
        future: []
      };
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.past.length === 0) return prevHistory;

      const previous = prevHistory.past[prevHistory.past.length - 1];
      const newPast = prevHistory.past.slice(0, prevHistory.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [prevHistory.present, ...prevHistory.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.future.length === 0) return prevHistory;

      const next = prevHistory.future[0];
      const newFuture = prevHistory.future.slice(1);

      const newPast = [...prevHistory.past, prevHistory.present];
      const limitedPast =
        newPast.length > maxHistory
          ? newPast.slice(newPast.length - maxHistory)
          : newPast;

      return {
        past: limitedPast,
        present: next,
        future: newFuture
      };
    });
  }, [maxHistory]);

  const resetHistory = useCallback(() => {
    setHistory(prevHistory => ({
      past: [],
      present: prevHistory.present,
      future: []
    }));
  }, []);

  const replaceState = useCallback((nextState: T) => {
    setHistory({
      past: [],
      present: nextState,
      future: []
    });
  }, []);

  return {
    state: history.present,
    setState,
    commit,
    undo,
    redo,
    resetHistory,
    replaceState,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pastStates: history.past,
    futureStates: history.future
  };
}
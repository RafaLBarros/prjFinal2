import { useCallback, useState } from 'react';

interface UseHistoryStateOptions {
  maxHistory?: number;
}

export function useHistoryState<T>(
  initialState: T,
  options: UseHistoryStateOptions = {}
) {
  const { maxHistory = 30 } = options;

  const [state, setStateBase] = useState<T>(initialState);
  const [pastStates, setPastStates] = useState<T[]>([]);
  const [futureStates, setFutureStates] = useState<T[]>([]);

  const takeSnapshot = useCallback(() => {
    setPastStates(prev => {
      const newHistory = [...prev, state];
      return newHistory.length > maxHistory
        ? newHistory.slice(newHistory.length - maxHistory)
        : newHistory;
    });

    setFutureStates([]);
  }, [state, maxHistory]);


  const setState = useCallback((nextState: T | ((prev: T) => T)) => {
    setStateBase(prev => {
      if (typeof nextState === 'function') {
        return (nextState as (prev: T) => T)(prev);
      }

      return nextState;
    });
  }, []);

  const undo = useCallback(() => {
    setPastStates(prevPast => {
      if (prevPast.length === 0) return prevPast;

      const previousState = prevPast[prevPast.length - 1];

      setFutureStates(prevFuture => [state, ...prevFuture]);
      setStateBase(previousState);

      return prevPast.slice(0, prevPast.length - 1);
    });
  }, [state]);

  const redo = useCallback(() => {
    setFutureStates(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;

      const nextState = prevFuture[0];

      setPastStates(prevPast => [...prevPast, state]);
      setStateBase(nextState);

      return prevFuture.slice(1);
    });
  }, [state]);

  const resetHistory = useCallback(() => {
    setPastStates([]);
    setFutureStates([]);
  }, []);

  return {
    state,
    setState,
    takeSnapshot,
    undo,
    redo,
    resetHistory,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    pastStates,
    futureStates
  };
}
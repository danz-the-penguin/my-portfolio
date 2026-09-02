import { useState, useEffect, useRef, useCallback } from 'react';

export function useSolverWorker(
  deferredRack,
  deferredBoard,
  activePreset,
  useTwl,
  useSowpods,
  sortMode,
  enableIntel,
  intelMode,
  manualAvailableTiles
) {
  const [candidatePlays, setCandidatePlays] = useState([]);
  const [wordCheckResult, setWordCheckResult] = useState(null);
  const [isSolving, setIsSolving] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      workerRef.current = new Worker("/solverWorker.js");
      
      workerRef.current.onmessage = (e) => {
        if (e.data && e.data.type === "CHECK_WORD_RESULT") {
           // Create a custom event or callback for the referee
           window.dispatchEvent(new CustomEvent('CHECK_WORD_RESULT', { detail: e.data }));
           return;
        }
        setCandidatePlays(e.data || []);
        setIsSolving(false);
      };
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!deferredRack.trim()) {
      setCandidatePlays([]);
      setIsSolving(false);
      return;
    }

    setIsSolving(true);
    workerRef.current?.postMessage({
      rack: deferredRack,
      board: deferredBoard,
      activePreset,
      useTwl,
      useSowpods,
      sortMode,
      enableIntel,
      manualAvailableTiles: intelMode === "manual" ? manualAvailableTiles : "",
    });
  }, [
    deferredBoard,
    deferredRack,
    activePreset,
    useTwl,
    useSowpods,
    sortMode,
    enableIntel,
    intelMode,
    manualAvailableTiles,
  ]);

  
  const checkWord = useCallback((word) => {
     if (workerRef.current && word) {
        workerRef.current.postMessage({ type: "CHECK_WORD", word });
     }
  }, []);

  return { candidatePlays, isSolving, checkWord, wordCheckResult };

}

import { useState, useCallback, useRef, useEffect } from 'react';

export function useScrabbleHistory(board, setBoard, rack, setRack, setHoveredPlay) {
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const boardRef = useRef(board);
  const rackRef = useRef(rack);

  useEffect(() => {
    boardRef.current = board;
    rackRef.current = rack;
  }, [board, rack]);

  const pushHistory = useCallback(() => {
    setPast((p) => [...p.slice(-49), { board: boardRef.current, rack: rackRef.current }]);
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [{ board: boardRef.current, rack: rackRef.current }, ...f]);
      setBoard(previous.board);
      setRack(previous.rack);
      if (setHoveredPlay) setHoveredPlay(null);
      return p.slice(0, -1);
    });
  }, [setBoard, setRack, setHoveredPlay]);

  const handleRedo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, { board: boardRef.current, rack: rackRef.current }]);
      setBoard(next.board);
      setRack(next.rack);
      if (setHoveredPlay) setHoveredPlay(null);
      return f.slice(1);
    });
  }, [setBoard, setRack, setHoveredPlay]);

  return {
    past,
    setPast,
    future,
    setFuture,
    pushHistory,
    handleUndo,
    handleRedo,
  };
}

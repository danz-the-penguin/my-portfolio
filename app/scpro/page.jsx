"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useDeferredValue,
  useCallback,
} from "react";
import "./scrabble.css";
import localDictionary from "./dictionary_compact.json";
import RefereeChecker from "./RefereeChecker";

const COLUMNS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
];

const BOARD_PRESETS = {
  plato_literati: {
    name: "Plato Wordplay / Literati (15x15)",
    defaultLexicon: "twl",
    bingoBonus: 35,
    scores: {
      a: 1,
      b: 2,
      c: 2,
      d: 2,
      e: 1,
      f: 3,
      g: 2,
      h: 3,
      i: 1,
      j: 5,
      k: 3,
      l: 2,
      m: 2,
      n: 1,
      o: 1,
      p: 2,
      q: 5,
      r: 1,
      s: 1,
      t: 1,
      u: 1,
      v: 3,
      w: 3,
      x: 5,
      y: 3,
      z: 5,
    },
    premiums: {
      "0,0": "3W",
      "0,4": "2L",
      "0,7": "3L",
      "0,10": "2L",
      "0,14": "3W",
      "1,3": "2W",
      "1,6": "3L",
      "1,8": "3L",
      "1,11": "2W",
      "2,2": "3W",
      "2,5": "2L",
      "2,9": "2L",
      "2,12": "3W",
      "3,1": "2W",
      "3,4": "2L",
      "3,7": "2W",
      "3,10": "2L",
      "3,13": "2W",
      "4,0": "2L",
      "4,3": "2L",
      "4,6": "2L",
      "4,8": "2L",
      "4,11": "2L",
      "4,14": "2L",
      "5,2": "2L",
      "5,5": "3L",
      "5,9": "3L",
      "5,12": "2L",
      "6,1": "3L",
      "6,4": "2L",
      "6,10": "2L",
      "6,13": "3L",
      "7,0": "3L",
      "7,3": "2W",
      "7,7": "CENTER",
      "7,11": "2W",
      "7,14": "3L",
      "8,1": "3L",
      "8,4": "2L",
      "8,10": "2L",
      "8,13": "3L",
      "9,2": "2L",
      "9,5": "3L",
      "9,9": "3L",
      "9,12": "2L",
      "10,0": "2L",
      "10,3": "2L",
      "10,6": "2L",
      "10,8": "2L",
      "10,11": "2L",
      "10,14": "2L",
      "11,1": "2W",
      "11,4": "2L",
      "11,7": "2W",
      "11,10": "2L",
      "11,13": "2W",
      "12,2": "3W",
      "12,5": "2L",
      "12,9": "2L",
      "12,12": "3W",
      "13,3": "2W",
      "13,6": "3L",
      "13,8": "3L",
      "13,11": "2W",
      "14,0": "3W",
      "14,4": "2L",
      "14,7": "3L",
      "14,10": "2L",
      "14,14": "3W",
    },
  },
  scrabble: {
    name: "Scrabble (Standard 15x15)",
    defaultLexicon: "sowpods",
    bingoBonus: 50,
    scores: {
      a: 1,
      b: 3,
      c: 3,
      d: 2,
      e: 1,
      f: 4,
      g: 2,
      h: 4,
      i: 1,
      j: 8,
      k: 5,
      l: 1,
      m: 3,
      n: 1,
      o: 1,
      p: 3,
      q: 10,
      r: 1,
      s: 1,
      t: 1,
      u: 1,
      v: 4,
      w: 4,
      x: 8,
      y: 4,
      z: 10,
    },
    premiums: {
      "0,0": "3W",
      "0,3": "2L",
      "0,7": "3W",
      "0,11": "2L",
      "0,14": "3W",
      "1,1": "2W",
      "1,5": "3L",
      "1,9": "3L",
      "1,13": "2W",
      "2,2": "2W",
      "2,6": "2L",
      "2,8": "2L",
      "2,12": "2W",
      "3,0": "2L",
      "3,3": "2W",
      "3,7": "2L",
      "3,11": "2W",
      "3,14": "2L",
      "4,4": "2W",
      "4,10": "2W",
      "5,1": "3L",
      "5,5": "3L",
      "5,9": "3L",
      "5,13": "3L",
      "6,2": "2L",
      "6,6": "2L",
      "6,8": "2L",
      "6,12": "2L",
      "7,0": "3W",
      "7,3": "2L",
      "7,7": "CENTER",
      "7,11": "2L",
      "7,14": "3W",
      "8,2": "2L",
      "8,6": "2L",
      "8,8": "2L",
      "8,12": "2L",
      "9,1": "3L",
      "9,5": "3L",
      "9,9": "3L",
      "9,13": "3L",
      "10,4": "2W",
      "10,10": "2W",
      "11,0": "2L",
      "11,3": "2W",
      "11,7": "2L",
      "11,11": "2W",
      "11,14": "2L",
      "12,2": "2W",
      "12,6": "2L",
      "12,8": "2L",
      "12,12": "2W",
      "13,1": "2W",
      "13,5": "3L",
      "13,9": "3L",
      "13,13": "2W",
      "14,0": "3W",
      "14,3": "2L",
      "14,7": "3W",
      "14,11": "2L",
      "14,14": "3W",
    },
  },
  literati: {
    name: "Literati (Yahoo Classic)",
    defaultLexicon: "twl",
    bingoBonus: 35,
    scores: {
      a: 1,
      b: 2,
      c: 2,
      d: 2,
      e: 1,
      f: 3,
      g: 2,
      h: 3,
      i: 1,
      j: 5,
      k: 3,
      l: 2,
      m: 2,
      n: 1,
      o: 1,
      p: 2,
      q: 5,
      r: 1,
      s: 1,
      t: 1,
      u: 1,
      v: 3,
      w: 3,
      x: 5,
      y: 3,
      z: 5,
    },
    premiums: {
      "0,0": "2W",
      "0,4": "3L",
      "0,10": "3L",
      "0,14": "2W",
      "1,1": "2L",
      "1,5": "2W",
      "1,9": "2W",
      "1,13": "2L",
      "2,2": "2W",
      "2,6": "3L",
      "2,8": "3L",
      "2,12": "2W",
      "3,3": "3L",
      "3,7": "2W",
      "3,11": "3L",
      "4,0": "3L",
      "4,4": "2L",
      "4,10": "2L",
      "4,14": "3L",
      "5,1": "2W",
      "5,5": "3L",
      "5,9": "3L",
      "5,13": "2W",
      "6,2": "3L",
      "6,6": "2L",
      "6,8": "2L",
      "6,12": "3L",
      "7,3": "2W",
      "7,7": "CENTER",
      "7,11": "2W",
      "8,2": "3L",
      "8,6": "2L",
      "8,8": "2L",
      "8,12": "3L",
      "9,1": "2W",
      "9,5": "3L",
      "9,9": "3L",
      "9,13": "2W",
      "10,0": "3L",
      "10,4": "2L",
      "10,10": "2L",
      "10,14": "3L",
      "11,3": "3L",
      "11,7": "2W",
      "11,11": "3L",
      "12,2": "2W",
      "12,6": "3L",
      "12,8": "3L",
      "12,12": "2W",
      "13,1": "2L",
      "13,5": "2W",
      "13,9": "2W",
      "13,13": "2L",
      "14,0": "2W",
      "14,4": "3L",
      "14,10": "3L",
      "14,14": "2W",
    },
  },
  literaki: {
    name: "Literaki / Kurnik",
    defaultLexicon: "sowpods",
    bingoBonus: 50,
    scores: {
      a: 1,
      b: 3,
      c: 2,
      d: 2,
      e: 1,
      f: 5,
      g: 3,
      h: 3,
      i: 1,
      j: 3,
      k: 3,
      l: 2,
      m: 2,
      n: 1,
      o: 1,
      p: 2,
      q: 5,
      r: 1,
      s: 1,
      t: 2,
      u: 3,
      v: 4,
      w: 1,
      x: 8,
      y: 2,
      z: 1,
    },
    premiums: {
      "0,0": "3W",
      "0,2": "3L",
      "0,4": "2L",
      "0,10": "2L",
      "0,12": "3L",
      "0,14": "3W",
      "1,1": "2W",
      "1,5": "2L",
      "1,9": "2L",
      "1,13": "2W",
      "2,0": "3L",
      "2,2": "2W",
      "2,6": "3L",
      "2,8": "3L",
      "2,12": "2W",
      "2,14": "3L",
      "3,3": "2W",
      "3,7": "3L",
      "3,11": "2W",
      "4,0": "2L",
      "4,4": "2W",
      "4,10": "2W",
      "4,14": "2L",
      "5,1": "2L",
      "5,5": "3L",
      "5,9": "3L",
      "5,13": "2L",
      "6,2": "3L",
      "6,6": "2L",
      "6,8": "2L",
      "6,12": "3L",
      "7,3": "3L",
      "7,7": "CENTER",
      "7,11": "3L",
      "8,2": "3L",
      "8,6": "2L",
      "8,8": "2L",
      "8,12": "3L",
      "9,1": "2L",
      "9,5": "3L",
      "9,9": "3L",
      "9,13": "2L",
      "10,0": "2L",
      "10,4": "2W",
      "10,10": "2W",
      "10,14": "2L",
      "11,3": "2W",
      "11,7": "3L",
      "11,11": "2W",
      "12,0": "3L",
      "12,2": "2W",
      "12,6": "3L",
      "12,8": "3L",
      "12,12": "2W",
      "12,14": "3L",
      "13,1": "2W",
      "13,5": "2L",
      "13,9": "2L",
      "13,13": "2W",
      "14,0": "3W",
      "14,2": "3L",
      "14,4": "2L",
      "14,10": "2L",
      "14,12": "3L",
      "14,14": "3W",
    },
  },
};

const BoardCell = React.memo(
  ({
    r,
    c,
    tileVal,
    previewChar,
    premium,
    isSelected,
    isInActiveLine,
    typingDir,
    onClick,
  }) => {
    const cellClass = tileVal ? "" : premium ? `cell-${premium}` : "";

    return (
      <div
        className={`board-cell ${cellClass} ${isSelected ? "selected" : ""} ${isInActiveLine && !isSelected ? "in-line-highlight" : ""}`}
        onClick={onClick}
        style={{
          position: "relative",
          backgroundColor:
            isInActiveLine && !isSelected && !tileVal ? "#e6f0fa" : undefined,
        }}
      >
        {tileVal ? (
          <div className="cell-tile">{tileVal}</div>
        ) : previewChar ? (
          <div
            className="cell-tile"
            style={{
              backgroundColor: "#2e7d32",
              color: "#ffffff",
              opacity: 0.85,
              border: "1px dashed #ffffff",
            }}
          >
            {previewChar}
          </div>
        ) : (
          premium || ""
        )}

        {isSelected && (
          <div
            style={{
              position: "absolute",
              bottom: "1px",
              right: "2px",
              fontSize: "8px",
              color: "#ff0000",
              fontWeight: "bold",
              lineHeight: 1,
              pointerEvents: "none",
              textShadow: "1px 1px 0px #ffffff",
            }}
          >
            {typingDir === "H" ? "►" : "▼"}
          </div>
        )}
      </div>
    );
  },
);
BoardCell.displayName = "BoardCell";

const ResultCard = React.memo(
  ({
    play,
    notation,
    colLetter,
    rowNum,
    inTwl,
    inSowpods,
    activePreset,
    onHover,
    onLeave,
    onClick,
  }) => {
    return (
      <div
        className="result-card"
        style={{ cursor: "pointer" }}
        onMouseEnter={() => onHover(play)}
        onMouseLeave={onLeave}
        onClick={() => onClick(play)}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              marginBottom: "4px",
            }}
          >
            <div style={{ display: "flex", gap: "2px" }}>
              {play.word
                .toUpperCase()
                .split("")
                .map((ch, idx) => (
                  <div key={idx} className="scrabble-tile-mini">
                    <span>{ch}</span>
                    <sub className="tile-score-sub">
                      {activePreset?.scores?.[ch.toLowerCase()] ?? 0}
                    </sub>
                  </div>
                ))}
            </div>

            {inTwl ? (
              <span
                className="badge-legal"
                style={{ fontSize: "8px", padding: "1px 3px" }}
              >
                TWL
              </span>
            ) : (
              <span
                className="badge-illegal"
                style={{ fontSize: "8px", padding: "1px 3px" }}
              >
                NO-TWL
              </span>
            )}
            {inSowpods ? (
              <span
                className="badge-legal"
                style={{ fontSize: "8px", padding: "1px 3px" }}
              >
                CSW
              </span>
            ) : (
              <span
                className="badge-illegal"
                style={{ fontSize: "8px", padding: "1px 3px" }}
              >
                NO-CSW
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", opacity: 0.9 }}>
            <strong>{notation}</strong> &bull; Row {rowNum}, Col {colLetter} (
            {play.dir === "H" ? "Across" : "Down"})
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: "#008000",
            }}
          >
            {play.score} PTS
          </div>
          {play.exposes3W ? (
            <span className="badge-risk-high">EXPOSES 3W</span>
          ) : (
            <span className="badge-risk-safe">SAFE LEAVE</span>
          )}
        </div>
      </div>
    );
  },
);
ResultCard.displayName = "ResultCard";

function FloatingDefinitionTooltip({ hoveredPlay, twlSet, sowpodsSet }) {
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!hoveredPlay) return;

    const handleMouseMove = (e) => {
      if (!tooltipRef.current) return;
      const x = Math.max(10, Math.min(e.clientX + 14, window.innerWidth - 300));
      const y = Math.max(
        10,
        Math.min(e.clientY + 14, window.innerHeight - 180),
      );
      tooltipRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [hoveredPlay]);

  if (!hoveredPlay) return null;

  const w = hoveredPlay.word.toLowerCase();
  const inTwl = twlSet ? twlSet.has(w) : false;
  const inSowpods = sowpodsSet ? sowpodsSet.has(w) : false;

  return (
    <div
      ref={tooltipRef}
      className="win98-window win98-tooltip"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "280px",
        zIndex: 99999,
        pointerEvents: "none",
        boxShadow: "2px 2px 0px #000000",
        willChange: "transform",
        margin: 0,
      }}
    >
      <div
        className="win98-titlebar"
        style={{ padding: "2px 4px", fontSize: "11px" }}
      >
        <span>{hoveredPlay.word.toUpperCase()}</span>
        <span>{hoveredPlay.score} PTS</span>
      </div>
      <div
        className="win98-inset"
        style={{
          padding: "6px 8px",
          fontSize: "11px",
          lineHeight: "1.4",
          maxHeight: "150px",
          overflowY: "auto",
          whiteSpace: "normal",
          wordBreak: "break-word",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "5px",
            flexWrap: "wrap",
          }}
        >
          {inTwl ? (
            <span className="badge-legal">✔ TWL (PLATO)</span>
          ) : (
            <span className="badge-illegal">✖ NOT TWL</span>
          )}

          {inSowpods ? (
            <span className="badge-legal">✔ SOWPODS (INTL)</span>
          ) : (
            <span className="badge-illegal">✖ NOT SOWPODS</span>
          )}
        </div>
        {localDictionary[w] || (
          <span style={{ color: "#777", fontStyle: "italic" }}>
            Valid tournament play (inflected form or no extended definition
            entry).
          </span>
        )}
      </div>
    </div>
  );
}

export default function ScrabbleSolverV3() {
  const [activePresetKey, setActivePresetKey] = useState("plato_literati");

  // Dictionary Toggles
  const [useTwl, setUseTwl] = useState(true);
  const [useSowpods, setUseSowpods] = useState(false);
  const [useJsonDict, setUseJsonDict] = useState(true);

  const [twlWords, setTwlWords] = useState([]);
  const [sowpodsWords, setSowpodsWords] = useState([]);
  const [jsonWords, setJsonWords] = useState([]);

  const [twlSet, setTwlSet] = useState(null);
  const [sowpodsSet, setSowpodsSet] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const [rack, setRack] = useState("REOPMAJ?");
  const [candidatePlays, setCandidatePlays] = useState([]);
  const [hoveredPlay, setHoveredPlay] = useState(null);
  const [isBoardLocked, setIsBoardLocked] = useState(true);
  const [typingDir, setTypingDir] = useState("H");

  // History Stack for Undo
  const [history, setHistory] = useState([]);

  const [board, setBoard] = useState(() =>
    Array(15)
      .fill(null)
      .map(() => Array(15).fill("")),
  );
  const [selectedCell, setSelectedCell] = useState([7, 7]);

  const activePreset =
    BOARD_PRESETS[activePresetKey] || BOARD_PRESETS.plato_literati;
  const deferredBoard = useDeferredValue(board);
  const deferredRack = useDeferredValue(rack);

  const workerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      workerRef.current = new Worker(
        new URL("./solverWorker.js", import.meta.url),
      );

      workerRef.current.onmessage = (e) => {
        setCandidatePlays(e.data);
        setIsSolving(false);
      };
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Load Lexicons safely
  useEffect(() => {
    const rawJson = Object.keys(localDictionary)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 2 && /^[a-z]+$/.test(w));
    setJsonWords(rawJson);

    const fetchList = async (paths, fallbackUrl) => {
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            const text = await res.text();
            const words = text
              .split("\n")
              .map((w) => w.trim().toLowerCase())
              .filter((w) => w.length >= 2 && /^[a-z]+$/.test(w));
            if (words.length > 0) return words;
          }
        } catch {
          // Try next
        }
      }
      if (fallbackUrl) {
        try {
          const res = await fetch(fallbackUrl);
          if (res.ok) {
            const text = await res.text();
            return text
              .split("\n")
              .map((w) => w.trim().toLowerCase())
              .filter((w) => w.length >= 2 && /^[a-z]+$/.test(w));
          }
        } catch {
          return [];
        }
      }
      return [];
    };

    const loadAll = async () => {
      const [sow, twl] = await Promise.all([
        fetchList(
          ["/sowpods.txt", "/scrabble_words.txt"],
          "https://raw.githubusercontent.com/raun/Scrabble/master/words.txt",
        ),
        fetchList(
          ["/twl06.txt", "/naspa2023.txt"],
          "https://raw.githubusercontent.com/jesstess/Scrabble/master/scrabble/twl06.txt",
        ),
      ]);

      setSowpodsWords(sow);
      setSowpodsSet(new Set(sow));

      setTwlWords(twl);
      setTwlSet(new Set(twl));

      setLoading(false);
    };

    loadAll();
  }, []);

  const handlePresetChange = (key) => {
    setActivePresetKey(key);
    const def = BOARD_PRESETS[key]?.defaultLexicon;
    if (def === "twl") {
      setUseTwl(true);
      setUseSowpods(false);
    } else if (def === "sowpods") {
      setUseTwl(false);
      setUseSowpods(true);
    }
  };

  const workerWordList = useMemo(() => {
    let list = [];
    if (useTwl) list = list.concat(twlWords);
    if (useSowpods) list = list.concat(sowpodsWords);
    if (useJsonDict) list = list.concat(jsonWords);
    return Array.from(new Set(list));
  }, [useTwl, useSowpods, useJsonDict, twlWords, sowpodsWords, jsonWords]);

  useEffect(() => {
    if (!deferredRack.trim() || workerWordList.length === 0) {
      setCandidatePlays([]);
      setIsSolving(false);
      return;
    }

    setIsSolving(true);
    workerRef.current?.postMessage({
      rack: deferredRack,
      board: deferredBoard,
      wordList: workerWordList,
      activePreset,
    });
  }, [deferredBoard, deferredRack, workerWordList, activePreset]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const lastState = prevHistory[prevHistory.length - 1];
      setBoard(lastState.board);
      setRack(lastState.rack);
      setHoveredPlay(null);
      return prevHistory.slice(0, -1);
    });
  }, []);

  // Direct Arrow Movement & Dedicated Direction Toggling (Spacebar/Button Only)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (
          document.activeElement &&
          document.activeElement.tagName === "INPUT"
        )
          return;
        e.preventDefault();
        handleUndo();
        return;
      }

      if (isBoardLocked) return;
      if (document.activeElement && document.activeElement.tagName === "INPUT")
        return;
      if (!selectedCell) return;
      const [r, c] = selectedCell;

      // 1. Spacebar exclusively toggles orientation in place
      if (e.key === " ") {
        e.preventDefault();
        setTypingDir((d) => (d === "H" ? "V" : "H"));
        return;
      }

      // 2. Letters place and auto-advance in the active direction
      if (e.key >= "a" && e.key <= "z") {
        setHistory((prev) => [...prev, { board, rack }]);
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = e.key.toUpperCase();
          return next;
        });

        if (typingDir === "H") {
          if (c < 14) setSelectedCell([r, c + 1]);
        } else {
          if (r < 14) setSelectedCell([r + 1, c]);
        }
      }
      // 3. Backspace & Delete
      else if (e.key === "Backspace") {
        if (board[r][c]) {
          setHistory((prev) => [...prev, { board, rack }]);
          setBoard((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = "";
            return next;
          });
        } else {
          if (typingDir === "H" && c > 0) {
            setSelectedCell([r, c - 1]);
            setHistory((prev) => [...prev, { board, rack }]);
            setBoard((prev) => {
              const next = prev.map((row) => [...row]);
              next[r][c - 1] = "";
              return next;
            });
          } else if (typingDir === "V" && r > 0) {
            setSelectedCell([r - 1, c]);
            setHistory((prev) => [...prev, { board, rack }]);
            setBoard((prev) => {
              const next = prev.map((row) => [...row]);
              next[r - 1][c] = "";
              return next;
            });
          }
        }
      } else if (e.key === "Delete") {
        setHistory((prev) => [...prev, { board, rack }]);
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = "";
          return next;
        });
      }
      // 4. Arrow keys ALWAYS immediately move cursor up/down/left/right
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (c < 14) setSelectedCell([r, c + 1]);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (c > 0) setSelectedCell([r, c - 1]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (r < 14) setSelectedCell([r + 1, c]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (r > 0) setSelectedCell([r - 1, c]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isBoardLocked, typingDir, board, rack, handleUndo]);

  const clearBoard = () => {
    setHistory((prev) => [...prev, { board, rack }]);
    setBoard(
      Array(15)
        .fill(null)
        .map(() => Array(15).fill("")),
    );
    setHoveredPlay(null);
  };

  const previewMap = useMemo(() => {
    if (!hoveredPlay) return {};
    const map = {};
    const { word, row, col, dir } = hoveredPlay;
    for (let i = 0; i < word.length; i++) {
      const r = dir === "V" ? row + i : row;
      const c = dir === "H" ? col + i : col;
      map[`${r},${c}`] = word[i].toUpperCase();
    }
    return map;
  }, [hoveredPlay]);

  const applyPlay = useCallback(
    (play) => {
      setHistory((prev) => [...prev, { board, rack }]);

      setBoard((prev) => {
        const next = prev.map((row) => [...row]);
        for (let i = 0; i < play.word.length; i++) {
          const r = play.dir === "V" ? play.row + i : play.row;
          const c = play.dir === "H" ? play.col + i : play.col;
          next[r][c] = play.word[i].toUpperCase();
        }
        return next;
      });

      setRack((prevRack) => {
        let currentRack = prevRack.toUpperCase().split("");
        for (let i = 0; i < play.word.length; i++) {
          const r = play.dir === "V" ? play.row + i : play.row;
          const c = play.dir === "H" ? play.col + i : play.col;
          if (!board[r][c]) {
            const char = play.word[i].toUpperCase();
            const idx = currentRack.indexOf(char);
            if (idx !== -1) {
              currentRack.splice(idx, 1);
            } else {
              const wildcardIdx = currentRack.findIndex(
                (ch) =>
                  ch === "?" ||
                  ch === "." ||
                  ch === "0" ||
                  ch === "*" ||
                  ch === "_",
              );
              if (wildcardIdx !== -1) currentRack.splice(wildcardIdx, 1);
            }
          }
        }
        return currentRack.join("");
      });

      setHoveredPlay(null);
    },
    [board, rack],
  );

  const handleCellClick = useCallback(
    (r, c) => {
      if (isBoardLocked) setIsBoardLocked(false);

      setSelectedCell((prev) => {
        if (!prev) return [r, c];
        const [prevR, prevC] = prev;

        // Clicking the already-selected cell toggles direction
        if (prevR === r && prevC === c) {
          setTypingDir((d) => (d === "H" ? "V" : "H"));
          return [r, c];
        }

        // Clicking a different cell moves cursor without altering direction
        return [r, c];
      });
    },
    [isBoardLocked],
  );

  const handleHoverPlay = useCallback((play) => {
    setHoveredPlay(play);
  }, []);

  const handleLeavePlay = useCallback(() => {
    setHoveredPlay(null);
  }, []);

  return (
    <div className="win98-body">
      <div className="win98-container">
        <div className="win98-window">
          <div className="win98-titlebar">
            <span>
              Scrabble_Bot_Solver_v3.exe - [Multi-Lexicon Control Panel]
            </span>
            <div>
              <button className="win98-button">X</button>
            </div>
          </div>

          <div className="win98-content">
            {/* Toolbar Controls */}
            <div
              style={{
                marginBottom: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                    Preset:
                  </label>
                  <select
                    className="win98-input"
                    style={{
                      width: "auto",
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                    value={activePresetKey}
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    {Object.entries(BOARD_PRESETS).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dictionary Checkboxes */}
                <div
                  className="win98-inset"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    backgroundColor: "#e0e0e0",
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>Solver Dicts:</span>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useTwl}
                      onChange={(e) => setUseTwl(e.target.checked)}
                    />
                    TWL
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useSowpods}
                      onChange={(e) => setUseSowpods(e.target.checked)}
                    />
                    SOWPODS
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useJsonDict}
                      onChange={(e) => setUseJsonDict(e.target.checked)}
                    />
                    JSON Dict
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="win98-button"
                  style={{
                    fontWeight: "bold",
                    backgroundColor: isBoardLocked ? "#c0c0c0" : "#ffcccc",
                  }}
                  onClick={() => setIsBoardLocked((prev) => !prev)}
                >
                  {isBoardLocked
                    ? "🔒 Locked (Search)"
                    : "🔓 Unlocked (Opponent)"}
                </button>

                <button
                  className="win98-button"
                  style={{ fontWeight: "bold" }}
                  onClick={() =>
                    setTypingDir((prev) => (prev === "H" ? "V" : "H"))
                  }
                >
                  Typing:{" "}
                  {typingDir === "H"
                    ? "Across ➔ (Space to flip)"
                    : "Down ⬇ (Space to flip)"}
                </button>

                <button
                  className="win98-button"
                  style={{
                    fontWeight: "bold",
                    opacity: history.length === 0 ? 0.5 : 1,
                    cursor: history.length === 0 ? "not-allowed" : "pointer",
                  }}
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  title="Undo last play or change (Ctrl+Z)"
                >
                  ↶ Undo
                </button>

                <button className="win98-button" onClick={clearBoard}>
                  Clear Board
                </button>
              </div>
            </div>

            <div className="v3-layout">
              <div>
                <div className="board-grid-container win98-inset">
                  <div className="board-grid">
                    <div className="board-header"></div>
                    {COLUMNS.map((col) => (
                      <div key={col} className="board-header">
                        {col}
                      </div>
                    ))}

                    {board.map((row, r) => (
                      <React.Fragment key={`row-${r}`}>
                        <div className="board-header">{r + 1}</div>
                        {row.map((tileVal, c) => {
                          const isSelected =
                            !isBoardLocked &&
                            selectedCell &&
                            selectedCell[0] === r &&
                            selectedCell[1] === c;

                          const isInActiveLine =
                            !isBoardLocked &&
                            selectedCell &&
                            (typingDir === "H"
                              ? selectedCell[0] === r
                              : selectedCell[1] === c);

                          const previewChar = previewMap[`${r},${c}`];
                          const premium = activePreset.premiums[`${r},${c}`];

                          return (
                            <BoardCell
                              key={`${r}-${c}`}
                              r={r}
                              c={c}
                              tileVal={tileVal}
                              previewChar={previewChar}
                              premium={premium}
                              isSelected={isSelected}
                              isInActiveLine={isInActiveLine}
                              typingDir={typingDir}
                              onClick={() => handleCellClick(r, c)}
                            />
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <RefereeChecker
                  twlSet={twlSet}
                  sowpodsSet={sowpodsSet}
                  activePreset={activePreset}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {/* Physical Wooden Rack Tray & Input */}
                <div className="win98-inset">
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Your Rack Tiles:
                  </label>
                  <input
                    type="text"
                    className="win98-input"
                    value={rack}
                    onChange={(e) => setRack(e.target.value.toUpperCase())}
                    placeholder="E.g. REOPMAJ? or ? for blank"
                  />

                  {/* Tray Display: Blank tiles render empty with no subscript */}
                  <div className="rack-tray">
                    {rack.trim().length === 0 ? (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#d4a373",
                          fontStyle: "italic",
                          padding: "4px",
                        }}
                      >
                        Empty rack (Type letters above)...
                      </span>
                    ) : (
                      rack.split("").map((ch, idx) => {
                        const isBlank = ["?", ".", "0", "*", "_"].includes(ch);
                        const score = isBlank
                          ? 0
                          : (activePreset?.scores?.[ch.toLowerCase()] ?? 0);
                        return (
                          <div
                            key={idx}
                            className="scrabble-tile-rack"
                            title={
                              isBlank
                                ? "Blank / Wildcard Tile (0 pts)"
                                : `${ch.toUpperCase()} (${score} pts)`
                            }
                          >
                            <span>{isBlank ? "" : ch.toUpperCase()}</span>
                            {!isBlank && (
                              <sub className="tile-score-sub">{score}</sub>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="win98-window" style={{ flex: 1, margin: 0 }}>
                  <div className="win98-titlebar">
                    <span>Ranked Strategic Plays</span>
                    <span>
                      {isSolving
                        ? "Calculating..."
                        : `${candidatePlays.length} Found`}
                    </span>
                  </div>

                  <div className="win98-inset results-list">
                    {loading || isSolving ? (
                      <div
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          fontSize: "11px",
                        }}
                      >
                        {loading
                          ? "Loading Lexicons..."
                          : "Calculating Best Plays..."}
                      </div>
                    ) : candidatePlays.length === 0 ? (
                      <div
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          fontSize: "11px",
                        }}
                      >
                        No legal moves found for this board state.
                      </div>
                    ) : (
                      candidatePlays.slice(0, 50).map((play, idx) => {
                        const colLetter = COLUMNS[play.col];
                        const rowNum = play.row + 1;
                        const notation =
                          play.dir === "H"
                            ? `${rowNum}${colLetter}`
                            : `${colLetter}${rowNum}`;

                        const w = play.word.toLowerCase();
                        const inTwl = twlSet ? twlSet.has(w) : false;
                        const inSowpods = sowpodsSet
                          ? sowpodsSet.has(w)
                          : false;

                        return (
                          <ResultCard
                            key={`${play.word}-${play.row}-${play.col}-${play.dir}-${idx}`}
                            play={play}
                            notation={notation}
                            colLetter={colLetter}
                            rowNum={rowNum}
                            inTwl={inTwl}
                            inSowpods={inSowpods}
                            activePreset={activePreset}
                            onHover={handleHoverPlay}
                            onLeave={handleLeavePlay}
                            onClick={applyPlay}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FloatingDefinitionTooltip
          hoveredPlay={hoveredPlay}
          twlSet={twlSet}
          sowpodsSet={sowpodsSet}
        />
      </div>
    </div>
  );
}

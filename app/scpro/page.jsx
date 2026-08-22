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

const STANDARD_DIST = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
  "?": 2,
};

const BOARD_PRESETS = {
  plato_literati: {
    name: "Plato Wordplay / Literati (15x15)",
    defaultLexicon: "twl",
    bingoBonus: 35,
    distribution: STANDARD_DIST,
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
    distribution: STANDARD_DIST,
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
};

// Component: Enhanced Visual Unseen Tile Tracker
function UnseenTileTracker({
  board,
  rack,
  activePreset,
  enableIntel,
  intelMode,
  manualAvailableTiles,
}) {
  const unseen = useMemo(() => {
    let counts = {};
    let total = 0;

    // Default: initialize all standard alphabet + blank
    Object.keys(activePreset.distribution).forEach((k) => (counts[k] = 0));

    if (enableIntel && intelMode === "manual" && manualAvailableTiles.trim()) {
      // Manual Paste Mode from Woogles
      const pool = manualAvailableTiles.toUpperCase().replace(/[^A-Z?]/g, "");
      for (let i = 0; i < pool.length; i++) {
        const ch = pool[i];
        counts[ch] = (counts[ch] || 0) + 1;
        total++;
      }
    } else {
      // Auto Calculation Mode (Distribution minus Board minus Rack)
      counts = { ...activePreset.distribution };
      for (const k in counts) total += counts[k];

      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          const val = board[r][c];
          if (val) {
            const upper = val.toUpperCase();
            if (counts[upper] !== undefined && counts[upper] > 0) {
              counts[upper]--;
              total--;
            }
          }
        }
      }

      const rackChars = rack.toUpperCase().split("");
      for (const ch of rackChars) {
        const mapped = ["?", ".", "0", "*", "_"].includes(ch) ? "?" : ch;
        if (counts[mapped] !== undefined && counts[mapped] > 0) {
          counts[mapped]--;
          total--;
        }
      }
    }

    return { counts, total };
  }, [board, rack, activePreset, enableIntel, intelMode, manualAvailableTiles]);

  return (
    <div
      className="win98-inset"
      style={{ marginTop: "10px", backgroundColor: "#e0e0e0" }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: "bold",
          marginBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Available Tiles (Bag + Opponent)</span>
        <span style={{ color: "#000080" }}>Total: {unseen.total}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
        {Object.entries(unseen.counts).map(([ch, count]) => {
          const isZero = count === 0;
          return (
            <div
              key={ch}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                opacity: isZero ? 0.35 : 1,
                filter: isZero ? "grayscale(100%)" : "none",
                transition: "opacity 0.2s ease",
              }}
            >
              <div
                className="scrabble-tile-mini"
                style={{
                  width: "18px",
                  height: "22px",
                  fontSize: "11px",
                  boxShadow: isZero ? "none" : undefined,
                  border: isZero ? "1px solid #999" : undefined,
                }}
              >
                <span>{ch === "?" ? "" : ch}</span>
                {ch !== "?" && (
                  <sub
                    className="tile-score-sub"
                    style={{ fontSize: "7px", bottom: "0px", right: "1px" }}
                  >
                    {activePreset?.scores?.[ch.toLowerCase()] ?? 0}
                  </sub>
                )}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#222",
                  minWidth: "14px",
                }}
              >
                x{count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
        className={`board-cell ${cellClass} ${isSelected ? "selected" : ""} ${
          isInActiveLine && !isSelected ? "in-line-highlight" : ""
        }`}
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
    const isExch = play.dir === "EXCH";

    return (
      <div
        className="result-card"
        style={{
          cursor: "pointer",
          backgroundColor: isExch ? "#f4f0ff" : undefined,
        }}
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
                  <div
                    key={idx}
                    className="scrabble-tile-mini"
                    style={{ opacity: isExch ? 0.6 : 1 }}
                  >
                    <span>{ch}</span>
                    <sub className="tile-score-sub">
                      {activePreset?.scores?.[ch.toLowerCase()] ?? 0}
                    </sub>
                  </div>
                ))}
            </div>

            {!isExch && (
              <>
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
              </>
            )}
          </div>
          <div style={{ fontSize: "11px", opacity: 0.9 }}>
            <strong>{notation}</strong>{" "}
            {!isExch &&
              `• Row ${rowNum}, Col ${colLetter} (${play.dir === "H" ? "Across" : "Down"})`}
          </div>
          <div style={{ fontSize: "10px", marginTop: "3px", color: "#444" }}>
            Leave:{" "}
            <strong style={{ letterSpacing: "1px" }}>{play.leave}</strong> (
            <span
              style={{
                color: play.leaveEquity >= 0 ? "#1b5e20" : "#b71c1c",
                fontWeight: "bold",
              }}
            >
              {play.leaveEquity >= 0
                ? `+${play.leaveEquity}`
                : play.leaveEquity}{" "}
              eq
            </span>
            )
          </div>

          {/* Counter-Move / Opponent Deduction Metrics */}
          {play.oppBestReply && (
            <div
              style={{
                fontSize: "10px",
                marginTop: "2px",
                color: "#b71c1c",
                fontWeight: "bold",
              }}
            >
              Opp. Reply: {play.oppBestReply.word} ({play.oppBestReply.score}{" "}
              PTS) &bull; Net:{" "}
              {play.netSpread > 0 ? `+${play.netSpread}` : play.netSpread}
            </div>
          )}
        </div>

        <div style={{ textAlign: "right", minWidth: "90px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: isExch ? "#606060" : "#008000",
            }}
          >
            {play.score} PTS
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#333",
              fontWeight: "bold",
              marginBottom: "2px",
            }}
          >
            Val: {play.totalVal}
          </div>
          {!isExch &&
            (play.exposes3W ? (
              <span className="badge-risk-high">EXPOSES 3W</span>
            ) : (
              <span className="badge-risk-safe">SAFE LEAVE</span>
            ))}
        </div>
      </div>
    );
  },
);
ResultCard.displayName = "ResultCard";

function FloatingDefinitionTooltip({
  hoveredPlay,
  twlSet,
  sowpodsSet,
  localDictionary,
}) {
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!hoveredPlay || hoveredPlay.dir === "EXCH") return;

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

  if (!hoveredPlay || hoveredPlay.dir === "EXCH") return null;

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

  const [useTwl, setUseTwl] = useState(true);
  const [useSowpods, setUseSowpods] = useState(false);
  const [sortMode, setSortMode] = useState("value");

  // Opponent Intel & Deduction State
  const [enableIntel, setEnableIntel] = useState(true);
  const [intelMode, setIntelMode] = useState("auto");
  const [manualAvailableTiles, setManualAvailableTiles] = useState("");

  const [twlSet, setTwlSet] = useState(null);
  const [sowpodsSet, setSowpodsSet] = useState(null);
  const [localDictionary, setLocalDictionary] = useState({});

  const [loading, setLoading] = useState(true);
  const [isSolving, setIsSolving] = useState(false);
  const [rack, setRack] = useState("REOPMAJ?");
  const [candidatePlays, setCandidatePlays] = useState([]);
  const [hoveredPlay, setHoveredPlay] = useState(null);
  const [isBoardLocked, setIsBoardLocked] = useState(true);
  const [typingDir, setTypingDir] = useState("H");

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
      workerRef.current = new Worker("/solverWorker.js");
      workerRef.current.onmessage = (e) => {
        setCandidatePlays(e.data || []);
        setIsSolving(false);
      };
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchList = async (paths, fallbackUrl) => {
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            const text = await res.text();
            return text
              .split("\n")
              .map((w) => w.trim().toLowerCase())
              .filter((w) => w.length >= 2 && /^[a-z]+$/.test(w));
          }
        } catch {}
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
      try {
        const [sow, twl, dictRes] = await Promise.all([
          fetchList(
            ["/sowpods.txt", "/scrabble_words.txt"],
            "https://raw.githubusercontent.com/raun/Scrabble/master/words.txt",
          ),
          fetchList(
            ["/twl06.txt", "/naspa2023.txt"],
            "https://raw.githubusercontent.com/jesstess/Scrabble/master/scrabble/twl06.txt",
          ),
          fetch("/dictionary_compact.json")
            .then((res) => (res.ok ? res.json() : {}))
            .catch(() => ({})),
        ]);

        if (isMounted) {
          setSowpodsSet(new Set(sow));
          setTwlSet(new Set(twl));
          setLocalDictionary(dictRes);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    loadAll();
    return () => {
      isMounted = false;
    };
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

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-49), { board, rack }]);
  }, [board, rack]);

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

      if (e.key === " ") {
        e.preventDefault();
        setTypingDir((d) => (d === "H" ? "V" : "H"));
        return;
      }

      if (/^[a-zA-Z]$/.test(e.key)) {
        pushHistory();
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = e.key.toUpperCase();
          return next;
        });

        if (typingDir === "H" && c < 14) setSelectedCell([r, c + 1]);
        else if (typingDir === "V" && r < 14) setSelectedCell([r + 1, c]);
      } else if (e.key === "Backspace") {
        if (board[r][c]) {
          pushHistory();
          setBoard((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = "";
            return next;
          });
        } else {
          if (typingDir === "H" && c > 0) {
            setSelectedCell([r, c - 1]);
            pushHistory();
            setBoard((prev) => {
              const next = prev.map((row) => [...row]);
              next[r][c - 1] = "";
              return next;
            });
          } else if (typingDir === "V" && r > 0) {
            setSelectedCell([r - 1, c]);
            pushHistory();
            setBoard((prev) => {
              const next = prev.map((row) => [...row]);
              next[r - 1][c] = "";
              return next;
            });
          }
        }
      } else if (e.key === "Delete") {
        pushHistory();
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = "";
          return next;
        });
      } else if (e.key === "ArrowRight") {
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
  }, [selectedCell, isBoardLocked, typingDir, board, handleUndo, pushHistory]);

  const clearBoard = useCallback(() => {
    pushHistory();
    setBoard(
      Array(15)
        .fill(null)
        .map(() => Array(15).fill("")),
    );
    setHoveredPlay(null);
  }, [pushHistory]);

  const previewMap = useMemo(() => {
    if (!hoveredPlay || hoveredPlay.dir === "EXCH") return {};
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
      pushHistory();
      if (play.dir !== "EXCH") {
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          for (let i = 0; i < play.word.length; i++) {
            const r = play.dir === "V" ? play.row + i : play.row;
            const c = play.dir === "H" ? play.col + i : play.col;
            next[r][c] = play.word[i].toUpperCase();
          }
          return next;
        });
      }

      setRack((prevRack) => {
        let currentRack = prevRack.toUpperCase().split("");
        for (let i = 0; i < play.word.length; i++) {
          if (play.dir !== "EXCH") {
            const r = play.dir === "V" ? play.row + i : play.row;
            const c = play.dir === "H" ? play.col + i : play.col;
            if (board[r][c]) continue;
          }
          const char = play.word[i].toUpperCase();
          const idx = currentRack.indexOf(char);
          if (idx !== -1) {
            currentRack.splice(idx, 1);
          } else {
            const wildcardIdx = currentRack.findIndex((ch) =>
              ["?", ".", "0", "*", "_"].includes(ch),
            );
            if (wildcardIdx !== -1) currentRack.splice(wildcardIdx, 1);
          }
        }
        return currentRack.join("");
      });

      setHoveredPlay(null);
    },
    [board, pushHistory],
  );

  const handleCellClick = useCallback(
    (r, c) => {
      if (isBoardLocked) setIsBoardLocked(false);
      setSelectedCell((prev) => {
        if (!prev) return [r, c];
        if (prev[0] === r && prev[1] === c) {
          setTypingDir((d) => (d === "H" ? "V" : "H"));
          return [r, c];
        }
        return [r, c];
      });
    },
    [isBoardLocked],
  );

  const handleHoverPlay = useCallback((play) => setHoveredPlay(play), []);
  const handleLeavePlay = useCallback(() => setHoveredPlay(null), []);

  const handleRackChange = (val) => {
    const sanitized = val.toUpperCase().replace(/[^A-Z?.*_0]/g, "");
    setRack(sanitized);
  };

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
                      onChange={(e) => {
                        setUseTwl(e.target.checked);
                        if (!e.target.checked && !useSowpods)
                          setUseSowpods(true);
                      }}
                    />{" "}
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
                      onChange={(e) => {
                        setUseSowpods(e.target.checked);
                        if (!e.target.checked && !useTwl) setUseTwl(true);
                      }}
                    />{" "}
                    SOWPODS
                  </label>
                </div>

                {/* Ranking Toggle Dropdown */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <label
                    style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#b71c1c",
                    }}
                  >
                    Sort By:
                  </label>
                  <select
                    className="win98-input"
                    style={{
                      width: "auto",
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value)}
                  >
                    <option value="value">
                      Strategic Value (Score + Leave + Defense)
                    </option>
                    <option value="score">Highest Score (Greedy)</option>
                  </select>
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
                  localDictionary={localDictionary}
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
                    onChange={(e) => handleRackChange(e.target.value)}
                    placeholder="E.g. REOPMAJ? or ? for blank"
                  />

                  {/* Tray Display */}
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

                {/* Opponent Intel & Prediction Module */}
                <div
                  className="win98-inset"
                  style={{ backgroundColor: "#f0f4f8" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={enableIntel}
                        onChange={(e) => setEnableIntel(e.target.checked)}
                      />
                      Opponent Intel & Minimax Counter
                    </label>
                  </div>

                  {enableIntel && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          fontSize: "10px",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="intelMode"
                            value="auto"
                            checked={intelMode === "auto"}
                            onChange={() => setIntelMode("auto")}
                          />
                          Auto (Endgame Deduce)
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
                            type="radio"
                            name="intelMode"
                            value="manual"
                            checked={intelMode === "manual"}
                            onChange={() => setIntelMode("manual")}
                          />
                          Manual (Paste Woogles Tiles)
                        </label>
                      </div>

                      {intelMode === "manual" && (
                        <div>
                          <input
                            type="text"
                            className="win98-input"
                            style={{ fontSize: "11px", padding: "2px 4px" }}
                            placeholder="Paste 'Available Tiles' from Woogles (e.g. AABCDEE...)"
                            value={manualAvailableTiles}
                            onChange={(e) =>
                              setManualAvailableTiles(
                                e.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z?]/g, ""),
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* NEW VISUAL UNSEEN TILE TRACKER */}
                <UnseenTileTracker
                  board={board}
                  rack={rack}
                  activePreset={activePreset}
                  enableIntel={enableIntel}
                  intelMode={intelMode}
                  manualAvailableTiles={manualAvailableTiles}
                />

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
                          : "Calculating Best Plays & Counter-Responses..."}
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
                        const isExch = play.dir === "EXCH";
                        const colLetter = isExch ? "" : COLUMNS[play.col];
                        const rowNum = isExch ? "" : play.row + 1;
                        const notation = isExch
                          ? "EXCHANGE"
                          : play.dir === "H"
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
          localDictionary={localDictionary}
        />
      </div>
    </div>
  );
}

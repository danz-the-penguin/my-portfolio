"use client";

import React, { useState, useEffect, useMemo, useDeferredValue } from "react";
import "./scrabble.css";

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

const SCORES = {
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
};

const PREMIUM_LAYOUT = {
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
};

export default function ScrabbleSolverV3() {
  const [wordList, setWordList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rack, setRack] = useState("IGORTEP");
  const [hoveredPlay, setHoveredPlay] = useState(null);
  const [isBoardLocked, setIsBoardLocked] = useState(true);

  const [board, setBoard] = useState(() =>
    Array(15)
      .fill(null)
      .map(() => Array(15).fill("")),
  );
  const [selectedCell, setSelectedCell] = useState([7, 7]);

  const deferredBoard = useDeferredValue(board);
  const deferredRack = useDeferredValue(rack);

  // O(1) dictionary lookup set for fast cross-word checking
  const wordSet = useMemo(() => new Set(wordList), [wordList]);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/raun/Scrabble/master/words.txt")
      .then((res) => res.text())
      .then((text) => {
        const words = text
          .split("\n")
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length >= 2 && /^[a-z]+$/.test(w));
        setWordList(words);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isBoardLocked) return;

    const handleKeyDown = (e) => {
      if (document.activeElement && document.activeElement.tagName === "INPUT")
        return;
      if (!selectedCell) return;
      const [r, c] = selectedCell;

      if (e.key >= "a" && e.key <= "z") {
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = e.key.toUpperCase();
          return next;
        });
        if (c < 14) setSelectedCell([r, c + 1]);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = "";
          return next;
        });
      } else if (e.key === "ArrowRight" && c < 14) setSelectedCell([r, c + 1]);
      else if (e.key === "ArrowLeft" && c > 0) setSelectedCell([r, c - 1]);
      else if (e.key === "ArrowDown" && r < 14) setSelectedCell([r + 1, c]);
      else if (e.key === "ArrowUp" && r > 0) setSelectedCell([r - 1, c]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isBoardLocked]);

  const clearBoard = () => {
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

  const applyPlay = (play) => {
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
              (ch) => ch === "?" || ch === ".",
            );
            if (wildcardIdx !== -1) currentRack.splice(wildcardIdx, 1);
          }
        }
      }
      return currentRack.join("");
    });

    setHoveredPlay(null);
  };

  const candidatePlays = useMemo(() => {
    if (!deferredRack.trim() || wordList.length === 0) return [];

    const cleanRack = deferredRack.toLowerCase().replace(/[\?\.]/g, "");
    const rackCounts = {};
    for (let char of cleanRack) rackCounts[char] = (rackCounts[char] || 0) + 1;
    const wildcards = (deferredRack.match(/[\?\.]/g) || []).length;

    const maxAvailable = { ...rackCounts };
    let hasBoardTiles = false;

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const val = deferredBoard[r][c];
        if (val) {
          hasBoardTiles = true;
          const char = val.toLowerCase();
          maxAvailable[char] = (maxAvailable[char] || 0) + 1;
        }
      }
    }

    const viableWords = wordList.filter((word) => {
      if (word.length > 15) return false;
      let missing = 0;
      const counts = {};
      for (let char of word) {
        counts[char] = (counts[char] || 0) + 1;
        const limit = maxAvailable[char] || 0;
        if (counts[char] > limit) {
          missing++;
          if (missing > wildcards) return false;
        }
      }
      return true;
    });

    const results = [];
    const isCenterCovered = deferredBoard[7][7] !== "";

    const processVector = (isVertical, index) => {
      for (const w of viableWords) {
        const wLen = w.length;
        for (let pos = 0; pos <= 15 - wLen; pos++) {
          let isValid = true;
          let rackTilesUsed = 0;
          let blanksUsed = 0;
          let mainWordScore = 0;
          let mainWordMultiplier = 1;
          let crossWordsTotalScore = 0;
          let intersectsBoard = false;
          let exposes3W = false;

          const tempCounts = { ...rackCounts };

          // Pre-check: Ensure word doesn't seamlessly attach to pre/post existing tiles forming invalid main word extensions
          const startR = isVertical ? pos : index;
          const startC = isVertical ? index : pos;
          const endR = isVertical ? pos + wLen - 1 : index;
          const endC = isVertical ? index : pos + wLen - 1;

          const preR = isVertical ? startR - 1 : startR;
          const preC = isVertical ? startC : startC - 1;
          const postR = isVertical ? endR + 1 : endR;
          const postC = isVertical ? endC : endC + 1;

          if (
            (preR >= 0 && preC >= 0 && deferredBoard[preR][preC]) ||
            (postR < 15 && postC < 15 && deferredBoard[postR][postC])
          ) {
            continue; // Invalid play: forms an unhandled longer word along the main vector
          }

          for (let i = 0; i < wLen; i++) {
            const r = isVertical ? pos + i : index;
            const c = isVertical ? index : pos + i;
            const existing = deferredBoard[r][c].toLowerCase();
            const char = w[i];
            const premiumKey = `${r},${c}`;
            const premium = PREMIUM_LAYOUT[premiumKey];

            if (existing) {
              if (existing !== char) {
                isValid = false;
                break;
              }
              mainWordScore += SCORES[char] || 0;
              intersectsBoard = true;
            } else {
              let charScore = SCORES[char] || 0;
              let isBlankTile = false;

              if (tempCounts[char] > 0) {
                tempCounts[char]--;
                rackTilesUsed++;
              } else if (blanksUsed < wildcards) {
                blanksUsed++;
                rackTilesUsed++;
                charScore = 0;
                isBlankTile = true;
              } else {
                isValid = false;
                break;
              }

              // Main word multipliers
              if (premium === "2L") charScore *= 2;
              if (premium === "3L") charScore *= 3;
              if (premium === "2W" || premium === "CENTER")
                mainWordMultiplier *= 2;
              if (premium === "3W") mainWordMultiplier *= 3;

              mainWordScore += charScore;

              const adj3W = [
                `${r - 1},${c}`,
                `${r + 1},${c}`,
                `${r},${c - 1}`,
                `${r},${c + 1}`,
              ].some((k) => PREMIUM_LAYOUT[k] === "3W");
              if (adj3W) exposes3W = true;

              // --- CROSS-WORD VALIDATION ---
              const pdr = isVertical ? 0 : 1;
              const pdc = isVertical ? 1 : 0;

              const hasPerpTile =
                (r - pdr >= 0 &&
                  c - pdc >= 0 &&
                  deferredBoard[r - pdr][c - pdc]) ||
                (r + pdr < 15 &&
                  c + pdc < 15 &&
                  deferredBoard[r + pdr][c + pdc]);

              if (hasPerpTile) {
                intersectsBoard = true; // Connection made via adjacent cross-word tile

                // Find start of cross-word
                let cR = r;
                let cC = c;
                while (
                  cR - pdr >= 0 &&
                  cC - pdc >= 0 &&
                  deferredBoard[cR - pdr][cC - pdc]
                ) {
                  cR -= pdr;
                  cC -= pdc;
                }

                // Construct cross-word string and score
                let crossStr = "";
                let crossScore = 0;
                let crossMult = 1;

                while (cR < 15 && cC < 15) {
                  if (cR === r && cC === c) {
                    crossStr += char;
                    let tileVal = isBlankTile ? 0 : SCORES[char] || 0;
                    if (premium === "2L") tileVal *= 2;
                    if (premium === "3L") tileVal *= 3;
                    if (premium === "2W" || premium === "CENTER")
                      crossMult *= 2;
                    if (premium === "3W") crossMult *= 3;
                    crossScore += tileVal;
                  } else {
                    const existingTile = deferredBoard[cR][cC].toLowerCase();
                    if (!existingTile) break;
                    crossStr += existingTile;
                    crossScore += SCORES[existingTile] || 0;
                  }
                  cR += pdr;
                  cC += pdc;
                }

                if (!wordSet.has(crossStr)) {
                  isValid = false; // Cross-word is illegal dictionary word!
                  break;
                }

                crossWordsTotalScore += crossScore * crossMult;
              }
            }
          }

          const coversCenter = index === 7 && pos <= 7 && pos + wLen > 7;
          const validConnection = isCenterCovered
            ? intersectsBoard
            : coversCenter || (hasBoardTiles && intersectsBoard);

          if (isValid && rackTilesUsed > 0 && validConnection) {
            let total =
              mainWordScore * mainWordMultiplier + crossWordsTotalScore;
            if (rackTilesUsed === 7) total += 50;

            results.push({
              word: w,
              score: total,
              row: isVertical ? pos : index,
              col: isVertical ? index : pos,
              dir: isVertical ? "V" : "H",
              exposes3W,
            });
          }
        }
      }
    };

    for (let i = 0; i < 15; i++) {
      processVector(false, i);
      processVector(true, i);
    }

    const uniqueMap = new Map();
    for (const r of results) {
      const key = `${r.word}-${r.row}-${r.col}-${r.dir}`;
      if (!uniqueMap.has(key) || uniqueMap.get(key).score < r.score) {
        uniqueMap.set(key, r);
      }
    }

    return Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score);
  }, [deferredBoard, deferredRack, wordList, wordSet]);

  return (
    <div className="win98-body">
      <div className="win98-container">
        <div className="win98-window">
          <div className="win98-titlebar">
            <span>Scrabble_Bot_Solver_v3.exe - [Interactive Grid Engine]</span>
            <div>
              <button className="win98-button">X</button>
            </div>
          </div>

          <div className="win98-content">
            <div className="v3-layout">
              <div>
                <div
                  style={{
                    marginBottom: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <button
                    className="win98-button"
                    style={{
                      fontWeight: "bold",
                      backgroundColor: isBoardLocked ? "#c0c0c0" : "#ffcccc",
                    }}
                    onClick={() => setIsBoardLocked((prev) => !prev)}
                  >
                    {isBoardLocked
                      ? "🔒 Board Locked (Search Mode)"
                      : "🔓 Board Unlocked (Type Opponent Tiles)"}
                  </button>

                  <button className="win98-button" onClick={clearBoard}>
                    Clear Board Grid
                  </button>
                </div>

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
                          const previewChar = previewMap[`${r},${c}`];
                          const premium = PREMIUM_LAYOUT[`${r},${c}`];
                          const cellClass = tileVal
                            ? ""
                            : premium
                              ? `cell-${premium}`
                              : "";

                          return (
                            <div
                              key={`${r}-${c}`}
                              className={`board-cell ${cellClass} ${isSelected ? "selected" : ""}`}
                              onClick={() => {
                                if (isBoardLocked) setIsBoardLocked(false);
                                setSelectedCell([r, c]);
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
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div className="win98-inset">
                  <label style={{ fontSize: "11px", fontWeight: "bold" }}>
                    Your Rack Tiles:
                  </label>
                  <input
                    type="text"
                    className="win98-input"
                    value={rack}
                    onChange={(e) => setRack(e.target.value.toUpperCase())}
                    placeholder="E.g. ITTKTJO or ? for blank"
                  />
                </div>

                <div className="win98-window" style={{ flex: 1, margin: 0 }}>
                  <div className="win98-titlebar">
                    <span>Ranked Strategic Plays</span>
                    <span>{candidatePlays.length} Found</span>
                  </div>

                  <div className="win98-inset results-list">
                    {loading ? (
                      <div
                        style={{
                          padding: "10px",
                          textAlign: "center",
                          fontSize: "11px",
                        }}
                      >
                        Loading Lexicon...
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

                        return (
                          <div
                            key={idx}
                            className="result-card"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setHoveredPlay(play)}
                            onMouseLeave={() => setHoveredPlay(null)}
                            onClick={() => applyPlay(play)}
                          >
                            <div>
                              <div
                                style={{ fontWeight: "bold", fontSize: "13px" }}
                              >
                                {play.word.toUpperCase()}
                              </div>
                              <div style={{ fontSize: "11px", opacity: 0.9 }}>
                                <strong>{notation}</strong> &bull; Row {rowNum},
                                Col {colLetter} (
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
                                <span className="badge-risk-high">
                                  EXPOSES 3W
                                </span>
                              ) : (
                                <span className="badge-risk-safe">
                                  SAFE LEAVE
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

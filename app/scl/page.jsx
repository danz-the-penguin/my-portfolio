"use client";

import React, { useState, useEffect, useMemo, useDeferredValue } from "react";
import "./scrabble.css";

const SCORES = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1,
  m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8,
  y: 4, z: 10
};

function getCharCounts(str) {
  const counts = {};
  for (const char of str.toLowerCase()) {
    counts[char] = (counts[char] || 0) + 1;
  }
  return counts;
}

function Tile({ char, isBlank = false }) {
  const isBlankChar = isBlank || char === "?" || char === ".";
  const displayChar = isBlankChar && (char === "?" || char === ".") ? "" : char.toUpperCase();
  const score = isBlankChar ? 0 : (SCORES[char.toLowerCase()] ?? 0);

  return (
    <div className={`win98-tile ${isBlankChar ? "win98-tile-blank" : ""}`}>
      <span>{displayChar}</span>
      <span className="win98-tile-score">{score}</span>
    </div>
  );
}

export default function ScrabbleSolver() {
  const [wordList, setWordList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Raw Form Inputs
  const [rack, setRack] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [middle, setMiddle] = useState("");
  const [anchor, setAnchor] = useState("");
  const [lengthFilter, setLengthFilter] = useState("");
  const [sortBy, setSortBy] = useState("score");

  // Deferred inputs for smooth typing
  const deferredRack = useDeferredValue(rack);
  const deferredStarts = useDeferredValue(starts);
  const deferredEnds = useDeferredValue(ends);
  const deferredMiddle = useDeferredValue(middle);
  const deferredAnchor = useDeferredValue(anchor);
  const deferredLengthFilter = useDeferredValue(lengthFilter);

  // Modal State
  const [activeWord, setActiveWord] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [loadingDef, setLoadingDef] = useState(false);

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

  const handleInspectWord = async (word) => {
    setActiveWord(word);
    setLoadingDef(true);
    setDefinition(null);

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!res.ok) throw new Error("Definition not found");
      const data = await res.json();
      setDefinition(data[0]);
    } catch {
      setDefinition({ error: "No definition available for this word." });
    } finally {
      setLoadingDef(false);
    }
  };

  const results = useMemo(() => {
    if (!deferredRack.trim() || wordList.length === 0) return [];

    const rawRack = deferredRack.toLowerCase();
    const blanksCount = (rawRack.match(/[\?\.]/g) || []).length;
    const cleanRack = rawRack.replace(/[\?\.]/g, "");
    const rackCounts = getCharCounts(cleanRack);

    const s = deferredStarts.toLowerCase().trim();
    const e = deferredEnds.toLowerCase().trim();
    const m = deferredMiddle.toLowerCase().trim();
    const a = deferredAnchor.toLowerCase().trim();

    const boardAllowance = getCharCounts(s + e + m + a);

    let targetMin = null;
    let targetMax = null;
    if (deferredLengthFilter.trim()) {
      const lStr = deferredLengthFilter.trim();
      if (lStr.includes("-")) {
        const [p1, p2] = lStr.split("-").map(Number);
        targetMin = Math.min(p1, p2);
        targetMax = Math.max(p1, p2);
      } else if (lStr.endsWith("+")) {
        targetMin = parseInt(lStr.slice(0, -1), 10);
      } else if (!isNaN(Number(lStr))) {
        targetMin = targetMax = parseInt(lStr, 10);
      }
    }

    const matches = [];

    for (const w of wordList) {
      if (w.length < 2) continue;
      if (targetMin !== null && w.length < targetMin) continue;
      if (targetMax !== null && w.length > targetMax) continue;

      if (s && !w.startsWith(s)) continue;
      if (e && !w.endsWith(e)) continue;
      if (a && !w.includes(a)) continue;

      if (m) {
        const inner = w.slice(1, -1);
        let innerMatched = true;
        for (const char of m) {
          if (!inner.includes(char)) {
            innerMatched = false;
            break;
          }
        }
        if (!innerMatched) continue;
      }

      const wordCounts = getCharCounts(w);
      let neededBlanks = 0;
      const blankAssignedChars = {};
      const takenFromBoard = {};

      for (const [char, count] of Object.entries(wordCounts)) {
        const availableInRack = rackCounts[char] || 0;
        if (count > availableInRack) {
          const missing = count - availableInRack;
          const allowedBoard = boardAllowance[char] || 0;
          const fromBoard = Math.min(missing, allowedBoard);
          takenFromBoard[char] = fromBoard;

          const stillMissing = missing - fromBoard;
          if (stillMissing > 0) {
            neededBlanks += stillMissing;
            blankAssignedChars[char] = stillMissing;
          }
        }
      }

      if (neededBlanks <= blanksCount) {
        // Construct detailed tile representation & score
        let score = 0;
        let rackTilesUsed = 0;
        const blankTracker = { ...blankAssignedChars };
        const tilesDetail = [];

        for (const char of w) {
          let isBlankTile = false;
          if (blankTracker[char] && blankTracker[char] > 0) {
            isBlankTile = true;
            blankTracker[char] -= 1;
          } else {
            score += SCORES[char] || 0;
          }
          tilesDetail.push({ char, isBlank: isBlankTile });
        }

        for (const [char, count] of Object.entries(wordCounts)) {
          const boardUsed = takenFromBoard[char] || 0;
          rackTilesUsed += Math.max(0, count - boardUsed);
        }

        const isBingo = rackTilesUsed === 7;
        if (isBingo) score += 50;

        matches.push({
          word: w,
          score,
          length: w.length,
          bingo: isBingo,
          tilesDetail
        });
      }
    }

    if (sortBy === "score") {
      return matches.sort((x, y) => y.score - x.score || y.length - x.length);
    } else {
      return matches.sort((x, y) => y.length - x.length || y.score - x.score);
    }
  }, [
    deferredRack,
    deferredStarts,
    deferredEnds,
    deferredMiddle,
    deferredAnchor,
    deferredLengthFilter,
    sortBy,
    wordList
  ]);

  const groupedResults = useMemo(() => {
    if (sortBy !== "length") return {};
    const groups = {};
    for (const item of results) {
      if (!groups[item.length]) groups[item.length] = [];
      groups[item.length].push(item);
    }
    return groups;
  }, [results, sortBy]);

  const topScore = useMemo(() => {
    return results.length > 0 ? Math.max(...results.map((r) => r.score)) : 0;
  }, [results]);

  return (
    <div className="win98-body">
      <div className="win98-container">
        {/* Main Application Window */}
        <div className="win98-window">
          <div className="win98-titlebar">
            <span>Scrabble_Solver_v3.0.exe</span>
            <div className="win98-titlebar-controls">
              <button className="win98-btn-titlebar">_</button>
              <button className="win98-btn-titlebar">&#9633;</button>
              <button className="win98-btn-titlebar">X</button>
            </div>
          </div>

          <div className="win98-content">
            <div className="win98-header-layout">
              <div>
                <h1 className="win98-app-title">Scrabble Word Finder V3</h1>
                <p className="win98-app-subtitle">
                  Enter rack tiles below to find high scoring words.
                </p>
              </div>

              {/* Rack Display Area */}
              <div className="win98-inset win98-rack-container">
                {rack ? (
                  rack.split("").map((c, i) => <Tile key={i} char={c} />)
                ) : (
                  <span className="win98-rack-empty">[ Empty Rack ]</span>
                )}
              </div>
            </div>

            {/* Inputs Form */}
            <div className="win98-field-group">
              <div>
                <label className="win98-label">Rack (?/.)</label>
                <input
                  type="text"
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  placeholder="HOSPITAL"
                  className="win98-input"
                />
              </div>

              <div>
                <label className="win98-label">Starts With</label>
                <input
                  type="text"
                  value={starts}
                  onChange={(e) => setStarts(e.target.value)}
                  placeholder="HO"
                  className="win98-input"
                />
              </div>

              <div>
                <label className="win98-label">Ends With</label>
                <input
                  type="text"
                  value={ends}
                  onChange={(e) => setEnds(e.target.value)}
                  placeholder="AL"
                  className="win98-input"
                />
              </div>

              <div>
                <label className="win98-label">Contains Inner</label>
                <input
                  type="text"
                  value={middle}
                  onChange={(e) => setMiddle(e.target.value)}
                  placeholder="PIT"
                  className="win98-input"
                />
              </div>

              <div>
                <label className="win98-label">Anchor Letter</label>
                <input
                  type="text"
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  placeholder="S"
                  className="win98-input"
                />
              </div>

              <div>
                <label className="win98-label">Length Range</label>
                <input
                  type="text"
                  value={lengthFilter}
                  onChange={(e) => setLengthFilter(e.target.value)}
                  placeholder="8, 3-5, 4+"
                  className="win98-input win98-input-lowercase"
                />
              </div>
            </div>

            {/* Sorting Toggle Bar */}
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span className="win98-label" style={{ margin: 0 }}>
                  Sort Results By:
                </span>
                <button
                  className={`win98-button ${sortBy === "score" ? "active" : ""}`}
                  onClick={() => setSortBy("score")}
                >
                  Highest Score Overall
                </button>
                <button
                  className={`win98-button ${sortBy === "length" ? "active" : ""}`}
                  onClick={() => setSortBy("length")}
                >
                  By Word Length
                </button>
              </div>
            </div>

            {/* Classic Status Bar */}
            <div className="win98-statusbar">
              <div className="win98-statusbar-field">
                {loading
                  ? "Loading dictionary..."
                  : `Dictionary: ${wordList.length.toLocaleString()} words loaded.`}
              </div>
              <div className="win98-statusbar-field">Matches: {results.length}</div>
            </div>
          </div>
        </div>

        {/* Results Container */}
        <main>
          {loading ? (
            <div className="win98-window">
              <div className="win98-content win98-message-box">
                Loading dictionary into memory...
              </div>
            </div>
          ) : (
            <div className="win98-results-stack">
              {results.length === 0 && rack.trim() && (
                <div className="win98-window">
                  <div className="win98-content win98-message-box">
                    0 legal words matched your criteria.
                  </div>
                </div>
              )}

              {/* View Mode 1: Highest Score Regardless of Length */}
              {sortBy === "score" && results.length > 0 && (
                <div className="win98-window">
                  <div className="win98-titlebar win98-titlebar-inactive">
                    <span>Ranked by Highest Score</span>
                    <span>{results.length} Total Matches</span>
                  </div>

                  <div className="win98-inset" style={{ padding: 0 }}>
                    {results.map((item, idx) => {
                      const isTop = item.score === topScore;
                      return (
                        <div
                          key={`${item.word}-${idx}`}
                          onClick={() => handleInspectWord(item.word)}
                          className="win98-row"
                        >
                          <div className="win98-row-left">
                            <div className="win98-score-box">
                              <span
                                className={`win98-score-num ${
                                  isTop ? "top-score" : ""
                                }`}
                              >
                                {item.score}
                              </span>
                              <span className="win98-score-pts">PTS</span>
                            </div>

                            <div className="win98-tile-group">
                              {item.tilesDetail.map((t, cIdx) => (
                                <Tile key={cIdx} char={t.char} isBlank={t.isBlank} />
                              ))}
                            </div>
                          </div>

                          <div className="win98-row-right">
                            <span className="win98-row-meta">
                              ({item.length} letters)
                            </span>
                            {item.bingo && (
                              <span className="win98-badge-bingo">BINGO +50</span>
                            )}
                            <span className="win98-inspect-link">
                              Inspect &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* View Mode 2: Grouped by Word Length */}
              {sortBy === "length" &&
                Object.keys(groupedResults)
                  .map(Number)
                  .sort((a, b) => b - a)
                  .map((len) => {
                    const group = groupedResults[len];
                    const groupMaxScore = Math.max(...group.map((i) => i.score));

                    return (
                      <div key={len} className="win98-window">
                        <div className="win98-titlebar win98-titlebar-inactive">
                          <span>{len}-Letter Matches</span>
                          <span>{group.length} Words Found</span>
                        </div>

                        <div className="win98-inset" style={{ padding: 0 }}>
                          {group.map((item, idx) => {
                            const isTop = item.score === groupMaxScore;
                            return (
                              <div
                                key={`${item.word}-${idx}`}
                                onClick={() => handleInspectWord(item.word)}
                                className="win98-row"
                              >
                                <div className="win98-row-left">
                                  <div className="win98-score-box">
                                    <span
                                      className={`win98-score-num ${
                                        isTop ? "top-score" : ""
                                      }`}
                                    >
                                      {item.score}
                                    </span>
                                    <span className="win98-score-pts">PTS</span>
                                  </div>

                                  <div className="win98-tile-group">
                                    {item.tilesDetail.map((t, cIdx) => (
                                      <Tile key={cIdx} char={t.char} isBlank={t.isBlank} />
                                    ))}
                                  </div>
                                </div>

                                <div className="win98-row-right">
                                  {item.bingo && (
                                    <span className="win98-badge-bingo">
                                      BINGO +50
                                    </span>
                                  )}
                                  <span className="win98-inspect-link">
                                    Inspect &rarr;
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}
        </main>

        {/* Modal Dialog Window */}
        {activeWord && (
          <div
            className="win98-modal-overlay"
            onClick={() => setActiveWord(null)}
          >
            <div
              className="win98-window win98-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="win98-titlebar">
                <span>Dictionary.exe - {activeWord.toUpperCase()}</span>
                <button
                  className="win98-btn-titlebar"
                  onClick={() => setActiveWord(null)}
                >
                  X
                </button>
              </div>

              <div className="win98-content">
                <div className="win98-inset win98-modal-body">
                  {loadingDef ? (
                    <p style={{ margin: 0, fontSize: "11px" }}>
                      Searching database...
                    </p>
                  ) : definition?.error ? (
                    <p style={{ margin: 0, fontSize: "11px" }}>
                      {definition.error}
                    </p>
                  ) : (
                    <div className="win98-def-container">
                      {definition?.phonetic && (
                        <span className="win98-def-phonetic">
                          [{definition.phonetic}]
                        </span>
                      )}
                      {definition?.meanings?.map((m, idx) => (
                        <div key={idx}>
                          <strong>
                            <i>{m.partOfSpeech}</i>
                          </strong>
                          <ul className="win98-def-list">
                            {m.definitions.slice(0, 2).map((d, dIdx) => (
                              <li key={dIdx}>{d.definition}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="win98-modal-footer">
                  <button
                    className="win98-button"
                    onClick={() => setActiveWord(null)}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

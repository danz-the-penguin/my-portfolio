"use client";

import React, { useState, useEffect, useMemo } from "react";
import "./scrabble.css";

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

function getCharCounts(str) {
  const counts = {};
  for (const char of str.toLowerCase()) {
    counts[char] = (counts[char] || 0) + 1;
  }
  return counts;
}

function Tile({ char, scoreOverride }) {
  const isBlank = char === "?" || char === ".";
  const displayChar = isBlank ? "" : char.toUpperCase();
  const score = isBlank
    ? 0
    : (scoreOverride ?? SCORES[char.toLowerCase()] ?? 0);

  return (
    <div className="win98-tile">
      <span>{displayChar}</span>
      {!isBlank && <span className="win98-tile-score">{score}</span>}
    </div>
  );
}

export default function ScrabbleSolver() {
  const [wordList, setWordList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [rack, setRack] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [middle, setMiddle] = useState("");
  const [anchor, setAnchor] = useState("");
  const [lengthFilter, setLengthFilter] = useState("");

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
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      );
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
    if (!rack.trim() || wordList.length === 0) return [];

    const rawRack = rack.toLowerCase();
    const blanksCount = (rawRack.match(/[\?\.]/g) || []).length;
    const cleanRack = rawRack.replace(/[\?\.]/g, "");
    const rackCounts = getCharCounts(cleanRack);

    const s = starts.toLowerCase().trim();
    const e = ends.toLowerCase().trim();
    const m = middle.toLowerCase().trim();
    const a = anchor.toLowerCase().trim();

    const boardAllowance = getCharCounts(s + e + m + a);

    let targetMin = null;
    let targetMax = null;
    if (lengthFilter.trim()) {
      const lStr = lengthFilter.trim();
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
      const missingLetters = [];
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
            for (let i = 0; i < stillMissing; i++) {
              missingLetters.push(char);
            }
          }
        }
      }

      if (neededBlanks <= blanksCount) {
        missingLetters.sort((a, b) => (SCORES[b] || 0) - (SCORES[a] || 0));
        const baseScore = w
          .split("")
          .reduce((acc, c) => acc + (SCORES[c] || 0), 0);
        const blankDeduction = missingLetters
          .slice(0, neededBlanks)
          .reduce((acc, c) => acc + (SCORES[c] || 0), 0);

        let score = baseScore - blankDeduction;

        let rackTilesUsed = 0;
        for (const [char, count] of Object.entries(wordCounts)) {
          const boardUsed = takenFromBoard[char] || 0;
          rackTilesUsed += Math.max(0, count - boardUsed);
        }

        const isBingo = rackTilesUsed === 7;
        if (isBingo) score += 50;

        matches.push({ word: w, score, length: w.length, bingo: isBingo });
      }
    }

    return matches.sort((x, y) => y.length - x.length || y.score - x.score);
  }, [rack, starts, ends, middle, anchor, lengthFilter, wordList]);

  const groupedResults = useMemo(() => {
    const groups = {};
    for (const item of results) {
      if (!groups[item.length]) groups[item.length] = [];
      groups[item.length].push(item);
    }
    return groups;
  }, [results]);

  return (
    <div className="win98-body">
      <div className="win98-container">
        {/* Main Application Window */}
        <div className="win98-window">
          <div className="win98-titlebar">
            <span>Scrabble_Solver_v1.0.exe</span>
            <div className="win98-titlebar-controls">
              <button className="win98-btn-titlebar">_</button>
              <button className="win98-btn-titlebar">&#9633;</button>
              <button className="win98-btn-titlebar">X</button>
            </div>
          </div>

          <div className="win98-content">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: "16px" }}>
                  Scrabble Word Finder
                </h1>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px" }}>
                  Enter rack tiles below to find high scoring words.
                </p>
              </div>

              {/* Rack Display Area */}
              <div
                className="win98-inset"
                style={{
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                  minWidth: "180px",
                  minHeight: "46px",
                  boxSizing: "border-box",
                }}
              >
                {rack ? (
                  rack.split("").map((c, i) => <Tile key={i} char={c} />)
                ) : (
                  <span style={{ fontSize: "11px", color: "#666" }}>
                    [ Empty Rack ]
                  </span>
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
                  className="win98-input"
                  style={{ textTransform: "none" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Container */}
        <main>
          {loading ? (
            <div className="win98-window">
              <div
                className="win98-content"
                style={{ textAlign: "center", fontSize: "12px" }}
              >
                Loading dictionary into memory...
              </div>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {Object.keys(groupedResults).length === 0 && rack.trim() && (
                <div className="win98-window">
                  <div
                    className="win98-content"
                    style={{ textAlign: "center", fontSize: "12px" }}
                  >
                    0 legal words matched your criteria.
                  </div>
                </div>
              )}

              {Object.keys(groupedResults)
                .map(Number)
                .sort((a, b) => b - a)
                .map((len) => {
                  const group = groupedResults[len];
                  const maxScore = Math.max(...group.map((i) => i.score));

                  return (
                    <div key={len} className="win98-window">
                      <div
                        className="win98-titlebar"
                        style={{ background: "#808080" }}
                      >
                        <span>{len}-Letter Matches</span>
                        <span>{group.length} Words Found</span>
                      </div>

                      <div className="win98-inset" style={{ padding: 0 }}>
                        {group.map((item, idx) => {
                          const isTop = item.score === maxScore;
                          return (
                            <div
                              key={idx}
                              onClick={() => handleInspectWord(item.word)}
                              className="win98-row"
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                }}
                              >
                                <div
                                  style={{ width: "40px", textAlign: "center" }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "monospace",
                                      fontWeight: "bold",
                                      fontSize: "14px",
                                      color: isTop ? "#008000" : "inherit",
                                    }}
                                  >
                                    {item.score}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      display: "block",
                                    }}
                                  >
                                    PTS
                                  </span>
                                </div>

                                <div style={{ display: "flex", gap: "3px" }}>
                                  {item.word.split("").map((char, cIdx) => (
                                    <Tile key={cIdx} char={char} />
                                  ))}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                {item.bingo && (
                                  <span className="win98-badge-bingo">
                                    BINGO +50
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: "11px",
                                    textDecoration: "underline",
                                  }}
                                >
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

        {/* Modal Window */}
        {activeWord && (
          <div
            className="win98-modal-overlay"
            onClick={() => setActiveWord(null)}
          >
            <div
              className="win98-window"
              style={{ width: "380px" }}
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
                <div
                  className="win98-inset"
                  style={{ minHeight: "120px", padding: "10px" }}
                >
                  {loadingDef ? (
                    <p style={{ margin: 0, fontSize: "11px" }}>
                      Searching database...
                    </p>
                  ) : definition?.error ? (
                    <p style={{ margin: 0, fontSize: "11px" }}>
                      {definition.error}
                    </p>
                  ) : (
                    <div
                      style={{
                        fontSize: "11px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {definition?.phonetic && (
                        <span
                          style={{ fontFamily: "monospace", color: "#000080" }}
                        >
                          [{definition.phonetic}]
                        </span>
                      )}
                      {definition?.meanings?.map((m, idx) => (
                        <div key={idx}>
                          <strong>
                            <i>{m.partOfSpeech}</i>
                          </strong>
                          <ul
                            style={{ margin: "2px 0 0 0", paddingLeft: "16px" }}
                          >
                            {m.definitions.slice(0, 2).map((d, dIdx) => (
                              <li key={dIdx}>{d.definition}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "10px", textAlign: "right" }}>
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

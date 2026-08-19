"use client";

import React, { useState, useEffect, useMemo } from "react";

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

// Scrabble Tile Component
function Tile({ char, scoreOverride }) {
  const isBlank = char === "?" || char === ".";
  const displayChar = isBlank ? "" : char.toUpperCase();
  const score = isBlank
    ? 0
    : (scoreOverride ?? SCORES[char.toLowerCase()] ?? 0);

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "40px",
        backgroundColor: "#fef3c7",
        color: "#451a03",
        fontWeight: "800",
        fontSize: "18px",
        borderRadius: "6px",
        border: "2px solid #fcd34d",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <span>{displayChar}</span>
      {!isBlank && (
        <span
          style={{
            position: "absolute",
            bottom: "2px",
            right: "3px",
            fontSize: "9px",
            lineHeight: 1,
            color: "#78350f",
            fontWeight: "700",
          }}
        >
          {score}
        </span>
      )}
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

  // Definition Modal State
  const [activeWord, setActiveWord] = useState(null);
  const [definition, setDefinition] = useState(null);
  const [loadingDef, setLoadingDef] = useState(false);

  // Fetch dictionary
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

  // Solve matches
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
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        color: "#0f172a",
        boxSizing: "border-box",
      }}
    >
      {/* Header Container */}
      <header
        style={{
          backgroundColor: "#ffffff",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "900",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#0f172a",
              }}
            >
              <span
                style={{
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "16px",
                }}
              >
                S
              </span>
              Scrabble Word Finder
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              Find highest-scoring legal words and inspect live definitions.
            </p>
          </div>

          {/* Live Rack Preview */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#fffbe3",
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1px solid #fde68a",
              minHeight: "56px",
              boxSizing: "border-box",
            }}
          >
            {rack ? (
              rack.split("").map((c, i) => <Tile key={i} char={c} />)
            ) : (
              <span
                style={{
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "#b45309",
                }}
              >
                Type letters in Rack below
              </span>
            )}
          </div>
        </div>

        {/* Inputs Form Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
            paddingTop: "16px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <div>
            <label style={labelStyle}>Rack (? or .)</label>
            <input
              type="text"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              placeholder="HOSPITAL"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Starts With</label>
            <input
              type="text"
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
              placeholder="HO"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Ends With</label>
            <input
              type="text"
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
              placeholder="AL"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Contains Inner</label>
            <input
              type="text"
              value={middle}
              onChange={(e) => setMiddle(e.target.value)}
              placeholder="PIT"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Anchor Letter</label>
            <input
              type="text"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              placeholder="S"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Length Range</label>
            <input
              type="text"
              value={lengthFilter}
              onChange={(e) => setLengthFilter(e.target.value)}
              placeholder="8, 3-5, 4+"
              style={{ ...inputStyle, textTransform: "none" }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              color: "#64748b",
            }}
          >
            Loading Scrabble dictionary...
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {Object.keys(groupedResults).length === 0 && rack.trim() && (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px",
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                }}
              >
                No valid Scrabble words match your criteria.
              </div>
            )}

            {Object.keys(groupedResults)
              .map(Number)
              .sort((a, b) => b - a)
              .map((len) => {
                const group = groupedResults[len];
                const maxScore = Math.max(...group.map((i) => i.score));

                return (
                  <div
                    key={len}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      overflow: "hidden",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#f1f5f9",
                        padding: "12px 20px",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "700",
                          fontSize: "14px",
                          color: "#334155",
                        }}
                      >
                        {len}-Letter Words
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          backgroundColor: "#e2e8f0",
                          color: "#475569",
                          padding: "2px 10px",
                          borderRadius: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {group.length} {group.length === 1 ? "word" : "words"}
                      </span>
                    </div>

                    <div>
                      {group.map((item, idx) => {
                        const isTop = item.score === maxScore;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleInspectWord(item.word)}
                            style={{
                              padding: "12px 20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderBottom:
                                idx === group.length - 1
                                  ? "none"
                                  : "1px solid #f1f5f9",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "16px",
                              }}
                            >
                              <div
                                style={{
                                  minWidth: "48px",
                                  textAlign: "center",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "15px",
                                    fontWeight: "800",
                                    fontFamily: "monospace",
                                    color: isTop ? "#059669" : "#475569",
                                  }}
                                >
                                  {item.score}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "10px",
                                    color: "#94a3b8",
                                    fontWeight: "600",
                                  }}
                                >
                                  PTS
                                </span>
                              </div>

                              <div style={{ display: "flex", gap: "4px" }}>
                                {item.word.split("").map((char, cIdx) => (
                                  <Tile key={cIdx} char={char} />
                                ))}
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              {item.bingo && (
                                <span
                                  style={{
                                    backgroundColor: "#f3e8ff",
                                    color: "#6b21a8",
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  BINGO +50
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#059669",
                                  fontWeight: "600",
                                }}
                              >
                                Definition &rarr;
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

      {/* Definition Modal Overlay */}
      {activeWord && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 9999,
          }}
          onClick={() => setActiveWord(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              maxWidth: "440px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: "12px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "monospace",
                  color: "#0f172a",
                }}
              >
                {activeWord}
              </h3>
              <button
                onClick={() => setActiveWord(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                &times;
              </button>
            </div>

            {loadingDef ? (
              <p style={{ fontSize: "13px", color: "#64748b" }}>
                Fetching definition...
              </p>
            ) : definition?.error ? (
              <p style={{ fontSize: "13px", color: "#64748b" }}>
                {definition.error}
              </p>
            ) : (
              <div
                style={{
                  maxHeight: "240px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {definition?.phonetic && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      color: "#059669",
                      fontFamily: "monospace",
                    }}
                  >
                    {definition.phonetic}
                  </p>
                )}
                {definition?.meanings?.map((m, idx) => (
                  <div key={idx} style={{ fontSize: "13px" }}>
                    <span
                      style={{
                        fontWeight: "700",
                        color: "#334155",
                        fontStyle: "italic",
                      }}
                    >
                      {m.partOfSpeech}
                    </span>
                    <ul
                      style={{
                        margin: "4px 0 0 0",
                        paddingLeft: "20px",
                        color: "#475569",
                      }}
                    >
                      {m.definitions.slice(0, 2).map((d, dIdx) => (
                        <li key={dIdx} style={{ marginBottom: "4px" }}>
                          {d.definition}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#64748b",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  fontSize: "14px",
  fontFamily: "monospace",
  backgroundColor: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  outline: "none",
  textTransform: "uppercase",
  boxSizing: "border-box",
};

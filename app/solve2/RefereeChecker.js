"use client";

import React, { useState, useMemo } from "react";
import localDictionary from "./dictionary_compact.json";

export default function RefereeChecker({ twlSet, sowpodsSet, activePreset }) {
  const [challengeInput, setChallengeInput] = useState("");
  // Modes: "both" (either lexicon), "twl" (Plato / US only), "sowpods" (CSW International only)
  const [lexiconMode, setLexiconMode] = useState("both");

  const challengeResult = useMemo(() => {
    const raw = challengeInput.trim().toLowerCase();
    if (!raw) return null;

    const w = raw.replace(/[^a-z]/g, "");
    if (!w) return null;

    const isLoaded = Boolean(twlSet || sowpodsSet);
    const inTwl = twlSet ? twlSet.has(w) : false;
    const inSowpods = sowpodsSet ? sowpodsSet.has(w) : false;
    const inJson = Boolean(localDictionary[w]);
    const def = localDictionary[w] || null;

    // Evaluate validity based on the selected mode
    let isAccepted = false;
    if (lexiconMode === "twl") {
      isAccepted = inTwl;
    } else if (lexiconMode === "sowpods") {
      isAccepted = inSowpods;
    } else {
      isAccepted = inTwl || inSowpods;
    }

    const baseScore = w
      .split("")
      .reduce((sum, c) => sum + (activePreset?.scores?.[c] || 0), 0);

    return {
      word: w,
      isLoaded,
      inTwl,
      inSowpods,
      inJson,
      isAccepted,
      def,
      baseScore,
    };
  }, [challengeInput, twlSet, sowpodsSet, activePreset, lexiconMode]);

  return (
    <div className="win98-window" style={{ marginTop: "12px" }}>
      <div className="win98-titlebar">
        <span>Referee &bull; Multi-Lexicon Challenge & Verification</span>
      </div>
      <div className="win98-content" style={{ padding: "8px" }}>
        {/* Lexicon Selection Radio Buttons */}
        <div
          className="win98-inset"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "4px 8px",
            marginBottom: "8px",
            fontSize: "11px",
            backgroundColor: "#e0e0e0",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Verify Mode:</span>
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
              name="refereeLexiconMode"
              value="both"
              checked={lexiconMode === "both"}
              onChange={() => setLexiconMode("both")}
            />
            Both / Either
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
              name="refereeLexiconMode"
              value="twl"
              checked={lexiconMode === "twl"}
              onChange={() => setLexiconMode("twl")}
            />
            TWL (Plato / US)
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
              name="refereeLexiconMode"
              value="sowpods"
              checked={lexiconMode === "sowpods"}
              onChange={() => setLexiconMode("sowpods")}
            />
            SOWPODS (CSW / INTL)
          </label>
        </div>

        {/* Input Box */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            className="win98-input"
            style={{ maxWidth: "260px" }}
            placeholder="Type word to challenge..."
            value={challengeInput}
            onChange={(e) => setChallengeInput(e.target.value.toUpperCase())}
          />
          {challengeInput.trim() && (
            <button
              className="win98-button"
              onClick={() => setChallengeInput("")}
            >
              Clear
            </button>
          )}
        </div>

        {/* Challenge Result Display */}
        {challengeResult && (
          <div
            className="win98-inset"
            style={{
              marginTop: "8px",
              padding: "6px 8px",
              backgroundColor: !challengeResult.isLoaded
                ? "#fffde7"
                : challengeResult.isAccepted
                  ? "#e8f5e9"
                  : "#ffebee",
              borderColor: !challengeResult.isLoaded
                ? "#fbc02d"
                : challengeResult.isAccepted
                  ? "#2e7d32"
                  : "#c62828",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "4px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {!challengeResult.isLoaded ? (
                  <span className="badge-dict-only">
                    ⏳ LOADING LEXICONS...
                  </span>
                ) : (
                  <>
                    <span
                      className={
                        challengeResult.isAccepted
                          ? "badge-legal"
                          : "badge-illegal"
                      }
                    >
                      {challengeResult.isAccepted
                        ? `✔ VALID (${lexiconMode.toUpperCase()})`
                        : `✖ INVALID (${lexiconMode.toUpperCase()})`}
                    </span>

                    {challengeResult.inTwl ? (
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

                    {challengeResult.inSowpods ? (
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

                    {challengeResult.inJson && (
                      <span
                        className="badge-dict-only"
                        style={{ fontSize: "8px", padding: "1px 3px" }}
                      >
                        DEF
                      </span>
                    )}
                  </>
                )}
              </div>

              {challengeResult.isLoaded && challengeResult.isAccepted && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#1b5e20",
                  }}
                >
                  Base Value: {challengeResult.baseScore} PTS
                </span>
              )}
            </div>

            <div style={{ fontSize: "11px", lineHeight: "1.4", color: "#222" }}>
              {!challengeResult.isLoaded ? (
                <span style={{ color: "#777" }}>Loading wordlists...</span>
              ) : challengeResult.def ? (
                challengeResult.def
              ) : challengeResult.isAccepted ? (
                <span style={{ color: "#555", fontStyle: "italic" }}>
                  Verified legal word (inflected form or no extended dictionary
                  entry).
                </span>
              ) : (
                <span style={{ color: "#b71c1c" }}>
                  &quot;{challengeResult.word.toUpperCase()}&quot; is not legal
                  under {lexiconMode.toUpperCase()} rules. Challenge succeeds!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

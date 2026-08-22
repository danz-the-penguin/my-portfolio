// solverWorker.js

const REV_CODE = 26; // '#' Reversal separator
let gaddagTwl = null;
let gaddagSowpods = null;

// Preload binary buffers
async function loadGaddags() {
  try {
    const [twlRes, sowpodsRes] = await Promise.all([
      fetch("/gaddag_twl.bin"),
      fetch("/gaddag_sowpods.bin"),
    ]);

    if (twlRes.ok) {
      const buf = await twlRes.arrayBuffer();
      gaddagTwl = new Uint32Array(buf);
    }
    if (sowpodsRes.ok) {
      const buf = await sowpodsRes.arrayBuffer();
      gaddagSowpods = new Uint32Array(buf);
    }
  } catch (err) {
    console.error("Failed to load binary GADDAG files in worker:", err);
  }
}
const loadPromise = loadGaddags();

self.onmessage = async function (e) {
  await loadPromise;

  const { rack, board, activePreset, useTwl, useSowpods } = e.data;
  if (!rack || !activePreset) {
    self.postMessage([]);
    return;
  }

  const gaddag = useTwl ? gaddagTwl : useSowpods ? gaddagSowpods : gaddagTwl;
  if (!gaddag) {
    self.postMessage([]);
    return;
  }

  const { scores = {}, premiums = {}, bingoBonus = 50 } = activePreset;

  // 1. Rack parsing
  const WILDCARD_REGEX = /[\?\.\*0_\s]/g;
  const cleanRack = rack.toLowerCase().replace(WILDCARD_REGEX, "");
  let wildcards = (rack.match(WILDCARD_REGEX) || []).length;

  const rackCounts = new Int8Array(26);
  for (let i = 0; i < cleanRack.length; i++) {
    const code = cleanRack.charCodeAt(i) - 97;
    if (code >= 0 && code < 26) rackCounts[code]++;
  }

  const scoreTable = new Int8Array(26);
  for (let i = 0; i < 26; i++) {
    const lower = String.fromCharCode(97 + i);
    const upper = String.fromCharCode(65 + i);
    scoreTable[i] = scores[lower] ?? scores[upper] ?? 0;
  }

  // 2. Premium Grid Flattening
  const premiumGrid = new Uint8Array(225);
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const p = premiums[`${r},${c}`];
      if (p === "2L") premiumGrid[r * 15 + c] = 1;
      else if (p === "3L") premiumGrid[r * 15 + c] = 2;
      else if (p === "2W" || p === "CENTER") premiumGrid[r * 15 + c] = 3;
      else if (p === "3W") premiumGrid[r * 15 + c] = 4;
    }
  }

  // 3. Board Grid Flattening
  const boardGrid = new Int8Array(225);
  let hasBoardTiles = false;

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const val = board[r]?.[c];
      if (val && typeof val === "string") {
        const code = val.toLowerCase().charCodeAt(0) - 97;
        if (code >= 0 && code < 26) {
          boardGrid[r * 15 + c] = code + 1; // 1-based (1 = 'a')
          hasBoardTiles = true;
        }
      }
    }
  }

  // 4. Precompute Cross-Checks & Anchors
  const crossMaskV = new Uint32Array(225);
  const crossScoreBaseV = new Int16Array(225);
  const hasPerpGridV = new Uint8Array(225);

  const crossMaskH = new Uint32Array(225);
  const crossScoreBaseH = new Int16Array(225);
  const hasPerpGridH = new Uint8Array(225);

  const isAnchorSquare = new Uint8Array(225);
  const ALL_LETTERS_MASK = 0x03ffffff;

  if (!hasBoardTiles) {
    isAnchorSquare[7 * 15 + 7] = 1;
  }

  // Fast GADDAG lookup for perpendicular cross-checks
  const isWordValid = (str) => {
    if (str.length < 2) return false;
    const firstCode = str.charCodeAt(0) - 97;
    let nodeIdx = 0;
    let childPointer = gaddag[nodeIdx] >>> 7;

    // Step 1: Match first character
    let foundFirst = false;
    while (childPointer !== 0) {
      const entry = gaddag[childPointer];
      if ((entry & 0x1f) === firstCode) {
        nodeIdx = childPointer;
        foundFirst = true;
        break;
      }
      if ((entry & 0x40) === 0) break;
      childPointer++;
    }
    if (!foundFirst) return false;

    // Step 2: Match REV separator '#'
    childPointer = gaddag[nodeIdx] >>> 7;
    let foundRev = false;
    while (childPointer !== 0) {
      const entry = gaddag[childPointer];
      if ((entry & 0x1f) === REV_CODE) {
        nodeIdx = childPointer;
        foundRev = true;
        break;
      }
      if ((entry & 0x40) === 0) break;
      childPointer++;
    }
    if (!foundRev) return false;

    // Step 3: Match remaining characters
    for (let i = 1; i < str.length; i++) {
      const targetCode = str.charCodeAt(i) - 97;
      childPointer = gaddag[nodeIdx] >>> 7;
      let matched = false;
      while (childPointer !== 0) {
        const entry = gaddag[childPointer];
        if ((entry & 0x1f) === targetCode) {
          if (i === str.length - 1) return (entry & 0x20) !== 0; // isTerminal
          nodeIdx = childPointer;
          matched = true;
          break;
        }
        if ((entry & 0x40) === 0) break;
        childPointer++;
      }
      if (!matched) return false;
    }
    return false;
  };

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const gridIdx = r * 15 + c;
      if (boardGrid[gridIdx] !== 0) {
        const neighbors = [
          r > 0 ? (r - 1) * 15 + c : -1,
          r < 14 ? (r + 1) * 15 + c : -1,
          c > 0 ? r * 15 + (c - 1) : -1,
          c < 14 ? r * 15 + (c + 1) : -1,
        ];
        for (let n = 0; n < 4; n++) {
          const nIdx = neighbors[n];
          if (nIdx !== -1 && boardGrid[nIdx] === 0) isAnchorSquare[nIdx] = 1;
        }
        continue;
      }

      // Vertical cross-check (for horizontal placements)
      let up = r - 1;
      let prefixV = "";
      let scoreV = 0;
      while (up >= 0 && boardGrid[up * 15 + c] !== 0) {
        const code = boardGrid[up * 15 + c] - 1;
        prefixV = String.fromCharCode(97 + code) + prefixV;
        scoreV += scoreTable[code];
        up--;
      }
      let down = r + 1;
      let suffixV = "";
      while (down < 15 && boardGrid[down * 15 + c] !== 0) {
        const code = boardGrid[down * 15 + c] - 1;
        suffixV += String.fromCharCode(97 + code);
        scoreV += scoreTable[code];
        down++;
      }

      if (prefixV.length > 0 || suffixV.length > 0) {
        hasPerpGridV[gridIdx] = 1;
        crossScoreBaseV[gridIdx] = scoreV;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          const testWord = prefixV + String.fromCharCode(97 + code) + suffixV;
          if (isWordValid(testWord)) mask |= 1 << code;
        }
        crossMaskV[gridIdx] = mask;
      } else {
        crossMaskV[gridIdx] = ALL_LETTERS_MASK;
      }

      // Horizontal cross-check (for vertical placements)
      let left = c - 1;
      let prefixH = "";
      let scoreH = 0;
      while (left >= 0 && boardGrid[r * 15 + left] !== 0) {
        const code = boardGrid[r * 15 + left] - 1;
        prefixH = String.fromCharCode(97 + code) + prefixH;
        scoreH += scoreTable[code];
        left--;
      }
      let right = c + 1;
      let suffixH = "";
      while (right < 15 && boardGrid[r * 15 + right] !== 0) {
        const code = boardGrid[r * 15 + right] - 1;
        suffixH += String.fromCharCode(97 + code);
        scoreH += scoreTable[code];
        right++;
      }

      if (prefixH.length > 0 || suffixH.length > 0) {
        hasPerpGridH[gridIdx] = 1;
        crossScoreBaseH[gridIdx] = scoreH;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          const testWord = prefixH + String.fromCharCode(97 + code) + suffixH;
          if (isWordValid(testWord)) mask |= 1 << code;
        }
        crossMaskH[gridIdx] = mask;
      } else {
        crossMaskH[gridIdx] = ALL_LETTERS_MASK;
      }
    }
  }

  // 5. Zero-Allocation GADDAG Generator
  const results = [];
  const placedLetters = new Int8Array(15);
  const placedIsBlank = new Uint8Array(15);

  const searchVector = (isVertical, lineIdx) => {
    const crossMask = isVertical ? crossMaskH : crossMaskV;
    const crossScoreBase = isVertical ? crossScoreBaseH : crossScoreBaseV;
    const hasPerpGrid = isVertical ? hasPerpGridH : hasPerpGridV;

    const lineTiles = new Int8Array(15);
    const lineAnchors = new Uint8Array(15);
    const linePremiums = new Uint8Array(15);
    const lineCrossMasks = new Uint32Array(15);
    const lineCrossScores = new Int16Array(15);
    const lineHasPerp = new Uint8Array(15);

    for (let i = 0; i < 15; i++) {
      const gIdx = isVertical ? i * 15 + lineIdx : lineIdx * 15 + i;
      lineTiles[i] = boardGrid[gIdx];
      lineAnchors[i] = isAnchorSquare[gIdx];
      linePremiums[i] = premiumGrid[gIdx];
      lineCrossMasks[i] = crossMask[gIdx];
      lineCrossScores[i] = crossScoreBase[gIdx];
      lineHasPerp[i] = hasPerpGrid[gIdx];
    }

    const recordPlay = (startPos, endPos, rackUsed) => {
      let word = "";
      let mainWordScore = 0;
      let mainWordMult = 1;
      let crossScoreTotal = 0;
      let exposes3W = false;

      for (let p = startPos; p <= endPos; p++) {
        const charCode = placedLetters[p];
        word += String.fromCharCode(65 + charCode);

        const r = isVertical ? p : lineIdx;
        const c = isVertical ? lineIdx : p;
        const gIdx = r * 15 + c;
        const premium = premiumGrid[gIdx];
        const isExisting = boardGrid[gIdx] !== 0;
        const isBlank = placedIsBlank[p] === 1;

        if (isExisting) {
          mainWordScore += scoreTable[charCode];
        } else {
          let letterVal = isBlank ? 0 : scoreTable[charCode];
          if (premium === 1) letterVal *= 2;
          else if (premium === 2) letterVal *= 3;
          else if (premium === 3) mainWordMult *= 2;
          else if (premium === 4) mainWordMult *= 3;
          mainWordScore += letterVal;

          if (
            (r > 0 &&
              premiumGrid[(r - 1) * 15 + c] === 4 &&
              boardGrid[(r - 1) * 15 + c] === 0) ||
            (r < 14 &&
              premiumGrid[(r + 1) * 15 + c] === 4 &&
              boardGrid[(r + 1) * 15 + c] === 0) ||
            (c > 0 &&
              premiumGrid[r * 15 + c - 1] === 4 &&
              boardGrid[r * 15 + c - 1] === 0) ||
            (c < 14 &&
              premiumGrid[r * 15 + c + 1] === 4 &&
              boardGrid[r * 15 + c + 1] === 0)
          ) {
            exposes3W = true;
          }

          if (lineHasPerp[p] === 1) {
            let pVal = isBlank ? 0 : scoreTable[charCode];
            if (premium === 1) pVal *= 2;
            else if (premium === 2) pVal *= 3;
            let cMult = 1;
            if (premium === 3) cMult = 2;
            else if (premium === 4) cMult = 3;
            crossScoreTotal += (lineCrossScores[p] + pVal) * cMult;
          }
        }
      }

      let totalScore = mainWordScore * mainWordMult + crossScoreTotal;
      if (rackUsed === 7) totalScore += bingoBonus;

      results.push({
        word,
        score: totalScore,
        row: isVertical ? startPos : lineIdx,
        col: isVertical ? lineIdx : startPos,
        dir: isVertical ? "V" : "H",
        exposes3W,
      });
    };

    const gen = (
      pos,
      currPos,
      nodeIdx,
      direction,
      minPos,
      maxPos,
      tilesUsed,
    ) => {
      // 1. Terminal Check
      if (nodeIdx !== 0) {
        const entry = gaddag[nodeIdx];
        const isTerminal = (entry & 0x20) !== 0;

        if (isTerminal && tilesUsed > 0 && maxPos > minPos) {
          const leftClean = minPos === 0 || lineTiles[minPos - 1] === 0;
          let rightClean = false;
          if (direction > 0) {
            rightClean = currPos >= 15 || lineTiles[currPos] === 0;
          } else {
            rightClean = pos + 1 >= 15 || lineTiles[pos + 1] === 0;
          }

          if (leftClean && rightClean) {
            recordPlay(minPos, maxPos, tilesUsed);
          }
        }
      }

      // 2. Bounds check for further placements
      if (direction > 0 && currPos >= 15) return;

      let childPointer = gaddag[nodeIdx] >>> 7;
      if (childPointer === 0) return;

      while (childPointer !== 0) {
        const entry = gaddag[childPointer];
        const letterCode = entry & 0x1f;
        const hasSibling = (entry & 0x40) !== 0;

        // Reversal Transition '#'
        if (letterCode === REV_CODE) {
          if (direction < 0) {
            gen(pos, pos + 1, childPointer, 1, minPos, maxPos, tilesUsed);
          }
        }
        // Letter Transitions (A-Z)
        else if (letterCode < 26) {
          if (currPos >= 0 && currPos < 15) {
            const existing = lineTiles[currPos];

            if (existing !== 0) {
              if (existing - 1 === letterCode) {
                placedLetters[currPos] = letterCode;
                placedIsBlank[currPos] = 0;
                const nextMin =
                  direction < 0 && currPos < minPos ? currPos : minPos;
                const nextMax =
                  direction > 0 && currPos > maxPos ? currPos : maxPos;
                gen(
                  pos,
                  currPos + direction,
                  childPointer,
                  direction,
                  nextMin,
                  nextMax,
                  tilesUsed,
                );
              }
            } else {
              if ((lineCrossMasks[currPos] & (1 << letterCode)) !== 0) {
                const nextMin =
                  direction < 0 && currPos < minPos ? currPos : minPos;
                const nextMax =
                  direction > 0 && currPos > maxPos ? currPos : maxPos;

                if (rackCounts[letterCode] > 0) {
                  rackCounts[letterCode]--;
                  placedLetters[currPos] = letterCode;
                  placedIsBlank[currPos] = 0;
                  gen(
                    pos,
                    currPos + direction,
                    childPointer,
                    direction,
                    nextMin,
                    nextMax,
                    tilesUsed + 1,
                  );
                  rackCounts[letterCode]++;
                } else if (wildcards > 0) {
                  wildcards--;
                  placedLetters[currPos] = letterCode;
                  placedIsBlank[currPos] = 1;
                  gen(
                    pos,
                    currPos + direction,
                    childPointer,
                    direction,
                    nextMin,
                    nextMax,
                    tilesUsed + 1,
                  );
                  wildcards++;
                }
              }
            }
          }
        }

        if (!hasSibling) break;
        childPointer++;
      }
    };

    for (let pos = 0; pos < 15; pos++) {
      if (lineAnchors[pos] === 1) {
        gen(pos, pos, 0, -1, pos, pos, 0);
      }
    }
  };

  for (let i = 0; i < 15; i++) {
    searchVector(false, i);
    searchVector(true, i);
  }

  // Deduplicate and retain highest scores
  const uniqueMap = new Map();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const key = `${r.word}-${r.row}-${r.col}-${r.dir}`;
    const existing = uniqueMap.get(key);
    if (!existing || existing.score < r.score) uniqueMap.set(key, r);
  }

  const sorted = Array.from(uniqueMap.values()).sort(
    (a, b) => b.score - a.score || b.word.length - a.word.length,
  );

  self.postMessage(sorted.slice(0, 150));
};

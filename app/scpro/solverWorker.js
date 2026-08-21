// app/solve/solverWorker.js

self.onmessage = function (e) {
  const { rack, board, wordList, activePreset } = e.data;
  if (!rack || !wordList || wordList.length === 0 || !activePreset) {
    self.postMessage([]);
    return;
  }

  const { scores = {}, premiums = {}, bingoBonus = 50 } = activePreset;

  // 1. Clean rack & count tiles / wildcards
  const WILDCARD_REGEX = /[\?\.\*0_\s]/g;
  const cleanRack = rack.toLowerCase().replace(WILDCARD_REGEX, "");
  const wildcards = (rack.match(WILDCARD_REGEX) || []).length;

  const scoreTable = new Int8Array(26);
  for (let i = 0; i < 26; i++) {
    const lower = String.fromCharCode(97 + i);
    const upper = String.fromCharCode(65 + i);
    scoreTable[i] = scores[lower] ?? scores[upper] ?? 0;
  }

  // 2. Flatten premium grid: 0: None, 1: 2L, 2: 3L, 3: 2W/CENTER, 4: 3W
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

  // 3. Board flattening & tile counts
  const boardGrid = new Int8Array(225);
  let hasBoardTiles = false;
  const maxAvailable = new Int8Array(26);
  const rackCounts = new Int8Array(26);

  for (let i = 0; i < cleanRack.length; i++) {
    const code = cleanRack.charCodeAt(i) - 97;
    if (code >= 0 && code < 26) {
      rackCounts[code]++;
      maxAvailable[code]++;
    }
  }

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const val = board[r]?.[c];
      if (val && typeof val === "string") {
        const char = val.toLowerCase();
        const code = char.charCodeAt(0) - 97;
        if (code >= 0 && code < 26) {
          boardGrid[r * 15 + c] = code + 1; // 1-based (1 = 'a')
          hasBoardTiles = true;
          maxAvailable[code]++;
        }
      }
    }
  }

  const isCenterCovered = boardGrid[7 * 15 + 7] !== 0;

  // 4. Build word set and filter viable candidates
  const wordSet = new Set();
  const viableWords = [];

  for (let i = 0; i < wordList.length; i++) {
    const rawWord = wordList[i];
    const w = typeof rawWord === "string" ? rawWord.trim().toLowerCase() : "";
    if (w.length < 2 || w.length > 15) continue;
    wordSet.add(w);

    let missing = 0;
    const wCounts = new Int8Array(26);
    let isViable = true;
    for (let j = 0; j < w.length; j++) {
      const idx = w.charCodeAt(j) - 97;
      if (idx < 0 || idx >= 26) {
        isViable = false;
        break;
      }
      wCounts[idx]++;
      if (wCounts[idx] > maxAvailable[idx]) {
        missing++;
        if (missing > wildcards) {
          isViable = false;
          break;
        }
      }
    }
    if (isViable) viableWords.push(w);
  }

  // 5. Precalculate 32-bit Bitmask Cross-Checks and Anchor Map
  const crossMaskV = new Uint32Array(225);
  const crossScoreBaseV = new Int16Array(225);
  const hasPerpGridV = new Uint8Array(225);

  const crossMaskH = new Uint32Array(225);
  const crossScoreBaseH = new Int16Array(225);
  const hasPerpGridH = new Uint8Array(225);

  const isAnchorSquare = new Uint8Array(225);
  const rowHasAnchors = new Uint8Array(15);
  const colHasAnchors = new Uint8Array(15);

  const ALL_LETTERS_MASK = 0x03ffffff; // Bits 0-25 set to 1

  if (!hasBoardTiles) {
    isAnchorSquare[7 * 15 + 7] = 1;
    rowHasAnchors[7] = 1;
    colHasAnchors[7] = 1;
  }

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const gridIdx = r * 15 + c;

      if (boardGrid[gridIdx] !== 0) {
        // Mark orthogonally adjacent empty cells as anchors
        const neighbors = [
          r > 0 ? (r - 1) * 15 + c : -1,
          r < 14 ? (r + 1) * 15 + c : -1,
          c > 0 ? r * 15 + (c - 1) : -1,
          c < 14 ? r * 15 + (c + 1) : -1,
        ];
        for (let n = 0; n < 4; n++) {
          const nIdx = neighbors[n];
          if (nIdx !== -1 && boardGrid[nIdx] === 0) {
            isAnchorSquare[nIdx] = 1;
            const nr = Math.floor(nIdx / 15);
            const nc = nIdx % 15;
            rowHasAnchors[nr] = 1;
            colHasAnchors[nc] = 1;
          }
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
          if (wordSet.has(testWord)) mask |= 1 << code;
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
          if (wordSet.has(testWord)) mask |= 1 << code;
        }
        crossMaskH[gridIdx] = mask;
      } else {
        crossMaskH[gridIdx] = ALL_LETTERS_MASK;
      }
    }
  }

  // 6. Vector Scan Engine
  const results = [];
  const tempCounts = new Int8Array(26);

  const processVector = (isVertical, index) => {
    // Fast line skip if this line cannot form an anchor connection
    if (isVertical && colHasAnchors[index] === 0) return;
    if (!isVertical && rowHasAnchors[index] === 0) return;

    const crossMask = isVertical ? crossMaskH : crossMaskV;
    const crossScoreBase = isVertical ? crossScoreBaseH : crossScoreBaseV;
    const hasPerpGrid = isVertical ? hasPerpGridH : hasPerpGridV;

    for (let wIdx = 0; wIdx < viableWords.length; wIdx++) {
      const w = viableWords[wIdx];
      const wLen = w.length;
      const maxPos = 15 - wLen;

      for (let pos = 0; pos <= maxPos; pos++) {
        const startR = isVertical ? pos : index;
        const startC = isVertical ? index : pos;
        const endR = isVertical ? pos + wLen - 1 : index;
        const endC = isVertical ? index : pos + wLen - 1;

        // Bounding collision checks
        const preR = isVertical ? startR - 1 : startR;
        const preC = isVertical ? startC : startC - 1;
        const postR = isVertical ? endR + 1 : endR;
        const postC = isVertical ? endC : endC + 1;

        if (preR >= 0 && preC >= 0 && boardGrid[preR * 15 + preC] !== 0)
          continue;
        if (postR < 15 && postC < 15 && boardGrid[postR * 15 + postC] !== 0)
          continue;

        let isValid = true;
        let rackTilesUsed = 0;
        let blanksUsed = 0;
        let mainWordScore = 0;
        let mainWordMultiplier = 1;
        let crossWordsTotalScore = 0;
        let touchesAnchor = false;
        let exposes3W = false;

        for (let k = 0; k < 26; k++) tempCounts[k] = rackCounts[k];

        for (let i = 0; i < wLen; i++) {
          const r = isVertical ? pos + i : index;
          const c = isVertical ? index : pos + i;
          const gridIdx = r * 15 + c;
          const existingCode = boardGrid[gridIdx];
          const charCode = w.charCodeAt(i) - 97;
          const premium = premiumGrid[gridIdx];

          if (existingCode !== 0) {
            if (existingCode - 1 !== charCode) {
              isValid = false;
              break;
            }
            mainWordScore += scoreTable[charCode];
            touchesAnchor = true;
          } else {
            // O(1) Bitmask validation
            if ((crossMask[gridIdx] & (1 << charCode)) === 0) {
              isValid = false;
              break;
            }

            if (isAnchorSquare[gridIdx] === 1) touchesAnchor = true;

            let charScore = scoreTable[charCode];
            let isBlankTile = false;

            if (tempCounts[charCode] > 0) {
              tempCounts[charCode]--;
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

            if (premium === 1) charScore *= 2;
            else if (premium === 2) charScore *= 3;
            else if (premium === 3) mainWordMultiplier *= 2;
            else if (premium === 4) mainWordMultiplier *= 3;

            mainWordScore += charScore;

            if (!exposes3W) {
              if (
                r > 0 &&
                premiumGrid[(r - 1) * 15 + c] === 4 &&
                boardGrid[(r - 1) * 15 + c] === 0
              )
                exposes3W = true;
              else if (
                r < 14 &&
                premiumGrid[(r + 1) * 15 + c] === 4 &&
                boardGrid[(r + 1) * 15 + c] === 0
              )
                exposes3W = true;
              else if (
                c > 0 &&
                premiumGrid[r * 15 + c - 1] === 4 &&
                boardGrid[r * 15 + c - 1] === 0
              )
                exposes3W = true;
              else if (
                c < 14 &&
                premiumGrid[r * 15 + c + 1] === 4 &&
                boardGrid[r * 15 + c + 1] === 0
              )
                exposes3W = true;
            }

            if (hasPerpGrid[gridIdx] === 1) {
              let tileVal = isBlankTile ? 0 : scoreTable[charCode];
              if (premium === 1) tileVal *= 2;
              else if (premium === 2) tileVal *= 3;
              let cMult = 1;
              if (premium === 3) cMult = 2;
              else if (premium === 4) cMult = 3;
              crossWordsTotalScore +=
                (crossScoreBase[gridIdx] + tileVal) * cMult;
            }
          }
        }

        if (!isValid || !touchesAnchor || rackTilesUsed === 0) continue;

        let total = mainWordScore * mainWordMultiplier + crossWordsTotalScore;
        if (rackTilesUsed === 7) total += bingoBonus;

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
  };

  for (let i = 0; i < 15; i++) {
    processVector(false, i);
    processVector(true, i);
  }

  // 7. Deduplicate & Sort top 150 plays
  const uniqueMap = new Map();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const key = `${r.word}-${r.row}-${r.col}-${r.dir}`;
    const existing = uniqueMap.get(key);
    if (!existing || existing.score < r.score) {
      uniqueMap.set(key, r);
    }
  }

  const sorted = Array.from(uniqueMap.values()).sort(
    (a, b) => b.score - a.score || b.word.length - a.word.length,
  );

  self.postMessage(sorted.slice(0, 150));
};

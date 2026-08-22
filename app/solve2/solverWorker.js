// solverWorker.js - Zero-GC Binary GADDAG + HastyBot Leave Equity Engine

const REV_CODE = 26; // '#' Reversal separator
const MAX_RESULTS = 8192;

let gaddagTwl = null;
let gaddagSowpods = null;

// Tournament Base Leave Equity (scaled in 0.1 pts)
// Derived from Quackle / Elise / HastyBot simulation models
const BASE_LEAVE_EQUITY = new Int16Array([
  15, // A (+1.5)
  -20, // B (-2.0)
  -5, // C (-0.5)
  10, // D (+1.0)
  30, // E (+3.0)
  -20, // F (-2.0)
  -15, // G (-1.5)
  -10, // H (-1.0)
  12, // I (+1.2)
  -25, // J (-2.5)
  -25, // K (-2.5)
  12, // L (+1.2)
  -5, // M (-0.5)
  20, // N (+2.0)
  -5, // O (-0.5)
  -10, // P (-1.0)
  -75, // Q (-7.5)
  32, // R (+3.2)
  80, // S (+8.0)
  25, // T (+2.5)
  -30, // U (-3.0)
  -55, // V (-5.5)
  -25, // W (-2.5)
  35, // X (+3.5)
  0, // Y ( 0.0)
  20, // Z (+2.0)
]);
const BLANK_LEAVE_EQUITY = 255; // ? (+25.5)

// Static pre-allocated module buffers
const RACK_COUNTS = new Int8Array(26);
const SCORE_TABLE = new Int8Array(26);
const REMAINING_COUNTS = new Int8Array(26);

const PREMIUM_GRID = new Uint8Array(225);
const BOARD_GRID = new Int8Array(225);
const IS_ANCHOR_SQUARE = new Uint8Array(225);

const CROSS_MASK_V = new Uint32Array(225);
const CROSS_SCORE_BASE_V = new Int16Array(225);
const HAS_PERP_GRID_V = new Uint8Array(225);

const CROSS_MASK_H = new Uint32Array(225);
const CROSS_SCORE_BASE_H = new Int16Array(225);
const HAS_PERP_GRID_H = new Uint8Array(225);

const PERP_BUF = new Uint8Array(15);
const PLACED_LETTERS = new Int8Array(15);
const PLACED_IS_BLANK = new Uint8Array(15);

const LINE_TILES = new Int8Array(15);
const LINE_ANCHORS = new Uint8Array(15);
const LINE_CROSS_MASKS = new Uint32Array(15);
const LINE_CROSS_SCORES = new Int16Array(15);
const LINE_HAS_PERP = new Uint8Array(15);

// Flat results buffer pool
let resultsCount = 0;
const RES_WORD_LEN = new Uint8Array(MAX_RESULTS);
const RES_WORD_CHARS = new Uint8Array(MAX_RESULTS * 15);
const RES_SCORE = new Int16Array(MAX_RESULTS);
const RES_EQUITY = new Float32Array(MAX_RESULTS);
const RES_TOTAL_VAL = new Float32Array(MAX_RESULTS);
const RES_ROW = new Uint8Array(MAX_RESULTS);
const RES_COL = new Uint8Array(MAX_RESULTS);
const RES_DIR = new Uint8Array(MAX_RESULTS); // 0 = H, 1 = V
const RES_EXPOSES_3W = new Uint8Array(MAX_RESULTS);
const RES_LEAVE_CHARS = new Uint8Array(MAX_RESULTS * 7);
const RES_LEAVE_LEN = new Uint8Array(MAX_RESULTS);

const INDEX_ARRAY = new Uint16Array(MAX_RESULTS);
const ALL_LETTERS_MASK = 0x03ffffff;

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

// Zero-allocation binary GADDAG lookup on integer character codes
function isWordValidCodes(gaddag, buf, len) {
  if (len < 2) return false;

  const firstCode = buf[0];
  let nodeIdx = 0;
  let childPointer = gaddag[0] >>> 7;
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

  for (let i = 1; i < len; i++) {
    const targetCode = buf[i];
    childPointer = gaddag[nodeIdx] >>> 7;
    let matched = false;
    while (childPointer !== 0) {
      const entry = gaddag[childPointer];
      if ((entry & 0x1f) === targetCode) {
        if (i === len - 1) return (entry & 0x20) !== 0;
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
}

// Strategic Leave Valuation Model
function evaluateLeaveEquity(counts, blanksRemaining) {
  let equity = blanksRemaining * BLANK_LEAVE_EQUITY;
  let vowels = 0;
  let consonants = 0;
  let totalTiles = blanksRemaining;

  for (let c = 0; c < 26; c++) {
    const count = counts[c];
    if (count === 0) continue;

    totalTiles += count;
    equity += count * BASE_LEAVE_EQUITY[c];

    // Vowel vs Consonant tracking
    if (c === 0 || c === 4 || c === 8 || c === 14 || c === 20) {
      vowels += count;
    } else {
      consonants += count;
    }

    // Duplicate Tile Penalties
    if (count > 1) {
      equity -= (count - 1) * 20;
      if (c === 8 || c === 14 || c === 20) equity -= (count - 1) * 15; // Extra penalty for duplicate I/O/U
    }
  }

  if (totalTiles === 0) return 0; // Bingo / Empty leave

  // Vowel/Consonant Ratio Adjustments
  if (vowels === 0 && consonants > 0) {
    equity -= consonants * 25; // Harsh penalty for vowel-less leaves
  } else if (consonants === 0 && vowels > 1) {
    equity -= vowels * 30; // Harsh penalty for all-vowel leaves
  } else if (vowels === 2 && consonants === 2) {
    equity += 15; // Balanced 2V/2C bonus
  } else if (vowels === 2 && consonants === 3) {
    equity += 12; // Balanced 2V/3C bonus
  }

  // Q without U penalty
  if (counts[16] > 0 && counts[20] === 0 && blanksRemaining === 0) {
    equity -= 45;
  }

  // High-synergy bingo suffixes (ER, IN, ST)
  if (counts[4] > 0 && counts[17] > 0) equity += 12; // E + R
  if (counts[8] > 0 && counts[13] > 0) equity += 10; // I + N
  if (counts[18] > 0 && counts[19] > 0) equity += 15; // S + T

  return equity / 10.0;
}

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

  // 1. Reset working state
  resultsCount = 0;
  RACK_COUNTS.fill(0);
  SCORE_TABLE.fill(0);
  PREMIUM_GRID.fill(0);
  BOARD_GRID.fill(0);
  IS_ANCHOR_SQUARE.fill(0);
  CROSS_MASK_V.fill(ALL_LETTERS_MASK);
  CROSS_SCORE_BASE_V.fill(0);
  HAS_PERP_GRID_V.fill(0);
  CROSS_MASK_H.fill(ALL_LETTERS_MASK);
  CROSS_SCORE_BASE_H.fill(0);
  HAS_PERP_GRID_H.fill(0);

  // 2. Parse rack without string allocation
  let initialWildcards = 0;
  for (let i = 0; i < rack.length; i++) {
    const code = rack.charCodeAt(i);
    if (code >= 97 && code <= 122) RACK_COUNTS[code - 97]++;
    else if (code >= 65 && code <= 90) RACK_COUNTS[code - 65]++;
    else initialWildcards++;
  }
  let wildcards = initialWildcards;

  for (let i = 0; i < 26; i++) {
    const lower = String.fromCharCode(97 + i);
    const upper = String.fromCharCode(65 + i);
    SCORE_TABLE[i] = scores[lower] ?? scores[upper] ?? 0;
  }

  // 3. Grid setup
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const idx = r * 15 + c;
      const p = premiums[`${r},${c}`];
      if (p === "2L") PREMIUM_GRID[idx] = 1;
      else if (p === "3L") PREMIUM_GRID[idx] = 2;
      else if (p === "2W" || p === "CENTER") PREMIUM_GRID[idx] = 3;
      else if (p === "3W") PREMIUM_GRID[idx] = 4;
    }
  }

  let hasBoardTiles = false;
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const val = board[r]?.[c];
      if (val && typeof val === "string") {
        const code = val.toLowerCase().charCodeAt(0) - 97;
        if (code >= 0 && code < 26) {
          BOARD_GRID[r * 15 + c] = code + 1;
          hasBoardTiles = true;
        }
      }
    }
  }

  if (!hasBoardTiles) {
    IS_ANCHOR_SQUARE[7 * 15 + 7] = 1;
  }

  // 4. Precompute cross-checks
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const gridIdx = r * 15 + c;
      if (BOARD_GRID[gridIdx] !== 0) {
        if (r > 0 && BOARD_GRID[(r - 1) * 15 + c] === 0)
          IS_ANCHOR_SQUARE[(r - 1) * 15 + c] = 1;
        if (r < 14 && BOARD_GRID[(r + 1) * 15 + c] === 0)
          IS_ANCHOR_SQUARE[(r + 1) * 15 + c] = 1;
        if (c > 0 && BOARD_GRID[r * 15 + (c - 1)] === 0)
          IS_ANCHOR_SQUARE[r * 15 + (c - 1)] = 1;
        if (c < 14 && BOARD_GRID[r * 15 + (c + 1)] === 0)
          IS_ANCHOR_SQUARE[r * 15 + (c + 1)] = 1;
        continue;
      }

      // Vertical cross-check
      let up = r - 1;
      let upCount = 0;
      let scoreV = 0;
      while (up >= 0 && BOARD_GRID[up * 15 + c] !== 0) {
        upCount++;
        up--;
      }
      for (let k = 0; k < upCount; k++) {
        const code = BOARD_GRID[(r - upCount + k) * 15 + c] - 1;
        PERP_BUF[k] = code;
        scoreV += SCORE_TABLE[code];
      }

      let down = r + 1;
      let downCount = 0;
      while (down < 15 && BOARD_GRID[down * 15 + c] !== 0) {
        const code = BOARD_GRID[down * 15 + c] - 1;
        PERP_BUF[upCount + 1 + downCount] = code;
        scoreV += SCORE_TABLE[code];
        downCount++;
        down++;
      }

      const perpLenV = upCount + 1 + downCount;
      if (perpLenV > 1) {
        HAS_PERP_GRID_V[gridIdx] = 1;
        CROSS_SCORE_BASE_V[gridIdx] = scoreV;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          PERP_BUF[upCount] = code;
          if (isWordValidCodes(gaddag, PERP_BUF, perpLenV)) mask |= 1 << code;
        }
        CROSS_MASK_V[gridIdx] = mask;
      }

      // Horizontal cross-check
      let left = c - 1;
      let leftCount = 0;
      let scoreH = 0;
      while (left >= 0 && BOARD_GRID[r * 15 + left] !== 0) {
        leftCount++;
        left--;
      }
      for (let k = 0; k < leftCount; k++) {
        const code = BOARD_GRID[r * 15 + (c - leftCount + k)] - 1;
        PERP_BUF[k] = code;
        scoreH += SCORE_TABLE[code];
      }

      let right = c + 1;
      let rightCount = 0;
      while (right < 15 && BOARD_GRID[r * 15 + right] !== 0) {
        const code = BOARD_GRID[r * 15 + right] - 1;
        PERP_BUF[leftCount + 1 + rightCount] = code;
        scoreH += SCORE_TABLE[code];
        rightCount++;
        right++;
      }

      const perpLenH = leftCount + 1 + rightCount;
      if (perpLenH > 1) {
        HAS_PERP_GRID_H[gridIdx] = 1;
        CROSS_SCORE_BASE_H[gridIdx] = scoreH;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          PERP_BUF[leftCount] = code;
          if (isWordValidCodes(gaddag, PERP_BUF, perpLenH)) mask |= 1 << code;
        }
        CROSS_MASK_H[gridIdx] = mask;
      }
    }
  }

  // 5. Zero-allocation vector search + Leave Valuation
  const recordPlay = (startPos, endPos, rackUsed, isVertical, lineIdx) => {
    if (resultsCount >= MAX_RESULTS) return;

    let mainWordScore = 0;
    let mainWordMult = 1;
    let crossScoreTotal = 0;
    let exposes3W = 0;

    const charOffset = resultsCount * 15;
    let wordLen = 0;

    // Reset remaining rack counts
    for (let k = 0; k < 26; k++) REMAINING_COUNTS[k] = RACK_COUNTS[k];
    let blanksLeft = initialWildcards;

    for (let p = startPos; p <= endPos; p++) {
      const charCode = PLACED_LETTERS[p];
      RES_WORD_CHARS[charOffset + wordLen] = charCode;
      wordLen++;

      const r = isVertical ? p : lineIdx;
      const c = isVertical ? lineIdx : p;
      const gIdx = r * 15 + c;
      const premium = PREMIUM_GRID[gIdx];
      const isExisting = BOARD_GRID[gIdx] !== 0;
      const isBlank = PLACED_IS_BLANK[p] === 1;

      if (isExisting) {
        mainWordScore += SCORE_TABLE[charCode];
      } else {
        if (isBlank) {
          blanksLeft--;
        } else {
          REMAINING_COUNTS[charCode]--;
        }

        let letterVal = isBlank ? 0 : SCORE_TABLE[charCode];
        if (premium === 1) letterVal *= 2;
        else if (premium === 2) letterVal *= 3;
        else if (premium === 3) mainWordMult *= 2;
        else if (premium === 4) mainWordMult *= 3;
        mainWordScore += letterVal;

        if (
          (r > 0 &&
            PREMIUM_GRID[(r - 1) * 15 + c] === 4 &&
            BOARD_GRID[(r - 1) * 15 + c] === 0) ||
          (r < 14 &&
            PREMIUM_GRID[(r + 1) * 15 + c] === 4 &&
            BOARD_GRID[(r + 1) * 15 + c] === 0) ||
          (c > 0 &&
            PREMIUM_GRID[r * 15 + c - 1] === 4 &&
            BOARD_GRID[r * 15 + c - 1] === 0) ||
          (c < 14 &&
            PREMIUM_GRID[r * 15 + c + 1] === 4 &&
            BOARD_GRID[r * 15 + c + 1] === 0)
        ) {
          exposes3W = 1;
        }

        if (LINE_HAS_PERP[p] === 1) {
          let pVal = isBlank ? 0 : SCORE_TABLE[charCode];
          if (premium === 1) pVal *= 2;
          else if (premium === 2) pVal *= 3;
          let cMult = 1;
          if (premium === 3) cMult = 2;
          else if (premium === 4) cMult = 3;
          crossScoreTotal += (LINE_CROSS_SCORES[p] + pVal) * cMult;
        }
      }
    }

    let totalScore = mainWordScore * mainWordMult + crossScoreTotal;
    if (rackUsed === 7) totalScore += bingoBonus;

    // Calculate Strategic Leave Value
    const leaveEquity = evaluateLeaveEquity(REMAINING_COUNTS, blanksLeft);
    const totalPlayValue = totalScore + leaveEquity;

    // Store leave string bytes
    const leaveOffset = resultsCount * 7;
    let leaveLen = 0;
    for (let k = 0; k < blanksLeft; k++) {
      RES_LEAVE_CHARS[leaveOffset + leaveLen] = 63; // '?'
      leaveLen++;
    }
    for (let k = 0; k < 26; k++) {
      for (let count = 0; count < REMAINING_COUNTS[k]; count++) {
        if (leaveLen < 7) {
          RES_LEAVE_CHARS[leaveOffset + leaveLen] = 65 + k;
          leaveLen++;
        }
      }
    }

    RES_WORD_LEN[resultsCount] = wordLen;
    RES_SCORE[resultsCount] = totalScore;
    RES_EQUITY[resultsCount] = leaveEquity;
    RES_TOTAL_VAL[resultsCount] = totalPlayValue;
    RES_LEAVE_LEN[resultsCount] = leaveLen;
    RES_ROW[resultsCount] = isVertical ? startPos : lineIdx;
    RES_COL[resultsCount] = isVertical ? lineIdx : startPos;
    RES_DIR[resultsCount] = isVertical ? 1 : 0;
    RES_EXPOSES_3W[resultsCount] = exposes3W;

    resultsCount++;
  };

  const searchVector = (isVertical, lineIdx) => {
    const crossMask = isVertical ? CROSS_MASK_H : CROSS_MASK_V;
    const crossScoreBase = isVertical ? CROSS_SCORE_BASE_H : CROSS_SCORE_BASE_V;
    const hasPerpGrid = isVertical ? HAS_PERP_GRID_H : HAS_PERP_GRID_V;

    for (let i = 0; i < 15; i++) {
      const gIdx = isVertical ? i * 15 + lineIdx : lineIdx * 15 + i;
      LINE_TILES[i] = BOARD_GRID[gIdx];
      LINE_ANCHORS[i] = IS_ANCHOR_SQUARE[gIdx];
      LINE_CROSS_MASKS[i] = crossMask[gIdx];
      LINE_CROSS_SCORES[i] = crossScoreBase[gIdx];
      LINE_HAS_PERP[i] = hasPerpGrid[gIdx];
    }

    const gen = (
      pos,
      currPos,
      nodeIdx,
      direction,
      minPos,
      maxPos,
      tilesUsed,
    ) => {
      if (nodeIdx !== 0) {
        const entry = gaddag[nodeIdx];
        const isTerminal = (entry & 0x20) !== 0;

        if (isTerminal && tilesUsed > 0 && maxPos > minPos) {
          const leftClean = minPos === 0 || LINE_TILES[minPos - 1] === 0;
          let rightClean = false;
          if (direction > 0)
            rightClean = currPos >= 15 || LINE_TILES[currPos] === 0;
          else rightClean = pos + 1 >= 15 || LINE_TILES[pos + 1] === 0;

          if (leftClean && rightClean) {
            recordPlay(minPos, maxPos, tilesUsed, isVertical, lineIdx);
          }
        }
      }

      if (direction > 0 && currPos >= 15) return;

      let childPointer = gaddag[nodeIdx] >>> 7;
      if (childPointer === 0) return;

      while (childPointer !== 0) {
        const entry = gaddag[childPointer];
        const letterCode = entry & 0x1f;
        const hasSibling = (entry & 0x40) !== 0;

        if (letterCode === REV_CODE) {
          if (direction < 0) {
            gen(pos, pos + 1, childPointer, 1, minPos, maxPos, tilesUsed);
          }
        } else if (letterCode < 26) {
          if (currPos >= 0 && currPos < 15) {
            const existing = LINE_TILES[currPos];
            if (existing !== 0) {
              if (existing - 1 === letterCode) {
                PLACED_LETTERS[currPos] = letterCode;
                PLACED_IS_BLANK[currPos] = 0;
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
              if ((LINE_CROSS_MASKS[currPos] & (1 << letterCode)) !== 0) {
                const nextMin =
                  direction < 0 && currPos < minPos ? currPos : minPos;
                const nextMax =
                  direction > 0 && currPos > maxPos ? currPos : maxPos;

                if (RACK_COUNTS[letterCode] > 0) {
                  RACK_COUNTS[letterCode]--;
                  PLACED_LETTERS[currPos] = letterCode;
                  PLACED_IS_BLANK[currPos] = 0;
                  gen(
                    pos,
                    currPos + direction,
                    childPointer,
                    direction,
                    nextMin,
                    nextMax,
                    tilesUsed + 1,
                  );
                  RACK_COUNTS[letterCode]++;
                } else if (wildcards > 0) {
                  wildcards--;
                  PLACED_LETTERS[currPos] = letterCode;
                  PLACED_IS_BLANK[currPos] = 1;
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
      if (LINE_ANCHORS[pos] === 1) {
        gen(pos, pos, 0, -1, pos, pos, 0);
      }
    }
  };

  for (let i = 0; i < 15; i++) {
    searchVector(false, i);
    searchVector(true, i);
  }

  // 6. Sort plays by Strategic HastyBot Value (Score + Leave Equity)
  for (let i = 0; i < resultsCount; i++) INDEX_ARRAY[i] = i;

  const validSlice = INDEX_ARRAY.subarray(0, resultsCount);
  validSlice.sort((a, b) => {
    const vDiff = RES_TOTAL_VAL[b] - RES_TOTAL_VAL[a];
    if (Math.abs(vDiff) > 0.001) return vDiff;
    return RES_SCORE[b] - RES_SCORE[a];
  });

  const finalPlays = [];
  for (let i = 0; i < resultsCount; i++) {
    const idx = validSlice[i];
    const row = RES_ROW[idx];
    const col = RES_COL[idx];
    const dir = RES_DIR[idx] === 1 ? "V" : "H";
    const len = RES_WORD_LEN[idx];
    const charOffset = idx * 15;

    let duplicate = false;
    for (let j = 0; j < finalPlays.length; j++) {
      const existing = finalPlays[j];
      if (
        existing.row === row &&
        existing.col === col &&
        existing.dir === dir &&
        existing.word.length === len
      ) {
        let match = true;
        for (let k = 0; k < len; k++) {
          if (
            existing.word.charCodeAt(k) - 65 !==
            RES_WORD_CHARS[charOffset + k]
          ) {
            match = false;
            break;
          }
        }
        if (match) {
          duplicate = true;
          break;
        }
      }
    }

    if (duplicate) continue;

    let wordStr = "";
    for (let k = 0; k < len; k++) {
      wordStr += String.fromCharCode(65 + RES_WORD_CHARS[charOffset + k]);
    }

    const leaveOffset = idx * 7;
    const leaveLen = RES_LEAVE_LEN[idx];
    let leaveStr = "";
    for (let k = 0; k < leaveLen; k++) {
      leaveStr += String.fromCharCode(RES_LEAVE_CHARS[leaveOffset + k]);
    }
    if (leaveStr.length === 0) leaveStr = "None";

    finalPlays.push({
      word: wordStr,
      score: RES_SCORE[idx],
      leaveEquity: Math.round(RES_EQUITY[idx] * 10) / 10,
      totalVal: Math.round(RES_TOTAL_VAL[idx] * 10) / 10,
      leave: leaveStr,
      row,
      col,
      dir,
      exposes3W: RES_EXPOSES_3W[idx] === 1,
    });

    if (finalPlays.length >= 150) break;
  }

  self.postMessage(finalPlays);
};

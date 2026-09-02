// public/solverWorker.js - Anti-Bot Tactical Engine (Dynamic Defense + Anti-Stuck Penalty)

const REV_CODE = 26; // '#' Reversal separator
const MAX_RESULTS = 131072;

let gaddagTwl = null;
let gaddagSowpods = null;
let synergyMatrix = null;
let gpuDevice = null;
let gpuPipeline = null;

// Tournament Base Leave Equity (scaled in 0.1 pts)
const BASE_LEAVE_EQUITY = new Int16Array([
  15, -20, -5, 10, 30, -20, -15, -10, 12, -25, -25, 12, -5, 20, -5, -10, -75,
  32, 80, 25, -30, -55, -25, 35, 0, 20,
]);
const BLANK_LEAVE_EQUITY = 255;

const RACK_COUNTS = new Int8Array(26);
const SCORE_TABLE = new Int8Array(26);
const REMAINING_COUNTS = new Int8Array(26);

const PREMIUM_GRID = new Uint8Array(225);
const BOARD_GRID = new Int8Array(225);
const BOARD_IS_BLANK = new Uint8Array(225);
const TEMP_BOARD_GRID = new Int8Array(225);
const TEMP_BOARD_IS_BLANK = new Uint8Array(225);
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

const OPP_RACK_COUNTS = new Int8Array(26);
const UNSEEN_COUNTS = new Int16Array(27);

let resultsCount = 0;
const RES_WORD_LEN = new Uint8Array(MAX_RESULTS);
const RES_WORD_CHARS = new Uint8Array(MAX_RESULTS * 15);
const RES_SCORE = new Int16Array(MAX_RESULTS);
const RES_EQUITY = new Float32Array(MAX_RESULTS);
const RES_TOTAL_VAL = new Float32Array(MAX_RESULTS);
const RES_ROW = new Uint8Array(MAX_RESULTS);
const RES_COL = new Uint8Array(MAX_RESULTS);
const RES_DIR = new Uint8Array(MAX_RESULTS);
const RES_EXPOSES_3W = new Uint8Array(MAX_RESULTS);
const RES_LEAVE_CHARS = new Uint8Array(MAX_RESULTS * 7);
const RES_LEAVE_LEN = new Uint8Array(MAX_RESULTS);

const INDEX_ARRAY = new Uint16Array(MAX_RESULTS);
const ALL_LETTERS_MASK = 0x03ffffff;

async function loadAssets() {
  try {
    const [twlRes, sowpodsRes, synergyRes, wgslRes] = await Promise.all([
      fetch("/gaddag_twl.bin"),
      fetch("/gaddag_sowpods.bin"),
      fetch("/synergy_weights.bin"),
      fetch("/mc_simulator.wgsl"),
    ]);

    if (twlRes.ok) gaddagTwl = new Uint32Array(await twlRes.arrayBuffer());
    if (sowpodsRes.ok)
      gaddagSowpods = new Uint32Array(await sowpodsRes.arrayBuffer());
    if (synergyRes.ok)
      synergyMatrix = new Float32Array(await synergyRes.arrayBuffer());

    // Initialize WebGPU Pipeline
    if (navigator.gpu && wgslRes.ok) {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        gpuDevice = await adapter.requestDevice();
        const wgslCode = await wgslRes.text();
        const shaderModule = gpuDevice.createShaderModule({ code: wgslCode });
        gpuPipeline = gpuDevice.createComputePipeline({
          layout: "auto",
          compute: {
            module: shaderModule,
            entryPoint: "main",
          },
        });
        console.log("WebGPU MCTS Pipeline successfully compiled!");
      }
    } else {
      console.warn(
        "WebGPU not supported or wgsl fetch failed. Falling back to CPU MCTS.",
      );
    }
  } catch (err) {
    console.error("Failed to load assets or initialize GPU:", err);
  }
}
const loadPromise = loadAssets();

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

// UPGRADE 1: Aggressive Duplicate & Anti-Clumping Penalty
function hashLeave(counts, blanks) {
  let h = blanks;
  for (let c = 0; c < 26; c++) {
    if (counts[c] > 0) {
      h = (Math.imul(31, h) + counts[c] * (c + 1)) | 0;
    }
  }
  return Math.abs(h);
}

function evaluateLeaveEquity(counts, blanksRemaining, totalUnseen) {
  let equity = 0;
  if (synergyMatrix && synergyMatrix.length > 0) {
    const key = hashLeave(counts, blanksRemaining) % synergyMatrix.length;
    equity = synergyMatrix[key];
  } else {
    // Strategic Fallback (Since synergyMatrix is not loaded)
    let numConsonants = 0;
    let numVowels = 0;

    for (let c = 0; c < 26; c++) {
      const n = counts[c];
      if (n > 0) {
        // Base Tile Equity
        equity += (BASE_LEAVE_EQUITY[c] / 10.0) * n;

        // Duplication Penalties
        if (n > 1) {
          if (c === 4)
            equity -= 2.0; // E
          else if (c === 0 || c === 8)
            equity -= 2.5; // A, I
          else if (c === 14)
            equity -= 3.0; // O
          else if (c === 20)
            equity -= 4.0; // U
          else equity -= 3.5; // duplicate consonants
        }

        if (c === 0 || c === 4 || c === 8 || c === 14 || c === 20) {
          numVowels += n;
        } else if (c !== 24) {
          // Y is pseudo-vowel
          numConsonants += n;
        }
      }
    }

    equity += blanksRemaining * (BLANK_LEAVE_EQUITY / 10.0);

    // Vowel/Consonant Ratio Synergy (weighted by how many tiles are kept)
    const totalVC = numVowels + numConsonants;
    if (totalVC > 1) {
      const idealVowels = totalVC * 0.42;
      const diff = Math.abs(numVowels - idealVowels);
      const severity = totalVC / 7.0;
      equity -= diff * 2.0 * severity;
    }

    // Specific Synergies & Anti-Synergies
    if (counts[16] > 0 && counts[20] === 0 && blanksRemaining === 0) {
      equity -= 8.0; // Q without U
    }
    if (counts[2] > 0 && counts[7] > 0) equity += 2.5; // CH
    if (counts[18] > 0 && counts[7] > 0) equity += 1.5; // SH
    if (counts[19] > 0 && counts[7] > 0) equity += 1.5; // TH

    // Bingo Core Synergies
    if (counts[4] > 0 && counts[17] > 0) equity += 2.0; // ER
    if (counts[8] > 0 && counts[13] > 0) equity += 1.5; // IN
    if (counts[0] > 0 && counts[11] > 0) equity += 1.0; // AL
    if (counts[18] > 0 && counts[19] > 0) equity += 1.0; // ST
  }

  // Pre-Endgame Stuck Tile Exterminator (<12 tiles left in game)
  if (totalUnseen <= 12) {
    if (counts[21] > 0) equity -= 4.5; // V
    if (counts[22] > 0) equity -= 3.5; // W
    if (counts[9] > 0 || counts[23] > 0 || counts[25] > 0) equity -= 2.0; // J, X, Z
  }

  return equity;
}

// 1-Ply Minimax Counter-Move Evaluation
function findOpponentBestScore(
  gaddag,
  testBoard,
  testBoardIsBlank,
  oppCounts,
  oppWildcards,
  bingoBonus,
  dirtyRow,
  dirtyCol,
  dirtyDir,
  dirtyLen,
) {
  let maxOppScore = 0;
  let bestOppWord = "";
  let bestOppRow = 0;
  let bestOppCol = 0;
  let bestOppDir = "H";
  let bestOppTilesUsed = 0;

  const oppCrossV = new Uint32Array(CROSS_MASK_V);
  const oppCrossScoreV = new Int16Array(CROSS_SCORE_BASE_V);
  const oppHasPerpV = new Uint8Array(HAS_PERP_GRID_V);

  const oppCrossH = new Uint32Array(CROSS_MASK_H);
  const oppCrossScoreH = new Int16Array(CROSS_SCORE_BASE_H);
  const oppHasPerpH = new Uint8Array(HAS_PERP_GRID_H);

  const oppAnchors = new Uint8Array(IS_ANCHOR_SQUARE);

  for (let k = 0; k < dirtyLen; k++) {
    const r = dirtyDir === "V" ? dirtyRow + k : dirtyRow;
    const c = dirtyDir === "H" ? dirtyCol + k : dirtyCol;
    oppAnchors[r * 15 + c] = 0;
    if (r > 0 && testBoard[(r - 1) * 15 + c] === 0)
      oppAnchors[(r - 1) * 15 + c] = 1;
    if (r < 14 && testBoard[(r + 1) * 15 + c] === 0)
      oppAnchors[(r + 1) * 15 + c] = 1;
    if (c > 0 && testBoard[r * 15 + c - 1] === 0)
      oppAnchors[r * 15 + c - 1] = 1;
    if (c < 14 && testBoard[r * 15 + c + 1] === 0)
      oppAnchors[r * 15 + c + 1] = 1;
  }

  for (
    let c = dirtyCol;
    c < (dirtyDir === "H" ? dirtyCol + dirtyLen : dirtyCol + 1);
    c++
  ) {
    for (let r = 0; r < 15; r++) {
      const gridIdx = r * 15 + c;
      if (testBoard[gridIdx] !== 0) continue;
      let up = r - 1,
        upCount = 0,
        scoreV = 0;
      while (up >= 0 && testBoard[up * 15 + c] !== 0) {
        upCount++;
        up--;
      }
      for (let k = 0; k < upCount; k++) {
        const gIdx = (r - upCount + k) * 15 + c;
        const code = testBoard[gIdx] - 1;
        PERP_BUF[k] = code;
        scoreV += testBoardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
      }
      let down = r + 1,
        downCount = 0;
      while (down < 15 && testBoard[down * 15 + c] !== 0) {
        const gIdx = down * 15 + c;
        const code = testBoard[gIdx] - 1;
        PERP_BUF[upCount + 1 + downCount] = code;
        scoreV += testBoardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
        downCount++;
        down++;
      }
      const lenV = upCount + 1 + downCount;
      if (lenV > 1) {
        oppHasPerpV[gridIdx] = 1;
        oppCrossScoreV[gridIdx] = scoreV;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          PERP_BUF[upCount] = code;
          if (isWordValidCodes(gaddag, PERP_BUF, lenV)) mask |= 1 << code;
        }
        oppCrossV[gridIdx] = mask;
      } else {
        oppHasPerpV[gridIdx] = 0;
        oppCrossScoreV[gridIdx] = 0;
        oppCrossV[gridIdx] = ALL_LETTERS_MASK;
      }
    }
  }

  for (
    let r = dirtyRow;
    r < (dirtyDir === "V" ? dirtyRow + dirtyLen : dirtyRow + 1);
    r++
  ) {
    for (let c = 0; c < 15; c++) {
      const gridIdx = r * 15 + c;
      if (testBoard[gridIdx] !== 0) continue;
      let left = c - 1,
        leftCount = 0,
        scoreH = 0;
      while (left >= 0 && testBoard[r * 15 + left] !== 0) {
        leftCount++;
        left--;
      }
      for (let k = 0; k < leftCount; k++) {
        const gIdx = r * 15 + (c - leftCount + k);
        const code = testBoard[gIdx] - 1;
        PERP_BUF[k] = code;
        scoreH += testBoardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
      }
      let right = c + 1,
        rightCount = 0;
      while (right < 15 && testBoard[r * 15 + right] !== 0) {
        const gIdx = r * 15 + right;
        const code = testBoard[gIdx] - 1;
        PERP_BUF[leftCount + 1 + rightCount] = code;
        scoreH += testBoardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
        rightCount++;
        right++;
      }
      const lenH = leftCount + 1 + rightCount;
      if (lenH > 1) {
        oppHasPerpH[gridIdx] = 1;
        oppCrossScoreH[gridIdx] = scoreH;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          PERP_BUF[leftCount] = code;
          if (isWordValidCodes(gaddag, PERP_BUF, lenH)) mask |= 1 << code;
        }
        oppCrossH[gridIdx] = mask;
      } else {
        oppHasPerpH[gridIdx] = 0;
        oppCrossScoreH[gridIdx] = 0;
        oppCrossH[gridIdx] = ALL_LETTERS_MASK;
      }
    }
  }

  let oppWilds = oppWildcards;
  const oppPlaced = new Int8Array(15);
  const oppPlacedBlank = new Uint8Array(15);

  const testVector = (isVertical, lineIdx) => {
    const crossM = isVertical ? oppCrossH : oppCrossV;
    const crossS = isVertical ? oppCrossScoreH : oppCrossScoreV;
    const hasP = isVertical ? oppHasPerpH : oppHasPerpV;

    const lineT = new Int8Array(15);
    const lineA = new Uint8Array(15);
    const lineCM = new Uint32Array(15);
    const lineCS = new Int16Array(15);
    const lineHP = new Uint8Array(15);

    let lineTilesMask = 0;
    for (let i = 0; i < 15; i++) {
      const gIdx = isVertical ? i * 15 + lineIdx : lineIdx * 15 + i;
      lineT[i] = testBoard[gIdx];
      if (testBoard[gIdx] !== 0) lineTilesMask |= 1 << i;
      lineA[i] = oppAnchors[gIdx];
      lineCM[i] = crossM[gIdx];
      lineCS[i] = crossS[gIdx];
      lineHP[i] = hasP[gIdx];
    }

    const genOpp = (
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
        if ((entry & 0x20) !== 0 && tilesUsed > 0 && maxPos > minPos) {
          const lClean =
            minPos === 0 || (lineTilesMask & (1 << (minPos - 1))) === 0;
          let rClean = false;
          if (direction > 0)
            rClean = currPos >= 15 || (lineTilesMask & (1 << currPos)) === 0;
          else
            rClean = pos + 1 >= 15 || (lineTilesMask & (1 << (pos + 1))) === 0;

          if (lClean && rClean) {
            let mScore = 0,
              mMult = 1,
              crossTot = 0;
            let wordBuilt = "";
            for (let p = minPos; p <= maxPos; p++) {
              const code = oppPlaced[p];
              wordBuilt += String.fromCharCode(65 + code);
              const r = isVertical ? p : lineIdx;
              const c = isVertical ? lineIdx : p;
              const gIdx = r * 15 + c;
              const prem = PREMIUM_GRID[gIdx];
              const isExist = testBoard[gIdx] !== 0;
              const isB = oppPlacedBlank[p] === 1;

              if (isExist) {
                mScore += testBoardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
              } else {
                let lVal = isB ? 0 : SCORE_TABLE[code];
                if (prem === 1) lVal *= 2;
                else if (prem === 2) lVal *= 3;
                else if (prem === 3) mMult *= 2;
                else if (prem === 4) mMult *= 3;
                mScore += lVal;

                if (lineHP[p] === 1) {
                  let pVal = isB ? 0 : SCORE_TABLE[code];
                  if (prem === 1) pVal *= 2;
                  else if (prem === 2) pVal *= 3;
                  let cMult = 1;
                  if (prem === 3) cMult = 2;
                  else if (prem === 4) cMult = 3;
                  crossTot += (lineCS[p] + pVal) * cMult;
                }
              }
            }
            let total = mScore * mMult + crossTot;
            if (tilesUsed === 7) total += bingoBonus;

            if (total > maxOppScore) {
              maxOppScore = total;
              bestOppWord = wordBuilt;
              bestOppRow = isVertical ? minPos : lineIdx;
              bestOppCol = isVertical ? lineIdx : minPos;
              bestOppDir = isVertical ? "V" : "H";
              bestOppTilesUsed = tilesUsed;
            }
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
          if (direction < 0)
            genOpp(pos, pos + 1, childPointer, 1, minPos, maxPos, tilesUsed);
        } else if (letterCode < 26) {
          if (currPos >= 0 && currPos < 15) {
            const existing = lineT[currPos];
            if (existing !== 0) {
              if (existing - 1 === letterCode) {
                oppPlaced[currPos] = letterCode;
                oppPlacedBlank[currPos] = 0;
                const nextMin =
                  direction < 0 && currPos < minPos ? currPos : minPos;
                const nextMax =
                  direction > 0 && currPos > maxPos ? currPos : maxPos;
                genOpp(
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
              if ((lineCM[currPos] & (1 << letterCode)) !== 0) {
                const nextMin =
                  direction < 0 && currPos < minPos ? currPos : minPos;
                const nextMax =
                  direction > 0 && currPos > maxPos ? currPos : maxPos;

                if (oppCounts[letterCode] > 0) {
                  oppCounts[letterCode]--;
                  oppPlaced[currPos] = letterCode;
                  oppPlacedBlank[currPos] = 0;
                  genOpp(
                    pos,
                    currPos + direction,
                    childPointer,
                    direction,
                    nextMin,
                    nextMax,
                    tilesUsed + 1,
                  );
                  oppCounts[letterCode]++;
                } else if (oppWilds > 0) {
                  oppWilds--;
                  oppPlaced[currPos] = letterCode;
                  oppPlacedBlank[currPos] = 1;
                  genOpp(
                    pos,
                    currPos + direction,
                    childPointer,
                    direction,
                    nextMin,
                    nextMax,
                    tilesUsed + 1,
                  );
                  oppWilds++;
                }
              }
            }
          }
        }
        if (!hasSibling) break;
        childPointer++;
      }
    };

    let anchorMask = 0;
    for (let pos = 0; pos < 15; pos++) {
      if (lineA[pos] === 1) anchorMask |= 1 << pos;
    }

    while (anchorMask !== 0) {
      const lowestBit = anchorMask & -anchorMask;
      const pos = 31 - Math.clz32(lowestBit);
      genOpp(pos, pos, 0, -1, pos, pos, 0);
      anchorMask &= anchorMask - 1;
    }
  };

  for (let i = 0; i < 15; i++) {
    testVector(false, i);
    testVector(true, i);
  }

  return {
    maxOppScore,
    bestOppWord,
    bestOppRow,
    bestOppCol,
    bestOppDir,
    bestOppTilesUsed,
  };
}

async function runGPUSimulations(
  finalPlays,
  unseenArray,
  totalUnseen,
  activeGaddag,
) {
  if (!gpuDevice || !gpuPipeline || !activeGaddag) return false;

  finalPlays.sort((a, b) => b.totalVal - a.totalVal);
  const topN = Math.min(finalPlays.length, 20);
  const SIMS_PER_CANDIDATE = 1024;

  const configData = new Uint32Array([
    topN,
    SIMS_PER_CANDIDATE,
    totalUnseen,
    Math.floor(Math.random() * 0xffffffff),
  ]);
  const configBuffer = gpuDevice.createBuffer({
    size: configData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  gpuDevice.queue.writeBuffer(configBuffer, 0, configData);

  const boardsData = new Uint32Array(topN * 225);
  for (let i = 0; i < topN; i++) {
    const play = finalPlays[i];
    TEMP_BOARD_GRID.set(BOARD_GRID);
    TEMP_BOARD_IS_BLANK.set(BOARD_IS_BLANK);

    if (play.dir !== "EXCH") {
      for (let k = 0; k < play.word.length; k++) {
        const r = play.dir === "V" ? play.row + k : play.row;
        const c = play.dir === "H" ? play.col + k : play.col;
        const charCode = play.word.charCodeAt(k);
        const isBlank = charCode >= 97;
        const num = isBlank ? charCode - 97 : charCode - 65;
        TEMP_BOARD_GRID[r * 15 + c] = num + 1;
        TEMP_BOARD_IS_BLANK[r * 15 + c] = isBlank ? 1 : 0;
      }
    }

    const offset = i * 225;
    for (let j = 0; j < 225; j++) {
      boardsData[offset + j] =
        (TEMP_BOARD_IS_BLANK[j] << 8) | TEMP_BOARD_GRID[j];
    }
  }

  const boardsBuffer = gpuDevice.createBuffer({
    size: boardsData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  gpuDevice.queue.writeBuffer(boardsBuffer, 0, boardsData);

  const unseenData = new Uint32Array(unseenArray);
  const unseenBuffer = gpuDevice.createBuffer({
    size: unseenData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  gpuDevice.queue.writeBuffer(unseenBuffer, 0, unseenData);

  // Phase 3: Allocate output buffer for EVERY thread (topN * 1024 floats)
  const spreadBufferSize = topN * SIMS_PER_CANDIDATE * 4;
  const spreadBuffer = gpuDevice.createBuffer({
    size: spreadBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const readBuffer = gpuDevice.createBuffer({
    size: spreadBufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  // Phase 3: Bind GADDAG
  const gaddagBuffer = gpuDevice.createBuffer({
    size: activeGaddag.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  gpuDevice.queue.writeBuffer(gaddagBuffer, 0, activeGaddag);

  const bindGroup = gpuDevice.createBindGroup({
    layout: gpuPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: configBuffer } },
      { binding: 1, resource: { buffer: boardsBuffer } },
      { binding: 2, resource: { buffer: unseenBuffer } },
      { binding: 3, resource: { buffer: spreadBuffer } },
      { binding: 4, resource: { buffer: gaddagBuffer } },
    ],
  });

  const commandEncoder = gpuDevice.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(gpuPipeline);
  passEncoder.setBindGroup(0, bindGroup);

  const totalInvocations = topN * SIMS_PER_CANDIDATE;
  passEncoder.dispatchWorkgroups(Math.ceil(totalInvocations / 64));
  passEncoder.end();

  commandEncoder.copyBufferToBuffer(
    spreadBuffer,
    0,
    readBuffer,
    0,
    spreadBufferSize,
  );
  gpuDevice.queue.submit([commandEncoder.finish()]);

  await readBuffer.mapAsync(GPUMapMode.READ);
  const resultArray = new Float32Array(readBuffer.getMappedRange());

  // CPU Reduction of the 1024 threads per candidate
  for (let i = 0; i < topN; i++) {
    let sum = 0;
    for (let j = 0; j < SIMS_PER_CANDIDATE; j++) {
      sum += resultArray[i * SIMS_PER_CANDIDATE + j];
    }
    const avgOppScore = sum / SIMS_PER_CANDIDATE;
    finalPlays[i].netSpread = finalPlays[i].score - avgOppScore;
    finalPlays[i].totalVal =
      finalPlays[i].netSpread + finalPlays[i].leaveEquity * 0.7;
  }

  readBuffer.unmap();

  configBuffer.destroy();
  boardsBuffer.destroy();
  unseenBuffer.destroy();
  spreadBuffer.destroy();
  gaddagBuffer.destroy();

  return true;
}

self.onmessage = async function (e) {
  await loadPromise;

  if (e.data && e.data.type === "CHECK_WORD") {
    const w = e.data.word.toLowerCase();
    const len = w.length;
    const wordCodes = new Int8Array(len);
    for (let k = 0; k < len; k++) {
      let charCode = w.charCodeAt(k);
      wordCodes[k] = charCode >= 97 ? charCode - 97 : charCode - 65;
    }
    const inTwl = gaddagTwl
      ? isWordValidCodes(gaddagTwl, wordCodes, len)
      : false;
    const inSowpods = gaddagSowpods
      ? isWordValidCodes(gaddagSowpods, wordCodes, len)
      : false;

    self.postMessage({
      type: "CHECK_WORD_RESULT",
      word: e.data.word,
      inTwl,
      inSowpods,
    });
    return;
  }

  const {
    rack,
    board,
    activePreset,
    useTwl,
    useSowpods,
    sortMode,
    enableIntel,
    manualAvailableTiles,
    workerId = 0,
    numWorkers = 1,
  } = e.data;

  if (!rack || !activePreset) {
    self.postMessage([]);
    return;
  }

  const gaddag = useTwl ? gaddagTwl : useSowpods ? gaddagSowpods : gaddagTwl;
  if (!gaddag) {
    self.postMessage([]);
    return;
  }

  const {
    scores = {},
    premiums = {},
    bingoBonus = 50,
    distribution = {},
  } = activePreset;

  resultsCount = 0;
  RACK_COUNTS.fill(0);
  SCORE_TABLE.fill(0);
  PREMIUM_GRID.fill(0);
  BOARD_GRID.fill(0);
  BOARD_IS_BLANK.fill(0);
  IS_ANCHOR_SQUARE.fill(0);
  CROSS_MASK_V.fill(ALL_LETTERS_MASK);
  CROSS_SCORE_BASE_V.fill(0);
  HAS_PERP_GRID_V.fill(0);
  CROSS_MASK_H.fill(ALL_LETTERS_MASK);
  CROSS_SCORE_BASE_H.fill(0);
  HAS_PERP_GRID_H.fill(0);

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
        const isBlank = val >= "a" && val <= "z";
        const code = val.toLowerCase().charCodeAt(0) - 97;
        if (code >= 0 && code < 26) {
          BOARD_GRID[r * 15 + c] = code + 1;
          BOARD_IS_BLANK[r * 15 + c] = isBlank ? 1 : 0;
          hasBoardTiles = true;
        }
      }
    }
  }

  if (!hasBoardTiles) IS_ANCHOR_SQUARE[7 * 15 + 7] = 1;

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

      let up = r - 1,
        upCount = 0,
        scoreV = 0;
      while (up >= 0 && BOARD_GRID[up * 15 + c] !== 0) {
        upCount++;
        up--;
      }
      for (let k = 0; k < upCount; k++) {
        const gridIdx = (r - upCount + k) * 15 + c;
        const code = BOARD_GRID[gridIdx] - 1;
        PERP_BUF[k] = code;
        scoreV += BOARD_IS_BLANK[gridIdx] ? 0 : SCORE_TABLE[code];
      }
      let down = r + 1,
        downCount = 0;
      while (down < 15 && BOARD_GRID[down * 15 + c] !== 0) {
        const gridIdx = down * 15 + c;
        const code = BOARD_GRID[gridIdx] - 1;
        PERP_BUF[upCount + 1 + downCount] = code;
        scoreV += BOARD_IS_BLANK[gridIdx] ? 0 : SCORE_TABLE[code];
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

      let left = c - 1,
        leftCount = 0,
        scoreH = 0;
      while (left >= 0 && BOARD_GRID[r * 15 + left] !== 0) {
        leftCount++;
        left--;
      }
      for (let k = 0; k < leftCount; k++) {
        const gridIdx = r * 15 + (c - leftCount + k);
        const code = BOARD_GRID[gridIdx] - 1;
        PERP_BUF[k] = code;
        scoreH += BOARD_IS_BLANK[gridIdx] ? 0 : SCORE_TABLE[code];
      }
      let right = c + 1,
        rightCount = 0;
      while (right < 15 && BOARD_GRID[r * 15 + right] !== 0) {
        const gridIdx = r * 15 + right;
        const code = BOARD_GRID[gridIdx] - 1;
        PERP_BUF[leftCount + 1 + rightCount] = code;
        scoreH += BOARD_IS_BLANK[gridIdx] ? 0 : SCORE_TABLE[code];
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

  // Calculate Unseen Pool
  UNSEEN_COUNTS.fill(0);
  let totalUnseen = 0;

  if (enableIntel && manualAvailableTiles && manualAvailableTiles.trim()) {
    const pool = manualAvailableTiles.toUpperCase().replace(/[^A-Z?]/g, "");
    for (let i = 0; i < pool.length; i++) {
      if (pool[i] === "?") UNSEEN_COUNTS[26]++;
      else UNSEEN_COUNTS[pool.charCodeAt(i) - 65]++;
      totalUnseen++;
    }
  } else if (distribution) {
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      UNSEEN_COUNTS[i] = distribution[char] || 0;
      totalUnseen += UNSEEN_COUNTS[i];
    }
    UNSEEN_COUNTS[26] = distribution["?"] || 0;
    totalUnseen += UNSEEN_COUNTS[26];

    for (let i = 0; i < 225; i++) {
      if (BOARD_GRID[i] !== 0) {
        if (BOARD_IS_BLANK[i]) {
          UNSEEN_COUNTS[26]--;
        } else {
          UNSEEN_COUNTS[BOARD_GRID[i] - 1]--;
        }
        totalUnseen--;
      }
    }
    for (let i = 0; i < 26; i++) {
      UNSEEN_COUNTS[i] -= RACK_COUNTS[i];
      totalUnseen -= RACK_COUNTS[i];
    }
    UNSEEN_COUNTS[26] -= initialWildcards;
    totalUnseen -= initialWildcards;
  }

  // UPGRADE 3: Dynamic Triple-Word Score Lane Danger Estimation
  let twsThreatWeight = 12.0; // Default penalty
  if (
    UNSEEN_COUNTS[9] > 0 || // J
    UNSEEN_COUNTS[16] > 0 || // Q
    UNSEEN_COUNTS[23] > 0 || // X
    UNSEEN_COUNTS[25] > 0 || // Z
    UNSEEN_COUNTS[26] > 0 // Blank
  ) {
    twsThreatWeight = 22.0; // Extreme penalty if power tiles are in opponent pool
  } else if (
    UNSEEN_COUNTS[7] > 0 || // H
    UNSEEN_COUNTS[22] > 0 || // W
    UNSEEN_COUNTS[12] > 0 // M
  ) {
    twsThreatWeight = 16.0; // Moderate penalty for versatile offensive tiles
  }

  const recordPlay = (startPos, endPos, rackUsed, isVertical, lineIdx) => {
    if (resultsCount >= MAX_RESULTS) return;

    let mainWordScore = 0,
      mainWordMult = 1,
      crossScoreTotal = 0,
      exposes3W = 0,
      exposes2W = 0,
      exposes3L = 0;
    const charOffset = resultsCount * 15;
    let wordLen = 0;

    for (let k = 0; k < 26; k++) REMAINING_COUNTS[k] = RACK_COUNTS[k];
    let blanksLeft = initialWildcards;

    for (let p = startPos; p <= endPos; p++) {
      const charCode = PLACED_LETTERS[p];
      const isBlank = PLACED_IS_BLANK[p] === 1;
      RES_WORD_CHARS[charOffset + wordLen] = charCode + (isBlank ? 32 : 0);
      wordLen++;

      const r = isVertical ? p : lineIdx;
      const c = isVertical ? lineIdx : p;
      const gIdx = r * 15 + c;
      const premium = PREMIUM_GRID[gIdx];
      const isExisting = BOARD_GRID[gIdx] !== 0;

      if (isExisting) {
        mainWordScore += BOARD_IS_BLANK[gIdx] ? 0 : SCORE_TABLE[charCode];
      } else {
        if (isBlank) blanksLeft--;
        else REMAINING_COUNTS[charCode]--;

        let letterVal = isBlank ? 0 : SCORE_TABLE[charCode];
        if (premium === 1) letterVal *= 2;
        else if (premium === 2) letterVal *= 3;
        else if (premium === 3) mainWordMult *= 2;
        else if (premium === 4) mainWordMult *= 3;
        mainWordScore += letterVal;

        const upFree = r > 0 && BOARD_GRID[(r - 1) * 15 + c] === 0;
        const dnFree = r < 14 && BOARD_GRID[(r + 1) * 15 + c] === 0;
        const ltFree = c > 0 && BOARD_GRID[r * 15 + c - 1] === 0;
        const rtFree = c < 14 && BOARD_GRID[r * 15 + c + 1] === 0;

        const upPrem = upFree ? PREMIUM_GRID[(r - 1) * 15 + c] : 0;
        const dnPrem = dnFree ? PREMIUM_GRID[(r + 1) * 15 + c] : 0;
        const ltPrem = ltFree ? PREMIUM_GRID[r * 15 + c - 1] : 0;
        const rtPrem = rtFree ? PREMIUM_GRID[r * 15 + c + 1] : 0;

        if (upPrem === 4 || dnPrem === 4 || ltPrem === 4 || rtPrem === 4)
          exposes3W = 1;
        if (upPrem === 3 || dnPrem === 3 || ltPrem === 3 || rtPrem === 3)
          exposes2W = 1;
        if (upPrem === 2 || dnPrem === 2 || ltPrem === 2 || rtPrem === 2)
          exposes3L = 1;

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

    const leaveEquity = evaluateLeaveEquity(
      REMAINING_COUNTS,
      blanksLeft,
      totalUnseen,
    );

    // UPGRADE 4: Subtract Open Lane Defensive Risk from Total Value
    let defensivePenalty = 0;
    if (exposes3W === 1) defensivePenalty += twsThreatWeight;
    if (exposes2W === 1) defensivePenalty += 6.5; // Double-word exposure
    if (exposes3L === 1) defensivePenalty += 4.0; // Triple-letter exposure
    const totalPlayValue = totalScore + leaveEquity - defensivePenalty;

    const leaveOffset = resultsCount * 7;
    let leaveLen = 0;
    for (let k = 0; k < blanksLeft; k++) {
      RES_LEAVE_CHARS[leaveOffset + leaveLen] = 63;
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

    let lineTilesMask = 0;
    for (let i = 0; i < 15; i++) {
      const gIdx = isVertical ? i * 15 + lineIdx : lineIdx * 15 + i;
      LINE_TILES[i] = BOARD_GRID[gIdx];
      if (BOARD_GRID[gIdx] !== 0) lineTilesMask |= 1 << i;
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
        if ((entry & 0x20) !== 0 && tilesUsed > 0 && maxPos > minPos) {
          const leftClean =
            minPos === 0 || (lineTilesMask & (1 << (minPos - 1))) === 0;
          let rightClean = false;
          if (direction > 0)
            rightClean =
              currPos >= 15 || (lineTilesMask & (1 << currPos)) === 0;
          else
            rightClean =
              pos + 1 >= 15 || (lineTilesMask & (1 << (pos + 1))) === 0;

          if (leftClean && rightClean)
            recordPlay(minPos, maxPos, tilesUsed, isVertical, lineIdx);
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
          if (direction < 0)
            gen(pos, pos + 1, childPointer, 1, minPos, maxPos, tilesUsed);
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

    let anchorMask = 0;
    for (let pos = 0; pos < 15; pos++) {
      if (LINE_ANCHORS[pos] === 1) anchorMask |= 1 << pos;
    }

    // Fast Bitboard Traversal using trailing zeros count (TZCNT)
    while (anchorMask !== 0) {
      // Isolate the lowest set bit
      const lowestBit = anchorMask & -anchorMask;
      // Calculate the position of the bit (0 to 14)
      const pos = 31 - Math.clz32(lowestBit);

      gen(pos, pos, 0, -1, pos, pos, 0);

      // Clear the lowest set bit
      anchorMask &= anchorMask - 1;
    }
  };

  for (let i = 0; i < 15; i++) {
    if (i % numWorkers === workerId) {
      searchVector(false, i);
      searchVector(true, i);
    }
  }

  // Exact Endgame Deduction
  OPP_RACK_COUNTS.fill(0);
  let oppWildcards = 0;
  let isDeterministicOpponent = false;

  if (enableIntel && totalUnseen > 0 && totalUnseen <= 7) {
    isDeterministicOpponent = true;
    for (let i = 0; i < 26; i++) OPP_RACK_COUNTS[i] = UNSEEN_COUNTS[i];
    oppWildcards = UNSEEN_COUNTS[26];
  }

  // Strategic Exchange Logic
  let bestExchange = null;
  let maxExchVal = -999;

  if (workerId === 0 && totalUnseen >= 7) {
    let bagEquitySum = 0;
    for (let c = 0; c < 26; c++)
      bagEquitySum += (UNSEEN_COUNTS[c] || 0) * (BASE_LEAVE_EQUITY[c] / 10.0);
    bagEquitySum += (UNSEEN_COUNTS[26] || 0) * (BLANK_LEAVE_EQUITY / 10.0);
    const avgDrawEquityPerTile =
      totalUnseen > 0 ? bagEquitySum / totalUnseen : 0;

    const rackLetters = [];
    for (let c = 0; c < 26; c++) {
      for (let k = 0; k < RACK_COUNTS[c]; k++) rackLetters.push(c);
    }
    for (let k = 0; k < initialWildcards; k++) rackLetters.push(26);

    const n = rackLetters.length;
    if (n > 0) {
      const totalSubsets = 1 << n;
      for (let mask = 1; mask < totalSubsets; mask++) {
        const keptCounts = new Int8Array(26);
        let keptBlanks = 0;
        let dumpStr = "";
        let dumpCount = 0;

        for (let i = 0; i < n; i++) {
          if ((mask & (1 << i)) === 0) {
            if (rackLetters[i] === 26) keptBlanks++;
            else keptCounts[rackLetters[i]]++;
          } else {
            dumpCount++;
            dumpStr +=
              rackLetters[i] === 26
                ? "?"
                : String.fromCharCode(65 + rackLetters[i]);
          }
        }

        const leaveEquity = evaluateLeaveEquity(
          keptCounts,
          keptBlanks,
          totalUnseen,
        );
        const expectedDrawValue = dumpCount * avgDrawEquityPerTile;
        const tempoPenalty = -3.0;

        const totalVal = leaveEquity + expectedDrawValue + tempoPenalty;

        if (totalVal > maxExchVal) {
          maxExchVal = totalVal;
          bestExchange = {
            word: dumpStr,
            score: 0,
            leaveEquity: Math.round(leaveEquity * 10) / 10,
            totalVal: Math.round(totalVal * 10) / 10,
            leave: "",
            row: 0,
            col: 0,
            dir: "EXCH",
            exposes3W: false,
          };
        }
      }
    }
  }

  // Sort candidate plays
  for (let i = 0; i < resultsCount; i++) INDEX_ARRAY[i] = i;
  const validSlice = INDEX_ARRAY.subarray(0, resultsCount);

  validSlice.sort((a, b) => {
    if (sortMode === "score") {
      const sDiff = RES_SCORE[b] - RES_SCORE[a];
      return sDiff !== 0 ? sDiff : RES_TOTAL_VAL[b] - RES_TOTAL_VAL[a];
    } else {
      const vDiff = RES_TOTAL_VAL[b] - RES_TOTAL_VAL[a];
      return Math.abs(vDiff) > 0.001 ? vDiff : RES_SCORE[b] - RES_SCORE[a];
    }
  });

  const finalPlays = [];
  const topCandidatesCount = Math.min(resultsCount, 30);

  for (let i = 0; i < resultsCount; i++) {
    const idx = validSlice[i];
    const row = RES_ROW[idx];
    const col = RES_COL[idx];
    const dir = RES_DIR[idx] === 1 ? "V" : "H";
    const len = RES_WORD_LEN[idx];
    const charOffset = idx * 15;

    let duplicate = false;
    for (let j = 0; j < finalPlays.length; j++) {
      const ex = finalPlays[j];
      if (
        ex.row === row &&
        ex.col === col &&
        ex.dir === dir &&
        ex.word.length === len
      ) {
        let match = true;
        for (let k = 0; k < len; k++) {
          const stored = RES_WORD_CHARS[charOffset + k];
          const expectedCode = stored >= 32 ? stored - 32 + 97 : stored + 65;
          if (ex.word.charCodeAt(k) !== expectedCode) {
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
      const stored = RES_WORD_CHARS[charOffset + k];
      wordStr += String.fromCharCode(
        stored >= 32 ? stored - 32 + 97 : stored + 65,
      );
    }

    const leaveOffset = idx * 7;
    const leaveLen = RES_LEAVE_LEN[idx];
    let leaveStr = "";
    for (let k = 0; k < leaveLen; k++)
      leaveStr += String.fromCharCode(RES_LEAVE_CHARS[leaveOffset + k]);
    if (leaveStr.length === 0) leaveStr = "None";

    let oppBestReply = null;
    let netSpread = null;
    let totalValAdjusted = RES_TOTAL_VAL[idx];

    // Endgame Minimax Counter

    if (
      sortMode !== "score" &&
      isDeterministicOpponent &&
      i < topCandidatesCount
    ) {
      TEMP_BOARD_GRID.set(BOARD_GRID);
      TEMP_BOARD_IS_BLANK.set(BOARD_IS_BLANK);
      for (let k = 0; k < len; k++) {
        const r = dir === "V" ? row + k : row;
        const c = dir === "H" ? col + k : col;
        const stored = RES_WORD_CHARS[charOffset + k];
        const isBlank = stored >= 32;
        const charCode = isBlank ? stored - 32 : stored;

        TEMP_BOARD_GRID[r * 15 + c] = charCode + 1;
        TEMP_BOARD_IS_BLANK[r * 15 + c] = isBlank ? 1 : 0;
      }

      const oppReply = findOpponentBestScore(
        gaddag,
        TEMP_BOARD_GRID,
        TEMP_BOARD_IS_BLANK,
        OPP_RACK_COUNTS,
        oppWildcards,
        bingoBonus,
        row,
        col,
        dir,
        len,
      );
      if (oppReply.bestOppWord) {
        oppBestReply = {
          word: oppReply.bestOppWord,
          score: oppReply.maxOppScore,
          row: oppReply.bestOppRow,
          col: oppReply.bestOppCol,
          dir: oppReply.bestOppDir,
        };
        netSpread = RES_SCORE[idx] - oppReply.maxOppScore;
        totalValAdjusted = netSpread + RES_EQUITY[idx] * 0.5;
      }
    }
    const wordCodes = new Int8Array(len);
    for (let k = 0; k < len; k++) {
      let charCode = wordStr.charCodeAt(k);
      wordCodes[k] = charCode >= 97 ? charCode - 97 : charCode - 65;
    }
    const inTwl = gaddagTwl
      ? isWordValidCodes(gaddagTwl, wordCodes, len)
      : false;
    const inSowpods = gaddagSowpods
      ? isWordValidCodes(gaddagSowpods, wordCodes, len)
      : false;

    finalPlays.push({
      word: wordStr,
      score: RES_SCORE[idx],
      leaveEquity: Math.round(RES_EQUITY[idx] * 10) / 10,
      totalVal: Math.round(totalValAdjusted * 10) / 10,
      leave: leaveStr,
      row,
      col,
      dir,
      exposes3W: RES_EXPOSES_3W[idx] === 1,
      oppBestReply,
      netSpread,
      inTwl,
      inSowpods,
    });

    if (finalPlays.length >= 100) break;
  }

  // Include Strategic Exchange Option
  if (bestExchange) {
    const keptArr = [];
    const rackArr = rack.toUpperCase().split("");
    for (const c of rackArr) keptArr.push(c);
    for (const d of bestExchange.word.split("")) {
      const idx = keptArr.indexOf(d);
      if (idx !== -1) keptArr.splice(idx, 1);
    }
    bestExchange.leave = keptArr.join("") || "None";
    finalPlays.push(bestExchange);
  }

  // Phase 2: Trigger WebGPU Compute Pass
  if (
    false &&
    sortMode !== "score" &&
    gpuDevice &&
    totalUnseen > 7 &&
    enableIntel &&
    finalPlays.length > 0
  ) {
    const unseenArray = [];
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < UNSEEN_COUNTS[i]; j++) unseenArray.push(i);
    }
    for (let j = 0; j < UNSEEN_COUNTS[26]; j++) unseenArray.push(26);

    await runGPUSimulations(finalPlays, unseenArray, totalUnseen, gaddag);
  }

  // Phase 4: Exact Alpha-Beta Perfect Endgame Solver
  if (
    sortMode !== "score" &&
    isDeterministicOpponent &&
    finalPlays.length > 0
  ) {
    for (let i = 0; i < finalPlays.length; i++) {
      const play = finalPlays[i];
      if (play.dir === "EXCH") continue;

      let ourTilesUsed = 0;
      let tempRackCounts = new Int8Array(RACK_COUNTS);
      let tempWilds = initialWildcards;

      const newBoard = new Int8Array(BOARD_GRID);
      const newBoardIsBlank = new Uint8Array(BOARD_IS_BLANK);

      for (let k = 0; k < play.word.length; k++) {
        const r = play.dir === "V" ? play.row + k : play.row;
        const c = play.dir === "H" ? play.col + k : play.col;
        if (!BOARD_GRID || BOARD_GRID[r * 15 + c] === 0) {
          ourTilesUsed++;
          let charCode = play.word.charCodeAt(k);
          const isBlank = charCode >= 97;
          const num = isBlank ? charCode - 97 : charCode - 65;

          newBoard[r * 15 + c] = num + 1;
          newBoardIsBlank[r * 15 + c] = isBlank ? 1 : 0;

          if (isBlank) tempWilds--;
          else if (tempRackCounts[num] > 0) tempRackCounts[num]--;
        }
      }

      let totalRackTiles = initialWildcards;
      for (let c = 0; c < 26; c++) totalRackTiles += RACK_COUNTS[c];
      let ourTilesRemaining = totalRackTiles - ourTilesUsed;

      if (ourTilesRemaining === 0) {
        let oppRackVal = 0;
        for (let c = 0; c < 26; c++)
          oppRackVal += OPP_RACK_COUNTS[c] * SCORE_TABLE[c];
        play.totalVal = play.score + oppRackVal * 2 + 1000;
        continue;
      }

      // Run 2-Ply Alpha-Beta Search (Opponent plays -> We play)
      // Note: depth = 1 means Opponent plays. depth = 2 means Opp plays, We play.
      const oppNetScore = alphaBetaEndgame(
        newBoard,
        newBoardIsBlank,
        tempRackCounts,
        tempWilds,
        OPP_RACK_COUNTS,
        oppWildcards,
        false, // It is NOT our turn (it's the opponent's turn)
        2, // 2-Ply lookahead
        -10000,
        10000,
        gaddag,
        bingoBonus,
      );

      // play.score is our score now.
      // oppNetScore is the best net score from the OPPONENT's perspective after 2 plies.
      // So our net value is our current score MINUS their net score.
      play.totalVal = play.score - oppNetScore;
    }
  }

  // Final Sort
  if (isDeterministicOpponent || bestExchange || gpuDevice) {
    finalPlays.sort((a, b) => {
      if (sortMode === "score") {
        const sDiff = b.score - a.score;
        return sDiff !== 0 ? sDiff : b.totalVal - a.totalVal;
      } else {
        const vDiff = b.totalVal - a.totalVal;
        return Math.abs(vDiff) > 0.001 ? vDiff : b.score - a.score;
      }
    });
  }

  self.postMessage(finalPlays);
};
function computeBoardState(board, boardIsBlank, gaddag) {
  const anchors = new Uint8Array(225);
  const crossV = new Uint32Array(225);
  const crossScoreV = new Int16Array(225);
  const hasPerpV = new Uint8Array(225);
  const crossH = new Uint32Array(225);
  const crossScoreH = new Int16Array(225);
  const hasPerpH = new Uint8Array(225);

  crossV.fill(0x3ffffff); // ALL_LETTERS_MASK
  crossH.fill(0x3ffffff);

  let hasTiles = false;
  for (let i = 0; i < 225; i++) {
    if (board[i] !== 0) {
      hasTiles = true;
      const r = Math.floor(i / 15);
      const c = i % 15;
      if (r > 0 && board[(r - 1) * 15 + c] === 0) anchors[(r - 1) * 15 + c] = 1;
      if (r < 14 && board[(r + 1) * 15 + c] === 0)
        anchors[(r + 1) * 15 + c] = 1;
      if (c > 0 && board[r * 15 + c - 1] === 0) anchors[r * 15 + c - 1] = 1;
      if (c < 14 && board[r * 15 + c + 1] === 0) anchors[r * 15 + c + 1] = 1;
    }
  }

  if (!hasTiles) {
    anchors[112] = 1; // Center square
    return {
      anchors,
      crossV,
      crossScoreV,
      hasPerpV,
      crossH,
      crossScoreH,
      hasPerpH,
    };
  }

  const PERP_BUF = new Uint8Array(15);

  for (let c = 0; c < 15; c++) {
    for (let r = 0; r < 15; r++) {
      const gridIdx = r * 15 + c;
      if (board[gridIdx] !== 0) continue;

      let up = r - 1,
        upCount = 0,
        scoreV = 0;
      while (up >= 0 && board[up * 15 + c] !== 0) {
        upCount++;
        up--;
      }
      for (let k = 0; k < upCount; k++) {
        const gIdx = (r - upCount + k) * 15 + c;
        const code = board[gIdx] - 1;
        PERP_BUF[k] = code;
        scoreV += boardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
      }

      let down = r + 1,
        downCount = 0;
      while (down < 15 && board[down * 15 + c] !== 0) {
        const gIdx = down * 15 + c;
        const code = board[gIdx] - 1;
        PERP_BUF[upCount + 1 + downCount] = code;
        scoreV += boardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
        downCount++;
        down++;
      }

      const lenV = upCount + 1 + downCount;
      if (lenV > 1) {
        hasPerpV[gridIdx] = 1;
        crossScoreV[gridIdx] = scoreV;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          PERP_BUF[upCount] = code;
          if (isWordValidCodes(gaddag, PERP_BUF, lenV)) mask |= 1 << code;
        }
        crossV[gridIdx] = mask;
      }

      let left = c - 1,
        leftCount = 0,
        scoreH = 0;
      while (left >= 0 && board[r * 15 + left] !== 0) {
        leftCount++;
        left--;
      }
      for (let k = 0; k < leftCount; k++) {
        const gIdx = r * 15 + (c - leftCount + k);
        const code = board[gIdx] - 1;
        PERP_BUF[k] = code;
        scoreH += boardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
      }

      let right = c + 1,
        rightCount = 0;
      while (right < 15 && board[r * 15 + right] !== 0) {
        const gIdx = r * 15 + right;
        const code = board[gIdx] - 1;
        PERP_BUF[leftCount + 1 + rightCount] = code;
        scoreH += boardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
        rightCount++;
        right++;
      }

      const lenH = leftCount + 1 + rightCount;
      if (lenH > 1) {
        hasPerpH[gridIdx] = 1;
        crossScoreH[gridIdx] = scoreH;
        let mask = 0;
        for (let code = 0; code < 26; code++) {
          PERP_BUF[leftCount] = code;
          if (isWordValidCodes(gaddag, PERP_BUF, lenH)) mask |= 1 << code;
        }
        crossH[gridIdx] = mask;
      }
    }
  }

  return {
    anchors,
    crossV,
    crossScoreV,
    hasPerpV,
    crossH,
    crossScoreH,
    hasPerpH,
  };
}
function generatePlays(
  board,
  boardIsBlank,
  boardState,
  rackCounts,
  wildcards,
  gaddag,
  bingoBonus,
) {
  const {
    anchors,
    crossV,
    crossScoreV,
    hasPerpV,
    crossH,
    crossScoreH,
    hasPerpH,
  } = boardState;
  const plays = [];

  const placed = new Int8Array(15);
  const placedBlank = new Uint8Array(15);

  const testVector = (isVertical, lineIdx) => {
    const crossM = isVertical ? crossH : crossV;
    const crossS = isVertical ? crossScoreH : crossScoreV;
    const hasP = isVertical ? hasPerpH : hasPerpV;

    const lineT = new Int8Array(15);
    const lineA = new Uint8Array(15);
    const lineCM = new Uint32Array(15);
    const lineCS = new Int16Array(15);
    const lineHP = new Uint8Array(15);

    for (let i = 0; i < 15; i++) {
      const gIdx = isVertical ? i * 15 + lineIdx : lineIdx * 15 + i;
      lineT[i] = board[gIdx];
      lineA[i] = anchors[gIdx];
      lineCM[i] = crossM[gIdx];
      lineCS[i] = crossS[gIdx];
      lineHP[i] = hasP[gIdx];
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
        if ((entry & 0x20) !== 0 && tilesUsed > 0 && maxPos > minPos) {
          const lClean = minPos === 0 || lineT[minPos - 1] === 0;
          let rClean = false;
          if (direction > 0) rClean = currPos >= 15 || lineT[currPos] === 0;
          else rClean = pos + 1 >= 15 || lineT[pos + 1] === 0;

          if (lClean && rClean) {
            let mScore = 0,
              mMult = 1,
              crossTot = 0;
            let wordBuilt = "";
            for (let p = minPos; p <= maxPos; p++) {
              const code = placed[p];
              wordBuilt += String.fromCharCode(65 + code);
              const r = isVertical ? p : lineIdx;
              const c = isVertical ? lineIdx : p;
              const gIdx = r * 15 + c;
              const prem = PREMIUM_GRID[gIdx];
              const isExist = board[gIdx] !== 0;
              const isB = placedBlank[p] === 1;

              if (isExist) {
                mScore += boardIsBlank[gIdx] ? 0 : SCORE_TABLE[code];
              } else {
                let lVal = isB ? 0 : SCORE_TABLE[code];
                if (prem === 1) lVal *= 2;
                else if (prem === 2) lVal *= 3;
                else if (prem === 3) mMult *= 2;
                else if (prem === 4) mMult *= 3;
                mScore += lVal;

                if (lineHP[p] === 1) {
                  let pVal = isB ? 0 : SCORE_TABLE[code];
                  if (prem === 1) pVal *= 2;
                  else if (prem === 2) pVal *= 3;
                  let cMult = 1;
                  if (prem === 3) cMult = 2;
                  else if (prem === 4) cMult = 3;
                  crossTot += (lineCS[p] + pVal) * cMult;
                }
              }
            }
            let total = mScore * mMult + crossTot;
            if (tilesUsed === 7) total += bingoBonus;

            plays.push({
              word: wordBuilt,
              row: isVertical ? minPos : lineIdx,
              col: isVertical ? lineIdx : minPos,
              dir: isVertical ? "V" : "H",
              score: total,
              tilesUsed: tilesUsed,
            });
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
          // REV_CODE
          if (direction < 0)
            gen(pos, pos + 1, childPointer, 1, minPos, maxPos, tilesUsed);
        } else if (letterCode < 26) {
          if (currPos >= 0 && currPos < 15) {
            const existing = lineT[currPos];
            if (existing !== 0) {
              if (existing - 1 === letterCode) {
                placed[currPos] = letterCode;
                placedBlank[currPos] = 0;
                gen(
                  pos,
                  currPos + direction,
                  childPointer,
                  direction,
                  direction < 0 && currPos < minPos ? currPos : minPos,
                  direction > 0 && currPos > maxPos ? currPos : maxPos,
                  tilesUsed,
                );
              }
            } else {
              if ((lineCM[currPos] & (1 << letterCode)) !== 0) {
                const nextMin =
                  direction < 0 && currPos < minPos ? currPos : minPos;
                const nextMax =
                  direction > 0 && currPos > maxPos ? currPos : maxPos;

                if (rackCounts[letterCode] > 0) {
                  rackCounts[letterCode]--;
                  placed[currPos] = letterCode;
                  placedBlank[currPos] = 0;
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
                  placed[currPos] = letterCode;
                  placedBlank[currPos] = 1;
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
      if (lineA[pos] === 1) gen(pos, pos, 0, -1, pos, pos, 0);
    }
  };

  for (let i = 0; i < 15; i++) {
    testVector(false, i);
    testVector(true, i);
  }

  return plays;
}
function alphaBetaEndgame(
  board,
  boardIsBlank,
  countsA,
  wildsA,
  countsB,
  wildsB,
  isTurnA,
  depth,
  alpha,
  beta,
  gaddag,
  bingoBonus,
) {
  // If game is over (someone went out) or depth is 0
  const tilesA = countsA.reduce((a, b) => a + b, 0) + wildsA;
  const tilesB = countsB.reduce((a, b) => a + b, 0) + wildsB;

  if (tilesA === 0 || tilesB === 0 || depth === 0) {
    let unplayedA = 0;
    for (let i = 0; i < 26; i++) unplayedA += countsA[i] * SCORE_TABLE[i];
    let unplayedB = 0;
    for (let i = 0; i < 26; i++) unplayedB += countsB[i] * SCORE_TABLE[i];

    // In Scrabble, the person who goes out gets 2x the opponent's unplayed tiles in net spread.
    let spreadForA = 0;
    if (tilesA === 0) spreadForA = unplayedB * 2;
    else if (tilesB === 0) spreadForA = -(unplayedA * 2);

    // Return spread from the perspective of the CURRENT active player
    return isTurnA ? spreadForA : -spreadForA;
  }

  const boardState = computeBoardState(board, boardIsBlank, gaddag);
  const activeCounts = isTurnA ? countsA : countsB;
  const activeWilds = isTurnA ? wildsA : wildsB;

  const plays = generatePlays(
    board,
    boardIsBlank,
    boardState,
    activeCounts,
    activeWilds,
    gaddag,
    bingoBonus,
  );

  if (plays.length === 0) {
    // Pass
    return -alphaBetaEndgame(
      board,
      boardIsBlank,
      countsB,
      wildsB,
      countsA,
      wildsA,
      !isTurnA,
      depth - 1,
      -beta,
      -alpha,
      gaddag,
      bingoBonus,
    );
  }

  // Sort plays to optimize alpha-beta pruning (highest score first)
  plays.sort((a, b) => b.score - a.score);

  let bestValue = -Infinity;

  // To avoid evaluating 500 nodes per depth, we cap it.
  // In a true perfect solver, you'd use a time limit or search all.
  const maxBranch = Math.min(plays.length, 10);

  for (let i = 0; i < maxBranch; i++) {
    const play = plays[i];

    // Apply play
    const newBoard = new Int8Array(board);
    const newBoardIsBlank = new Uint8Array(boardIsBlank);
    const newCounts = new Int8Array(activeCounts);
    let newWilds = activeWilds;

    let wordIdx = 0;
    for (let k = 0; k < play.word.length; k++) {
      const r = play.dir === "V" ? play.row + k : play.row;
      const c = play.dir === "H" ? play.col + k : play.col;
      const gIdx = r * 15 + c;
      if (newBoard[gIdx] === 0) {
        const charCode = play.word.charCodeAt(k);
        const isBlank = charCode >= 97;
        const num = isBlank ? charCode - 97 : charCode - 65;

        newBoard[gIdx] = num + 1;
        newBoardIsBlank[gIdx] = isBlank ? 1 : 0;

        if (isBlank) newWilds--;
        else newCounts[num]--;
      }
    }

    const value =
      play.score -
      alphaBetaEndgame(
        newBoard,
        newBoardIsBlank,
        countsB,
        wildsB,
        newCounts,
        newWilds,
        !isTurnA,
        depth - 1,
        -beta,
        -alpha,
        gaddag,
        bingoBonus,
      );

    bestValue = Math.max(bestValue, value);
    alpha = Math.max(alpha, value);
    if (alpha >= beta) break;
  }

  return bestValue;
}

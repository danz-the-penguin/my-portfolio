const fs = require('fs');
const path = require('path');

const RAW_GCG_DIR = path.join(__dirname, 'raw_gcg');
const MATCHES_DIR = path.join(__dirname, 'matches');

if (!fs.existsSync(RAW_GCG_DIR)) {
  fs.mkdirSync(RAW_GCG_DIR, { recursive: true });
}
if (!fs.existsSync(MATCHES_DIR)) {
  fs.mkdirSync(MATCHES_DIR, { recursive: true });
}

function processGcgFiles() {
  const files = fs.readdirSync(RAW_GCG_DIR).filter(f => f.endsWith('.gcg'));
  
  if (files.length === 0) {
    console.log("No .gcg files found in scripts/raw_gcg/. Please add some and run again.");
    return;
  }
  
  let convertedCount = 0;

  files.forEach(file => {
    try {
      const fileContent = fs.readFileSync(path.join(RAW_GCG_DIR, file), 'utf8');
      const lines = fileContent.split(/\r?\n/);
      
      let player1 = null;
      let player2 = null;
      
      let currentBoard = Array(15).fill(null).map(() => Array(15).fill(""));
      const turns = [];
      
      for (const line of lines) {
        if (line.startsWith("#player1")) {
          player1 = line.split(" ")[1] || "Player 1";
        } else if (line.startsWith("#player2")) {
          player2 = line.split(" ")[1] || "Player 2";
        } else if (line.startsWith(">")) {
          const parts = line.split(/\s+/).filter(Boolean);
          if (parts.length >= 5) {
             const playerName = parts[0].substring(1, parts[0].length - 1);
             if (!player1) player1 = playerName;
             if (!player2 && playerName !== player1) player2 = playerName;
             
             let rack = parts[1];
             const pos = parts[2];
             let rawWord = parts[3];
             const score = parseInt(parts[4]) || 0;
             
             let leave = "";
             
             if (/[0-9]/.test(pos) && /[A-Za-z]/.test(pos)) {
                let dir = "H";
                let row = 0;
                let col = 0;
                
                if (/[0-9]/.test(pos[0])) {
                   dir = "H";
                   const numMatch = pos.match(/[0-9]+/);
                   const letterMatch = pos.match(/[A-Za-z]+/);
                   row = parseInt(numMatch[0]) - 1;
                   col = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
                } else {
                   dir = "V";
                   const letterMatch = pos.match(/[A-Za-z]+/);
                   const numMatch = pos.match(/[0-9]+/);
                   col = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
                   row = parseInt(numMatch[0]) - 1;
                }
                
                let word = rawWord.replace(/[()]/g, '');
                let rackArray = rack.split('');
                
                for (let i = 0; i < word.length; i++) {
                   const r = dir === "V" ? row + i : row;
                   const c = dir === "H" ? col + i : col;
                   if (r >= 0 && r < 15 && c >= 0 && c < 15) {
                       if (currentBoard[r][c] === "") {
                          let char = word[i];
                          currentBoard[r][c] = char;
                          
                          // Determine if it was a blank or normal letter from the rack
                          const isBlank = char === char.toLowerCase() && char !== char.toUpperCase();
                          const rackTarget = isBlank ? "?" : char.toUpperCase();
                          
                          const rackIdx = rackArray.indexOf(rackTarget);
                          if (rackIdx !== -1) {
                             rackArray.splice(rackIdx, 1);
                          } else {
                             // Fallback if rack doesn't exactly match (e.g. blank used but '?' not in rack string)
                             // Sometimes GCG uses lower/upper inconsistently.
                             const upperIdx = rackArray.indexOf(char.toUpperCase());
                             if (upperIdx !== -1) rackArray.splice(upperIdx, 1);
                          }
                       }
                   }
                }
                leave = rackArray.join("");
             } else {
                // Exchange or pass
                // If exchange, leave is the rack minus exchanged tiles.
                // It's safer to just set leave to empty to exclude it from training.
                leave = "";
             }
             
             turns.push({
               player: playerName,
               rack,
               leave,
               score
             });
          }
        }
      }
      
      const outFile = path.join(MATCHES_DIR, file.replace('.gcg', '.json'));
      fs.writeFileSync(outFile, JSON.stringify(turns, null, 2));
      convertedCount++;
      
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  });

  console.log(`Successfully converted ${convertedCount} .gcg files into training data in scripts/matches/.`);
}

processGcgFiles();

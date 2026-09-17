const fs = require('fs');
const path = require('path');

const MATCHES_DIR = path.join(__dirname, 'matches');
const OUTPUT_FILE = path.join(__dirname, '../public/synergy_trained.json');

function train() {
  if (!fs.existsSync(MATCHES_DIR)) {
    console.log("No matches directory found.");
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({}));
    return;
  }

  const files = fs.readdirSync(MATCHES_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log("No match files found to train on.");
    // Output a dummy object so the app doesn't crash
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ "A": 1.5, "?": 25.0 }));
    return;
  }

  const leavePerformance = {};

  files.forEach(file => {
    try {
      const matchData = JSON.parse(fs.readFileSync(path.join(MATCHES_DIR, file), 'utf8'));
      // Assume a flat array of turns: { player, rack, leave, scoreDiff }
      
      if (!Array.isArray(matchData)) {
         console.warn(`Skipping ${file} (not an array of turns)`);
         return; // Skip this file in forEach
      }
      
      const p1Turns = [];
      const p2Turns = [];
      
      for (const turn of matchData) {
         if (turn.player === "Player 1" || turn.player === "me") {
             p1Turns.push(turn);
         } else {
             p2Turns.push(turn);
         }
      }
      
      const processTurns = (turns) => {
         for (let i = 0; i < turns.length - 1; i++) {
            const currentTurn = turns[i];
            const nextTurn = turns[i + 1];
            
            // Score gained on the NEXT turn
            const scoreGained = nextTurn.score || nextTurn.points || 0;
            const leave = (currentTurn.leave || "").toUpperCase().split('').sort().join('');
            
            if (!leave) continue;
            
            if (!leavePerformance[leave]) {
               leavePerformance[leave] = { total: 0, count: 0 };
            }
            leavePerformance[leave].total += scoreGained;
            leavePerformance[leave].count++;
         }
      };
      
      processTurns(p1Turns);
      processTurns(p2Turns);
    } catch (err) {
      console.error("Error parsing file", file, err);
    }
  });

  const trainedWeights = {};
  
  // Calculate average for exact leaves
  for (const [leave, data] of Object.entries(leavePerformance)) {
     if (data.count > 5) { // Minimum sample size
        trainedWeights[leave] = data.total / data.count;
     }
  }
  
  // Also calculate single letter averages to provide a baseline for unseen combos
  const letterStats = {};
  for (const [leave, data] of Object.entries(leavePerformance)) {
     const avg = data.total / data.count;
     for (const char of leave) {
        if (!letterStats[char]) letterStats[char] = { total: 0, count: 0 };
        letterStats[char].total += avg;
        letterStats[char].count++;
     }
  }
  
  for (const [char, data] of Object.entries(letterStats)) {
     trainedWeights[char] = (data.total / data.count) - 15; // Baseline adjustment
  }

  // Fallback to make sure essential letters have a weight if matches were too few
  if (!trainedWeights["A"]) trainedWeights["A"] = 1.0;
  if (!trainedWeights["?"]) trainedWeights["?"] = 25.0;

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(trainedWeights, null, 2));
  console.log(`Trained heuristic weights written to ${OUTPUT_FILE}`);
}

train();

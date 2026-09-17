// ==========================================
// WebGPU Monte Carlo Simulator (WGSL)
// ==========================================

// --- Storage Bindings ---
// We map input/output arrays as storage buffers for read/write access.
@group(0) @binding(0) var<storage, read> config: array<u32>;
@group(0) @binding(1) var<storage, read> boards: array<u32>;
@group(0) @binding(2) var<storage, read> unseens: array<u32>;
@group(0) @binding(3) var<storage, read> gaddag: array<u32>;
@group(0) @binding(4) var<storage, read_write> out_equities: array<f32>;

// --- PRNG Implementation (PCG Hash) ---
// WGSL lacks a native Math.random(), so we implement a Permuted Congruential Generator.
fn pcg_hash(seed: u32) -> u32 {
    var state = seed * 747796405u + 2891336453u;
    var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

// --- Compute Shader Entry Point ---
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let sim_idx = global_id.x;
    let topN = config[0];
    let sims_per_candidate = config[1];
    let total_unseen = config[2];
    let base_seed = config[3];
    
    // Bounds check
    let total_sims = topN * sims_per_candidate;
    if (sim_idx >= total_sims) {
        return;
    }
    
    let candidate_idx = sim_idx / sims_per_candidate;
    
    // 1. Initialize PRNG with a unique seed for this specific thread
    var rng_state = pcg_hash(base_seed ^ sim_idx);
    
    // 2. Read current board state
    // (In a full implementation, we'd copy the board to private memory and simulate play)
    var board_score: u32 = 0u;
    let board_offset = candidate_idx * 225u;
    for(var i = 0u; i < 225u; i = i + 1u) {
        let cell = boards[board_offset + i];
        if (cell > 0u) {
            board_score = board_score + 1u;
        }
    }
    
    // 3. Simulate random tile draws
    // Use the PRNG to pick random tiles from the unseen pool
    var drawn_score: u32 = 0u;
    for(var j = 0u; j < 7u; j = j + 1u) {
        if (j >= total_unseen) {
            break;
        }
        rng_state = pcg_hash(rng_state);
        let random_idx = rng_state % total_unseen;
        let drawn_tile = unseens[random_idx];
        drawn_score = drawn_score + drawn_tile; 
    }
    
    // 4. Calculate simulated endgame score and output win probability/equity
    // (Simplified scoring logic for the Monte Carlo simulation)
    let simulated_equity = f32(board_score) * 0.5 + f32(drawn_score) * 0.1;
    
    // Accumulate the result atomically into the output buffer
    // (Note: in WGSL f32 atomic add requires an extension, so we use a thread-local write for this stub)
    out_equities[sim_idx] = simulated_equity;
}

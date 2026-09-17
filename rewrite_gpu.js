const fs = require('fs');

let content = fs.readFileSync('public/solverWorker.js', 'utf8');

// Replace the inline WebGPU initialization in loadAssets with a call to initWebGPU()
const oldGpuInit = `
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
`;

const newInitCall = `
    // Initialize WebGPU Pipeline using our new function
    await initWebGPU();
`;

// Only replace if found
if (content.includes('// Initialize WebGPU Pipeline')) {
  // It's a bit hard to replace exactly with whitespace, so let's use regex
  content = content.replace(/\/\/ Initialize WebGPU Pipeline[\s\S]*?CPU MCTS\.",\s*\);\s*\}/, newInitCall);
}


// Add initWebGPU function right above loadAssets
const initWebGPUCode = `
// ==========================================
// WebGPU Initialization
// ==========================================
async function initWebGPU() {
  if (!navigator.gpu) {
    console.warn("WebGPU not supported on this browser. Falling back to CPU MCTS.");
    return;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return;
    
    gpuDevice = await adapter.requestDevice();
    
    // Fetch and compile the WGSL shader
    const wgslRes = await fetch("/mc_simulator.wgsl");
    if (!wgslRes.ok) throw new Error("Failed to fetch mc_simulator.wgsl");
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
  } catch (err) {
    console.warn("Failed to initialize WebGPU:", err);
  }
}
`;
if (!content.includes('async function initWebGPU()')) {
  content = content.replace(/async function loadAssets\(\) \{/, initWebGPUCode + '\nasync function loadAssets() {');
}

// Add runMonteCarloSimulations
const mcSimCode = `
// ==========================================
// WebGPU Monte Carlo Integration
// ==========================================
async function runMonteCarloSimulations(board, remainingTiles) {
  if (!gpuDevice || !gpuPipeline) return null;
  
  // Map JavaScript arrays to Uint32Array buffers
  const boardBuffer = new Uint32Array(225);
  for(let i=0; i<225; i++) boardBuffer[i] = board[i];
  
  const tilesBuffer = new Uint32Array(remainingTiles.length);
  for(let i=0; i<remainingTiles.length; i++) tilesBuffer[i] = remainingTiles[i];
  
  // Write input arrays to the GPU
  const gpuBoard = gpuDevice.createBuffer({
    size: boardBuffer.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  gpuDevice.queue.writeBuffer(gpuBoard, 0, boardBuffer);
  
  const gpuTiles = gpuDevice.createBuffer({
    size: tilesBuffer.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  gpuDevice.queue.writeBuffer(gpuTiles, 0, tilesBuffer);
  
  // Config [topN, sims_per_candidate, total_unseen, base_seed]
  // In a real scenario topN and sims would be dynamic, but we just want 10000 sims overall
  const configData = new Uint32Array([1, 10000, remainingTiles.length, Math.floor(Math.random() * 0xffffffff)]);
  const gpuConfig = gpuDevice.createBuffer({
    size: configData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  gpuDevice.queue.writeBuffer(gpuConfig, 0, configData);

  // Resulting equity buffer output
  const gpuOut = gpuDevice.createBuffer({
    size: 10000 * 4, // 10,000 f32 results
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  
  // We provide a dummy gaddag buffer since it's defined in WGSL
  const gpuGaddag = gpuDevice.createBuffer({
    size: 4, usage: GPUBufferUsage.STORAGE
  });

  const bindGroup = gpuDevice.createBindGroup({
    layout: gpuPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: gpuConfig } },
      { binding: 1, resource: { buffer: gpuBoard } },
      { binding: 2, resource: { buffer: gpuTiles } },
      { binding: 3, resource: { buffer: gpuGaddag } },
      { binding: 4, resource: { buffer: gpuOut } },
    ],
  });
  
  const commandEncoder = gpuDevice.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(gpuPipeline);
  passEncoder.setBindGroup(0, bindGroup);
  
  // Dispatch 10,000 workgroups as requested
  passEncoder.dispatchWorkgroups(10000);
  passEncoder.end();
  
  // Read back the resulting equity buffer to the main thread
  const gpuReadBuffer = gpuDevice.createBuffer({
    size: 10000 * 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  commandEncoder.copyBufferToBuffer(gpuOut, 0, gpuReadBuffer, 0, 10000 * 4);
  
  gpuDevice.queue.submit([commandEncoder.finish()]);
  
  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const resultData = new Float32Array(gpuReadBuffer.getMappedRange());
  const finalResult = new Float32Array(resultData);
  gpuReadBuffer.unmap();
  
  return finalResult;
}
`;
if (!content.includes('async function runMonteCarloSimulations')) {
  content = content.replace(/async function runGPUSimulations/, mcSimCode + '\nasync function runGPUSimulations');
}

fs.writeFileSync('public/solverWorker.js', content);

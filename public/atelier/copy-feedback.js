/** Portable retained-copy core. Frozen aligned-current-sheet-v1 arithmetic. */
export const COPY_FEEDBACK_VERSION = 1;
export const COPY_FEEDBACK_MAX_SIZE = 720;
export const COPY_FEEDBACK_GENERATIONS = 12;
export const COPY_FEEDBACK_MACHINE_SEED = 2401;
export const COPY_FEEDBACK_DEFAULT_SEED = 2401;
export const COPY_FEEDBACK_MODEL = "aligned-current-sheet-v1";

function integer(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new RangeError(`${label} must be an integer from ${min} through ${max}`);
  return value;
}
export function normalizeCopySeed(seed = COPY_FEEDBACK_DEFAULT_SEED) {
  integer(seed, 0, 0xffffffff, "Seed");
  return seed === 0 ? COPY_FEEDBACK_DEFAULT_SEED : seed;
}
function dimensions(width, height) {
  integer(width, 1, COPY_FEEDBACK_MAX_SIZE, "Width");
  integer(height, 1, COPY_FEEDBACK_MAX_SIZE, "Height");
  return width * height;
}
function isBytes(value) {
  return value instanceof Uint8Array || value instanceof Uint8ClampedArray;
}
function validateRGBA(rgba, width, height) {
  const count = dimensions(width, height);
  if (!isBytes(rgba) || rgba.length !== count * 4)
    throw new TypeError("Source must be a Uint8Array or Uint8ClampedArray of width × height × 4 bytes");
  return count;
}
export function validateCopyState(state) {
  if (!state || typeof state !== "object") throw new TypeError("Copy state required");
  const count = dimensions(state.width, state.height);
  integer(state.generation, 0, COPY_FEEDBACK_GENERATIONS, "Generation");
  integer(state.rng, 1, 0xffffffff, "Random state");
  if (!(state.density instanceof Float32Array) || state.density.length !== count)
    throw new TypeError("Density must be a Float32Array with one value per pixel");
  for (let i = 0; i < count; i++) {
    const d = state.density[i];
    if (!Number.isFinite(d) || d < 0 || d > 1)
      throw new RangeError("Density values must be finite and within [0, 1]");
  }
  return state;
}
export function initialState(rgba, width, height, seed = COPY_FEEDBACK_DEFAULT_SEED) {
  const count = validateRGBA(rgba, width, height), rng = normalizeCopySeed(seed);
  const density = new Float32Array(count);
  for (let i = 0; i < count; i++)
    density[i] = 1 - (.2126 * rgba[4*i] + .7152 * rgba[4*i+1] + .0722 * rgba[4*i+2]) / 255;
  return {width, height, generation: 0, rng, density};
}
const bound = (n, limit) => Math.max(0, Math.min(limit - 1, n));
const mix = (a, b, t) => a + (b - a) * t;
function machineHash(x, y) {
  let h = (Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ 0x9e3779b9 ^ COPY_FEEDBACK_MACHINE_SEED) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296 * 2 - 1;
}
function workspace(width, height) {
  const count = width * height, fixed = new Float32Array(count);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const ix = Math.floor(x / 8), iy = Math.floor(y / 8), fx = x / 8 - ix, fy = y / 8 - iy;
    fixed[y*width+x] = mix(mix(machineHash(ix,iy), machineHash(ix+1,iy), fx),
      mix(machineHash(ix,iy+1), machineHash(ix+1,iy+1), fx), fy);
  }
  return {fixed, tmp: new Float32Array(count), scanned: new Float32Array(count),
    mean: new Float32Array(count), developed: new Float32Array(count)};
}
// Trusted internal loop: inputs were validated or produced by this bounded operator.
// Operation order and Float32 writes match the frozen research implementation.
function step(d, out, w, h, rng, work) {
  const {tmp, scanned: s, mean: m, developed: q, fixed} = work;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=y*w+x;
    tmp[i]=.16*d[y*w+bound(x-1,w)]+.68*d[i]+.16*d[y*w+bound(x+1,w)];
  }
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=y*w+x;
    s[i]=.1*tmp[bound(y-1,h)*w+x]+.8*tmp[i]+.1*tmp[bound(y+1,h)*w+x];
  }
  for (let y=0;y<h;y++) {
    let sum=0;for(let dx=-4;dx<=4;dx++)sum+=s[y*w+bound(dx,w)];
    for(let x=0;x<w;x++){tmp[y*w+x]=sum/9;sum+=s[y*w+bound(x+5,w)]-s[y*w+bound(x-4,w)];}
  }
  for (let x=0;x<w;x++) {
    let sum=0;for(let dy=-4;dy<=4;dy++)sum+=tmp[bound(dy,h)*w+x];
    for(let y=0;y<h;y++){m[y*w+x]=sum/9;sum+=tmp[bound(y+5,h)*w+x]-tmp[bound(y-4,h)*w+x];}
  }
  const uniform=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;return rng/4294967296;};
  for (let i=0;i<d.length;i++) {
    const u=uniform(),v=uniform();
    const envelope=Math.sqrt(Math.max(0,s[i]*(1-s[i])));
    const surround=.22*Math.tanh((s[i]-m[i])/.22);
    const fixedError=.008*fixed[i]*envelope;
    const freshError=.020*(u+v-1)*envelope;
    let developed=Math.max(0,Math.min(1,.88*s[i]+1.95*surround-.012+fixedError+freshError));
    if(u<.0015)developed*=.25;
    q[i]=developed;
  }
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=y*w+x;
    out[i]=.94*q[i]+.015*(q[y*w+bound(x-1,w)]+q[y*w+bound(x+1,w)]+q[bound(y-1,h)*w+x]+q[bound(y+1,h)*w+x]);
  }
  return rng;
}
export function copyGeneration(previous) {
  validateCopyState(previous);
  if (previous.generation === COPY_FEEDBACK_GENERATIONS)
    throw new RangeError("Generation limit reached");
  const {width, height} = previous, density = new Float32Array(width * height);
  const rng = step(previous.density, density, width, height, previous.rng, workspace(width, height));
  return {width, height, generation: previous.generation + 1, rng, density};
}
export function advance(previous, target = COPY_FEEDBACK_GENERATIONS) {
  validateCopyState(previous);
  integer(target, previous.generation, COPY_FEEDBACK_GENERATIONS, "Target generation");
  const {width, height} = previous;
  let density = previous.density.slice(), next = new Float32Array(width * height), rng = previous.rng;
  const work = target > previous.generation ? workspace(width, height) : null;
  for (let n = previous.generation; n < target; n++) {
    rng = step(density, next, width, height, rng, work);
    [density, next] = [next, density];
  }
  return {width, height, generation: target, rng, density};
}
/** Generation-zero display deliberately rounds the saved Float32 density, including ties. */
export function stateToRGBA(state) {
  validateCopyState(state);
  const rgba = new Uint8ClampedArray(state.density.length * 4);
  for (let i = 0; i < state.density.length; i++) {
    const g = Math.round(255 * (1 - state.density[i]));
    rgba[4*i] = rgba[4*i+1] = rgba[4*i+2] = g; rgba[4*i+3] = 255;
  }
  return rgba;
}
export function initialCopyRGBA(rgba, width, height, seed = COPY_FEEDBACK_DEFAULT_SEED) {
  return stateToRGBA(initialState(rgba, width, height, seed));
}
function grayFromDensity(density) {
  const gray = new Uint8Array(density.length);
  for (let i = 0; i < density.length; i++) gray[i] = Math.round(255 * (1 - density[i]));
  return gray;
}
function finishHistory(width, height, seed, stages, rngStates) {
  return {version: COPY_FEEDBACK_VERSION, model: COPY_FEEDBACK_MODEL,
    width, height, seed, machineSeed: COPY_FEEDBACK_MACHINE_SEED,
    maxGeneration: COPY_FEEDBACK_GENERATIONS, stages, rngStates};
}
/** Owns all returned arrays; neither retains nor modifies source RGBA. */
export function prepareCopyHistory(rgba, width, height, seed = COPY_FEEDBACK_DEFAULT_SEED) {
  const initial = initialState(rgba, width, height, seed), work = workspace(width, height);
  let density = initial.density, next = new Float32Array(width * height), rng = initial.rng;
  const stages = [grayFromDensity(density)], rngStates = new Uint32Array(13); rngStates[0] = rng;
  for (let generation = 1; generation <= COPY_FEEDBACK_GENERATIONS; generation++) {
    rng = step(density, next, width, height, rng, work);
    [density, next] = [next, density];
    stages.push(grayFromDensity(density)); rngStates[generation] = rng;
  }
  // Only byte stages and 13 uint32 random states escape; Float32 workspace is unretained.
  return finishHistory(width, height, seed, stages, rngStates);
}
const defaultYield = () => new Promise(resolve => setTimeout(resolve, 0));
function checkAbort(signal) {
  if (signal?.aborted) {
    const error = new Error("Copy history preparation cancelled"); error.name = "AbortError"; throw error;
  }
}
/** Yields after each completed stage except the final one; cancellation is stage-granular. */
export async function prepareCopyHistoryAsync(rgba, width, height, seed = COPY_FEEDBACK_DEFAULT_SEED, options = {}) {
  if (!options || typeof options !== "object") throw new TypeError("Preparation options must be an object");
  const {signal, yieldControl = defaultYield, onProgress} = options;
  if (signal !== undefined && (!signal || typeof signal.aborted !== "boolean")) throw new TypeError("Invalid abort signal");
  if (typeof yieldControl !== "function" || (onProgress !== undefined && typeof onProgress !== "function")) throw new TypeError("Invalid preparation callback");
  checkAbort(signal);
  const initial = initialState(rgba, width, height, seed), work = workspace(width, height);
  let density = initial.density, next = new Float32Array(width * height), rng = initial.rng;
  const stages = [grayFromDensity(density)], rngStates = new Uint32Array(13); rngStates[0] = rng;
  if (onProgress) onProgress({generation: 0, total: COPY_FEEDBACK_GENERATIONS});
  checkAbort(signal); await yieldControl(); checkAbort(signal);
  for (let generation = 1; generation <= COPY_FEEDBACK_GENERATIONS; generation++) {
    rng = step(density, next, width, height, rng, work);
    [density, next] = [next, density];
    stages.push(grayFromDensity(density)); rngStates[generation] = rng;
    if (onProgress) onProgress({generation, total: COPY_FEEDBACK_GENERATIONS});
    checkAbort(signal);
    if (generation < COPY_FEEDBACK_GENERATIONS) { await yieldControl(); checkAbort(signal); }
  }
  return finishHistory(width, height, seed, stages, rngStates);
}
export function validateCopyHistory(history) {
  if (!history || typeof history !== "object") throw new TypeError("Copy history required");
  const count = dimensions(history.width, history.height);
  if (history.version !== COPY_FEEDBACK_VERSION || history.model !== COPY_FEEDBACK_MODEL ||
      history.machineSeed !== COPY_FEEDBACK_MACHINE_SEED || history.maxGeneration !== COPY_FEEDBACK_GENERATIONS)
    throw new TypeError("Incompatible copy history");
  integer(history.seed, 0, 0xffffffff, "History seed");
  if (!Array.isArray(history.stages) || history.stages.length !== 13) throw new TypeError("History must contain generations 0 through 12");
  for (const gray of history.stages)
    if (!(gray instanceof Uint8Array) || gray.length !== count) throw new TypeError("Invalid grayscale stage");
  if (!(history.rngStates instanceof Uint32Array) || history.rngStates.length !== 13 || history.rngStates[0] !== normalizeCopySeed(history.seed))
    throw new TypeError("Invalid random-state history");
  for (const rng of history.rngStates) if (rng === 0) throw new RangeError("Random states must be nonzero");
  return history;
}
export function generationForStrength(strength = .6) {
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) throw new RangeError("Strength must be finite and within [0, 1]");
  return Math.max(0, Math.ceil(COPY_FEEDBACK_GENERATIONS * strength));
}
/** Borrowed read-only view by contract. Clone the history before handing ownership elsewhere. */
export function selectCopyStage(history, strength = .6) {
  validateCopyHistory(history);
  const generation = generationForStrength(strength);
  return {generation, gray: history.stages[generation]};
}
export function cloneCopyHistory(history) {
  validateCopyHistory(history);
  return finishHistory(history.width, history.height, history.seed, history.stages.map(gray => gray.slice()), history.rngStates.slice());
}
export function copyHistoryByteLength(history) {
  validateCopyHistory(history);
  return history.stages.reduce((sum, gray) => sum + gray.byteLength, 0) + history.rngStates.byteLength;
}
export function renderCopyHistory(history, strength = .6) {
  const {gray} = selectCopyStage(history, strength), rgba = new Uint8ClampedArray(gray.length * 4);
  for (let i = 0; i < gray.length; i++) { rgba[4*i] = rgba[4*i+1] = rgba[4*i+2] = gray[i]; rgba[4*i+3] = 255; }
  return rgba;
}
/** Synchronous pixel writer works with actual p5 Renderer2D and a load/updatePixels recorder. */
export function drawCopyHistory(p, history, strength = .6) {
  const {generation, gray} = selectCopyStage(history, strength);
  if (!p || typeof p.loadPixels !== "function" || typeof p.updatePixels !== "function") throw new TypeError("A p5-compatible pixel target is required");
  if ((p.width !== undefined && p.width !== history.width) || (p.height !== undefined && p.height !== history.height)) throw new RangeError("Copy feedback canvas dimensions must match the history");
  p.loadPixels();
  if ((!isBytes(p.pixels) && !(p.pixels instanceof Float64Array)) || p.pixels.length !== gray.length * 4) throw new RangeError("Copy feedback requires matching dimensions and pixel density 1");
  for (let i = 0; i < gray.length; i++) { p.pixels[4*i] = p.pixels[4*i+1] = p.pixels[4*i+2] = gray[i]; p.pixels[4*i+3] = 255; }
  p.updatePixels();
  return generation;
}

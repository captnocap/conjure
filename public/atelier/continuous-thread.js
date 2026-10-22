/**
 * Continuous pin-thread reconstruction, isolated Atelier prototype.
 * A single globally selected first chord followed by endpoint-constrained,
 * strictly improving additions. This is our own bounded greedy adaptation.
 * Primary credits and limitations: ./README.md
 */
const clamp = v => Math.max(0, Math.min(1, v));
export const THREAD_MODEL = Object.freeze({ resolution: 180, pins: 128, maxChords: 2048, widthAt720: .5, opacity: .82, minimumGain: 1e-10 });
export const THREAD_CREDITS = Object.freeze([
  { name: 'Petros Vrellis — A new way to knit (2016)', url: 'https://artof01.com/vrellis/works/knit.html' },
  { name: 'Birsak, Rist, Wonka and Musialski — String Art (2018)', url: 'https://peterwonka.net/Publications/pdfs/2018.EG.Birsak.StringArt.pdf' },
  { name: 'Eric Heitz — Implementation and realization of Petros Vrellis’ knitting', url: 'https://eheitzresearch.wordpress.com/implementation-and-realization-of-petros-vrellis-knitting/' },
]);
let maskCache = null;
const counters = { maskBuilds: 0, solves: 0, draws: 0 };
export const threadCacheStats = () => ({ ...counters, maskCacheCount: +!!maskCache, maskBytes: maskCache?.stats.bytes || 0 });
export function clearThreadMaskCache() { maskCache = null; }
function checkedModel(overrides) {
  const model = { ...THREAD_MODEL, ...overrides };
  if (!Number.isInteger(model.resolution) || model.resolution < 8 || model.resolution > 180 || !Number.isInteger(model.pins) || model.pins < 8 || model.pins > 128 || model.pins % 4 || !Number.isInteger(model.maxChords) || model.maxChords < 0 || model.maxChords > 2048 || !(model.widthAt720 > 0 && model.widthAt720 <= 1) || !(model.opacity > 0 && model.opacity <= 1) || !(model.minimumGain >= 1e-12 && model.minimumGain <= 1)) throw Error('Invalid or unbounded thread model');
  return model;
}
export function perimeterPins(count = 128, size = 180) {
  if (!Number.isInteger(count) || count < 8 || count > 128 || count % 4 || !(size > 0 && Number.isFinite(size))) throw Error('Invalid perimeter');
  const q = count / 4, out = [];
  for (let i = 0; i < count; i++) {
    const side = Math.floor(i / q), t = i % q / q;
    out.push(side === 0 ? [size * t, 0] : side === 1 ? [size, size * t] : side === 2 ? [size * (1 - t), size] : [0, size * (1 - t)]);
  }
  return out;
}
function boundaryOnly(a, b, n) { return a[0] === b[0] && (a[0] === 0 || a[0] === n) || a[1] === b[1] && (a[1] === 0 || a[1] === n); }
// Sutherland–Hodgman clipping of a thin rectangular strand against pixel cells.
// This integrates subpixel coverage in the solver grid; it is not physical fiber occlusion.
function clip(poly, axis, bound, sign) {
  const out = []; let prev = poly[poly.length - 1];
  if (!prev) return out;
  let pin = (prev[axis] - bound) * sign >= 0;
  for (const cur of poly) {
    const cin = (cur[axis] - bound) * sign >= 0;
    if (cin !== pin) { const t = (bound - prev[axis]) / (cur[axis] - prev[axis]); out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]); }
    if (cin) out.push(cur);
    prev = cur; pin = cin;
  }
  return out;
}
function area(poly) {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) sum += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  return Math.abs(sum) / 2;
}
export function chordMask(a, b, n, width, opacity) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
  if (!length) return { indices: new Uint16Array(0), alpha: new Float32Array(0) };
  const nx = -dy / length * width / 2, ny = dx / length * width / 2;
  const poly = [[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];
  const indices = [], alpha = [], major = Math.abs(dx) >= Math.abs(dy) ? 0 : 1, minor = 1 - major;
  const lo = Math.max(0, Math.floor(Math.min(...poly.map(p=>p[major])))), hi = Math.min(n-1, Math.floor(Math.max(...poly.map(p=>p[major]))));
  for (let u = lo; u <= hi; u++) {
    const strip = clip(clip(poly, major, u, 1), major, u+1, -1);
    if (!strip.length) continue;
    const v0 = Math.max(0, Math.floor(Math.min(...strip.map(p=>p[minor])))), v1 = Math.min(n-1, Math.floor(Math.max(...strip.map(p=>p[minor]))));
    for (let v = v0; v <= v1; v++) {
      const coverage = area(clip(clip(strip, minor, v, 1), minor, v+1, -1));
      if (coverage > 1e-12) { const x = major === 0 ? u : v, y = major === 0 ? v : u; indices.push(y*n+x); alpha.push(Math.min(1, coverage) * opacity); }
    }
  }
  return { indices: Uint16Array.from(indices), alpha: Float32Array.from(alpha) };
}
export function threadMasks(overrides = {}) {
  const m = checkedModel(overrides), key = [m.resolution,m.pins,m.widthAt720,m.opacity].join(':');
  if (maskCache?.key === key) return maskCache;
  const start = performance.now(), n = m.resolution, pins = perimeterPins(m.pins,n), masks = [], lookup = new Int16Array(m.pins*m.pins).fill(-1);
  let entries = 0, largest = 0;
  for (let a = 0; a < m.pins; a++) for (let b = a+1; b < m.pins; b++) {
    if (boundaryOnly(pins[a],pins[b],n)) continue;
    const mask = chordMask(pins[a],pins[b],n,m.widthAt720*n/720,m.opacity);
    if (mask.indices.length > 4*n+8) throw Error('Sparse mask bound exceeded');
    lookup[a*m.pins+b] = lookup[b*m.pins+a] = masks.length;
    masks.push({ a, b, ...mask }); entries += mask.indices.length; largest = Math.max(largest,mask.indices.length);
  }
  const bytes = entries*6 + lookup.byteLength;
  maskCache = { key, pins, masks, lookup, stats: { count: masks.length, entries, largest, bytes, buildMs: performance.now()-start } }; counters.maskBuilds++;
  return maskCache;
}
/** Area average existing per-pixel darkness, never sample an enlarged/cropped subject. */
export function targetFromFrame(f, n = THREAD_MODEL.resolution) {
  if (!Number.isInteger(f.w) || f.w < 1 || f.w > 4096 || typeof f.D !== 'function' || !Number.isInteger(n) || n < 8 || n > 180) throw Error('Invalid frame');
  const target = new Float64Array(n*n), scale = f.w/n;
  for (let y=0;y<n;y++) for(let x=0;x<n;x++) {
    let sum=0; const left=x*scale, right=Math.min(f.w,(x+1)*scale), top=y*scale, bottom=Math.min(f.w,(y+1)*scale);
    for(let sy=Math.floor(top);sy<Math.min(f.w,Math.ceil(bottom));sy++) for(let sx=Math.floor(left);sx<Math.min(f.w,Math.ceil(right));sx++) {
      const v=f.D(sx,sy); if(!Number.isFinite(v))throw Error('Nonfinite target');
      sum+=clamp(v)*(Math.min(right,sx+1)-Math.max(left,sx))*(Math.min(bottom,sy+1)-Math.max(top,sy));
    }
    target[y*n+x]=sum/(scale*scale);
  }
  return target;
}
function hash(seed,a,b,step) { let h = Math.imul((seed|0)^a,0x45d9f3b)^Math.imul(b+step*129,0x27d4eb2d); h=Math.imul(h^(h>>>16),0x45d9f3b); return (h^(h>>>16))>>>0; }
export function squaredError(target,current) { let e=0; for(let i=0;i<target.length;i++){const d=target[i]-current[i];e+=d*d;}return e; }
export function scoreChord(target,current,mask) {
  let gain=0;
  for(let j=0;j<mask.indices.length;j++){const i=mask.indices[j], delta=(1-current[i])*mask.alpha[j], residual=target[i]-current[i];gain+=2*residual*delta-delta*delta;}
  return gain;
}
export function solveThread(target, seed = 2401, overrides = {}) {
  const started=performance.now(), model=checkedModel(overrides), n=model.resolution;
  if(target.length!==n*n || !Number.isFinite(seed))throw Error('Invalid solve input');
  for(const t of target)if(!Number.isFinite(t)||t<0||t>1)throw Error('Target outside [0,1]');
  const bank=threadMasks(model),current=new Float64Array(target.length),used=new Uint8Array(bank.masks.length),path=[],gains=[],errors=[],drift=[];
  let error=squaredError(target,current),sampleVisits=0,candidateScores=0,stopReason='chord-budget',terminalBestGain=null; errors.push(error); counters.solves++;
  const consider=(id,step,best)=>{
    if(id<0||used[id])return best;
    const mask=bank.masks[id],gain=scoreChord(target,current,mask),rank=hash(seed,mask.a,mask.b,step);sampleVisits+=mask.indices.length;candidateScores++;
    const tie=1e-12*Math.max(1,Math.abs(gain),Math.abs(best.gain));
    if(best.id<0 || gain>best.gain+tie || Math.abs(gain-best.gain)<=tie && (rank<best.rank || rank===best.rank&&id<best.id))return {id,gain,rank};
    return best;
  };
  if(!target.some(t=>t>0))stopReason='zero-target';
  else for(let step=0;step<model.maxChords;step++){
    let best={id:-1,gain:-Infinity,rank:Infinity};
    if(!path.length){for(let id=0;id<bank.masks.length;id++)best=consider(id,step,best);}
    else {const from=path[path.length-1];for(let to=0;to<model.pins;to++)best=consider(bank.lookup[from*model.pins+to],step,best);}
    if(best.id<0 || !(best.gain>model.minimumGain)){stopReason=path.length?'no-improving-endpoint-chord':'no-improving-initial-chord';terminalBestGain=Number.isFinite(best.gain)?best.gain:null;break;}
    const mask=bank.masks[best.id];used[best.id]=1;
    if(!path.length){const reverse=(seed|0)&1;path.push(reverse?mask.b:mask.a);path.push(reverse?mask.a:mask.b);}
    else path.push(path[path.length-1]===mask.a?mask.b:mask.a);
    for(let j=0;j<mask.indices.length;j++){const i=mask.indices[j];current[i]+=(1-current[i])*mask.alpha[j];}
    gains.push(best.gain);error-=best.gain;errors.push(error);
    if((step+1)%64===0){const exact=squaredError(target,current),delta=exact-error;drift.push({step:step+1,delta});if(Math.abs(delta)>1e-8*Math.max(1,exact))throw Error('Objective drift');}
  }
  const exactError=squaredError(target,current);drift.push({step:gains.length,delta:exactError-error});
  if(Math.abs(exactError-error)>1e-8*Math.max(1,exactError))throw Error('Final objective drift');
  return {model,seed,pins:bank.pins.map(p=>p.map(v=>v/n)),path:Uint16Array.from(path),gains:Float64Array.from(gains),errors:Float64Array.from(errors),prediction:current,stats:{accepted:gains.length,stopReason,terminalBestGain,initialError:errors[0],finalError:exactError,reduction:errors[0]?1-exactError/errors[0]:0,sampleVisits,candidateScores,solveMs:performance.now()-started,maxDrift:Math.max(...drift.map(d=>Math.abs(d.delta))),drift,mask:bank.stats}};
}
export function prepareContinuousThread(f) {
  if (f.continuousThreadPlan) return f.continuousThreadPlan;
  const compute=()=>solveThread(targetFromFrame(f),f.seed);
  return typeof f.prepare==='function'?f.prepare('continuous-thread-v1:'+JSON.stringify(THREAD_MODEL),compute):compute();
}
export function drawThreadPlan(p,f,plan,strength=f.intensity) {
  if(!Number.isFinite(strength))throw Error('Invalid completion');
  p.background(255);p.blendMode(p.BLEND);p.noFill();p.stroke(0,0,0,plan.model.opacity*255);p.strokeWeight(plan.model.widthAt720*f.w/720);
  const count=Math.floor(clamp(strength)*(plan.stats?.accepted ?? plan.count));
  // Separate operations are intentional: every crossing composites another strand.
  for(let i=0;i<count;i++){const a=plan.pins[plan.path[i]],b=plan.pins[plan.path[i+1]];p.line(a[0]*f.w,a[1]*f.w,b[0]*f.w,b[1]*f.w);}
  counters.draws++;return count;
}
export function drawContinuousThread(p,f) {
  if(!Number.isFinite(f.intensity))throw Error('Invalid completion');
  if(f.intensity<=0){p.background(255);return;}
  drawThreadPlan(p,f,prepareContinuousThread(f));
}

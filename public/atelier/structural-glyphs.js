import { GLYPHS, VARIANTS, CELL_W, CELL_H, PAD, PATCH_W, PATCH_H } from './glyph-atlas.js';
import { sameDrawSurface } from './clean-studies.js';

export const LIMITS = Object.freeze({maxSize:1440,logicalSize:720,maxOwners:64,maxGlyphs:21600,maxVariants:378,maxPatchPixels:320});
export const PAPER=Object.freeze([250,247,235]);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const aborted=signal=>{if(signal?.aborted)throw signal.reason||new DOMException('Canceled','AbortError');};
const luma=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;

/** Quantized symmetric distance score. Atlas and offset order break exact ties. */
export function matchPatch(target,visible,{toneOnly=false,stats}={}) {
  const points=[];let targetCount=0;
  for(let y=PAD;y<PAD+CELL_H;y++)for(let x=PAD;x<PAD+CELL_W;x++){
    const i=y*PATCH_W+x;if(target[i]){points.push(i);targetCount++;}
  }
  if(!targetCount)return null;
  const td=new Uint8Array(PATCH_W*PATCH_H).fill(112);
  // Exact small capped distance transform; one row/cell never exceeds 320² work.
  const all=[];for(let i=0;i<target.length;i++)if(target[i])all.push(i);
  for(let i=0;i<td.length;i++){
    const x=i%PATCH_W,y=(i/PATCH_W)|0;
    for(const p of all){const d=Math.round(Math.hypot(x-p%PATCH_W,y-((p/PATCH_W)|0))*16);if(d<td[i])td[i]=d;}
  }
  let best=null,bestScore=Infinity;
  for(let v=0;v<VARIANTS.length;v++){
    const variant=VARIANTS[v];let score=0,visibleInk=0,falseInk=0,inkDistance=0;
    // The ablation sees only edge-pixel count: same layout and target cells,
    // same color/pressure/owner clipping, but no spatial arrangement at all.
    if(toneOnly){
      score=Math.abs(variant.core.length-targetCount)*32;
      // Stable fixed alignment for tone-only. No concealed spatial fitting.
      if(variant.shift)score+=10000;
    }else{
      let missed=0;
      for(const point of points)missed+=Math.min(80,variant.distance[point]);
      for(const point of variant.ink){
        if(visible[point]){visibleInk++;inkDistance+=td[point];}
        else falseInk++;
      }
      // Missed contour dominates. Off-target or cross-owner ink is penalized.
      // Normalize by population, so punctuation cannot win just by being tiny.
      score=128*missed/points.length + 112*inkDistance/Math.max(1,visibleInk)
        + 128*falseInk/Math.max(1,variant.ink.length)
        + 16*Math.abs(visibleInk-targetCount)/Math.max(4,targetCount);
      if(!visibleInk)score+=100000;
    }
    if(stats)stats.variantEvaluations++;
    if(score<bestScore){bestScore=score;best={variant:v,score,targetCount};}
  }
  return best;
}

function createFields(f,signal) {
  const w=f.w,scale=1,n=w*w;
  const originalOwners=new Uint16Array(n),owners=new Uint16Array(n),edge=new Uint8Array(n),parent=new Map();
  const colorHist=new Map(),normals=new Float32Array(n*3),depth=new Float32Array(n);
  const point=(x,y)=>[(x+.5)*scale-.5,(y+.5)*scale-.5];
  for(let y=0;y<w;y++){
    if(y%24===0)aborted(signal);
    for(let x=0;x<w;x++){
      const [u,v]=point(x,y),i=y*w+x,id=f.ID(u,v);
      if(!Number.isInteger(id)||id<0||id>65535)throw RangeError('Invalid visible owner');
      originalOwners[i]=owners[i]=id;
      if(id<=1)continue;
      if(!parent.has(id)){parent.set(id,id);colorHist.set(id,[new Uint32Array(32),new Uint32Array(32),new Uint32Array(32)]);}
      if(parent.size>LIMITS.maxOwners)throw RangeError('Owner budget exceeded');
      const b=f.B(u,v),h=colorHist.get(id);
      for(let c=0;c<3;c++)h[c][Math.round(clamp(b[c],0,255)/255*31)]++;
      for(let c=0;c<3;c++)normals[i*3+c]=f.N(u,v,c)*2-1;
      depth[i]=f.distance(u,v);
    }
  }
  const root=id=>{while(parent.get(id)!==id)id=parent.get(id);return id;};
  // Remove only verified coplanar shared-material owner ties, especially stairs.
  for(let y=0;y<w-1;y++)for(let x=0;x<w-1;x++){
    const a=owners[y*w+x];if(a<=1)continue;
    for(const j of [y*w+x+1,(y+1)*w+x]){
      const b=owners[j];if(b<=1||a===b||root(a)===root(b))continue;
      const [u,v]=point(x,y),[xx,yy]=point(j%w,(j/w)|0);
      if(sameDrawSurface(f,u,v,xx,yy))parent.set(root(b),root(a));
    }
  }
  for(let i=0;i<n;i++)if(owners[i]>1)owners[i]=root(owners[i]);
  const inks=new Map();
  for(const [id,h]of colorHist){
    const median=h.map(bins=>{const half=bins.reduce((a,b)=>a+b,0)/2;let s=0;for(let i=0;i<32;i++){s+=bins[i];if(s>=half)return(i+.5)/32*255;}return 128;});
    // Owner-local pigment, flattened in illumination; a contrast floor protects
    // pale white/chrome forms. No beauty-pass underpainting is drawn.
    const light=luma(median),k=Math.min(.56,105/Math.max(1,light));
    inks.set(id,median.map(v=>Math.round(22+v*k*.74)));
  }
  let edgePixels=0;
  for(let y=1;y<w-1;y++){
    if(y%24===0)aborted(signal);
    for(let x=1;x<w-1;x++){
      const i=y*w+x,id=owners[i];if(id<=1)continue;
      for(const j of [i-1,i+1,i-w,i+w]){
        if(owners[j]!==id){edge[i]=1;break;}
        const at=i*3,bt=j*3,dot=normals[at]*normals[bt]+normals[at+1]*normals[bt+1]+normals[at+2]*normals[bt+2];
        if(dot<.93){edge[i]=1;break;}
        if(Math.abs(depth[i]-depth[j])>(f.pixelWorldSize||8.2/f.w)*scale*5){edge[i]=1;break;}
      }
      edgePixels+=edge[i];
    }
  }
  return {w,scale,originalOwners,owners,edge,inks,edgePixels,ownerCount:parent.size};
}

export function prepareTypedContours(f,{toneOnly=false,signal}={}) {
  if(!Number.isInteger(f.w)||f.w<12||f.w>LIMITS.maxSize)throw RangeError('Typed contours requires size 12–1440');
  const started=performance.now(),fields=createFields(f,signal),{owners,edge}=fields;
  const sourceSize = fields.w, w = Math.min(LIMITS.logicalSize, sourceSize), sourceScale = sourceSize / w;
  const entries=[],stats={variantEvaluations:0,logicalSize:w,cellSize:[CELL_W,CELL_H],edgePixels:fields.edgePixels,visibleOwners:fields.ownerCount,ownerCellPlans:0,preparationMs:0};
  const target=new Uint8Array(PATCH_W*PATCH_H),visible=new Uint8Array(target.length);
  for(let y=0;y<w;y+=CELL_H){
    aborted(signal);
    for(let x=0;x<w;x+=CELL_W){
      const active=new Set();
      for(let py=Math.floor(y*sourceScale);py<Math.min(Math.ceil((y+CELL_H)*sourceScale),sourceSize);py++)
        for(let px=Math.floor(x*sourceScale);px<Math.min(Math.ceil((x+CELL_W)*sourceScale),sourceSize);px++){
          const i=py*sourceSize+px;if(edge[i])active.add(owners[i]);
        }
      // Owner order is numerical and independent of Map/scan timing.
      for(const owner of [...active].sort((a,b)=>a-b)){
        if(entries.length>=LIMITS.maxGlyphs)throw RangeError('Glyph plan budget exceeded');
        target.fill(0);visible.fill(0);
        for(let py=0;py<PATCH_H;py++)for(let px=0;px<PATCH_W;px++){
          const u=x+px-PAD,v=y+py-PAD;if(u<0||v<0||u>=w||v>=w)continue;
          const j=py*PATCH_W+px;
          // A logical sample retains every source owner in its footprint, not
          // only the center/majority owner. Thin high-resolution stems survive.
          for(let sy=Math.floor(v*sourceScale);sy<Math.min(Math.ceil((v+1)*sourceScale),sourceSize);sy++)
            for(let sx=Math.floor(u*sourceScale);sx<Math.min(Math.ceil((u+1)*sourceScale),sourceSize);sx++){
              const i=sy*sourceSize+sx;
              if(owners[i]===owner){visible[j]=1;target[j]|=edge[i];}
            }
        }
        const matched=matchPatch(target,visible,{toneOnly,stats});
        if(matched)entries.push({x,y,owner,variant:matched.variant,score:matched.score,targetCount:matched.targetCount});
      }
    }
  }
  stats.ownerCellPlans=entries.length;
  const records = new Uint16Array(entries.length * 5);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    records.set([e.x, e.y, e.owner, e.variant, e.targetCount], i * 5);
  }
  const inkTable = new Uint8Array((Math.max(...fields.inks.keys(), 0) + 1) * 3);
  const visibleOwnerIds = Uint16Array.from([...fields.inks.keys()].sort((a,b)=>a-b));
  for (const [id, ink] of fields.inks) inkTable.set(ink, id * 3);
  delete fields.inks;
  stats.retainedTypedBytes=fields.originalOwners.byteLength+fields.owners.byteLength+fields.edge.byteLength+records.byteLength+inkTable.byteLength+visibleOwnerIds.byteLength;
  stats.preparationMs=performance.now()-started;
  return {...fields,w,sourceSize,records,inkTable,visibleOwnerIds,stats,mode:toneOnly?'tone-only ablation':'structure matched'};
}

export function renderTypedContours(plan,strength=.6,{size=plan.w,signal}={}) {
  aborted(signal);
  const started=performance.now();strength=clamp(Number.isFinite(strength)?strength:.6);
  if(!Number.isInteger(size)||size<12||size>LIMITS.maxSize)throw RangeError('Invalid output size');
  const rgba=new Uint8ClampedArray(size*size*4),coverage=new Uint8Array(size*size),ownerInkCounts=new Map();
  for(let i=0;i<size*size;i++)rgba.set([...PAPER,255],i*4);
  const scale=size/plan.w,radius=.50+strength*.60,alpha=.79+.20*strength;
  let clippedSamples=0,inkSamples=0;
  for(let ei=0;ei<plan.records.length / 5;ei++){
    if(ei%128===0)aborted(signal);
    const atRecord = ei * 5;
    const e = { x: plan.records[atRecord], y: plan.records[atRecord+1], owner: plan.records[atRecord+2], variant: plan.records[atRecord+3] };
    const v=VARIANTS[e.variant];
    const x0=Math.max(0,Math.floor((e.x-PAD)*scale)),x1=Math.min(size,Math.ceil((e.x-PAD+PATCH_W)*scale));
    const y0=Math.max(0,Math.floor((e.y-PAD)*scale)),y1=Math.min(size,Math.ceil((e.y-PAD+PATCH_H)*scale));
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const lx=(x+.5)/scale,ly=(y+.5)/scale,px=Math.floor(lx-e.x+PAD),py=Math.floor(ly-e.y+PAD);
      if(px<0||py<0||px>=PATCH_W||py>=PATCH_H)continue;
      const d=v.distance[py*PATCH_W+px]/16,c=Math.round(clamp((radius+.5-d)*alpha)*255);
      if(!c)continue;
      // Final clipping uses the full capture resolution, never the planning
      // mask. This protects one-pixel apertures and true export silhouettes.
      const sx=Math.min(plan.sourceSize-1,Math.floor((x+.5)*plan.sourceSize/size));
      const sy=Math.min(plan.sourceSize-1,Math.floor((y+.5)*plan.sourceSize/size));
      const at=sy*plan.sourceSize+sx;
      if(plan.owners[at]!==e.owner){clippedSamples++;continue;}
      const i=y*size+x;if(c<=coverage[i])continue;
      coverage[i]=c;inkSamples++;
      const inkOffset=plan.originalOwners[at]*3;
      for(let k=0;k<3;k++)rgba[i*4+k]=Math.round(PAPER[k]+(plan.inkTable[inkOffset+k]-PAPER[k])*c/255);
    }
  }
  let inkPixels=0;for(let i=0;i<coverage.length;i++)if(coverage[i]){
    inkPixels++;const x=i%size,y=(i/size)|0,at=Math.min(plan.sourceSize-1,Math.floor((y+.5)*plan.sourceSize/size))*plan.sourceSize+Math.min(plan.sourceSize-1,Math.floor((x+.5)*plan.sourceSize/size)),id=plan.originalOwners[at];
    ownerInkCounts.set(id,(ownerInkCounts.get(id)||0)+1);
  }
  return {rgba,coverage,stats:{renderMs:performance.now()-started,inkPixels,inkSamples,clippedSamples,paperFraction:1-inkPixels/(size*size),ownerInkCounts:Object.fromEntries(ownerInkCounts),radius,alpha,workingBytes:rgba.byteLength+coverage.byteLength}};
}
export function drawTypedContours(p,f) {
  const plan=f.prepare('typed-contours-atlas1',()=>prepareTypedContours(f));
  const {rgba}=renderTypedContours(plan,f.intensity,{size:f.w});
  p.loadPixels();p.pixels.set(rgba);p.updatePixels();
}
export const candidate = Object.freeze({id:'typed-contours',name:'Typed contours',family:'Glyph study',draw:drawTypedContours,offThread:true,control:'Typing pressure',note:'Original glyph atlas; bounded owner-specific spatial matching. No underpainting or non-glyph outline.'});

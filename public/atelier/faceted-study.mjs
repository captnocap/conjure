import {CONFIG,Work,prepareCandidates,selectSites,triangulate,rasterize} from './faceted-core.mjs';

/** Two discrete detail settings, deliberately not a continuous pressure effect. */
export function detailBudget(intensity){
 if(!Number.isFinite(intensity)||intensity<0||intensity>1)throw Error('intensity must be finite and from 0 through 1');
 return intensity<.5?303:603;
}
function validateFrame(f){
 if(!f||!Number.isInteger(f.w)||f.w<CONFIG.minSize||f.w>CONFIG.maxSize)throw Error('frame size must be an integer from 1 through 720');
 if(!(f.color instanceof Uint8Array||f.color instanceof Uint8ClampedArray)||f.color.length!==f.w*f.w*4)throw Error('frame color must be an exact RGBA byte array');
 if(!Number.isSafeInteger(f.seed))throw Error('frame seed must be a safe integer');
 if(typeof f.ID!=='function'||typeof f.prepare!=='function')throw Error('frame requires ID and prepare functions');
 return detailBudget(f.intensity);
}

/** A single cold image. Scratch plans are not retained in the returned value.
 *  Pixel dimensions are used directly, with the original fixed 8px/3px/+/-4px
 *  rules at every supported size. Requested budgets clamp to candidate count + 4
 *  corners on small frames; both detail settings coincide at sizes <= 136px.
 *  This never resizes to or from 720.
 */
export function renderFacetedStudy(f){
 const requestedBudget=validateFrame(f),size=f.w,budget=Math.min(requestedBudget,Math.ceil(size/8)**2+4),N=size*size,work=new Work(),start=performance.now();
 const owners=new Uint8Array(N);
 work.visit('frame owner materialization',N);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const id=f.ID(x,y);
  if(!Number.isInteger(id)||id<0||id>255)throw Error('owner ID must be an integer byte');
  owners[y*size+x]=id;
 }
 const prep=prepareCandidates(f.color,size,work),selection=selectSites(prep.candidates,size,requestedBudget,true),mesh=triangulate(selection.sites,size),raster=rasterize(selection.sites,mesh.triangles,f.color,owners,size,work);
 return {rgba:raster.out,size,budget,stats:{
  candidateCount:prep.candidates.length,sites:budget,faces:mesh.triangles.length,
  sourcePixelVisits:work.sourcePixelVisits,sourcePixelWork:work.entries,
  internalPixelVisits:prep.internalPixelVisits,
  distanceUpdates:selection.distanceUpdates,scoreEvaluations:selection.scoreEvaluations,
  triangulation:mesh.work,raster:raster.stats,
  typedBytes:{retained:raster.out.byteLength,maximumReachableScratchAndOutput:owners.byteLength+Math.max(prep.workingTypedBytes,selection.typedBytes,raster.typedBytes),totalAllocated:owners.byteLength+prep.workingTypedBytes+selection.typedBytes+raster.typedBytes},
  ms:{candidates:prep.ms,selection:selection.ms,triangulation:mesh.ms,raster:raster.ms,total:performance.now()-start}
 }};
}

/** Existing makeFrame.prepare owns the cache: raw WeakMap, seed-keyed, 2-slot LRU.
 *  Each detail is one entry. No intensity-string keys, extra retained plans,
 *  source buffers, global maps, or cached packet buffers are introduced here.
 *  Source captures obey makeFrame's existing immutable-raw contract.
 */
export function prepareFacetedStudy(f){
 const requestedBudget=validateFrame(f),budget=Math.min(requestedBudget,Math.ceil(f.w/8)**2+4);
 return f.prepare('faceted-color-abstraction:'+budget,()=>renderFacetedStudy(f));
}

/** Works with p5.Graphics and the existing write-only contact drawing protocol.
 *  A warm draw only obtains and copies its image; no source/owner pixels read.
 */
export function drawFacetedStudy(p,f){
 if(!p||typeof p.loadPixels!=='function'||typeof p.updatePixels!=='function')throw Error('p5 pixel methods are required');
 const image=prepareFacetedStudy(f);
 p.loadPixels();
 if(!p.pixels||p.pixels.length!==image.rgba.length||typeof p.pixels.set!=='function')throw Error('Faceted study requires pixel density 1 and matching frame dimensions');
 p.pixels.set(image.rgba);
 p.updatePixels();
}

/** Reviewable descriptor only. Exporting it does not register the study. */
export const facetedPlanes = Object.freeze({
 id:'faceted-planes',
 name:'Faceted planes',
 family:'Lines & geometry',
 control:'Facet detail',
 formatStrength:value=>detailBudget(value)===303?'Coarse':'Fine',
 title:'Color becomes a plane.',
 medium:'Flat color planes',
 swatch:'#b3b5a7',
 category:'FACETED COLOR ABSTRACTION',
 description:'Broad flat color planes become finer around changing light and form. Coarse and Fine select two fixed detail budgets; fine reflections are simplified and soft shadows become angular.',
 mechanism:'Saliency-weighted site placement · 303 or 603 sites at 720px · exact Delaunay triangles · flat source-color means clipped by original object ownership. Small frames clamp to available sites. Reflections are simplified, shadows angularized, and native ownership boundaries retained.',
 reference:'https://www.liambrazier.com/illustration/copperandink',
 referenceLabel:'Liam Brazier / Copper & Ink',
 referencePage:'https://cgl.ethz.ch/Downloads/Publications/Papers/2018/Law18a/Law18a.pdf',
 referencePageLabel:'Lawonn & Günther / Stylized Image Triangulation',
 offThread:true,
 draw:drawFacetedStudy,
});

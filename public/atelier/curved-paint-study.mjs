import {solveCurvedPaint,validateInput} from './curved-paint-core.mjs';

/** Paint refinement deliberately selects two completed stages. */
export function refinementLayers(intensity){
 if(!Number.isFinite(intensity)||intensity<0||intensity>1)throw Error('intensity must be finite and from 0 through 1');
 return intensity<.5?3:4;
}
export function renderIntensity(value){return refinementLayers(value)===3?0:1;}
function validateFrame(f){
 if(!f)throw Error('frame is required');
 const layers=refinementLayers(f.intensity);
 validateInput(f.color,f.w,f.seed,layers);
 if(typeof f.prepare!=='function')throw Error('frame requires prepare function');
 return layers;
}

/** Native square pixels 1–720. Fixed 16/8/4/2 px radii, no hidden resizing.
 *  Cold rendering belongs in Atelier's existing contact worker.
 */
export function renderCurvedPaint(f){
 const layers=validateFrame(f);
 return solveCurvedPaint(f.color,f.w,f.seed,layers);
}

/** Existing f.prepare owns the raw-keyed, seed-keyed two-slot LRU. Only the
 *  completed output and numeric diagnostics survive; no plans or global cache.
 */
export function prepareCurvedPaint(f){
 const layers=validateFrame(f);
 return f.prepare('curved-paint:'+layers,()=>renderCurvedPaint(f));
}

/** All-pixel write for pixelDensity 1 p5 or the existing drawing protocol. */
export function drawCurvedPaint(p,f){
 if(!p||typeof p.loadPixels!=='function'||typeof p.updatePixels!=='function')throw Error('p5 pixel methods are required');
 const image=prepareCurvedPaint(f);
 p.loadPixels();
 if(!p.pixels||p.pixels.length!==image.rgba.length||typeof p.pixels.set!=='function')throw Error('Curved paint requires pixel density 1 and matching frame dimensions');
 p.pixels.set(image.rgba);p.updatePixels();
}

/** Descriptor only. Exporting this object does not register or schedule work. */
export const curvedPaint=Object.freeze({
 id:'curved-paint',
 name:'Curved paint',
 family:'Marks & pigment',
 control:'Paint refinement',
 formatStrength:value=>refinementLayers(value)===3?'Loose':'Detailed',
 renderIntensity,
 restartOnIntensity:true,
 title:'Color follows a curve.',
 medium:'Layered curved brushstrokes',
 swatch:'#a69d77',
 category:'ADAPTIVE CURVED PAINTING',
 description:'Broad curved marks build the scene on warm paper. Loose stops after three brush sizes; Detailed adds a finer pass. Fine texture is simplified, with loose contours and occasional pale edge specks.',
 mechanism:'Gaussian reference · residual-based cell placement · gradient-following cubic splines · rounded per-stroke antialias coverage. Fixed 16/8/4/2 px radii; refinement overflow admits the strongest mean-residual cells within declared budgets. Local selection does not guarantee the best global painting.',
 reference:'https://mrl.cs.nyu.edu/publications/painterly98/',
 referenceLabel:'Aaron Hertzmann / Painterly Rendering',
 offThread:true,
 draw:drawCurvedPaint,
});

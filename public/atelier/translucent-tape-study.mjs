import {planTranslucentTape,composeTape} from './translucent-tape-core.mjs';

export function tapeSourceFromFrame(f){
  if(!f||!Number.isInteger(f.w)||f.w<1||f.w>720||typeof f.ID!=='function')throw new TypeError('Invalid tape frame');
  const n=f.w*f.w,owners=new Uint8Array(n),materialKeys=[],baseColors=[],geometry=f.geometrySnapshot?.()||null;
  const haveGeometry=geometry&&f.worldFromClip&&f.normal&&typeof f.worldPosition==='function';
  const positions=haveGeometry?new Float64Array(n*3):null;
  for(let y=0;y<f.w;y++)for(let x=0;x<f.w;x++){
    const i=y*f.w+x,id=f.ID(x,y);if(!Number.isInteger(id)||id<0||id>255)throw new TypeError('Invalid owner ID');owners[i]=id;
    if(id>=4&&id<=6){
      if(materialKeys[id]===undefined&&f.hasMaterialEvidence?.(id)===true){materialKeys[id]=f.materialKey?.(x,y);baseColors[id]=f.materialColor?.(id);}
      if(positions){const p=f.worldPosition(x,y);if(!p||p.length!==3||!p.every(Number.isFinite))throw new TypeError('Invalid world position');positions.set(p,i*3);}
    }
  }
  return {size:f.w,seed:f.seed,color:f.color,normal:f.normal,owners,positions,worldFromClip:f.worldFromClip,geometry,materialKeys,baseColors};
}
export function drawTranslucentTape(p,f){
  if(typeof f.prepare!=='function')throw new TypeError('Tape requires the existing frame preparation cache');
  // The raw-identity/seed-keyed two-slot frame cache owns the compact plan. Density
  // deliberately stays out of the key: one retained piece history replays at any
  // global stock density. No capture/source/geometry arrays remain in this cache.
  const plan=f.prepare('translucent-tape',()=>planTranslucentTape(tapeSourceFromFrame(f)));
  const rgba=composeTape(plan,{intensity:f.intensity});
  p.loadPixels();if(p.pixels.length!==rgba.length)throw new Error('Tape rendering requires pixel density 1');p.pixels.set(rgba);p.updatePixels();
}
export const translucentTapeStudy={
  id:'translucent-tape',name:'Translucent tape',family:'Cut & assembly',
  offThread:true,reference:'https://www.markkhaisman.com/human-nature-wells',
  title:'Light through layers.',control:'Film density',
  medium:'Translucent tape / luminous backing',swatch:'#aa753b',category:'FINITE STRIP ASSEMBLY',
  description:'Finite overlapping amber strips construct tone on a luminous backing. Film density deepens the same retained pieces while clear cuts preserve highlights and openings.',
  mechanism:'Constant stock transmission × local geometric overlap · finite seeded pieces · geometry-supported cuts · coherent clear reserves. Authored display-RGB optical approximation.',
  referenceLabel:'Mark Khaisman / tape drawings',draw:drawTranslucentTape,
};
export default translucentTapeStudy;

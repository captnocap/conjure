/**
 * Atelier proof-of-concept atlas, drawn from scratch 2026-10-07.
 * Every coordinate below is original; no font file, font engine, traced glyph,
 * artwork or third-party bitmap is included. ASCII labels describe these shapes.
 * Released with this prototype under CC0-1.0. Stable list order resolves ties.
 * Coordinates occupy an 8 × 12 unit upright character cell. No glyph rotation.
 */
export const ATLAS_PROVENANCE = Object.freeze({
  title: 'Atelier typed-contour atlas 1', author: 'Original procedural artwork for Atelier',
  date: '2026-10-07', license: 'CC0-1.0', source: 'The explicit polylines in glyph-atlas.js',
  fontDependencies: 0, cell: [8, 12],
});
const path = (...p) => p;
export const GLYPHS = Object.freeze([
  ['-', [path([.8,5.5],[6.7,5.5])]],
  ['_', [path([.8,10],[6.7,10])]],
  ['|', [path([3.5,.7],[3.5,10.5])]],
  ['/', [path([.9,10.5],[6.6,.7])]],
  ['\\', [path([.9,.7],[6.6,10.5])]],
  ['(', [path([5.4,.7],[3.2,2.4],[2.2,5.5],[3.2,8.8],[5.4,10.5])]],
  [')', [path([2,.7],[4.2,2.4],[5.2,5.5],[4.2,8.8],[2,10.5])]],
  ['[', [path([5.8,.7],[2.2,.7],[2.2,10.5],[5.8,10.5])]],
  [']', [path([1.5,.7],[5.2,.7],[5.2,10.5],[1.5,10.5])]],
  ['<', [path([6,1.7],[1.4,5.5],[6,9.4])]],
  ['>', [path([1.4,1.7],[6,5.5],[1.4,9.4])]],
  ['{', [path([5.6,.7],[3.5,1.3],[3.1,4],[1.6,5.5],[3.1,7],[3.5,9.8],[5.6,10.5])]],
  ['}', [path([1.8,.7],[3.9,1.3],[4.3,4],[5.8,5.5],[4.3,7],[3.9,9.8],[1.8,10.5])]],
  ['+', [path([.8,5.5],[6.6,5.5]),path([3.7,1.5],[3.7,9.5])]],
  ['=', [path([.8,3.5],[6.6,3.5]),path([.8,7.5],[6.6,7.5])]],
  [':', [path([3.5,3],[3.5,3.4]),path([3.5,8],[3.5,8.4])]],
  ['.', [path([3.5,9.6],[3.5,10])]],
  ["'", [path([3.8,1.2],[3.2,3.1])]],
  [',', [path([4.1,8.5],[3.5,10.5],[2.5,11])]],
  ['^', [path([1.1,5.8],[3.7,1.6],[6.4,5.8])]],
  ['v', [path([1,4.5],[3.7,10],[6.4,4.5])]],
  ['L', [path([1.5,.9],[1.5,10],[6.3,10])]],
  ['T', [path([.8,1],[6.6,1]),path([3.7,1],[3.7,10.5])]],
  ['Y', [path([.8,.9],[3.7,5.3],[6.6,.9]),path([3.7,5.3],[3.7,10.5])]],
  ['V', [path([.9,.9],[3.7,10.5],[6.5,.9])]],
  ['X', [path([1,.9],[6.4,10.5]),path([6.4,.9],[1,10.5])]],
  ['x', [path([1.2,4],[6.2,10]),path([6.2,4],[1.2,10])]],
  ['I', [path([1.2,1],[6.2,1]),path([3.7,1],[3.7,10]),path([1.2,10],[6.2,10])]],
  ['J', [path([2,1],[6,1],[6,7.6],[5,9.8],[3,10.5],[1.2,9])]],
  ['C', [path([6.3,2],[4.7,.8],[2.4,1.1],[1.2,3],[1,7.8],[2.5,10],[4.8,10.4],[6.3,9])]],
  ['O', [path([3.7,.8],[1.5,2],[.8,5.5],[1.5,9],[3.7,10.4],[5.9,9],[6.6,5.5],[5.9,2],[3.7,.8])]],
  ['U', [path([1.1,.9],[1.1,7.5],[2.2,9.8],[3.7,10.4],[5.2,9.8],[6.3,7.5],[6.3,.9])]],
  ['n', [path([1.2,10],[1.2,4]),path([1.2,6],[2.6,4.3],[4.5,4],[6,5.6],[6,10])]],
  ['u', [path([1.2,4],[1.2,8.5],[2.6,10],[4.5,9.7],[6,8]),path([6,4],[6,10])]],
  ['r', [path([1.5,10],[1.5,4.2]),path([1.5,6],[3.2,4.2],[5.9,4.3])]],
  ['c', [path([6,4.9],[4.5,4],[2.5,4.4],[1.1,6.8],[1.8,9],[3.4,10],[5.8,9.4])]],
  ['o', [path([3.7,4],[1.7,4.9],[1.1,7],[1.7,9.3],[3.7,10.1],[5.7,9.3],[6.3,7],[5.7,4.9],[3.7,4])]],
  ['s', [path([5.9,4.7],[4.3,4],[2.3,4.5],[1.6,5.8],[2.8,7],[4.8,7.2],[6,8.6],[5,9.9],[2.8,10.1],[1.3,9.3])]],
  ['z', [path([1.2,4.3],[6.1,4.3],[1.2,10],[6.1,10])]],
  ['t', [path([3.3,1.7],[3.3,8.9],[4.2,10],[6,9.6]),path([1,4],[5.8,4])]],
  ['H', [path([1,.9],[1,10.5]),path([6.4,.9],[6.4,10.5]),path([1,5.5],[6.4,5.5])]],
  ['*', [path([3.7,2],[3.7,9]),path([.8,3.8],[6.6,7.6]),path([6.6,3.8],[.8,7.6])]],
].map(([label,paths],index) => Object.freeze({ label, paths, index })));
export const CELL_W=8,CELL_H=12,PAD=4,PATCH_W=16,PATCH_H=20;
export const OFFSETS = Object.freeze([[0,0],[-2,0],[2,0],[0,-3],[0,3],[-2,-3],[2,-3],[-2,3],[2,3]]);
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
export function lineDistance(x,y,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;
  const t=l?clamp(((x-a[0])*dx+(y-a[1])*dy)/l,0,1):0;
  return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
}
export function glyphDistance(glyph,x,y) {
  let distance=100;
  for(const p of glyph.paths) for(let i=1;i<p.length;i++) distance=Math.min(distance,lineDistance(x,y,p[i-1],p[i]));
  return distance;
}
// Small, immutable 42 × 9 × 320-byte matching atlas. Render coverage samples these quantized distance masks.
export const VARIANTS = Object.freeze(GLYPHS.flatMap(glyph=>OFFSETS.map(([dx,dy],shift)=>{
  const distance=new Uint8Array(PATCH_W*PATCH_H),core=[],ink=[];
  for(let y=0;y<PATCH_H;y++)for(let x=0;x<PATCH_W;x++){
    const d=glyphDistance(glyph,x-PAD+.5-dx,y-PAD+.5-dy),i=y*PATCH_W+x;
    distance[i]=Math.round(Math.min(7.9,d)*16);
    if(d<.8)ink.push(i);
    if(x>=PAD&&x<PAD+CELL_W&&y>=PAD&&y<PAD+CELL_H&&d<.8)core.push(i);
  }
  return Object.freeze({glyph:glyph.index,shift,dx,dy,distance,ink:Uint16Array.from(ink),core:Uint16Array.from(core)});
})));

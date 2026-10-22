/** Original portable float64 implementation of the frozen MODEL.json.
 * No DOM, Node APIs, imported algorithm, randomness, controls, or tuning API.
 * Source provenance: actual Three r180/Mesa RGBA; this is a CPU reconstruction.
 */
export const CONTRACT = Object.freeze({width:720, output:120, cell:6, paletteBudget:24, maxIterations:64, maxSeconds:240, modelSHA256:'f6df22f483fb09c31064748e9b08c8524422462965955fd900bb3a28bd79e159'});
const D=6/29, D2=D*D, D3=D2*D;
const DECODE=Float64Array.from({length:256},(_,i)=>{const c=i/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
const MI=[3.2404548360214087,-1.5371388501025751,-.498531546868481,-.9692663898756538,1.876010928842491,.041556082346673545,.05564341960421367,-.20402585426769818,1.057225162457929];
const clock=()=>performance.now();
export function validateSource(source,width=CONTRACT.width){
 if (!(source instanceof Uint8Array || source instanceof Uint8ClampedArray)) throw new TypeError('Source must be an unsigned RGBA8 typed array');
 if(source.length!==width*width*4) throw new RangeError(`Source must contain exactly ${width*width*4} bytes`);
 if(typeof SharedArrayBuffer!=='undefined' && source.buffer instanceof SharedArrayBuffer) throw new TypeError('Shared source buffers cannot guarantee a coherent snapshot');
 for(let i=3;i<source.length;i+=4) if(source[i]!==255) throw new RangeError('Source alpha must be opaque');
}
function rgbLab(r,g,b,out,at=0){
 r=DECODE[r];g=DECODE[g];b=DECODE[b];
 let x=(r*.4124564+g*.3575761+b*.1804375)/.95047;
 let y=r*.2126729+g*.7151522+b*.0721750;
 let z=(r*.0193339+g*.1191920+b*.9503041)/1.08883;
 x=x>D3?Math.cbrt(x):x/(3*D2)+4/29;y=y>D3?Math.cbrt(y):y/(3*D2)+4/29;z=z>D3?Math.cbrt(z):z/(3*D2)+4/29;
 out[at]=116*y-16;out[at+1]=500*(x-y);out[at+2]=200*(y-z);
}
function nearest(points,palette,out=new Int32Array(points.length/3)){
 for(let i=0;i<out.length;i++){let best=Infinity,chosen=0;const j=i*3;
  for(let k=0;k<palette.length;k+=3){const a=points[j]-palette[k],b=points[j+1]-palette[k+1],c=points[j+2]-palette[k+2];const distance=a*a+b*b+c*c;if(distance<best){best=distance;chosen=k/3;}}
  out[i]=chosen;
 }return out;
}
function paletteUpdate(points,weights,palette){
 const ids=nearest(points,palette),masses=new Float64Array(palette.length/3),sums=new Float64Array(palette.length),updated=palette.slice();
 for(let i=0;i<ids.length;i++){const k=ids[i],w=weights?weights[i]:1,j=i*3;masses[k]+=w;sums[k*3]+=points[j]*w;sums[k*3+1]+=points[j+1]*w;sums[k*3+2]+=points[j+2]*w;}
 for(let k=0;k<masses.length;k++)if(masses[k]>0)for(let c=0;c<3;c++)updated[k*3+c]=sums[k*3+c]/masses[k];
 return updated;
}
function maxDistance(a,b,channels){let max=0;for(let i=0;i<a.length;i+=channels){let sum=0;for(let c=0;c<channels;c++){const d=a[i+c]-b[i+c];sum+=d*d;}max=Math.max(max,Math.sqrt(sum));}return max;}
function histogram(source,check){
 // Sorted bounded packed RGB list avoids unbounded object/hash table overhead.
 const keys=new Uint32Array(source.length/4);for(let i=0;i<keys.length;i++){const j=i*4;keys[i]=(source[j]<<16)|(source[j+1]<<8)|source[j+2];if((i&8191)===0)check();}
 keys.sort();check();let unique=0;for(let i=0;i<keys.length;i++)if(i===0||keys[i]!==keys[i-1])unique++;
 const points=new Float64Array(unique*3),weights=new Uint32Array(unique);let k=-1;
 for(let i=0;i<keys.length;i++){if(i===0||keys[i]!==keys[i-1]){k++;rgbLab(keys[i]>>>16,(keys[i]>>>8)&255,keys[i]&255,points,k*3);}weights[k]++;if((i&8191)===0)check();}
 return {points,weights,unique};
}
function medianPalette(points,weights,budget,check){
 function stats(ids){const mean=[0,0,0],variance=[0,0,0];let mass=0;for(const i of ids){const w=weights[i];mass+=w;for(let c=0;c<3;c++)mean[c]+=points[i*3+c]*w;}for(let c=0;c<3;c++)mean[c]/=mass;
  for(const i of ids)for(let c=0;c<3;c++){const d=points[i*3+c]-mean[c];variance[c]+=d*d*weights[i];}return {mean,variance};}
 const boxes=[Uint32Array.from({length:weights.length},(_,i)=>i)];
 while(boxes.length<budget){check();let chosen=0,best=-Infinity,chosenStats;
  for(let b=0;b<boxes.length;b++){const st=stats(boxes[b]),score=boxes[b].length>1?st.variance[0]+st.variance[1]+st.variance[2]:-1;if(score>best){best=score;chosen=b;chosenStats=st;}}
  if(best<0)break;let axis=0;for(let c=1;c<3;c++)if(chosenStats.variance[c]>chosenStats.variance[axis])axis=c;
  // TypedArray.sort is specified stable; equal channel values retain inherited order.
  const ids=boxes[chosen];ids.sort((a,b)=>points[a*3+axis]-points[b*3+axis]);let mass=0;for(const i of ids)mass+=weights[i];let cumulative=0,cut=0;while(cut<ids.length&&cumulative<mass/2)cumulative+=weights[ids[cut++]];cut=Math.min(Math.max(cut,1),ids.length-1);
  boxes.splice(chosen,1,ids.slice(0,cut),ids.slice(cut));
 }
 const palette=new Float64Array(boxes.length*3);for(let b=0;b<boxes.length;b++)palette.set(stats(boxes[b]).mean,b*3);return palette;
}
function initializePalette(source,check){const {points,weights,unique}=histogram(source,check);let palette=medianPalette(points,weights,24,check);const history=[];
 for(let step=0;step<16;step++){check();const next=paletteUpdate(points,weights,palette),delta=maxDistance(next,palette,3);palette=next;history.push(delta);if(delta<=1e-7)break;}return {palette,history,unique};}
function regionStats(lab,labels,width,count,oldMeans,oldCenters){
 const masses=new Uint32Array(count),means=new Float64Array(count*3),centers=new Float64Array(count*2);
 for(let y=0,p=0;y<width;y++)for(let x=0;x<width;x++,p++){const k=labels[p],j=p*3;masses[k]++;means[k*3]+=lab[j];means[k*3+1]+=lab[j+1];means[k*3+2]+=lab[j+2];centers[k*2]+=x;centers[k*2+1]+=y;}
 for(let k=0;k<count;k++){if(masses[k]){for(let c=0;c<3;c++)means[k*3+c]/=masses[k];centers[k*2]/=masses[k];centers[k*2+1]/=masses[k];}else{means.set(oldMeans.subarray(k*3,k*3+3),k*3);centers.set(oldCenters.subarray(k*2,k*2+2),k*2);}}
 return {means,centers,masses};
}
function latticeCenters(raw,original,old,masses,n,width,check){const centers=new Float64Array(raw.length);
 for(let y=0;y<n;y++){check();for(let x=0;x<n;x++){const k=y*n+x,p=k*2;if(masses[k]===0){centers[p]=old[p];centers[p+1]=old[p+1];continue;}let sx=0,sy=0,neighbors=0;
  for(const q of [y>0?k-n:-1,x>0?k-1:-1,x<n-1?k+1:-1,y<n-1?k+n:-1])if(q>=0){sx+=raw[q*2]-original[q*2];sy+=raw[q*2+1]-original[q*2+1];neighbors++;}
  let cx=.6*raw[p]+.4*(original[p]+(neighbors?sx/neighbors:0)),cy=.6*raw[p+1]+.4*(original[p+1]+(neighbors?sy/neighbors:0));
  const dx=cx-original[p],dy=cy-original[p+1],length=Math.sqrt(dx*dx+dy*dy),scale=Math.min(1,3/Math.max(length,1e-300));
  centers[p]=Math.min(width-1,Math.max(0,original[p]+dx*scale));centers[p+1]=Math.min(width-1,Math.max(0,original[p+1]+dy*scale));
 }}return centers;}
function smoothColors(means,n,check){const result=new Float64Array(means.length);
 for(let y=0;y<n;y++){check();for(let x=0;x<n;x++){const p=(y*n+x)*3;let a=0,b=0,c=0,mass=0;
  for(let dy=-1;dy<=1;dy++){const yy=y+dy;if(yy<0||yy>=n)continue;for(let dx=-1;dx<=1;dx++){const xx=x+dx;if(xx<0||xx>=n)continue;const q=(yy*n+xx)*3,da=means[p]-means[q],db=means[p+1]-means[q+1],dc=means[p+2]-means[q+2],w=Math.exp(-(dx*dx+dy*dy)/2-(da*da+db*db+dc*dc)/128);a+=means[q]*w;b+=means[q+1]*w;c+=means[q+2]*w;mass+=w;}}
  result[p]=a/mass;result[p+1]=b/mass;result[p+2]=c/mass;
 }}return result;}
function assign(lab,centers,palette,paletteIDs,width,n,check){const labels=new Int32Array(width*width);let totalDistance=0;
 for(let y=0,p=0;y<width;y++){check();const gy=Math.floor(y/6);for(let x=0;x<width;x++,p++){const gx=Math.floor(x/6),lp=p*3;let best=Infinity,chosen=-1;
  for(let dy=-1;dy<=1;dy++){const yy=gy+dy;if(yy<0||yy>=n)continue;for(let dx=-1;dx<=1;dx++){const xx=gx+dx;if(xx<0||xx>=n)continue;const k=yy*n+xx,kp=paletteIDs[k]*3;
   const da=lab[lp]-palette[kp],db=lab[lp+1]-palette[kp+1],dc=lab[lp+2]-palette[kp+2],px=x-centers[k*2],py=y-centers[k*2+1];
   const distance=Math.sqrt(da*da+db*db+dc*dc)+45*Math.sqrt(px*px+py*py)/6;
   if(distance<best){best=distance;chosen=k;}
  }}if(chosen<0||!Number.isFinite(best))throw new Error('HOLD: invalid source assignment');labels[p]=chosen;totalDistance+=best;
 }}return {labels,meanDistance:totalDistance/labels.length};}
function fit(source,width,n,palette,check,onIteration,observeState){
 const started=clock(),count=n*n,lab=new Float64Array(width*width*3),original=new Float64Array(count*2);let means=new Float64Array(count*3),centers,labels=new Int32Array(width*width);
 for(let y=0,p=0;y<width;y++){check();for(let x=0;x<width;x++,p++){const q=p*4;rgbLab(source[q],source[q+1],source[q+2],lab,p*3);const k=Math.floor(y/6)*n+Math.floor(x/6);labels[p]=k;}}
 // Same row-major nominal block mean, with sequential source sums per block.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=y*n+x;original[k*2]=x*6+2.5;original[k*2+1]=y*6+2.5;for(let dy=0;dy<6;dy++)for(let dx=0;dx<6;dx++){const p=((y*6+dy)*width+x*6+dx)*3;for(let c=0;c<3;c++)means[k*3+c]+=lab[p+c];}for(let c=0;c<3;c++)means[k*3+c]/=36;}
 centers=original.slice();let filtered=means.slice(),paletteIDs=nearest(filtered,palette),masses=new Uint32Array(count).fill(36),stable=0,converged=false;const diagnostics=[];
 observeState?.(0,{labels,means,filtered,centers,original_centers:original,palette,palette_ids:paletteIDs,masses},diagnostics);
 for(let iteration=1;iteration<=64;iteration++){
  check();const assigned=assign(lab,centers,palette,paletteIDs,width,n,check),stats=regionStats(lab,assigned.labels,width,count,means,centers);check();
  const nextCenters=latticeCenters(stats.centers,original,centers,stats.masses,n,width,check),nextFiltered=smoothColors(stats.means,n,check),nextPalette=paletteUpdate(nextFiltered,null,palette),nextIDs=nearest(nextFiltered,nextPalette);
  let changed=0,colorsChanged=0,empty=0,smallest=Infinity,largest=0,total=0,displacementSum=0,displacementMax=0;
  for(let i=0;i<labels.length;i++)if(assigned.labels[i]!==labels[i])changed++;
  for(let k=0;k<count;k++){if(nextIDs[k]!==paletteIDs[k])colorsChanged++;const m=stats.masses[k];total+=m;if(m===0)empty++;else smallest=Math.min(smallest,m);largest=Math.max(largest,m);const dx=nextCenters[k*2]-original[k*2],dy=nextCenters[k*2+1]-original[k*2+1],disp=Math.sqrt(dx*dx+dy*dy);displacementSum+=disp;displacementMax=Math.max(displacementMax,disp);}
  if(displacementMax>3+1e-10||total!==width*width)throw new Error('HOLD: invalid region bounds or coverage');
  for(const array of [stats.means,nextCenters,nextFiltered,nextPalette])for(const value of array)if(!Number.isFinite(value))throw new Error('HOLD: nonfinite state');
  const colorDelta=maxDistance(nextPalette,palette,3),centerDelta=maxDistance(nextCenters,centers,2);
  const diagnostic={iteration,source_labels_changed:changed,palette_labels_changed:colorsChanged,max_center_update_px:centerDelta,max_color_update_Lab:colorDelta,max_center_displacement_px:displacementMax,mean_center_displacement_px:displacementSum/count,empty_regions:empty,smallest_nonempty_region:smallest,largest_region:largest,mean_assignment_distance:assigned.meanDistance,seconds:(clock()-started)/1000};diagnostics.push(diagnostic);
  labels=assigned.labels;centers=nextCenters;means=stats.means;filtered=nextFiltered;palette=nextPalette;paletteIDs=nextIDs;masses=stats.masses;
  stable=changed===0&&colorsChanged===0&&centerDelta<=1e-7&&colorDelta<=1e-7?stable+1:0;
  observeState?.(iteration,{labels,means,filtered,centers,original_centers:original,palette,palette_ids:paletteIDs,masses},diagnostics);
  onIteration?.({...diagnostic});check(); // Guard/cancellation also precede a successful convergence break.
  if(stable>=2){converged=true;break;}
 }
 return {palette,palette_ids:paletteIDs,labels,means,filtered,centers,original_centers:original,masses,diagnostics,converged};
}
function emitPalette(palette){const rgb=new Uint8Array(palette.length);let low=0,high=0;
 for(let k=0;k<palette.length;k+=3){const fy=(palette[k]+16)/116,f=[fy+palette[k+1]/500,fy,fy-palette[k+2]/200],white=[.95047,1,1.08883];for(let c=0;c<3;c++)f[c]=(f[c]>D?f[c]**3:3*D2*(f[c]-4/29))*white[c];
  for(let c=0;c<3;c++){let v=f[0]*MI[c*3]+f[1]*MI[c*3+1]+f[2]*MI[c*3+2];if(v<0)low++;if(v>1)high++;v=Math.max(0,Math.min(1,v));v=v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;rgb[k+c]=Math.floor(v*255+.5);}}
 return {rgb,preclip_low_channels:low,preclip_high_channels:high};}
function enlarge(rgba,n,factor){const width=n*factor,output=new Uint8Array(width*width*4);for(let y=0;y<width;y++)for(let x=0;x<width;x++){const src=(Math.floor(y/factor)*n+Math.floor(x/factor))*4,dst=(y*width+x)*4;output[dst]=rgba[src];output[dst+1]=rgba[src+1];output[dst+2]=rgba[src+2];output[dst+3]=255;}return output;}
function run(source,width,n,{checkpoint,onIteration,includeState=false}={},observeState){
 const start=clock();validateSource(source,width);const snapshot=new Uint8Array(source);let stage='initialization',lastState=null,lastCompletedIteration=0,lastDiagnostics=[];
 const check=()=>{checkpoint?.();if(clock()-start>240000){const error=new Error('HOLD: frozen 240-second wall guard');error.code='PIXEL_CLUSTER_WALL_GUARD';error.failure={stage,lastCompletedIteration,diagnostics:lastDiagnostics.map(d=>({...d})),sourceRGBA:snapshot,state:lastState};throw error;}};check();
 const init=initializePalette(snapshot,check),initDone=clock();stage='fitting';
 const state=fit(snapshot,width,n,init.palette,check,onIteration,(iteration,values,diagnostics)=>{lastState=values;lastCompletedIteration=iteration;lastDiagnostics=diagnostics;observeState?.(iteration,values);}),fitDone=clock();stage='emission';
 const emitted=emitPalette(state.palette),emittedLab=new Float64Array(emitted.rgb.length);for(let k=0;k<emitted.rgb.length;k+=3)rgbLab(emitted.rgb[k],emitted.rgb[k+1],emitted.rgb[k+2],emittedLab,k);
 const ids=nearest(state.filtered,emittedLab),rgba=new Uint8Array(n*n*4);for(let i=0;i<ids.length;i++){const k=ids[i]*3;rgba[i*4]=emitted.rgb[k];rgba[i*4+1]=emitted.rgb[k+1];rgba[i*4+2]=emitted.rgb[k+2];rgba[i*4+3]=255;}
 const large=enlarge(rgba,n,6);check();if(source.length!==snapshot.length)throw new Error('HOLD: source mutated or detached during computation');for(let i=0;i<source.length;i++)if(source[i]!==snapshot[i])throw new Error('HOLD: source mutated during computation');
 const result={rgba120:rgba,rgba720:large,paletteRGB:emitted.rgb,iterations:state.diagnostics.length,converged:state.converged,diagnostics:state.diagnostics,gamut:{preclip_low_channels:emitted.preclip_low_channels,preclip_high_channels:emitted.preclip_high_channels},initialization:{uniqueColors:init.unique,history:init.history},timings:{initializeMs:initDone-start,fitMs:fitDone-initDone,totalMs:clock()-start}};
 if(includeState)result.state={...state,initial_palette:init.palette,emitted_ids:ids};return result;
}
export function renderPixelCluster(sourceRGBA,options){return run(sourceRGBA,720,120,options);}
// Deliberately named test surface; fixed production entry above exposes no image parameters.
export const testing=Object.freeze({renderWithStateObserver(source,observeState){return run(source,720,120,{},observeState);},rgbLab,nearest,paletteUpdate,medianPalette,regionStats,latticeCenters,smoothColors,assign,emitPalette,enlarge,runSmall(source,width,options){if(!Number.isInteger(width)||width<6||width>720||width%6)throw new RangeError('Fixture width must be a multiple of six');return run(source,width,width/6,options);}});

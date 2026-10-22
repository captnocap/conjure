/** Extracted original floating-point paint primitives, plus bounded admission. */
export const VERSION='curved-paint-budgeted-1';
export const CONFIG=Object.freeze({radii:Object.freeze([16,8,4,2]),budgets:Object.freeze([2025,4096,8192,16384]),background:Object.freeze([237,231,212]),threshold:.07,minSize:1,maxSize:720,maxWork:600000000,maxBytes:64*1024*1024,maxAdvances:16,minAdvances:4,smoothing:.75,gradientEpsilon:1e-6,subdivisions:4});
export const hash32=v=>{v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return(v^(v>>>16))>>>0;};
const d3=(a,b,c)=>Math.sqrt((a*a+b*b+c*c)/3)/255;
export function blank(out){for(let i=0;i<out.length;i+=4){out[i]=237;out[i+1]=231;out[i+2]=212;out[i+3]=255;}}
function shuffle(indices,n,seed){let state=seed>>>0;for(let i=n-1;i>0;i--){state=hash32(state+0x9e3779b9);const j=state%(i+1),v=indices[i];indices[i]=indices[j];indices[j]=v;}}
export function blur(source,w,h,r,tmp,ref,kernelBuffer){
 const sigma=r*.5,kr=Math.ceil(3*sigma),kernel=kernelBuffer.subarray(0,2*kr+1);for(let k=-kr;k<=kr;k++)kernel[k+kr]=Math.exp(-k*k/(2*sigma*sigma));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let red=0,green=0,blue=0,weight=0;for(let k=-kr;k<=kr;k++){const xx=x+k;if(xx<0||xx>=w)continue;const q=kernel[k+kr],s=(y*w+xx)*4;red+=q*source[s];green+=q*source[s+1];blue+=q*source[s+2];weight+=q;}const i=(y*w+x)*3;tmp[i]=red/weight;tmp[i+1]=green/weight;tmp[i+2]=blue/weight;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let red=0,green=0,blue=0,weight=0;for(let k=-kr;k<=kr;k++){const yy=y+k;if(yy<0||yy>=h)continue;const q=kernel[k+kr],s=(yy*w+x)*3;red+=q*tmp[s];green+=q*tmp[s+1];blue+=q*tmp[s+2];weight+=q;}const i=(y*w+x)*3;ref[i]=red/weight;ref[i+1]=green/weight;ref[i+2]=blue/weight;}
}
export function gradients(ref,w,h,luma,gx,gy){
 for(let i=0;i<w*h;i++)luma[i]=(.2126*ref[i*3]+.7152*ref[i*3+1]+.0722*ref[i*3+2])/255;
 const at=(x,y)=>luma[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;gx[i]=(at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1)-at(x-1,y-1)-2*at(x-1,y)-at(x-1,y+1))/8;gy[i]=(at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1)-at(x-1,y-1)-2*at(x,y-1)-at(x+1,y-1))/8;}
}
export function residual(entry,ref,error){let sum=0;for(let i=0;i<error.length;i++){const a=i*4,b=i*3;const e=d3(entry[a]-ref[b],entry[a+1]-ref[b+1],entry[a+2]-ref[b+2]);error[i]=e;sum+=e;}return sum/error.length;}
const bilinear=(a,x,y,w,h,stride=1,ch=0)=>{x=Math.max(0,Math.min(w-1,x-.5));y=Math.max(0,Math.min(h-1,y-.5));const ix=Math.floor(x),iy=Math.floor(y),xx=Math.min(w-1,ix+1),yy=Math.min(h-1,iy+1),u=x-ix,v=y-iy;return(1-v)*((1-u)*a[(iy*w+ix)*stride+ch]+u*a[(iy*w+xx)*stride+ch])+v*((1-u)*a[(yy*w+ix)*stride+ch]+u*a[(yy*w+xx)*stride+ch]);};
export function trace(seed,r,w,h,ref,entry,gx,gy,points,offset,color){
 let x=seed%w+.5,y=Math.floor(seed/w)+.5,dx=0,dy=0,n=1,reason='max';points[offset]=x;points[offset+1]=y;
 for(let advance=0;advance<16;advance++){
  const rr=bilinear(ref,x,y,w,h,3,0),gg=bilinear(ref,x,y,w,h,3,1),bb=bilinear(ref,x,y,w,h,3,2);
  if(advance>=4&&d3(rr-bilinear(entry,x,y,w,h,4,0),gg-bilinear(entry,x,y,w,h,4,1),bb-bilinear(entry,x,y,w,h,4,2))<d3(rr-color[0],gg-color[1],bb-color[2])){reason='paint';break;}
  let tx=-bilinear(gy,x,y,w,h),ty=bilinear(gx,x,y,w,h);const mag=Math.hypot(tx,ty);if(mag<=CONFIG.gradientEpsilon){reason='zero';break;}tx/=mag;ty/=mag;
  if(advance){if(tx*dx+ty*dy<0){tx=-tx;ty=-ty;}tx=.75*tx+.25*dx;ty=.75*ty+.25*dy;const norm=Math.hypot(tx,ty);tx/=norm;ty/=norm;}
  dx=tx;dy=ty;const nx=Math.fround(x+r*dx),ny=Math.fround(y+r*dy);if(!Number.isFinite(nx)||!Number.isFinite(ny)||Math.abs(nx-x)>r+1/1024||Math.abs(ny-y)>r+1/1024)throw Error('Curved paint control-step bound exceeded');if(nx<0||nx>=w||ny<0||ny>=h){reason='boundary';break;}x=nx;y=ny;points[offset+n*2]=x;points[offset+n*2+1]=y;n++;
 }
 return {n,reason};
}
/** Clamped uniform cubic B-spline; four fixed subdivisions per knot span. */
export function flatten(points,offset,n,out){if(n===1){out[0]=points[offset];out[1]=points[offset+1];return 1;}let count=0;const at=(k,ch)=>points[offset+2*Math.max(0,Math.min(n-1,k))+ch];for(let span=-2;span<n-1;span++){for(let step=span===-2?0:1;step<=4;step++){const t=step/4,t2=t*t,t3=t2*t;const a=(1-3*t+3*t2-t3)/6,b=(4-6*t2+3*t3)/6,c=(1+3*t+3*t2-3*t3)/6,d=t3/6;for(let ch=0;ch<2;ch++)out[count*2+ch]=Math.fround(a*at(span,ch)+b*at(span+1,ch)+c*at(span+2,ch)+d*at(span+3,ch));count++;}}return count;}
export class Raster{
 constructor(w,h,arena){this.w=w;this.h=h;this.alpha=arena.alloc(Uint8Array,w*h,'stroke union coverage');this.touched=arena.alloc(Int32Array,w*h,'stroke touched indices');this.line=arena.alloc(Float32Array,160,'bounded flattened spline');this.work=0;this.segments=0;this.commits=0;this.distanceEvaluations=0;this.boxVisits=0;}
 stroke(canvas,provenance,covered,plan,k,straight=false){
  if(!Number.isInteger(k)||k<0||!CONFIG.radii.includes(plan.radii[k])||!Number.isInteger(plan.lengths[k])||plan.lengths[k]<1||plan.lengths[k]>17)throw Error('Curved paint stroke record is invalid');
  const w=this.w,h=this.h,r=plan.radii[k],n=flatten(plan.points,k*34,plan.lengths[k],this.line),line=this.line;let len=0;for(let s=1;s<n;s++)len+=Math.hypot(line[2*s]-line[2*s-2],line[2*s+1]-line[2*s-1]);
  if(straight&&n>1){let dx=plan.points[k*34+2]-plan.points[k*34],dy=plan.points[k*34+3]-plan.points[k*34+1];const m=Math.hypot(dx,dy);dx/=m;dy/=m;const x=line[0],y=line[1];for(let s=1;s<n;s++){line[2*s]=Math.fround(x+dx*len*s/(n-1));line[2*s+1]=Math.fround(y+dy*len*s/(n-1));}}
  const alpha=this.alpha,touched=this.touched;let used=0;const pad=r+.5,inner=(r-.5)**2,outer=pad*pad;
  for(let s=0;s<Math.max(1,n-1);s++){
   const ax=line[s*2],ay=line[s*2+1],bx=n===1?ax:line[s*2+2],by=n===1?ay:line[s*2+3],dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
   if(!Number.isFinite(ax)||!Number.isFinite(ay)||!Number.isFinite(bx)||!Number.isFinite(by)||Math.abs(dx)>r/4+1/512||Math.abs(dy)>r/4+1/512)throw Error('Curved paint flattened-step bound exceeded');
   const x0=Math.max(0,Math.ceil(Math.min(ax,bx)-pad-.5)),x1=Math.min(w-1,Math.floor(Math.max(ax,bx)+pad-.5)),y0=Math.max(0,Math.ceil(Math.min(ay,by)-pad-.5)),y1=Math.min(h-1,Math.floor(Math.max(ay,by)+pad-.5));
   const evaluations=Math.max(0,x1-x0+1)*Math.max(0,y1-y0+1);this.work+=evaluations;this.segments++;if(this.work>CONFIG.maxWork)throw Error('Curved paint segment-box visit bound exceeded');this.boxVisits+=evaluations;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x;if(alpha[i]===255)continue;this.distanceEvaluations++;const px=x+.5-ax,py=y+.5-ay,t=l2?Math.max(0,Math.min(1,(px*dx+py*dy)/l2)):0,ddx=px-t*dx,ddy=py-t*dy,dist=ddx*ddx+ddy*ddy;if(dist>=outer)continue;const a=dist<=inner?255:Math.round(255*(pad-Math.sqrt(dist)));if(a>alpha[i]){if(!alpha[i])touched[used++]=i;alpha[i]=a;}}
  }
  const red=plan.colors[k*3],green=plan.colors[k*3+1],blue=plan.colors[k*3+2];
  for(let j=0;j<used;j++){const i=touched[j],a=alpha[i],o=i*4;canvas[o]=Math.round((red*a+canvas[o]*(255-a))/255);canvas[o+1]=Math.round((green*a+canvas[o+1]*(255-a))/255);canvas[o+2]=Math.round((blue*a+canvas[o+2]*(255-a))/255);if(a>=128){provenance[i]=r;covered[i]=1;}alpha[i]=0;}this.commits+=used;
 }
}

/** Exact logical typed allocation accounting. All render buffers allocate once. */
class Arena {
 constructor(){this.bytes=0;this.allocations=[];}
 alloc(Type,n,name){
  if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid typed allocation');
  const bytes=n*Type.BYTES_PER_ELEMENT;
  if(this.bytes+bytes>CONFIG.maxBytes)throw Error('Curved paint 64 MiB owned typed bound exceeded');
  const value=new Type(n);this.bytes+=value.byteLength;this.allocations.push({name,bytes});return value;
 }
}

/** Mean residual determines cell eligibility; strict max keeps row-major seed ties.
 *  These arrays are render-local and reused across layers. No candidate objects.
 */
export function collectEligible(error,w,h,r,forced,seeds,scores){
 const nx=Math.ceil(w/r),ny=Math.ceil(h/r);let eligible=0;
 for(let cy=0;cy<ny;cy++)for(let cx=0;cx<nx;cx++){
  let sum=0,best=-1,max=-1,count=0;
  for(let y=cy*r;y<Math.min(h,(cy+1)*r);y++)for(let x=cx*r;x<Math.min(w,(cx+1)*r);x++){
   const i=y*w+x,e=error[i];sum+=e;count++;if(e>max){max=e;best=i;}
  }
  const mean=sum/count;
  if(mean>CONFIG.threshold||forced){seeds[eligible]=best;scores[eligible]=mean;eligible++;}
 }
 return eligible;
}

/** Bounded worst-first heap, then index order. Scores are Float64 means of the
 *  original Float32 per-pixel residual, not maximum seed error. Ties favor earlier
 *  row-major cells. Bypass ranking entirely if every eligible cell fits.
 *  Returns selection comparisons for accounting. The supplied order buffer has
 *  capacity for the admitted count; no array scales with unrestricted strokes.
 */
export function admitStrongest(seeds,scores,eligible,budget,order){
 const admitted=Math.min(eligible,budget);let comparisons=0;
 if(eligible<=budget){for(let i=0;i<admitted;i++)order[i]=i;return {admitted,comparisons,ranked:false};}
 const worse=(a,b)=>{comparisons++;return scores[a]<scores[b]||scores[a]===scores[b]&&a>b;};
 const down=(root,n)=>{
  while(root*2+1<n){let child=root*2+1;if(child+1<n&&worse(order[child+1],order[child]))child++;
   if(!worse(order[child],order[root]))break;const value=order[root];order[root]=order[child];order[child]=value;root=child;
  }
 };
 for(let i=0;i<admitted;i++)order[i]=i;
 for(let i=(admitted>>1)-1;i>=0;i--)down(i,admitted);
 for(let i=admitted;i<eligible;i++)if(worse(order[0],i)){order[0]=i;down(0,admitted);}
 // In-place integer heapsort restores row-major order without engine-sort scratch.
 const indexDown=(root,n)=>{while(root*2+1<n){let child=root*2+1;
  if(child+1<n&&order[child+1]>order[child])child++;if(order[root]>=order[child])break;
  const value=order[root];order[root]=order[child];order[child]=value;root=child;
 }};
 for(let i=(admitted>>1)-1;i>=0;i--)indexDown(i,admitted);
 for(let end=admitted-1;end>0;end--){const value=order[0];order[0]=order[end];order[end]=value;indexDown(0,end);}
 // Ascending selected indices imply order[i]>=i, so this compaction is safe.
 for(let i=0;i<admitted;i++)seeds[i]=seeds[order[i]];
 return {admitted,comparisons,ranked:true};
}

export function validateInput(source,size,seed,layers){
 if(!Number.isInteger(size)||size<1||size>720)throw Error('frame size must be an integer from 1 through 720');
 if(!(source instanceof Uint8Array||source instanceof Uint8ClampedArray)||source.length!==size*size*4)throw Error('frame color must be an exact RGBA byte array');
 if(!Number.isSafeInteger(seed))throw Error('frame seed must be a safe integer');
 if(layers!==3&&layers!==4)throw Error('Curved paint requires 3 or 4 completed layers');
}

/** Static bounded solve. No deadlines or source-dependent early-success paths.
 *  Every admitted stroke completes. No image scaling, source composite or retained
 *  plan. A caller can discard/terminate obsolete worker work outside this module.
 */
export function solveCurvedPaint(source,size,seed,layers){
 validateInput(source,size,seed,layers);
 const start=performance.now(),w=size,h=size,N=w*h,arena=new Arena();
 const lastRadius=CONFIG.radii[layers-1],maxCells=Math.ceil(w/lastRadius)**2;
 const maxPlan=Math.max(...CONFIG.radii.slice(0,layers).map((r,i)=>Math.min(CONFIG.budgets[i],Math.ceil(w/r)**2)));
 const canvas=arena.alloc(Uint8ClampedArray,N*4,'paint');
 const entry=arena.alloc(Uint8ClampedArray,N*4,'layer entry paint');
 const tmp=arena.alloc(Float32Array,N*3,'horizontal blur');
 const ref=arena.alloc(Float32Array,N*3,'reference');
 const luma=arena.alloc(Float32Array,N,'luminance');
 const gx=arena.alloc(Float32Array,N,'gradient x');
 const gy=arena.alloc(Float32Array,N,'gradient y');
 const error=arena.alloc(Float32Array,N,'actual residual');
 const covered=arena.alloc(Uint8Array,N,'unpainted flags');
 const provenance=arena.alloc(Uint8Array,N,'last covering radius');
 const seeds=arena.alloc(Uint32Array,maxCells,'eligible cell seeds');
 const scores=arena.alloc(Float64Array,maxCells,'eligible cell mean residual');
 const order=arena.alloc(Uint32Array,maxPlan,'admission and shuffle indices');
 const plan={points:arena.alloc(Float32Array,maxPlan*34,'layer control points'),lengths:arena.alloc(Uint8Array,maxPlan,'layer point counts'),radii:arena.alloc(Uint8Array,maxPlan,'layer radii'),colors:arena.alloc(Uint8Array,maxPlan*3,'layer colors')};
 const kernel=arena.alloc(Float64Array,49,'reusable Gaussian kernel');
 const color=arena.alloc(Uint8Array,3,'stroke color');
 const raster=new Raster(w,h,arena),layerStats=[];
 blank(canvas);let totalStrokes=0,totalCells=0,blurMs=0,planningMs=0,rasterMs=0;
 for(let li=0;li<layers;li++){
  const r=CONFIG.radii[li],cells=Math.ceil(w/r)**2,budget=Math.min(CONFIG.budgets[li],cells);
  const workBefore=raster.work,distanceBefore=raster.distanceEvaluations,commitBefore=raster.commits,segmentBefore=raster.segments;
  const blurStart=performance.now();blur(source,w,h,r,tmp,ref,kernel);gradients(ref,w,h,luma,gx,gy);const layerBlurMs=performance.now()-blurStart;blurMs+=layerBlurMs;
  entry.set(canvas);const before=residual(entry,ref,error),planningStart=performance.now();
  const eligible=collectEligible(error,w,h,r,li===0,seeds,scores);
  if(li===0&&eligible>budget)throw Error('Forced coarse cells exceed declared budget');
  const admission=admitStrongest(seeds,scores,eligible,budget,order),admitted=admission.admitted;
  const reasons={zero:0,paint:0,boundary:0,max:0};
  for(let j=0;j<admitted;j++){
   const p=seeds[j];for(let ch=0;ch<3;ch++)color[ch]=Math.round(ref[p*3+ch]);
   const result=trace(p,r,w,h,ref,entry,gx,gy,plan.points,j*34,color);reasons[result.reason]++;
   plan.lengths[j]=result.n;plan.radii[j]=r;plan.colors.set(color,j*3);order[j]=j;
  }
  shuffle(order,admitted,hash32(seed^Math.imul(r,0x85ebca6b)));
  const layerPlanningMs=performance.now()-planningStart;planningMs+=layerPlanningMs;
  const rasterStart=performance.now();for(let j=0;j<admitted;j++)raster.stroke(canvas,provenance,covered,plan,order[j]);const layerRasterMs=performance.now()-rasterStart;rasterMs+=layerRasterMs;
  const after=residual(canvas,ref,error);totalStrokes+=admitted;totalCells+=cells;
  layerStats.push({radius:r,cells,budget,eligible,admitted,omitted:eligible-admitted,ranked:admission.ranked,selectionComparisons:admission.comparisons,beforeMeanRms:before,afterMeanRms:after,stopReasons:reasons,segmentBoxVisits:raster.work-workBefore,actualDistanceEvaluations:raster.distanceEvaluations-distanceBefore,pixelCommits:raster.commits-commitBefore,flattenedSegments:raster.segments-segmentBefore,ms:{blurAndGradient:layerBlurMs,planning:layerPlanningMs,raster:layerRasterMs}});
 }
 let sourceError=0,uncovered=0;const areas={0:0,2:0,4:0,8:0,16:0};
 for(let i=0;i<N;i++){const a=i*4;sourceError+=d3(canvas[a]-source[a],canvas[a+1]-source[a+1],canvas[a+2]-source[a+2]);if(!covered[i])uncovered++;areas[provenance[i]]++;}
 return {rgba:canvas,size,layers,stats:{complete:true,algorithm:VERSION,threshold:CONFIG.threshold,seed,strokes:totalStrokes,cells:totalCells,layers:layerStats,sourceMeanRms:sourceError/N,lowCoveragePixels:uncovered,lastRadiusArea:areas,segmentBoxVisits:raster.work,actualDistanceEvaluations:raster.distanceEvaluations,flattenedSegments:raster.segments,pixelCommits:raster.commits,typedBytes:{retained:canvas.byteLength,ownedAllocated:arena.bytes,ownedPeak:arena.bytes,borrowedSource:source.byteLength,ownedPlusBorrowedSource:arena.bytes+source.byteLength,allocations:arena.allocations},ms:{blurAndGradient:blurMs,planning:planningMs,raster:rasterMs,total:performance.now()-start}}};
}

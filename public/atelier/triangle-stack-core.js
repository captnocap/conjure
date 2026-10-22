// Portable implementation of frozen triangle-stack-proof-1.
// Exact source-RGB math and fixed search; no wall-clock-dependent rejection.
// See the admitted proof MODEL SHA e7169022ab3521e7e40a2b08c6568001f41157ada3ccf3c1afb73fbde826b715.
export const W=144, N=W*W, A=.5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const quant=v=>clamp(Math.round(v*4)/4,-24,168);
export function validateTriangleStackSource(source, size = 720) {
  if (size !== 720) throw new RangeError('Triangle stack requires the fixed 720-pixel capture');
  if (!(source instanceof Uint8Array || source instanceof Uint8ClampedArray) || source.length !== 720*720*4)
    throw new TypeError('Triangle stack requires complete byte RGBA source');
  for (let i = 3; i < source.length; i += 4)
    if (source[i] !== 255) throw new TypeError('Triangle stack requires opaque source alpha');
  return source;
}
export function makeTarget(source){
  validateTriangleStackSource(source);
  const t=new Float64Array(N*3),mean=[0,0,0];
  for(let y=0;y<720;y++)for(let x=0;x<720;x++){
    const p=(y*720+x)*4,j=(Math.floor(y/5)*W+Math.floor(x/5))*3;
    if(source[p+3]!==255) throw Error('Source alpha');
    for(let c=0;c<3;c++)t[j+c]+=source[p+c];
  }
  for(let i=0;i<N;i++)for(let c=0;c<3;c++){t[i*3+c]/=25;mean[c]+=t[i*3+c];}
  for(let c=0;c<3;c++)mean[c]/=N;
  return {t,mean};
}
export function triangleSpans(v,visit){
  const area=Math.abs((v[2]-v[0])*(v[5]-v[1])-(v[3]-v[1])*(v[4]-v[0]));
  if(!Number.isFinite(area)||area===0)return {support:0,minAltitude:0,rows:0};
  const maxSide=Math.max(Math.hypot(v[2]-v[0],v[3]-v[1]),Math.hypot(v[4]-v[2],v[5]-v[3]),Math.hypot(v[0]-v[4],v[1]-v[5]));
  const minAltitude=area/maxSide;
  
  let support=0,rows=0;
  const y0=Math.max(0,Math.ceil(Math.min(v[1],v[3],v[5])-.5)),y1=Math.min(W,Math.ceil(Math.max(v[1],v[3],v[5])-.5));
  for(let y=y0;y<y1;y++){
    const yy=y+.5;let lo=Infinity,hi=-Infinity;rows++;
    for(let k=0;k<3;k++){
      const j=k*2,l=((k+1)%3)*2,ya=v[j+1],yb=v[l+1];
      if(ya===yb||yy<Math.min(ya,yb)||yy>=Math.max(ya,yb))continue;
      const xx=v[j]+(yy-ya)*(v[l]-v[j])/(yb-ya);lo=Math.min(lo,xx);hi=Math.max(hi,xx);
    }
    if(!Number.isFinite(lo)||!Number.isFinite(hi))continue;
    const left=Math.max(0,Math.ceil(lo-.5)),right=Math.min(W,Math.ceil(hi-.5));
    if(right>left){support+=right-left;if(visit)visit(y,left,right);}
  }
  return {support,minAltitude,rows};
}
export function totalSSE(c,t){let s=0;for(let j=0;j<c.length;j++){const d=c[j]-t[j];s+=d*d;}return s;}
export function fitTriangleStack(source, { captureEvidence = false } = {}){
  const {t,mean}=makeTarget(source),current=new Float64Array(N*3),proposed=new Float64Array(N*3),prefix=Array.from({length:4},()=>new Float64Array(W*(W+1))),cdf=new Float64Array(N);
  for(let i=0;i<N;i++)current.set(mean,i*3);
  let state=2401;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  let sse=totalSSE(current,t),scores=0,scanRows=0;const initialSSE=sse,triangles=[],history=[sse];
  const score=v=>{
    scores++;const sums=[0,0,0,0];
    const shape=triangleSpans(v,(y,l,r)=>{const base=y*(W+1);for(let k=0;k<4;k++)sums[k]+=prefix[k][base+r]-prefix[k][base+l];});
    scanRows+=shape.rows;
    if(shape.support<1||!(shape.minAltitude>0))return {delta:Infinity,v};
    const rgb=sums.slice(0,3).map(z=>clamp(z/(A*shape.support),0,255));let delta=sums[3];
    for(let c=0;c<3;c++)delta+=-2*A*rgb[c]*sums[c]+A*A*shape.support*rgb[c]*rgb[c];
    return {v,rgb,delta,support:shape.support,minAltitude:shape.minAltitude};
  };
  for(let stage=0;stage<96;stage++){
    let errorMass=0;
    for(let y=0;y<W;y++){
      const base=y*(W+1);for(let k=0;k<4;k++)prefix[k][base]=0;
      for(let x=0;x<W;x++){
        const i=y*W+x,j=i*3;let difference=0,err=0;
        for(let c=0;c<3;c++){
          const u=t[j+c]-.5*current[j+c],e=current[j+c]-t[j+c];
          prefix[c][base+x+1]=prefix[c][base+x]+u;difference+=u*u-e*e;err+=e*e;
        }
        prefix[3][base+x+1]=prefix[3][base+x]+difference;errorMass+=err;cdf[i]=errorMass;
      }
    }
    if(errorMass===0)break;let best=null;
    for(let start=0;start<16;start++){
      const z=rand()*errorMass;let l=0,r=N-1;while(l<r){const m=(l+r)>>>1;if(cdf[m]>z)r=m;else l=m+1;}
      const cx=l%W+.5,cy=Math.floor(l/W)+.5,radius=12+48*rand(),angle=2*Math.PI*rand(),v=[];
      for(let k=0;k<3;k++){v.push(quant(cx+radius*Math.cos(angle+2*Math.PI*k/3)),quant(cy+radius*Math.sin(angle+2*Math.PI*k/3)));}
      let local=score(v);
      for(let mutation=0;mutation<32;mutation++){
        const next=local.v.slice(),j=2*Math.floor(rand()*3),d=[24,12,6,3][Math.floor(mutation/8)];
        next[j]=quant(next[j]+(2*rand()-1)*d);next[j+1]=quant(next[j+1]+(2*rand()-1)*d);
        const proposed=score(next);if(proposed.delta<local.delta)local=proposed;
      }
      if(!best||local.delta<best.delta)best=local;
    }
    if(!best||!(best.delta<0))break;
    proposed.set(current);triangleSpans(best.v,(y,l,r)=>{for(let x=l;x<r;x++){const j=(y*W+x)*3;for(let c=0;c<3;c++)proposed[j+c]=.5*proposed[j+c]+.5*best.rgb[c];}});
    const nextSSE=totalSSE(proposed,t);
    if(Math.abs((nextSSE-sse)-best.delta)>Math.max(1e-6,sse*1e-10))throw Error('Analytic/direct SSE mismatch');
    if(!(nextSSE<sse))break;
    triangles.push({...best,actualDelta:nextSSE-sse});current.set(proposed);sse=nextSSE;history.push(sse);
  }
  if(scores>50688||scanRows>7299072)throw Error('Work cap');
  for(const values of [mean,history,current])for(const x of values)if(!Number.isFinite(x))throw Error('Nonfinite');
  for(const v of triangles){if(v.v.some(x=>!Number.isFinite(x)||x< -24||x>168)||v.rgb.some(x=>!Number.isFinite(x)||x<0||x>255))throw Error('Invalid plan');const s=triangleSpans(v.v);if(s.support<1||!(s.minAltitude>0))throw Error('Support');}
  const proofPlan={model:'triangle-stack-proof-1',seed:2401,alpha:A,workingSize:W,background:mean,triangles,history,initialSSE,finalSSE:sse,scores,scanRows};
  const plan=compactTriangleStackPlan(proofPlan);
  // Fitting buffers and full diagnostics escape only when explicitly requested
  // by a proof test. The study retains the compact plan alone.
  return captureEvidence ? {plan, proofPlan, working:current} : plan;
}


function compactTriangleStackPlan(proofPlan) {
  const triangles = new Float64Array(proofPlan.triangles.length * 9);
  proofPlan.triangles.forEach((triangle, i) => {
    triangles.set(triangle.v, i * 9);
    triangles.set(triangle.rgb, i * 9 + 6);
  });
  return validateTriangleStackPlan({
    model: 'triangle-stack-vector-1', seed: 2401, alpha: .5,
    workingSize: 144, width: 720, height: 720,
    background: Float64Array.from(proofPlan.background), triangles,
  });
}

export function validateTriangleStackPlan(plan) {
  const names = ['model', 'seed', 'alpha', 'workingSize', 'width', 'height', 'background', 'triangles'];
  if (!plan || typeof plan !== 'object' || Object.keys(plan).length !== names.length || names.some(name => !Object.hasOwn(plan, name)) ||
      plan.model !== 'triangle-stack-vector-1' || plan.seed !== 2401 || plan.alpha !== .5 ||
      plan.workingSize !== 144 || plan.width !== 720 || plan.height !== 720)
    throw new TypeError('Invalid Triangle stack plan metadata');
  if (!(plan.background instanceof Float64Array) || plan.background.length !== 3 ||
      !(plan.triangles instanceof Float64Array) || plan.triangles.length % 9 !== 0 || plan.triangles.length > 96 * 9 ||
      plan.background.byteOffset !== 0 || plan.background.byteLength !== plan.background.buffer.byteLength ||
      plan.triangles.byteOffset !== 0 || plan.triangles.byteLength !== plan.triangles.buffer.byteLength)
    throw new TypeError('Invalid Triangle stack plan buffers');
  if (plan.background.some(value => !Number.isFinite(value) || value < 0 || value > 255))
    throw new TypeError('Invalid Triangle stack background');
  for (let i = 0; i < plan.triangles.length; i += 9) {
    const v = plan.triangles.subarray(i, i + 6), rgb = plan.triangles.subarray(i + 6, i + 9);
    if (v.some(value => !Number.isFinite(value) || value < -24 || value > 168 || !Number.isInteger(value * 4)) ||
        rgb.some(value => !Number.isFinite(value) || value < 0 || value > 255))
      throw new TypeError('Invalid Triangle stack geometry or color');
    const shape = triangleSpans(v);
    if (shape.support < 1 || !(shape.minAltitude > 0)) throw new TypeError('Invalid Triangle stack support');
  }
  return plan;
}

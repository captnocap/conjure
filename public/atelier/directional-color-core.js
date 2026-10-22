// Plain ECMAScript scalar translation of frozen akf.cpp. No native executable imports.
// Candidate only. One assessed optimization: cache original exact isotropic uniform-region outputs.
// The direct source remains portable-akf.mjs; this file preserves its full operator on every miss.
export const MODEL_SHA256 = '91cfc88ad1938e52c40a1bea77ed045df9d0313fc7dc04447d3ab350f4076148';
const G1 = new Float64Array([0.004433048175243745,0.054005582622414484,0.2420362293761143,0.3990502796524549,0.2420362293761143,0.054005582622414484,0.004433048175243745]);
const D1 = new Float64Array([-0.013299144525731235,-0.10801116524482897,-0.2420362293761143,0,0.2420362293761143,0.10801116524482897,0.013299144525731235]);
const G2 = new Float64Array([0.0022181958546457657,0.008773134791588384,0.02702315760287952,0.06482518513852682,0.12110939007484813,0.17621312278855084,0.1996756274979211,0.17621312278855084,0.12110939007484813,0.06482518513852682,0.02702315760287952,0.008773134791588384,0.0022181958546457657]);
const SC = new Float64Array([1,0.7071067811865476,0,-0.7071067811865476,-1,-0.7071067811865476,0,0.7071067811865476]);
const SS = new Float64Array([0,0.7071067811865476,1,0.7071067811865476,0,-0.7071067811865476,-1,-0.7071067811865476]);
const PI=3.141592653589793, ZETA=0.2222222222222222, ETA=3.4137811611365527, RADIUS=9, FLAT_TRACE=1e-12;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
function reflect(x,n) { while(x<0||x>=n)x=x<0?-x-1:2*n-x-1;return x; }
function reflectTable(n,r) {
  const table=new Int32Array(n*(2*r+1));
  for(let x=0;x<n;x++)for(let k=-r;k<=r;k++)table[x*(2*r+1)+k+r]=reflect(x+k,n);
  return table;
}
function sepInto(f,w,h,kx,ky,tmp,out,tables) {
  const rx=(kx.length-1)/2,ry=(ky.length-1)/2;
  const xt=tables['x'+rx],yt=tables['y'+ry];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++) {
    let v=0;
    for(let k=-rx;k<=rx;k++)v+=kx[k+rx]*f[(y*w+xt[x*kx.length+k+rx])*3+c];
    tmp[(y*w+x)*3+c]=v;
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++) {
    let v=0;
    for(let k=-ry;k<=ry;k++)v+=ky[k+ry]*tmp[(yt[y*ky.length+k+ry]*w+x)*3+c];
    out[(y*w+x)*3+c]=v;
  }
}
function tensorAxes(f,w,h,workspace) {
  const {dx,dy,tensor,tmp,axes,tables}=workspace;
  sepInto(f,w,h,D1,G1,tmp,dx,tables);
  sepInto(f,w,h,G1,D1,tmp,dy,tables);
  for(let p=0;p<w*h;p++) {
    let e=0,g=0,j=0;
    for(let c=0;c<3;c++){let a=dx[p*3+c],b=dy[p*3+c];e+=a*a;g+=b*b;j+=a*b;}
    tensor[p*3]=e;tensor[p*3+1]=g;tensor[p*3+2]=j;
  }
  sepInto(tensor,w,h,G2,G2,tmp,tensor,tables);
  for(let p=0;p<w*h;p++) {
    let e=tensor[p*3],g=tensor[p*3+1],j=tensor[p*3+2],trace=e+g;
    let gap=Math.hypot(e-g,2*j),A=0,theta=0;
    if(trace>FLAT_TRACE&&gap>0){A=clamp(gap/trace,0,1);theta=0.5*Math.atan2(2*j,e-g)+PI/2;}
    axes[p*5]=Math.cos(theta);axes[p*5+1]=Math.sin(theta);
    axes[p*5+2]=RADIUS*(1+A);axes[p*5+3]=RADIUS/(1+A);axes[p*5+4]=A;
  }
}
function stats() { return {acceptedSamples:0,boundingBoxTests:0,reflectedSamples:0,negativeVarianceClamps:0,flatOrIsotropicPixels:0,minSamplesPerPixel:1e6,maxSamplesPerPixel:0,minimumRawVariance:0,minimumRGB:1,maximumRGB:0,minimumSectorMass:1e100,minimumBetaSum:1e100,sumAnisotropy:0,maximumAnisotropy:0}; }
function rowRuns(f,w,h) {
  const runs=new Uint16Array(w*h);
  for(let y=0;y<h;y++)for(let x=w-1;x>=0;x--) {
    const p=y*w+x,c=p*3;
    runs[p]=x+1<w&&Object.is(f[c],f[c+3])&&Object.is(f[c+1],f[c+4])&&Object.is(f[c+2],f[c+5])?runs[p+1]+1:1;
  }
  return runs;
}
function uniformKey(f,w,h,x,y,runs,keyFloats,keyWords) {
  if(x<9||x>=w-9||y<9||y>=h-9)return null;
  const c=(y*w+x)*3,r=f[c],g=f[c+1],b=f[c+2];
  for(let row=y-9;row<=y+9;row++) {
    const left=row*w+x-9,base=left*3;
    if(runs[left]<19||!Object.is(f[base],r)||!Object.is(f[base+1],g)||!Object.is(f[base+2],b))return null;
  }
  keyFloats[0]=r;keyFloats[1]=g;keyFloats[2]=b;
  return keyWords.join(',');
}
function apply(f,w,h,out,workspace) {
  tensorAxes(f,w,h,workspace);
  const runs=rowRuns(f,w,h),cache=new Map(),keyFloats=new Float64Array(3),keyWords=new Uint32Array(keyFloats.buffer);
  const {axes,mass,m1,m2,kw,rgb,mean}=workspace,s=stats();
  s.uniformCacheHits=0;s.uniformCacheMisses=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const ap=(y*w+x)*5,tx=axes[ap],ty=axes[ap+1],a=axes[ap+2],b=axes[ap+3],A=axes[ap+4];
    s.sumAnisotropy+=A;s.maximumAnisotropy=Math.max(s.maximumAnisotropy,A);if(A===0)s.flatOrIsotropicPixels++;
    const key=A===0&&tx===1&&Object.is(ty,0)&&a===9&&b===9?uniformKey(f,w,h,x,y,runs,keyFloats,keyWords):null;
    const cached=key===null?undefined:cache.get(key);
    if(cached) {
      s.uniformCacheHits++;
      s.acceptedSamples+=cached.accepted;s.boundingBoxTests+=cached.bounds;s.negativeVarianceClamps+=cached.negativeVarianceClamps;
      s.minSamplesPerPixel=Math.min(s.minSamplesPerPixel,cached.accepted);s.maxSamplesPerPixel=Math.max(s.maxSamplesPerPixel,cached.accepted);
      // Every global extremum was already encountered when this same value was cached.
      const p=(y*w+x)*3;out[p]=cached.rgb[0];out[p+1]=cached.rgb[1];out[p+2]=cached.rgb[2];
      continue;
    }
    const negativeBefore=s.negativeVarianceClamps;
    const mx=Math.ceil(Math.hypot(a*tx,b*ty)),my=Math.ceil(Math.hypot(a*ty,b*tx));
    mass.fill(0);m1.fill(0);m2.fill(0);let accepted=0;
    for(let oy=-my;oy<=my;oy++)for(let ox=-mx;ox<=mx;ox++) {
      s.boundingBoxTests++;
      const vx=(ox*tx+oy*ty)/a,vy=(-ox*ty+oy*tx)/b,rr=vx*vx+vy*vy;
      if(rr>1)continue;
      accepted++;s.acceptedSamples++;
      if(x+ox<0||x+ox>=w||y+oy<0||y+oy>=h)s.reflectedSamples++;
      const p=(reflect(y+oy,h)*w+reflect(x+ox,w))*3;
      let ksum=0;
      for(let k=0;k<8;k++) {
        let u=vx*SC[k]+vy*SS[k],v=-vx*SS[k]+vy*SC[k];
        let z=Math.max(0,u+ZETA-ETA*v*v);kw[k]=z*z;ksum+=kw[k];
      }
      if(!(ksum>0))throw Error('nonpositive sector normalization');
      const factor=Math.exp(-3.125*rr)/ksum;
      for(let k=0;k<8;k++) {
        const q=kw[k]*factor;mass[k]+=q;
        for(let c=0;c<3;c++){let color=f[p+c];m1[k*3+c]+=q*color;m2[k*3+c]+=q*color*color;}
      }
    }
    s.minSamplesPerPixel=Math.min(s.minSamplesPerPixel,accepted);s.maxSamplesPerPixel=Math.max(s.maxSamplesPerPixel,accepted);
    rgb.fill(0);let bsum=0;
    for(let k=0;k<8;k++) {
      s.minimumSectorMass=Math.min(s.minimumSectorMass,mass[k]);
      if(!(mass[k]>0))throw Error('empty sector');
      let l1=0;
      for(let c=0;c<3;c++) {
        mean[c]=m1[k*3+c]/mass[k];const variance=m2[k*3+c]/mass[k]-mean[c]*mean[c];
        s.minimumRawVariance=Math.min(s.minimumRawVariance,variance);if(variance<0)s.negativeVarianceClamps++;
        l1+=Math.sqrt(Math.max(0,variance));
      }
      const d=255*l1,d2=d*d,d4=d2*d2,d8=d4*d4,beta=1/(1+d8);
      bsum+=beta;for(let c=0;c<3;c++)rgb[c]+=beta*mean[c];
    }
    s.minimumBetaSum=Math.min(s.minimumBetaSum,bsum);
    if(!(bsum>0))throw Error('nonpositive beta sum');
    for(let c=0;c<3;c++) {
      const z=rgb[c]/bsum;if(!Number.isFinite(z))throw Error('nonfinite output');
      out[(y*w+x)*3+c]=z;s.minimumRGB=Math.min(s.minimumRGB,z);s.maximumRGB=Math.max(s.maximumRGB,z);
    }
    if(key!==null) {
      const p=(y*w+x)*3;
      cache.set(key,{rgb:Float64Array.of(out[p],out[p+1],out[p+2]),accepted,bounds:(2*mx+1)*(2*my+1),negativeVarianceClamps:s.negativeVarianceClamps-negativeBefore});s.uniformCacheMisses++;
    }
  }
  s.meanAnisotropy=s.sumAnisotropy/(w*h);delete s.sumAnisotropy;return s;
}
export function directionalCandidate(rgbBytes,w,h,onIteration=()=>{}) {
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>720||h>720||w*h>518400)throw Error('size bound');
  if(!(rgbBytes instanceof Uint8Array)||rgbBytes.length!==w*h*3)throw Error('input RGB bytes');
  const length=rgbBytes.length,tables={};
  for(const r of [3,6]){tables['x'+r]=reflectTable(w,r);tables['y'+r]=reflectTable(h,r);}
  let current=new Float64Array(length),output=new Float64Array(length);
  const workspace={dx:new Float64Array(length),dy:new Float64Array(length),tensor:new Float64Array(length),tmp:new Float64Array(length),axes:new Float64Array(w*h*5),tables,mass:new Float64Array(8),m1:new Float64Array(24),m2:new Float64Array(24),kw:new Float64Array(8),rgb:new Float64Array(3),mean:new Float64Array(3)};
  for(let i=0;i<length;i++)current[i]=rgbBytes[i]/255;
  const iterations=[];
  for(let i=0;i<3;i++) {
    const start=performance.now();const s=apply(current,w,h,output,workspace);
    [current,output]=[output,current];s.seconds=(performance.now()-start)/1000;iterations.push(s);onIteration(i+1,current,s);
  }
  const rgba=new Uint8Array(w*h*4);
  for(let p=0;p<w*h;p++){for(let c=0;c<3;c++)rgba[p*4+c]=Math.floor(255*clamp(current[p*3+c],0,1)+0.5);rgba[p*4+3]=255;}
  return {rgba,float64:current,iterations,workspaceArrayBytes:6*length*8+w*h*5*8+w*h*2+24+Object.values(tables).reduce((v,a)=>v+a.byteLength,0)+(8+24+24+8+3+3)*8};
}

// The application renderer is fixed to 720 square opaque display-RGB pixels.
// directionalCandidate above is the bounded low-level verification entry point;
// it has no tunable artistic settings. Keep its arithmetic identical to the proof.
export const DIRECTIONAL_COLOR_SOURCE_SIZE = 720;
export const DIRECTIONAL_COLOR_MODEL = MODEL_SHA256;
export const DIRECTIONAL_COLOR_CONTRACT = Object.freeze({
  size: 720, passes: 3, radius: 9, sectors: 8, modelSHA256: MODEL_SHA256,
});
const SOURCE_BYTES = 720 * 720 * 4;
const TA = Object.getPrototypeOf(Uint8Array.prototype);
const brand = Object.getOwnPropertyDescriptor(TA, Symbol.toStringTag).get;
const typedLength = Object.getOwnPropertyDescriptor(TA, 'length').get;
const typedBuffer = Object.getOwnPropertyDescriptor(TA, 'buffer').get;
const typedOffset = Object.getOwnPropertyDescriptor(TA, 'byteOffset').get;
const arrayByteLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
const resizable = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'resizable')?.get;
const detached = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'detached')?.get;
function sourceView(source, size) {
  if (size !== 720) throw Error('Directional color requires the fixed 720 × 720 source');
  const kind = brand.call(source), backing = typedBuffer.call(source);
  arrayByteLength.call(backing); // Reject SharedArrayBuffer, including cross-realm values.
  if (!['Uint8Array', 'Uint8ClampedArray'].includes(kind) ||
      resizable?.call(backing) || detached?.call(backing) || typedLength.call(source) !== SOURCE_BYTES)
    throw Error('Invalid Directional color source buffer');
  const bytes = new Uint8Array(backing, typedOffset.call(source), SOURCE_BYTES);
  for (let i = 3; i < bytes.length; i += 4)
    if (bytes[i] !== 255) throw Error('Directional color requires opaque source pixels');
  return bytes;
}
export function validateDirectionalColorSource(source, size = 720) { sourceView(source, size); }
export function copyDirectionalColorSource(source, size = 720) {
  return new Uint8Array(sourceView(source, size));
}
export function renderDirectionalColor(source, size = 720) {
  const rgba = sourceView(source, size), rgb = new Uint8Array(720 * 720 * 3);
  for (let p = 0; p < 720 * 720; p++) {
    rgb[p * 3] = rgba[p * 4]; rgb[p * 3 + 1] = rgba[p * 4 + 1]; rgb[p * 3 + 2] = rgba[p * 4 + 2];
  }
  // Retain only final RGBA. No Float64 workspace or intermediate image escapes.
  const output = directionalCandidate(rgb, 720, 720).rgba;
  return Object.freeze({ renderRGBA: () => new Uint8Array(output) });
}

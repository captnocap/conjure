// Independent analytic CPU reference. A design model, not measured foil data.
import {spectralWeights} from './spectral-data.js';
export const defaults=Object.freeze({pitch:1200,sigmaT:.035,sigmaG:.12,budget:.65,orders:[[-2,.08],[-1,.42],[1,.42],[2,.08]]});
export const gaussian=(x,s)=>Math.exp(-.5*(x/s)**2)/(Math.sqrt(2*Math.PI)*s);
export function density(lambda,L,V,{pitch=defaults.pitch,sigmaT=defaults.sigmaT,sigmaG=defaults.sigmaG,orders=defaults.orders}={}){
 if(L[2]<=0||V[2]<=0)return 0;
 return orders.reduce((a,[m,w])=>a+w*gaussian(L[0]+V[0]-m*lambda/pitch,sigmaT),0)*gaussian(L[1]+V[1],sigmaG);
}
export function idealDirection(lambda,V,m,pitch=defaults.pitch){const t=m*lambda/pitch-V[0],g=-V[1],n2=1-t*t-g*g;return n2>=0?[t,g,Math.sqrt(n2)]:null;}
export const XYZ_RGB=[3.2404542,-1.5371385,-.4985314,-.969266,1.8760108,.041556,.0556434,-.2040259,1.0572252];
export function xyzToRgb(xyz){return [0,1,2].map(c=>XYZ_RGB[c*3]*xyz[0]+XYZ_RGB[c*3+1]*xyz[1]+XYZ_RGB[c*3+2]*xyz[2]);}
export function spectrumAt(st,sg=0,config=defaults,weights=spectralWeights){
 const xyz=[0,0,0];
 for(let i=0;i<weights.length;i+=4){let a=0;for(const [m,w]of config.orders)a+=w*gaussian(st-m*weights[i]/config.pitch,config.sigmaT);for(let c=0;c<3;c++)xyz[c]+=a*weights[i+1+c];}
 return xyzToRgb(xyz).map(v=>v*gaussian(sg,config.sigmaG));
}

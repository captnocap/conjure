// Fixed local-Z cylindrical cuts. Shared GLSL and Float32 CPU coverage; no UV chart.
export const MODEL_VERSION='coarse-z-cylinder-shell-v1';
export const ELIGIBLE_IDS=Object.freeze([7,10]);
export const PITCH=0.24,RADIUS=0.075,PHASE=Object.freeze([0.12,0.12]);
export const apertureGLSL=`
bool shellAperture(vec3 p) {
 vec2 d=p.xy-vec2(0.12,0.12);
 d-=0.24*floor(d/0.24+0.5);
 return dot(d,d)<0.075*0.075;
}
`;
export function apertureCPU(p){let x=p[0]-PHASE[0],y=p[1]-PHASE[1];x-=PITCH*Math.floor(x/PITCH+.5);y-=PITCH*Math.floor(y/PITCH+.5);return x*x+y*y<RADIUS*RADIUS;}
export function apertureSignedDistanceCPU(p){let x=p[0]-PHASE[0],y=p[1]-PHASE[1];x-=PITCH*Math.floor(x/PITCH+.5);y-=PITCH*Math.floor(y/PITCH+.5);return Math.hypot(x,y)-RADIUS;}
export function apertureFloat32CPU(p){const f=Math.fround;let x=f(f(p[0])-f(.12)),y=f(f(p[1])-f(.12));x=f(x-f(f(.24)*Math.floor(f(f(x/f(.24))+.5))));y=f(y-f(f(.24)*Math.floor(f(f(y/f(.24))+.5))));return f(f(x*x)+f(y*y))<f(f(.075)*f(.075));}

export const PERFORATED_SHELL_ID = 'perforated-shell';
export const APERTURE_MODEL_FINGERPRINT = "coarse-z-cylinder-shell-v1;eligible=6,9;XY;pitch=.24;radius=.075;phase=.12,.12;strict-radius";

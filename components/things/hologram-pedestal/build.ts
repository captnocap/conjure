import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 projection:choice('What information is being projected?',{map:'A contour-like miniature terrain map.',person:'An abstract human figure made of light segments.',constellation:'A connected constellation of luminous points.',machine:'A rotating-looking geometric cube schematic.'}),
 pedestal:choice('What projection unit supports the image?',{drum:'A round industrial projector drum.',altar:'A square ceremonial stone-like console.',tripod:'A compact three-legged field emitter.'}),
 scale:score('How large is the projection?', ['A small tabletop image','A life-size projected display']),
 colour:choice('What colour defines the image?',{cyan:'Cold cyan technical light.',amber:'Warm amber archival light.',violet:'Violet and rose spectral light.'}),
 density:score('How much information fills the image?', ['A spare outline','Dense multi-layer lines and points']),
 beam:noul('Are visible emitter rays rising from the base?'),
 controls:noul('Does the pedestal carry a control panel?'),
},build(a,c){
 const s=new Sculpture(c),k=.4+a.scale*1.6,base=s.material('#536570',{metalness:.45}),dark=s.material('#263e4a'),col=a.colour==='cyan'?'#74beca':a.colour==='amber'?'#d1ad67':'#b897c7',glow=s.material(col,{emissive:col,emissiveIntensity:.9}),h=.45*k,y=.9*k;
 if(a.pedestal==='drum'){s.cylinder(k*.55,k*.65,h,[0,h/2,0],base);const r=s.ring(k*.49,.035*k,[0,h+.02,0],glow);r.rotation.x=Math.PI/2;}
 if(a.pedestal==='altar')s.box([k*1.2,h,k*1.2],[0,h/2,0],base);
 if(a.pedestal==='tripod'){for(let i=0;i<3;i++){const q=i*Math.PI*2/3;s.rod([Math.sin(q)*k*.7,0,Math.cos(q)*k*.7],[0,h,0],.035*k,base);}s.cylinder(k*.4,k*.4,k*.12,[0,h,0],dark);}
 if(a.projection==='machine'){const edge=k*.7;for(const xx of [-1,1])for(const yy of [-1,1]){s.rod([xx*edge,y+yy*edge,-edge],[xx*edge,y+yy*edge,edge],.013*k,glow);s.rod([-edge,y+xx*edge,yy*edge],[edge,y+xx*edge,yy*edge],.013*k,glow);s.rod([xx*edge,y-edge,yy*edge],[xx*edge,y+edge,yy*edge],.013*k,glow);}s.ring(k*.45,.014*k,[0,y,0],glow);}
 if(a.projection==='person'){s.ball([k*.16,k*.2,k*.15],[0,y+k*.95,0],glow);s.rod([0,y+k*.7,0],[0,y+k*.12,0],.06*k,glow);for(const x of [-1,1]){s.rod([0,y+k*.56,0],[x*k*.45,y+k*.26,.1*k],.035*k,glow);s.rod([0,y+k*.12,0],[x*k*.2,y-k*.45,0],.04*k,glow);}for(let i=0;i<4+Math.round(a.density*5);i++)s.ring(k*.24,.012*k,[0,y+k*.15+i*k*.05,0],glow).rotation.x=Math.PI/2;}
 if(a.projection==='map'){
  const n=5+Math.round(a.density*5);for(let z=0;z<n;z++){const pts=Array.from({length:n},(_,x)=>[(x/(n-1)-.5)*k*1.5,y+k*.22*Math.sin(x*.8)*Math.cos(z*.7),(z/(n-1)-.5)*k*1.3] as const);s.tube(pts,.012*k,glow);}for(let x=0;x<n;x++){const pts=Array.from({length:n},(_,z)=>[(x/(n-1)-.5)*k*1.5,y+k*.22*Math.sin(x*.8)*Math.cos(z*.7),(z/(n-1)-.5)*k*1.3] as const);s.tube(pts,.012*k,glow);}}
 if(a.projection==='constellation'){const pts=Array.from({length:6+Math.round(a.density*12)},()=>[(c.random()-.5)*k*1.6,y+c.random()*k*1.3,(c.random()-.5)*k*1.1] as const);pts.forEach((p,i)=>{s.ball([k*.035,k*.035,k*.035],p,glow,12);if(i>0)s.rod(pts[i-1],p,.009*k,glow);});}
 if(a.beam)for(let i=0;i<6;i++){const q=i*Math.PI/3;s.rod([Math.cos(q)*k*.4,h,Math.sin(q)*k*.4],[Math.cos(q)*k*.55,y,Math.sin(q)*k*.55],.007*k,glow);}
 if(a.controls){s.box([k*.45,.035*k,k*.18],[0,h*.75,k*.55],dark);for(let i=0;i<4;i++)s.ball([k*.025,k*.025,k*.015],[(i-1.5)*k*.1,h*.79,k*.64],glow,10);}
 return s.finish();}});

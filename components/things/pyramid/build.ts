import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 profile:choice('What pyramid silhouette dominates?',{smooth:'A clean four-sided sloping stone pyramid.',stepped:'A broad tiered ceremonial pyramid.',split:'A pyramid with a central exposed ascending stair cut.'}),
 height:score('How monumental is the structure?', ['A four-metre garden monument','A forty-metre sacred monument']),
 stone:choice('What stone forms the pyramid?',{sand:'Golden sandstone blocks.',white:'Pale limestone casing.',black:'Dark volcanic stone.'}),
 tiers:score('How many visible stone terraces are there?', ['Six broad terraces','Twenty narrow terraces']),
 shrine:noul('Does a roofed shrine stand on the top terrace?'),
 entrance:choice('How is the entrance marked?',{portal:'A small black entrance with a lintel.',sealed:'An inset sealed stone doorway.',plain:'No visible entrance.'}),
 offerings:noul('Are offering urns placed beside the stair?'),
},build(a,c){
 const s=new Sculpture(c),h=4+a.height*36,w=h*1.5,n=6+Math.round(a.tiers*14),stone=s.material(a.stone==='sand'?'#c4ad83':a.stone==='white'?'#d6cfba':'#596771'),dark=s.material('#33414a'),trim=s.material(a.stone==='black'?'#82918d':'#aa9578');
 if(a.profile==='smooth'){const body=s.cylinder(0,w/Math.sqrt(2),h,[0,h/2,0],stone,4);body.rotation.y=Math.PI/4;}
 else for(let i=0;i<n;i++){const ww=w*(1-i/(n+1));s.box([ww,h/n,ww],[0,(i+.5)*h/n,0],stone);}
 if(a.profile==='split'||a.profile==='stepped')for(let i=0;i<n*2;i++){const y=(i+.5)*h/(n*2),z=w*.5*(1-(i+.5)/(n*2));s.box([w*.14,h/(n*2),w/(n*2)],[0,y,z+w*.045],trim);}
 if(a.profile==='smooth')for(let i=1;i<n;i++){const q=w*(1-i/n);s.box([q,.022,.025],[0,h*i/n,q/2+.012],trim);}
 if(a.shrine){const sw=w/(n+1)+w*.12;s.box([sw,sw*.5,sw],[0,h+sw*.25,0],stone);s.box([sw*.3,sw*.35,.025],[0,h+sw*.2,sw/2+.01],dark);const roof=s.cylinder(0,sw*.8,sw*.35,[0,h+sw*.675,0],trim,4);roof.rotation.y=Math.PI/4;}
 if(a.entrance!=='plain'){const ew=Math.max(.7,w*.075),eh=ew*1.3,z=w*.45;s.box([ew,eh,.04],[0,eh/2,z],a.entrance==='sealed'?trim:dark);s.box([ew*1.3,eh*.14,.2],[0,eh,z],stone);for(const x of [-1,1])s.box([ew*.13,eh,.2],[x*ew*.57,eh/2,z],trim);}
 if(a.offerings)for(const x of [-1,1])s.lathe([[w*.02,0],[w*.04,w*.025],[w*.035,w*.07],[w*.02,w*.085]],trim,[x*w*.16,0,w*.53]);
 return s.finish();}});

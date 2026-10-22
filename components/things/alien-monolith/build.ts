import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 silhouette:choice('What silhouette does the alien marker have?',{slab:'A tall perfectly rectangular black slab.',obelisk:'A tapering six-sided spire.',fork:'Two unequal pylons joined by a narrow lintel.'}),
 height:score('How imposing is the marker?', ['A waist-high relic','A towering twelve-metre monument']),
 substance:choice('What substance seems to form it?',{obsidian:'Polished black obsidian.',mineral:'Pale weathered crystalline stone.',metal:'Blue-black machined alien alloy.'}),
 seam:choice('What pattern breaks the surface?',{vertical:'A single luminous vertical cut.',circuit:'Branching rectilinear glowing channels.',glyphs:'Rows of recessed triangular glyphs.'}),
 signal:choice('What signal colour escapes?',{cyan:'An icy cyan signal.',amber:'A faint amber pulse.',violet:'An ultraviolet violet glow.'}),
 fragments:noul('Do smaller fragments hover beside it?'),
 foundation:choice('How does the marker meet the ground?',{buried:'A broken stone collar around its foot.',platform:'A precise hexagonal platform.',roots:'Thin metallic roots reaching into the ground.'}),
},build(a,c){
 const s=new Sculpture(c),h=1.3+a.height*10.7,w=h*.28,body=s.material(a.substance==='obsidian'?'#1c2530':a.substance==='mineral'?'#c2bbad':'#354656',{metalness:a.substance==='metal'?.7:.3,roughness:.35}),dark=s.material('#242c31'),col=a.signal==='cyan'?'#55c2d2':a.signal==='amber'?'#d2a35a':'#a079ce',glow=s.material(col,{emissive:col,emissiveIntensity:1});
 if(a.silhouette==='slab')s.box([w,h,w*.32],[0,h/2,0],body);
 if(a.silhouette==='obelisk'){s.cylinder(w*.18,w*.62,h,[0,h/2,0],body,6);s.cylinder(0,w*.18,h*.15,[0,h*1.075,0],body,6);}
 if(a.silhouette==='fork'){for(const x of [-1,1])s.box([w*.3,h*(x===1?1:.82),w*.35],[x*w*.42,h*(x===1?.5:.41),0],body);s.box([w*.95,h*.07,w*.35],[0,h*.73,0],body);}
 const front=w*.22;
 if(a.seam==='vertical')s.box([w*.025,h*.75,.014],[0,h*.55,front],glow);
 if(a.seam==='circuit')for(let i=0;i<5;i++){const y=h*(.18+i*.14),x=(i%2===0?1:-1)*w*.18;s.rod([0,y,front],[x,y,front],w*.015,glow);s.rod([x,y,front],[x,y+h*.09,front],w*.015,glow);}
 if(a.seam==='glyphs')for(let i=0;i<7;i++){const glyph=s.mesh(new THREE.ConeGeometry(w*.08,w*.16,3),glow,[0,h*(.2+i*.1),front]);glyph.rotation.x=Math.PI/2;}
 if(a.fragments)for(let i=0;i<5;i++){const p=s.mesh(new THREE.OctahedronGeometry(w*(.07+c.random()*.08)),body,[(i%2?1:-1)*w*(.8+c.random()*.2),h*(.25+c.random()*.7),(c.random()-.5)*w]);p.rotation.set(c.random(),c.random(),c.random());}
 if(a.foundation==='platform')s.cylinder(w*.85,w, .22,[0,.11,0],body,6);
 if(a.foundation==='buried')for(let i=0;i<9;i++){const q=i*Math.PI*2/9;s.mesh(new THREE.DodecahedronGeometry(w*.12),dark,[Math.sin(q)*w*.7,w*.05,Math.cos(q)*w*.7]);}
 if(a.foundation==='roots')for(let i=0;i<6;i++){const q=i*Math.PI/3;s.tube([[0,h*.1,0],[Math.sin(q)*w*.45,.2,Math.cos(q)*w*.45],[Math.sin(q)*w,.06,Math.cos(q)*w]],w*.02,body);}
 return s.finish();}});

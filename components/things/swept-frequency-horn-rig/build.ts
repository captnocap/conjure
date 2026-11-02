import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    horn:choice('What is the horn profile?', {'exponential': 'A rapidly flaring circular horn.', 'conical': 'A straight conical horn.', 'rectangular': 'A wide rectangular exponential horn.', 'folded': 'A two-part bent horn with an offset mouth.'}),
    mouth:choice('How is the mouth finished?', {'rim': 'A thick rolled mouth rim.', 'bare': 'A thin bare mouth edge.', 'grille': 'An open protective wire grille.', 'flange': 'A broad bolted mounting flange.'}),
    driver:choice('What drives the horn?', {'round': 'One large round compression driver.', 'stack': 'Two stacked driver chambers.', 'box': 'A rectangular sealed driver enclosure.', 'exposed': 'A ribbed driver with exposed cooling fins.'}),
    aim:choice('How is the horn aimed?', {'level': 'The horn points horizontally.', 'up': 'The horn points slightly upward.', 'down': 'The horn points slightly downward.', 'side': 'The horn points diagonally across the rail.'}),
    mount:choice('What supports the sound source?', {'fork': 'A tilting fork on a heavy pedestal.', 'tripod': 'A broad splayed tripod.', 'sled': 'A low two-runner sled.', 'cradle': 'A four-foot bench cradle.'}),
    receiver:choice('What measures the sweep?', {'single': 'One microphone at the end of a rail.', 'pair': 'Two microphones at different distances.', 'arc': 'Three microphones along a curved receiver arc.', 'none': 'No measurement microphone is fitted.'}),
    rail:choice('What defines the measurement distance?', {'ticks': 'A straight rail with distance ticks.', 'ladder': 'A ladder-like twin rail.', 'tape': 'A flat marked measurement tape.', 'arc': 'A curved distance guide.'}),
    state:choice('What test state is visible?', {'ready': 'The horn is clear and ready.', 'capped': 'A protective cap covers the mouth.', 'reference': 'A small reference reflector stands on the rail.', 'service': 'A removed driver cover rests by the base.'}),
    size:score('How broad is the horn mouth?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const metal=s.material('#9da7a1',{metalness:0.65}),dark=s.material('#3e5150'),pale=s.material('#c6c5ad'),accent=s.material('#b27a47'),foam=s.material('#7a8374');
const R=0.28+a.size*0.25,L=0.9,H=a.mount==='sled'?0.6:1.05;const start=s.root.children.length,g=new THREE.Group();
const rad=(v:number)=>0.06+(R-0.06)*(a.horn==='conical'?v:v*v);if(a.horn==='rectangular'){s.surface((u,v,p)=>{const e=Math.min(u*4,3.999999),k=Math.floor(e),t=e-k,cs=[[-1,-0.65],[1,-0.65],[1,0.65],[-1,0.65],[-1,-0.65]],r=rad(v);p.set((cs[k][0]*(1-t)+cs[k+1][0]*t)*r,(cs[k][1]*(1-t)+cs[k+1][1]*t)*r,v*L);},accent,{segments:[32,20],wrap:true});accent.side=THREE.DoubleSide;}else s.surface((u,v,p)=>{const t=u*Math.PI*2,r=rad(v),offset=a.horn==='folded'?0.25*Math.sin(v*Math.PI*0.5):0;p.set(Math.cos(t)*r+offset,Math.sin(t)*r,v*L);},accent,{segments:[40,24],wrap:true});accent.side=THREE.DoubleSide;
const mx=a.horn==='folded'?0.25:0;if(a.horn==='rectangular')for(const y of [-R*0.65,R*0.65])s.rod([-R,y,L],[R,y,L],0.018,metal);else s.ring(R,a.mouth==='rim'?0.035:0.014,[mx,0,L],metal);
if(a.mouth==='grille')for(let j=-3;j<=3;j++){const x=j*R/4,len=Math.sqrt(R*R-x*x);s.rod([mx+x,-len,L+0.01],[mx+x,len,L+0.01],0.008,metal);}if(a.mouth==='flange')for(let j=0;j<8;j++){const t=j/8*Math.PI*2;s.ball([0.022,0.022,0.014],[mx+Math.cos(t)*R,Math.sin(t)*R,L+0.015],dark,8);}
if(a.driver==='box')s.box([0.3,0.3,0.3],[0,0,-0.15],dark);else {s.cylinder(0.16,0.16,a.driver==='stack'?0.4:0.25,[0,0,-0.13],dark,24).rotation.x=Math.PI/2;if(a.driver==='exposed'||a.driver==='stack')for(let j=0;j<5;j++)s.ring(0.18,0.018,[0,0,-0.02-j*0.06],metal);}
if(a.state==='capped'){if(a.horn==='rectangular')s.box([R*2.04,R*1.34,0.03],[mx,0,L+0.02],foam);else {const m=s.cylinder(R,R,0.03,[mx,0,L+0.02],foam,32);m.rotation.x=Math.PI/2;}}for(const c of s.root.children.slice(start))g.add(c);g.position.y=H;g.rotation.x=a.aim==='up'?-0.2:a.aim==='down'?0.2:0;g.rotation.y=a.aim==='side'?0.3:0;s.root.add(g);
if(a.mount==='tripod')for(let j=0;j<3;j++){const t=j/3*Math.PI*2;s.rod([Math.cos(t)*0.5,0.02,Math.sin(t)*0.5],[0,H,0],0.035,metal);}else{for(const x of [-0.3,0.3])s.rod([x,0.06,0],[x,H,0],0.03,metal);s.rod([-0.3,H,0],[0.3,H,0],0.025,metal);if(a.mount==='sled')for(const x of [-0.35,0.35])s.box([0.08,0.07,1.2],[x,0.035,0],dark);else s.box([0.9,0.08,0.65],[0,0.04,0],dark);}
if(a.rail==='arc'){s.ring(1.45,0.02,[0,0.025,0],metal,Math.PI*0.75).rotation.x=Math.PI/2;}else{for(const x of(a.rail==='ladder'?[-0.15,0.15]:[0]))s.box([a.rail==='tape'?0.06:0.03,0.025,2],[x,0.025,1.2],a.rail==='tape'?pale:metal);for(let j=0;j<14;j++)s.box([a.rail==='ladder'?0.35:0.12,0.01,0.012],[0,0.045,0.3+j*0.14],dark);}
if(a.receiver!=='none'){const ps=a.receiver==='arc'?[[-0.7,1.65],[0,1.9],[0.7,1.65]]:a.receiver==='pair'?[[0,1.5],[0,2.1]]:[[0,2]];for(const [x,z] of ps){s.cylinder(0.16,0.16,0.035,[x,0.02,z],dark,24);s.rod([x,0.03,z],[x,H,z],0.018,metal);s.cylinder(0.025,0.025,0.15,[x,H,z],dark,12).rotation.x=Math.PI/2;}}
if(a.state==='reference'){s.rod([0.25,0,1.6],[0.25,H,1.6],0.02,metal);s.ball([0.09,0.09,0.09],[0.25,H,1.6],metal,20);}if(a.state==='service')s.cylinder(0.17,0.17,0.04,[-0.6,0.025,0],metal,24);

return s.finish();
}});

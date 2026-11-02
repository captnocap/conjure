import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    collector:choice('What is the collector shape?', {'round': 'A wide circular funnel.', 'square': 'A square hopper tapers into the stem.', 'long': 'An elongated trough feeds the jar.', 'twin': 'Two small funnels share a frame.'}),
    support:choice('How is the collector supported?', {'tripod': 'A tall splayed tripod.', 'post': 'A single post with a broad foot.', 'frame': 'A square four-legged frame.', 'wall': 'A low bent bracket on a heavy block.'}),
    jar:choice('What receives the ash?', {'graduated': 'A tall graduated glass jar.', 'bottle': 'A narrow-neck sample bottle.', 'bag': 'A flexible collection bag.', 'carousel': 'Three jars on a small rotating tray.'}),
    cover:choice('What protects the inlet?', {'open': 'An open unobstructed collector.', 'roof': 'A raised rain shield with an air gap.', 'mesh': 'A coarse bird screen spans the rim.', 'lid': 'A hinged lid is folded back.'}),
    sample:choice('What has accumulated?', {'empty': 'A clean empty sample vessel.', 'dust': 'A thin pale ash layer.', 'layered': 'Three distinct fall layers.', 'full': 'The vessel is nearly full of coarse ash.'}),
    level:choice('How is the collector levelled?', {'feet': 'Three large screw feet.', 'bubble': 'A small bubble level on the rim.', 'plumb': 'A hanging plumb line beside the stem.', 'marks': 'A cross of reference marks on the support plate.'}),
    label:choice('How is the sample identified?', {'date': 'A large dated sample card.', 'number': 'A numbered station plate.', 'bands': 'Two contrasting identification bands.', 'none': 'No separate sample label.'}),
    event:choice('What state is the collector in?', {'deployed': 'Set up and collecting.', 'changing': 'A sealed spare jar waits beside the support.', 'clogged': 'A few coarse clasts lodge at the throat.', 'covered': 'A protective sleeve covers the lower sample vessel.'}),
    size:score('How broad is the collector mouth?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const metal=s.material('#9aa6a1',{metalness:0.65}),dark=s.material('#435152'),orange=s.material('#b76f3e'),pale=s.material('#c7c8b4'),rock=s.material('#716f64');
const R=0.35+a.size*0.28,H=a.support==='wall'?0.75:1.35,n=a.collector==='twin'?2:1;
const funnel=(x:number,r:number)=>{if(a.collector==='square'){const sh=new THREE.Shape();sh.moveTo(-r,-r);sh.lineTo(r,-r);sh.lineTo(r,r);sh.lineTo(-r,r);sh.closePath();s.surface((u,v,p)=>{const edge=Math.min(u*4,3.999999),k=Math.floor(edge),t=edge-k;const corners=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]];const xx=corners[k][0]*(1-t)+corners[k+1][0]*t,zz=corners[k][1]*(1-t)+corners[k+1][1]*t,rr=0.06+(r-0.06)*v;p.set(x+xx*rr,H-0.3+v*0.3,zz*rr);},metal,{segments:[32,8],wrap:true});metal.side=THREE.DoubleSide;}else{const f=s.lathe([[0.055,0],[0.055,0.05],[r,0.34],[r+0.025,0.34],[r+0.025,0.31],[0.075,0.04],[0.075,0]],metal,[x,H-0.34,0]);if(a.collector==='long')f.scale.z=0.55;}
s.cylinder(0.045,0.045,0.2,[x,H-0.43,0],metal,16);
if(a.cover==='roof'){s.cylinder(0.02,r*1.1,0.18,[x,H+0.25,0],pale,24);for(const z of [-r*0.65,r*0.65])s.rod([x,H,z],[x,H+0.2,z],0.015,metal);}if(a.cover==='mesh')for(let j=-3;j<=3;j++){const v=j*r/4,len=Math.sqrt(r*r-v*v);s.rod([x-len,H+0.01,v],[x+len,H+0.01,v],0.008,dark);s.rod([x+v,H+0.01,-len],[x+v,H+0.01,len],0.008,dark);}if(a.cover==='lid'){const lid=s.cylinder(r,r,0.025,[x,H+r*0.7,-r*0.7],pale,32);lid.rotation.x=0.9;}
if(a.level==='bubble')s.ball([0.06,0.025,0.04],[x+r,H,0],s.material('#94b2a0'),12);if(a.event==='clogged')for(let j=0;j<7;j++)s.mesh(new THREE.IcosahedronGeometry(0.035,0),rock,[x+(rnd()-0.5)*0.13,H-0.24+rnd()*0.06,(rnd()-0.5)*0.13]);};for(let j=0;j<n;j++)funnel((j-(n-1)/2)*R*1.25,n===2?R*0.7:R);
const glass=s.material('#9ab5b0',{transparent:true,opacity:0.45,depthWrite:false}),jy=H-0.72;
const jar=(x:number,z:number)=>{if(a.jar==='bag')s.ball([0.14,0.23,0.11],[x,jy,z],pale,16);else{s.cylinder(a.jar==='bottle'?0.07:0.13,0.13,0.38,[x,jy,z],glass,24);s.ring(0.13,0.013,[x,jy+0.19,z],metal).rotation.x=Math.PI/2;for(let j=0;j<5;j++)s.rod([x-0.06,jy-0.13+j*0.06,z+0.132],[x+0.02,jy-0.13+j*0.06,z+0.132],0.005,dark);}
const sh=a.sample==='empty'?0:a.sample==='dust'?0.025:a.sample==='full'?0.32:0.18;if(sh)s.cylinder(0.115,0.115,sh,[x,jy-0.18+sh/2,z],rock,20);if(a.sample==='layered')for(let j=0;j<3;j++)s.cylinder(0.117,0.117,0.04,[x,jy-0.15+j*0.055,z],j%2?pale:dark,20);if(a.event==='covered')s.cylinder(0.145,0.145,0.28,[x,jy-0.03,z],orange,20);};
if(a.jar==='carousel'){s.cylinder(0.35,0.35,0.035,[0,jy-0.22,0],metal,24);for(let j=0;j<3;j++){const t=j/3*Math.PI*2;jar(Math.cos(t)*0.21,Math.sin(t)*0.21);}}else jar(0,0);
const legs=a.support==='post'?1:a.support==='frame'?4:3;for(let j=0;j<legs;j++){const t=j/legs*Math.PI*2,rad=a.support==='post'?0:R*0.9;s.rod([Math.cos(t)*rad,0.04,Math.sin(t)*rad],[Math.cos(t)*R*0.4,H-0.25,Math.sin(t)*R*0.4],0.025,metal);if(a.level==='feet')s.cylinder(0.08,0.08,0.04,[Math.cos(t)*rad,0.025,Math.sin(t)*rad],dark,16);}if(a.support==='post'||a.support==='wall')s.box([0.45,0.1,0.45],[0,0.05,0],rock);s.ring(R*0.4,0.025,[0,H-0.25,0],metal).rotation.x=Math.PI/2;
if(a.level==='plumb'){s.rod([R,H,0],[R,0.15,0],0.004,dark);s.cylinder(0.025,0,0.07,[R,0.12,0],metal,12);}if(a.level==='marks')for(const v of [-1,1])s.rod([-0.1,0.11,v*0.1],[0.1,0.11,-v*0.1],0.008,dark);
if(a.label==='date'||a.label==='number')s.label(a.label==='date'?'30 OCT':'ASH 06',0.28,0.14,[0,H-0.37,R*0.45],'#34494a','#ddd7b9');if(a.label==='bands')for(const y of [jy-0.08,jy+0.08])s.ring(0.135,0.015,[0,y,0],orange).rotation.x=Math.PI/2;if(a.event==='changing'){s.cylinder(0.12,0.12,0.32,[R+0.3,0.16,0],glass,20);s.cylinder(0.13,0.13,0.035,[R+0.3,0.34,0],orange,20);}

return s.finish();
}});

import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    body: choice("What encloses the fire?", {"round": "A cylindrical cast-iron firebox.", "square": "A square brick-lined firebox.", "barrel": "A broad horizontal barrel stove.", "taper": "A tapered upright stove."}),
    pan: choice("How is the sand bed held?", {"round": "A circular shallow pan.", "trough": "A long rectangular drying trough.", "tier": "Two stacked circular pans.", "trays": "Two side-by-side trays."}),
    door: choice("What is the fire door doing?", {"closed": "The door is latched shut.", "open": "The door swings outward.", "grille": "A barred grate exposes the firebox.", "ajar": "The door stands partly open."}),
    chimney: choice("What chimney is fitted?", {"straight": "A tall straight flue.", "elbow": "A rear-offset bent flue.", "short": "A short capped flue.", "twin": "Two narrow flues."}),
    sand: choice("What is in the drying pan?", {"full": "A thick flat bed of sand.", "heap": "A mound awaiting spreading.", "low": "A thin residual layer.", "empty": "The pan is empty."}),
    base: choice("What supports the stove?", {"legs": "Four cast feet.", "brick": "A low masonry hearth.", "skids": "Two long transport skids.", "plinth": "A square concrete plinth."}),
    tool: choice("What tending tool rests nearby?", {"rake": "A long sand rake.", "shovel": "A coal shovel.", "bucket": "A handled ash bucket.", "none": "No loose tool."}),
    fire: choice("What condition is the fire in?", {"glow": "A low red coal bed.", "ash": "Grey ash fills the grate.", "clean": "The grate is empty.", "logs": "Two short fuel billets."}),
    size: score("How large is the stove?", ["Small service stove", "Standard drying stove", "Depot-scale stove"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#71665c',{metalness:.5}),dark=s.material('#3e423d'),brass=s.material('#b59c66',{metalness:.6}),sand=s.material('#cdbb89'),wood=s.material('#a58b63'),pale=s.material('#d5cbb0');

 const R=.33+a.size*.13,H=.7+a.size*.3,by=.16;
 if(a.base==='brick'||a.base==='plinth')s.box([1.15,by,.95],[0,by/2,0],a.base==='brick'?wood:pale);else{for(const x of [-.3,.3])for(const z of [-.25,.25])s.rod([x,.02,z],[x,by+.05,z],.045,iron);if(a.base==='skids')for(const z of [-.3,.3])s.box([1.2,.06,.12],[0,.03,z],wood);}
 if(a.body==='square')s.box([R*2,H,R*2],[0,by+H/2,0],iron);else if(a.body==='barrel'){s.cylinder(R,R,H,[0,by+R,0],iron,32).rotation.z=Math.PI/2;s.box([H,.1,R*2],[0,by+R*2,0],iron);}else s.cylinder(a.body==='taper'?R*.75:R,R,H,[0,by+H/2,0],iron,32);
 const top=a.body==='barrel'?by+R*2+.05:by+H,dy=by+.27,dz=R+.015;if(a.body==='barrel')s.box([.36,.34,.15],[0,dy,dz-.06],iron);s.box([.32,.29,.016],[0,dy,dz+.02],dark);
 const angle={closed:0,open:-1.2,grille:0,ajar:-.4}[a.door];if(a.door==='grille'){for(let j=0;j<6;j++)s.rod([-.14+j*.056,dy-.13,dz+.04],[-.14+j*.056,dy+.13,dz+.04],.009,iron);}else{const door=new THREE.Group();door.position.set(-.16,dy,dz+.025);const m=s.box([.32,.3,.035],[.16,0,0],iron);door.add(m);const h=s.rod([.26,-.03,.035],[.26,.03,.035],.012,brass);door.add(h);door.rotation.y=angle;s.root.add(door);}
 if(a.fire!=='clean'){const mat=a.fire==='glow'?s.material('#b86835'):a.fire==='logs'?wood:pale;for(let j=0;j<4;j++)s.ball([.035,.025,.02],[-.1+j*.065,dy-.09,dz+.04],mat,8);}
 const tray=(x:number,y:number,z:number,w:number,d:number,round:boolean)=>{if(round)s.lathe([[0,0],[w/2,0],[w/2,.12],[w/2-.025,.12],[w/2-.025,.025],[0,.025]],iron,[x,y,z]);else{s.box([w,.025,d],[x,y+.0125,z],iron);for(const xx of [-1,1])s.box([.025,.12,d],[x+xx*w/2,y+.06,z],iron);for(const zz of [-1,1])s.box([w,.12,.025],[x,y+.06,z+zz*d/2],iron);}if(a.sand!=='empty'){const level=a.sand==='full'?.07:.035;if(round)s.cylinder(w/2-.035,w/2-.035,level,[x,y+.025+level/2,z],sand,32);else s.box([w-.045,level,d-.045],[x,y+.025+level/2,z],sand);if(a.sand==='heap')s.cylinder(.01,w*.3,.13,[x,y+.12,z],sand,24);}};
 if(a.pan==='trays'){for(const x of [-.28,.28])tray(x,top,0,.52,.72,false);}else{tray(0,top,0,a.pan==='trough'?1.2:1,.72,a.pan!=='trough');if(a.pan==='tier'){for(const x of [-.3,.3])s.rod([x,top,0],[x,top+.34,0],.025,iron);tray(0,top+.34,0,.8,.7,true);}}
 for(const x of a.chimney==='twin'?[-.2,.2]:[0]){const end=top+(a.chimney==='short'?.5:1.05),z=-R-.07;s.tube([[x,by+H*.65,-R*.6],[x,by+H*.65,z],[x,top+.25,z],[a.chimney==='elbow'?x+.3:x,end,z]],a.chimney==='twin'?.055:.08,iron);if(a.chimney==='short')s.cylinder(.13,.13,.035,[x,end+.01,z],iron,24);}
 if(a.tool==='bucket'){s.lathe([[0,0],[.13,0],[.17,.25],[.15,.25],[.11,.025],[0,.025]],iron,[.7,0,.1]);s.tube([[.54,.22,.1],[.7,.4,.1],[.86,.22,.1]],.008,iron);}else if(a.tool!=='none'){s.rod([.65,.025,.35],[.55,top+.1,.05],.018,wood);if(a.tool==='shovel')s.box([.18,.04,.23],[.65,.025,.35],iron);else{for(let j=0;j<7;j++)s.rod([.5+j*.05,.025,.29],[.5+j*.05,.025,.41],.008,iron);s.rod([.5,.025,.3],[.8,.025,.3],.014,iron);}}return s.finish();

  },
});

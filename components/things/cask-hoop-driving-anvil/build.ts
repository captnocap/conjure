import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    stake: choice("What anvil head is fitted?", {"horn": "A long tapered horn.", "mushroom": "A broad rounded stake head.", "flat": "A flat square anvil head.", "fork": "A forked hoop-support head."}),
    base: choice("What supports the stake?", {"stump": "A heavy timber stump.", "block": "A square timber block.", "tripod": "An iron tripod stand.", "stone": "A dressed stone plinth."}),
    hoop: choice("What hoop is being worked?", {"round": "A complete round hoop.", "open": "An open-ended hoop.", "oval": "A broad oval hoop.", "none": "No working hoop."}),
    position: choice("How is the hoop held?", {"upright": "Standing upright over the head.", "flat": "Lying horizontally on the anvil.", "lean": "Leaning against the stand.", "small": "A small hoop on the horn."}),
    rivet: choice("What joint detail is shown?", {"overlap": "An overlapping hoop joint.", "bolts": "Two temporary fastening bolts.", "rivet": "Three finished rivet heads.", "plain": "An unmarked hoop."}),
    hammer: choice("What hammer lies nearby?", {"sledge": "A heavy short sledge.", "cross": "A cross-peen hammer.", "mallet": "A timber-faced mallet.", "none": "No hammer."}),
    stock: choice("What spare material is present?", {"strip": "Two flat iron hoop strips.", "rings": "Two spare finished hoops.", "rivets": "A small tray of rivets.", "none": "No spare material."}),
    state: choice("What workshop detail appears?", {"clean": "A clean working stand.", "chalk": "Chalk sizing marks.", "wedge": "A timber packing wedge.", "tongs": "Long hoop-holding tongs."}),
    height: score("How tall is the working stake?", ["Low shop stake", "Standard cooper anvil", "Tall standing stake"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#a68a5e'),light=s.material('#c0a46e'),dark=s.material('#5b543f'),iron=s.material('#606f5d',{metalness:.5}),brass=s.material('#b59e63'),pale=s.material('#dfd0a7');

 const H=.65+a.height*.45,Y=H-.18;if(a.base==='stump')s.cylinder(.27,.33,Y,[0,Y/2,0],wood,20);if(a.base==='block')s.box([.5,Y,.5],[0,Y/2,0],wood);if(a.base==='stone')s.box([.55,Y,.5],[0,Y/2,0],pale);if(a.base==='tripod')for(let j=0;j<3;j++){const t=j*Math.PI*2/3;s.rod([Math.sin(t)*.35,0,Math.cos(t)*.35],[0,Y,0],.045,iron);}s.cylinder(.07,.1,.22,[0,Y+.11,0],iron,20);
 if(a.stake==='flat')s.box([.36,.1,.25],[0,H+.02,0],iron);if(a.stake==='mushroom')s.ball([.22,.08,.18],[0,H+.02,0],iron,20);if(a.stake==='horn')s.rod([-.28,H+.02,0],[.3,H+.02,0],.09,iron,.015);if(a.stake==='fork')for(const x of [-.12,.12])s.rod([x,H-.08,0],[x,H+.15,0],.035,iron);
 const R=a.position==='small'?.19:.36;if(a.hoop!=='none'){const g=new THREE.Group();g.position.set(a.position==='lean'?.38:0,a.position==='lean'?R:H+R-.04,a.position==='lean'?.1:0);if(a.position==='flat'){g.position.y=H+.09;g.rotation.x=Math.PI/2;}if(a.position==='lean')g.rotation.y=.15;const hoop=s.ring(R,.018,[0,0,0],iron,a.hoop==='open'?Math.PI*1.7:Math.PI*2);if(a.hoop==='oval')hoop.scale.x*=1.35;g.add(hoop);if(a.rivet!=='plain')for(let j=0;j<(a.rivet==='bolts'?2:3);j++)g.add(s.ball([.012,.012,.012],[-.025+j*.025,R,.015],brass,8));s.root.add(g);}
 if(a.hammer!=='none'){s.rod([-.2,.025,.45],[.15,.025,.45],.018,wood);s.box([a.hammer==='sledge'?.12:.08,.07,a.hammer==='cross'?.1:.16],[.18,.035,.45],a.hammer==='mallet'?dark:iron);}if(a.stock==='strip')for(const z of [-.42,-.49])s.box([.9,.018,.045],[0,.009,z],iron);if(a.stock==='rings')for(const x of [-.2,.2])s.ring(.3,.014,[x,.014,-.5],iron).rotation.x=Math.PI/2;if(a.stock==='rivets'){s.box([.25,.02,.15],[.5,.01,-.2],wood);for(let j=0;j<6;j++)s.ball([.012,.012,.012],[.42+j*.025,.03,-.2],iron,8);}if(a.state==='chalk')s.label('32',.12,.08,[0,Y*.65,.28],'#ded0ad','#5e5841');if(a.state==='wedge')s.box([.18,.04,.08],[-.45,.02,0],wood);if(a.state==='tongs')for(const z of [.38,.42])s.rod([-.4,.015,z],[.35,.015,.4],.01,iron);return s.finish();

  },
});

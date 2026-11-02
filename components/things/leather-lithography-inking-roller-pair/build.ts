import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    count: choice("How many rollers are on the stand?", {"one": "One broad roller.", "two": "A matched pair.", "three": "Three graduated rollers.", "four": "Four narrow rollers."}),
    cover: choice("What roller surface is visible?", {"leather": "A continuous leather sleeve.", "seamed": "A leather cover with a raised seam.", "segments": "Three separated leather sections.", "grooves": "A roller with shallow end grooves."}),
    handles: choice("What handles are fitted?", {"long": "Long straight wooden grips.", "knobs": "Short grips with round ends.", "cross": "Small crossed hand grips.", "bare": "Exposed metal axle ends."}),
    stand: choice("What supports the rollers?", {"low": "Low twin resting forks.", "bench": "A four-legged inking bench.", "rack": "A tiered roller storage rack.", "blocks": "Solid low bearing blocks."}),
    arrangement: choice("How are the rollers arranged?", {"parallel": "Parallel rollers side by side.", "fan": "The outer rollers splay outward.", "cross": "The rollers alternate direction on separate levels.", "stack": "A vertical storage stack."}),
    ink: choice("Where is the visible ink?", {"full": "A complete dark ink layer.", "middle": "Ink covers the central band.", "ends": "Ink remains only at the ends.", "clean": "The roller covers are clean."}),
    slab: choice("What inking slab is nearby?", {"square": "A square stone inking slab.", "long": "A long narrow inking slab.", "round": "A circular inking plate.", "none": "No separate slab."}),
    knife: choice("What spreads the ink?", {"wide": "A broad palette knife.", "narrow": "A narrow steel spatula.", "pair": "Two crossed spreading knives.", "none": "No knife is left out."}),
    supply: choice("What supplies sit beside the slab?", {"pot": "One open ink pot.", "tins": "Two shallow ink tins.", "cloth": "A folded wiping cloth.", "clear": "A clear working surface."}),
    state: choice("What work stage is shown?", {"mixing": "A striped ink patch on the slab.", "proof": "A small test strip lies beside the rollers.", "wrapped": "One roller has a paper storage wrapper.", "ready": "The set is ready for use."}),
    length: score("How long are the rollers?", ["Small proof rollers", "Standard hand rollers", "Wide edition rollers"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9b805b'),light=s.material('#c0a97d'),iron=s.material('#536b61',{metalness:.42}),dark=s.material('#3e4b42'),stone=s.material('#c4c3a6'),paper=s.material('#eee4c5',{side:THREE.DoubleSide}),leather=s.material('#78644b'),water=s.material('#93b6a7',{transparent:true,opacity:.5,depthWrite:false});

 const L=.55+a.length*.55,n={one:1,two:2,three:3,four:4}[a.count],Y=a.stand==='bench'?.65:.06,stack=a.arrangement==='stack'||a.stand==='rack'||a.arrangement==='cross',D=1.35;s.box([L+.7,.06,D],[0,Y-.03,0],wood);if(a.stand==='bench')for(const x of [-(L+.7)*.42,(L+.7)*.42])for(const z of [-.55,.55])s.box([.065,Y,.07],[x,Y/2,z],wood);
 for(let j=0;j<n;j++){const g=new THREE.Group();s.root.add(g);g.position.set(0,Y+(stack?j*.26:0),stack?-.3:(j-(n-1)/2)*(a.arrangement==='fan'?.28:.22)-.15);g.rotation.y=a.arrangement==='fan'?(j-(n-1)/2)*.12:a.arrangement==='cross'&&j%2?Math.PI/2:0;const prior=s.root.children.slice(),l=L*(a.count==='three'?1-j*.15:1),R=a.count==='four'?.07:.095,cy=.16;
 for(const x of [-l*.43,l*.43]){s.box([.08,cy-R,.15],[x,(cy-R)/2,0],a.stand==='blocks'?stone:wood);if(stack&&j>0)s.rod([x,-j*.26,0],[x,cy-R,0],.025,wood);}s.rod([-l/2-.18,cy,0],[l/2+.18,cy,0],.018,iron);
 for(let k=0;k<(a.cover==='segments'?3:1);k++){const len=a.cover==='segments'?l*.3:l,x=a.cover==='segments'?(k-1)*l*.34:0;s.cylinder(R,R,len,[x,cy,0],leather,24).rotation.z=Math.PI/2;}if(a.cover==='seamed')s.rod([-l/2,cy+R,0],[l/2,cy+R,0],.005,light);if(a.cover==='grooves')for(const x of [-l*.4,-l*.34,l*.34,l*.4])s.ring(R+.003,.005,[x,cy,0],dark).rotation.y=Math.PI/2;
 if(a.ink!=='clean')for(const x of a.ink==='ends'?[-l*.38,l*.38]:[0])s.cylinder(R+.004,R+.004,a.ink==='full'?l*.98:a.ink==='ends'?l*.2:l*.45,[x,cy,0],dark,24).rotation.z=Math.PI/2;
 for(const side of [-1,1]){const x=side*(l/2+.1);if(a.handles!=='bare')s.rod([side*(l/2+.015),cy,0],[side*(l/2+.19),cy,0],a.handles==='long'?.032:.025,wood);if(a.handles==='knobs')s.ball([.045,.045,.045],[x+side*.1,cy,0],wood,12);if(a.handles==='cross')s.rod([x,cy,-.08],[x,cy,.08],.02,wood);}if(a.state==='wrapped'&&j===0)s.cylinder(R+.008,R+.008,l*.7,[0,cy,0],paper,24).rotation.z=Math.PI/2;for(const obj of s.root.children.slice())if(!prior.includes(obj))g.add(obj);}
 const z=.47;if(a.slab!=='none'){if(a.slab==='round')s.cylinder(.23,.23,.045,[0,Y+.0225,z],stone,32);else s.box([a.slab==='long'?L+.2:.45,.045,a.slab==='long'?.25:.4],[0,Y+.0225,z],stone);if(a.state==='mixing')for(let j=0;j<5;j++)s.box([.28,.003,.025],[0,Y+.047,z-.1+j*.05],dark);}if(a.knife!=='none')for(const dz of a.knife==='pair'?[-.06,.06]:[0]){s.box([a.knife==='wide'?.18:.22,.012,a.knife==='wide'?.08:.035],[-L*.45,Y+.012,z+dz],iron);s.rod([-L*.45-.1,Y+.02,z+dz],[-L*.45-.22,Y+.02,z+dz],.015,wood);}if(a.supply==='pot')s.lathe([[0,0],[.075,0],[.08,.12],[.065,.12],[0,.018]],iron,[L*.55,Y,z]);if(a.supply==='tins')for(const dz of [-.09,.09])s.cylinder(.075,.075,.035,[L*.55,Y+.0175,z+dz],dark,24);if(a.supply==='cloth')s.box([.18,.035,.23],[L*.55,Y+.0175,z],paper);if(a.state==='proof'){s.box([.24,.006,.08],[0,Y+.004,.65],paper);for(let j=0;j<5;j++)s.box([.025,.002,.04],[-.08+j*.04,Y+.008,.65],dark);}
return s.finish();
  },
});

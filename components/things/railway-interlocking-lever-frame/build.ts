import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    count: choice("How many working levers?", {"three": "Three levers.", "five": "Five levers.", "seven": "Seven levers.", "nine": "Nine levers."}),
    position: choice("How are the levers set?", {"normal": "All stand in the normal position.", "reverse": "All are pulled forward.", "alternate": "Alternate levers are reversed.", "one": "Only the centre lever is reversed."}),
    frame: choice("What supports the lever bank?", {"iron": "Two cast iron end standards.", "wood": "A timber-framed base.", "pedestal": "A full steel pedestal.", "open": "An open braced underframe."}),
    handles: choice("What grip shape is fitted?", {"round": "Rounded cylindrical hand grips.", "swan": "Curved swan-neck grips.", "tee": "Crossbar grips.", "long": "Long straight handles."}),
    quadrant: choice("What guides each lever?", {"arc": "Raised semicircular quadrants.", "teeth": "Notched locking sectors.", "plates": "Flat elongated slots.", "open": "Exposed pivots without quadrants."}),
    locking: choice("What is visible below the frame?", {"rods": "Parallel locking rods.", "box": "An enclosed locking chest.", "bars": "Crossed tappet bars.", "clear": "An open underframe."}),
    plates: choice("What identification is fitted?", {"numbers": "Number plates below each lever.", "flags": "Raised destination flags.", "strip": "A continuous route strip.", "none": "No labels."}),
    access: choice("What lies in front of the frame?", {"deck": "A timber standing platform.", "grate": "A low grated footboard.", "rail": "A protective foot rail.", "clear": "Clear floor space."}),
    height: score("How tall are the levers?", ["Compact frame", "Standard full-size frame", "Tall heavy-duty frame"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#52665c',{metalness:.5}),dark=s.material('#39463f'),brass=s.material('#b79d67',{metalness:.7}),wood=s.material('#947651'),pale=s.material('#d8ceb3'),red=s.material('#a45f4f');

 const n={three:3,five:5,seven:7,nine:9}[a.count],W=n*.23+.2,Y=.42,L=.75+a.height*.4;
 for(const z of [-.2,.2])s.box([W,.08,.09],[0,Y-.04,z],a.frame==='wood'?wood:iron);for(const x of [-W/2+.08,W/2-.08]){if(a.frame==='pedestal')s.box([.14,Y,.5],[x,Y/2,0],iron);else for(const z of [-.2,.2])s.rod([x,0,z],[x,Y,z],a.frame==='wood'?.05:.035,a.frame==='wood'?wood:iron);if(a.frame==='open')s.rod([x,0,-.2],[x,Y,.2],.025,iron);}
 for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.23,pull=a.position==='reverse'||a.position==='alternate'&&j%2===0||a.position==='one'&&j===Math.floor(n/2),ang=pull?-.32:.14;const g=new THREE.Group();g.position.set(x,Y,0);s.root.add(g);const mat=j%3===0?red:j%3===1?iron:brass;const add=(m:THREE.Object3D)=>g.add(m);add(s.rod([0,-.1,0],[0,L,0],.025,mat));if(a.handles==='swan')add(s.tube([[0,L-.1,0],[0,L+.02,.06],[0,L+.14,.06]],.025,dark));else if(a.handles==='tee')add(s.rod([-.07,L,0],[.07,L,0],.025,dark));else add(s.rod([0,L-.15,0],[0,L+(a.handles==='long'?.18:.03),0],.032,dark));g.rotation.x=ang;
 s.cylinder(.07,.07,.09,[x,Y,0],brass,20).rotation.z=Math.PI/2;if(a.quadrant==='arc'||a.quadrant==='teeth'){s.ring(.21,.015,[x,Y,.01],iron,Math.PI).rotation.y=Math.PI/2;if(a.quadrant==='teeth')for(let k=0;k<7;k++)s.box([.035,.025,.025],[x,Y+.12+Math.sin(k*Math.PI/6)*.07,-.15+k*.05],brass);}if(a.quadrant==='plates')s.box([.1,.025,.48],[x,Y+.015,0],iron);
 if(a.locking==='rods')s.rod([x,Y-.08,0],[x,.1,-.6],.015,iron);if(a.locking==='bars'){s.rod([x,Y-.1,.2],[x,.2,-.5],.012,brass);s.rod([x,Y-.13,-.2],[x,.2,.5],.012,iron);}if(a.plates==='numbers')s.label(String(j+1),.1,.07,[x,Y-.1,.25],'#e0d5b7','#554f40');if(a.plates==='flags'){s.rod([x,Y,-.18],[x,Y+.3,-.18],.005,iron);s.label(String(j+1),.12,.07,[x,Y+.28,-.17],'#e0d5b7','#554f40');}}
 if(a.locking==='box')s.box([W,.23,.65],[0,.18,-.12],wood);if(a.plates==='strip')s.box([W,.1,.035],[0,Y-.12,.26],pale);if(a.access==='deck')s.box([W+.2,.08,.55],[0,.04,.55],wood);if(a.access==='grate'){s.box([W,.05,.45],[0,.025,.52],iron);for(let j=0;j<12;j++)s.box([W,.012,.015],[0,.056,.31+j*.038],brass);}if(a.access==='rail'){for(const x of [-W*.4,W*.4])s.rod([x,0,.5],[x,.2,.5],.02,iron);s.rod([-W*.45,.2,.5],[W*.45,.2,.5],.025,brass);}return s.finish();

  },
});

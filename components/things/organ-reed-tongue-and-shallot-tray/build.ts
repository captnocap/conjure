import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    reeds: choice("What reed assembly is shown?", {"open": "Open shallots with flat tongues.", "closed": "Closed-ended shallots.", "curved": "Strongly curved reed tongues.", "split": "Shallots and tongues laid separately."}),
    count: choice("How many reed assemblies?", {"two": "Two large reed assemblies.", "three": "Three matched reeds.", "four": "Four reed assemblies.", "six": "Six smaller reeds."}),
    tray: choice("What holds the components?", {"wood": "A shallow divided timber tray.", "felt": "A felt-lined sample board.", "metal": "A shallow metal service pan.", "bench": "A small raised voicing table."}),
    arrangement: choice("How are the reeds arranged?", {"parallel": "A straight parallel row.", "fan": "A fan of graduating reeds.", "pairs": "Reeds in matched pairs.", "stagger": "Staggered reed positions."}),
    wires: choice("What tuning wires are visible?", {"hooks": "Hooked brass tuning wires.", "straight": "Straight tuning rods.", "handles": "Wire rods with loop handles.", "none": "No tuning wires."}),
    tools: choice("What adjustment tool is included?", {"knife": "A thin reed knife.", "pliers": "Small curved pliers.", "hammer": "A small voicing hammer.", "none": "Only the reed parts."}),
    labels: choice("What identification is present?", {"numbers": "Numbered sample labels.", "notes": "Handwritten voicing cards.", "rule": "A graduated ruler.", "none": "No labels."}),
    state: choice("What condition is shown?", {"ready": "Clean assembled reeds.", "spare": "A spare reed tongue.", "wedge": "A small wooden wedge.", "opened": "One reed is propped open."}),
    size: score("How large is the reed set?", ["Small treble reeds", "Standard reed set", "Large bass reed samples"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#a3aaa0',{metalness:.6,roughness:.45}),dark=s.material('#444f47'),brass=s.material('#b89e66',{metalness:.65}),wood=s.material('#a38a62'),pale=s.material('#d9cfb1'),leather=s.material('#77614c');

 const n={two:2,three:3,four:4,six:6}[a.count],W=.2+n*.16,Y=a.tray==='bench'?.55:.025,S=.8+a.size*.5;s.box([W,.025,.48],[0,Y-.0125,0],a.tray==='metal'?metal:wood);if(a.tray==='felt')s.box([W-.02,.006,.46],[0,Y+.003,0],dark);if(a.tray==='bench')for(const x of [-W*.43,W*.43])for(const z of [-.18,.18])s.rod([x,0,z],[x,Y,z],.018,wood);if(a.tray==='wood'||a.tray==='metal')for(const z of [-.24,.24])s.box([W,.035,.018],[0,Y+.0175,z],wood);
 for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.16,z=a.arrangement==='stagger'?(j%2)*.08-.04:a.arrangement==='pairs'?(j%2)*.035:0,g=new THREE.Group();g.position.set(x,Y+.008,z);if(a.arrangement==='fan')g.rotation.y=(j-(n-1)/2)*.1;s.root.add(g);const start=s.root.children.length,L=.22+j*.008;s.cylinder(.025,.025,L,[0,.025,0],brass,16).rotation.x=Math.PI/2;s.box([.028,.012,L*.75],[0,.049,.02],dark);if(a.reeds==='closed')s.cylinder(.027,.027,.008,[0,.025,L/2],brass,16).rotation.x=Math.PI/2;
 const off=a.reeds==='split'?.05:0;s.surface((u,v,p)=>p.set((u-.5)*.025+off,.056+(a.reeds==='curved'?Math.sin(v*Math.PI)*.025:0)+(a.state==='opened'&&j===0?v*.05:0),(v-.5)*L*.85),brass,{segments:[2,12]});s.box([.035,.012,.035],[off,.055,-L*.4],brass);
 if(a.wires!=='none'){const wx=.055;if(a.wires==='hooks')s.tube([[wx,.006,-.13],[wx,.006,.1],[wx-.02,.025,.1]],.004,brass);else s.rod([wx,.005,-.13],[wx,.005,.12],.004,brass);if(a.wires==='handles')s.ring(.015,.004,[wx,.005,-.13],brass).rotation.x=Math.PI/2;}for(const obj of s.root.children.slice(start))g.add(obj);if(a.labels==='numbers')s.label(String(j+1),.06,.04,[x,Y+.018,.17],'#e1d4ae','#5e563f');}
 if(a.tools==='knife'){s.box([.16,.009,.025],[0,Y+.005,-.2],metal);s.box([.1,.018,.03],[-.12,Y+.009,-.2],wood);}if(a.tools==='pliers')for(const z of [-.2,-.17])s.rod([-.13,Y+.01,z],[.12,Y+.01,-.185],.008,metal);if(a.tools==='hammer'){s.rod([-.13,Y+.013,-.2],[.1,Y+.013,-.2],.009,wood);s.box([.045,.025,.09],[.12,Y+.013,-.2],brass);}if(a.labels==='rule'){s.box([W*.8,.005,.025],[0,Y+.003,.2],pale);for(let j=0;j<12;j++)s.box([.002,.002,.015],[-W*.35+j*W*.7/11,Y+.006,.2],dark);}if(a.labels==='notes')s.box([.16,.003,.1],[W/2+.1,.0015,0],pale);if(a.state==='spare')s.box([.025,.005,.18],[W/2+.07,.0025,.1],brass);if(a.state==='wedge')s.box([.03,.015,.12],[W/2+.07,.0075,.1],wood);s.root.scale.setScalar(S);return s.finish();

  },
});

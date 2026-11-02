import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    rack: choice("What rack silhouette is used?", {"wall": "A tall freestanding wall rack.", "a": "An A-frame standing rack.", "horizontal": "Two low horizontal cradles.", "fan": "A radial fan rack."}),
    count: choice("How many blowpipes?", {"three": "Three irons.", "five": "Five irons.", "seven": "Seven irons.", "nine": "Nine slender irons."}),
    tips: choice("What remains at the hot ends?", {"clean": "Bare iron tips.", "gather": "Small rounded glass gathers.", "bubble": "One blown glass bubble.", "mixed": "Several small discarded glass ends."}),
    grips: choice("What hand grips are fitted?", {"wood": "Long wooden grip sleeves.", "wrap": "Bound grip sleeves.", "rings": "Two metal grip rings.", "bare": "Plain iron handles."}),
    mouths: choice("How are the mouthpieces finished?", {"brass": "Brass mouthpieces.", "dark": "Dark plain mouthpieces.", "flared": "Slightly flared mouthpieces.", "plugs": "Pale protective end plugs."}),
    arrangement: choice("How are the irons ordered?", {"level": "Equal length irons.", "graduated": "Graduated iron lengths.", "paired": "Pairs of long and short irons.", "missing": "One empty rack position."}),
    base: choice("What sits below the rack?", {"board": "A plain timber board.", "drip": "A shallow metal drip tray.", "brick": "A brick base.", "wheels": "A wheeled workshop base."}),
    state: choice("What work detail is visible?", {"ready": "Tools stored ready.", "offcuts": "A small offcut box.", "cloth": "A folded grip cloth.", "tags": "Numbered tool positions."}),
    length: score("How long are the irons?", ["Short cylinder irons", "Standard long blowpipes", "Very long glasshouse irons"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#536c67',{metalness:.45,roughness:.55}),wood=s.material('#a58d65'),brick=s.material('#af8b6c'),pale=s.material('#d6c8a6'),dark=s.material('#4d5951'),glass=s.material('#a3c8b9',{transparent:true,opacity:.46,depthWrite:false,roughness:.18,metalness:.1,side:THREE.DoubleSide}),edge=s.material('#829e8e',{metalness:.2}),hot=s.material('#c58952',{emissive:'#b65527',emissiveIntensity:.12+context.mood.energy*.5});

 const n={three:3,five:5,seven:7,nine:9}[a.count],L=1.5+a.length*.8,W=n*.14+.25,B=a.base==='wheels'?.1:.04,horizontal=a.rack==='horizontal';s.box([horizontal?L+.2:W,.06,horizontal?W:.65],[0,B,0],a.base==='brick'?brick:a.base==='drip'?iron:wood);if(a.base==='wheels')for(const x of [-(horizontal?L:W)*.4,(horizontal?L:W)*.4])for(const z of [-(horizontal?W:.65)*.35,(horizontal?W:.65)*.35])s.cylinder(.07,.07,.04,[x,.07,z],iron,20).rotation.x=Math.PI/2;
 if(horizontal){for(const x of [-L*.35,L*.35])s.box([.12,.2,W],[x,B+.13,0],wood);}else{for(const x of [-W*.46,W*.46])for(const z of [-.23,.23])s.rod([x,B+.03,z],[x,L*.68,a.rack==='a'?z*.3:z],.03,wood);for(const y of [.28,L*.64]){s.box([W,.08,.12],[0,y,0],wood);for(const x of [-W*.46,W*.46])s.rod([x,y,-.23],[x,y,.23],.025,wood);}}
 for(let j=0;j<n;j++){if(a.arrangement==='missing'&&j===Math.floor(n/2))continue;const l=L*(a.arrangement==='graduated'?1-j/n*.25:a.arrangement==='paired'?1-Math.floor(j/2)/n*.3:1),x=(j-(n-1)/2)*.14,g=new THREE.Group(),before=s.root.children.slice();s.root.add(g);s.rod([0,0,0],[0,l,0],.012,iron);if(a.grips==='wood'||a.grips==='wrap')s.cylinder(.021,.021,.32,[0,l-.35,0],wood,16);if(a.grips==='wrap')for(let k=0;k<12;k++)s.ring(.022,.003,[0,l-.49+k*.026,0],pale).rotation.x=Math.PI/2;if(a.grips==='rings')for(const y of [l-.5,l-.2])s.ring(.022,.005,[0,y,0],iron).rotation.x=Math.PI/2;if(a.mouths==='plugs')s.cylinder(.02,.015,.06,[0,l+.02,0],wood,16);else{const r=a.mouths==='flared'?.025:.016;s.lathe([[.015,0],[r,.06],[r-.004,.06],[.011,0]],a.mouths==='brass'?pale:dark,[0,l-.01,0]);if(a.mouths==='brass')s.ring(.022,.006,[0,l,0],pale).rotation.x=Math.PI/2;}
 if(a.tips==='gather'||a.tips==='mixed')s.ball([.045,.065,.045],[0,-.025,0],j%2?glass:hot,16);if(a.tips==='bubble'&&j===Math.floor(n/2))s.ball([.11,.18,.11],[0,-.13,0],glass,24);for(const obj of s.root.children.slice())if(!before.includes(obj)&&obj!==g)g.add(obj);
 if(horizontal){g.rotation.z=-Math.PI/2;g.position.set(-l/2,B+.25,(j-(n-1)/2)*.14);}else{g.position.set(x,a.tips==='bubble'&&j===Math.floor(n/2)?.42:.3,0);if(a.rack==='fan'){g.rotation.z=-(j-(n-1)/2)*.055;g.position.x=x*.3;}}if(a.state==='tags'&&!horizontal)s.label(String(j+1),.065,.05,[x,L*.64,.07],'#e0d1ae','#5a604c');}
 if(a.state==='cloth')s.box([.25,.025,.18],[0,B+.05,.2],pale);if(a.state==='offcuts'){s.box([.35,.1,.22],[0,B+.08,.2],wood);for(let j=0;j<4;j++)s.ball([.035,.025,.02],[-.12+j*.08,B+.145,.2],glass,12);}return s.finish();

  },
});

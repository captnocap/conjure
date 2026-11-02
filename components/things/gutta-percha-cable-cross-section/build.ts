import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    display: choice("How is the sample displayed?", {"horizontal": "A long horizontal section on saddles.", "upright": "An upright cut section on a block.", "stepped": "A horizontal stepped cutaway.", "fan": "Armour wires spread into a fan."}),
    core: choice("What conductor lies inside?", {"single": "One thick copper conductor.", "seven": "Seven fine copper strands.", "bundle": "A dense multi-wire bundle.", "twin": "Two separately insulated conductors."}),
    insulation: choice("What colour is the insulation?", {"cream": "Pale cream gutta-percha.", "amber": "Amber natural rubber.", "brown": "Dark aged insulation.", "white": "White laboratory replacement."}),
    armour: choice("What armour surrounds the sample?", {"heavy": "Eight heavy iron wires.", "fine": "Sixteen fine armour wires.", "double": "Two contrasting armour layers.", "bare": "Armour stripped away."}),
    bedding: choice("What lies under the armour?", {"hemp": "Tan fibrous hemp bedding.", "tar": "Dark tarred textile.", "red": "Red wrapping tape.", "none": "No visible outer bedding."}),
    base: choice("What carries the exhibit?", {"wood": "A polished timber block.", "stone": "A pale stone display slab.", "metal": "A green metal specimen tray.", "bare": "Two simple support saddles."}),
    label: choice("How is it labelled?", {"plaque": "A small brass identification plate.", "numbers": "Numbered layer tabs.", "measure": "A measuring ruler beside it.", "none": "No label."}),
    state: choice("What has happened to the sample?", {"clean": "Freshly cut and polished.", "corroded": "One armour wire is broken short.", "opened": "A loose armour wire lies below.", "sealed": "A capped far end."}),
    length: score("How long is the section?", ["A short sample", "A medium section", "A long cable section"])
  },
  build(a,context){

 const s=new Sculpture(context),copper=s.material('#b38b54',{metalness:0.75}),rubber=s.material({cream:'#cec5a1',amber:'#bca16b',brown:'#826747',white:'#ddd8bd'}[a.insulation]),iron=s.material('#6b7867',{metalness:0.65}),bedding=s.material({hemp:'#a79163',tar:'#515842',red:'#9c6950',none:'#ad9f7b'}[a.bedding]),base=s.material(a.base==='stone'?'#b7b8a2':a.base==='metal'?'#718572':'#92764b'),L=0.7+a.length*0.8,r=0.13,cy=0.25;
 if(a.base!=='bare')s.box([L+0.3,0.08,0.65],[0,0.04,0],base);for(const x of [-L*0.3,L*0.3])s.box([0.12,0.15,0.24],[x,0.15,0],base);const start=s.root.children.length;
 const step=a.display==='stepped',outerL=step?L*0.5:L;s.cylinder(r,r,outerL,[-(L-outerL)/2,cy,0],bedding,32).rotation.z=Math.PI/2;s.cylinder(0.095,0.095,step?L*0.75:L,[step?-L*0.125:0,cy,0],rubber,32).rotation.z=Math.PI/2;
 const n=a.core==='single'?1:a.core==='seven'?7:a.core==='bundle'?19:2;for(let j=0;j<n;j++){const t=j*2.4,rr=j===0?0:a.core==='twin'?0.045:0.014*Math.sqrt(j);s.rod([-L/2,cy+Math.cos(t)*rr,Math.sin(t)*rr],[L/2,cy+Math.cos(t)*rr,Math.sin(t)*rr],n===1?0.045:n===2?0.025:0.012,copper);}
 const wires=a.armour==='bare'?0:a.armour==='fine'?16:8;for(let j=0;j<wires;j++){const pts: [number,number,number][]=[];for(let k=0;k<=16;k++){const t=j/wires*Math.PI*2+k/16*Math.PI*1.2;let x=-L/2+k/16*outerL;const rad=a.display==='fan'&&k>10?r+(k-10)*0.035:r;pts.push([x,cy+Math.cos(t)*rad,Math.sin(t)*rad]);}if(a.state==='corroded'&&j===0)pts.splice(10);s.tube(pts,a.armour==='fine'?0.009:0.016,iron);if(a.armour==='double')s.tube(pts.map(p=>[p[0],cy+(p[1]-cy)*1.2,p[2]*1.2]),0.007,copper);}
 if(a.state==='sealed')s.cylinder(0.15,0.15,0.04,[-L/2-0.02,cy,0],iron,32).rotation.z=Math.PI/2;if(a.display==='upright'){const g=new THREE.Group();for(const c of s.root.children.slice(start))g.add(c);g.rotation.z=Math.PI/2;g.position.set(cy,0.08+L/2,0);s.root.add(g);}
 if(a.state==='opened')s.tube([[-L/2,0.1,0.23],[0,0.1,0.27],[L/2,0.1,0.2]],0.016,iron);
 if(a.label==='plaque')s.label('SUBMARINE CABLE\nCOPPER / GUTTA-PERCHA',0.55,0.15,[0,0.086,0.22],'#59634c','#ba9f66').rotation.x=-Math.PI/2;if(a.label==='measure'){s.box([L,0.01,0.07],[0,0.087,-0.24],iron);for(let j=0;j<12;j++)s.box([0.004,0.004,0.04],[-L/2+j*L/12,0.095,-0.24],bedding);}if(a.label==='numbers')for(let j=0;j<3;j++)s.label(String(j+1),0.06,0.07,[-0.2+j*0.2,0.095,0.24],'#52614e','#d6caaa').rotation.x=-Math.PI/2;return s.finish();

  },
});

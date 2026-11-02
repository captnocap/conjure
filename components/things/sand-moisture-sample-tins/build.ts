import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    count: choice("How many sample tins?", {"two": "Two larger samples.", "three": "Three sample tins.", "four": "Four compact samples.", "six": "Six small sample tins."}),
    form: choice("What are the sample containers?", {"round": "Shallow round metal tins.", "square": "Square sample dishes.", "deep": "Deep cylindrical cups.", "boats": "Long narrow weighing boats."}),
    lid: choice("Where are the lids?", {"off": "The lids rest beside the samples.", "closed": "All tins are closed.", "mixed": "Every other tin is covered.", "stack": "The lids are stacked at one end."}),
    bed: choice("What supports the samples?", {"tray": "A metal tray.", "board": "A wood sample board.", "rack": "A raised two-level sample rack.", "bench": "A small four-legged bench."}),
    sand: choice("What sample texture is visible?", {"fine": "Smooth fine dry sand.", "clumps": "Several damp clumps.", "mixed": "Dry and wet samples alternate.", "empty": "The sample tins are clean."}),
    measure: choice("What measuring aid is included?", {"balance": "A small beam balance.", "thermometer": "A protected thermometer.", "rule": "A graduated measuring strip.", "none": "No measuring instrument."}),
    tool: choice("What tool is laid beside them?", {"spoon": "A long sample spoon.", "brush": "A fine cleaning brush.", "tongs": "Metal sample tongs.", "none": "No tool."}),
    record: choice("How are samples identified?", {"numbers": "Numbered cards at each sample.", "flags": "Small upright sample flags.", "book": "A closed record notebook.", "none": "No labels."}),
    size: score("How large is the sample set?", ["Small inspection set", "Standard sample tray", "Large depot assay set"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#71665c',{metalness:.5}),dark=s.material('#3e423d'),brass=s.material('#b59c66',{metalness:.6}),sand=s.material('#cdbb89'),wood=s.material('#a58b63'),pale=s.material('#d5cbb0');

 const n={two:2,three:3,four:4,six:6}[a.count],step=.2,S=.85+a.size*.4,W=n*step+.2,Y=a.bed==='bench'?.55:a.bed==='rack'?.18:.025;
 s.box([W,.025,.52],[0,Y-.0125,0],a.bed==='tray'?iron:wood);if(a.bed==='bench'||a.bed==='rack')for(const x of [-W*.43,W*.43])for(const z of [-.2,.2])s.rod([x,0,z],[x,Y,z],.016,iron);if(a.bed==='rack'){s.box([W,.02,.25],[0,Y+.18,-.14],wood);for(const x of [-W*.43,W*.43])s.rod([x,Y,-.2],[x,Y+.18,-.2],.015,iron);}
 const cy=Y+.02;for(let j=0;j<n;j++){const x=(j-(n-1)/2)*step,y=a.bed==='rack'&&j%2?Y+.18:Y,z=a.bed==='rack'&&j%2?-.13:0,R=.075,H=a.form==='deep'?.12:.04;
 if(a.form==='round'||a.form==='deep')s.lathe([[0,0],[R,0],[R,H],[R-.008,H],[R-.008,.008],[0,.008]],iron,[x,y,z]);else{const d=a.form==='boats'?.09:.14;s.box([.15,.008,d],[x,y+.004,z],iron);for(const zz of [-d/2,d/2])s.box([.15,H,.008],[x,y+H/2,z+zz],iron);for(const xx of [-.075,.075])s.box([.008,H,d],[x+xx,y+H/2,z],iron);}
 if(a.sand!=='empty'){s.cylinder(.06,.06,.01,[x,y+.015,z],sand,20);if(a.sand==='clumps'||a.sand==='mixed'&&j%2)for(let k=0;k<3;k++)s.ball([.02,.016,.019],[x-.03+k*.03,y+.028,z],wood,8);}
 const closed=a.lid==='closed'||a.lid==='mixed'&&j%2===0,lx=a.lid==='stack'?W/2+.09:x,ly=closed?y+H+.004:a.lid==='stack'?j*.009+.004:Y+.004,lz=closed?z:.18;if(a.form==='round'||a.form==='deep')s.cylinder(.078,.078,.008,[lx,ly,lz],iron,24);else s.box([.16,.008,a.form==='boats'?.1:.15],[lx,ly,lz],iron);if(a.record==='numbers')s.label(String(j+1),.09,.05,[x,y+.025,z+.083],'#ebe1bb','#554e3f');if(a.record==='flags'){s.rod([x,y,z-.07],[x,y+.18,z-.07],.003,brass);s.label(String(j+1),.06,.04,[x+.03,y+.16,z-.07],'#e3d6ae','#625a45');}}
 if(a.measure==='balance'){const x=-W/2-.18;s.box([.22,.025,.18],[x,.0125,0],iron);s.rod([x,.02,0],[x,.3,0],.012,brass);s.rod([x-.14,.3,0],[x+.14,.3,0],.012,brass);for(const xx of [x-.13,x+.13]){s.rod([xx,.3,0],[xx,.18,0],.003,brass);s.cylinder(.065,.065,.01,[xx,.18,0],iron,20);}}if(a.measure==='thermometer'){s.box([.3,.012,.04],[0,Y+.006,-.2],wood);s.rod([-.12,Y+.014,-.2],[.12,Y+.014,-.2],.004,pale);}if(a.measure==='rule'){s.box([W*.8,.008,.04],[0,Y+.004,-.2],pale);for(let j=0;j<14;j++)s.box([.002,.002,.02],[-W*.35+j*W*.7/13,Y+.009,-.2],dark);}
 if(a.tool==='spoon'){s.rod([-.15,Y+.01,.22],[.15,Y+.01,.22],.006,brass);s.ball([.035,.008,.018],[.17,Y+.01,.22],brass,12);}if(a.tool==='brush'){s.rod([-.15,Y+.012,.22],[.08,Y+.012,.22],.007,wood);s.box([.07,.02,.025],[.1,Y+.01,.22],dark);}if(a.tool==='tongs')for(const z of [.21,.235])s.rod([-.12,Y+.008,.22],[.15,Y+.008,z],.006,iron);if(a.record==='book')s.box([.16,.025,.21],[W/2+.13,.0125,-.03],dark);s.root.scale.setScalar(S);return s.finish();

  },
});

import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    shape: choice("What is the bin form?", {"round": "A cylindrical bin above a cone.", "square": "A square bin above a tapered funnel.", "cone": "A broad shallow funnel.", "slender": "A tall narrow storage bin."}),
    frame: choice("What holds the bin?", {"four": "Four braced iron legs.", "tripod": "Three splayed legs.", "timber": "A heavy timber trestle.", "wall": "A freestanding wall bracket frame."}),
    mouth: choice("What closes the upper mouth?", {"open": "An open rim.", "lid": "A flat removable lid.", "grille": "A coarse debris grille.", "half": "A half-width sliding cover."}),
    gate: choice("What regulates discharge?", {"slide": "A horizontal slide gate.", "wheel": "A wheel-operated spindle.", "lever": "A long side lever.", "chute": "A short fixed chute."}),
    fill: choice("What is the sand level?", {"high": "A nearly full bin.", "half": "A shallow fill.", "cone": "A sand mound at the mouth.", "empty": "An empty dark opening."}),
    access: choice("What access is fitted?", {"ladder": "A narrow side ladder.", "rungs": "Individual climbing rungs.", "platform": "A small railed service deck.", "none": "No access fittings."}),
    outlet: choice("Where does sand go?", {"bag": "Into a hanging sack.", "box": "Into a collection box.", "hose": "Through a curved flexible hose.", "clear": "Into a clear working gap."}),
    braces: choice("What frame bracing is visible?", {"cross": "Crossed diagonal braces.", "single": "One diagonal on each face.", "rails": "Horizontal lower rails.", "gusset": "Large corner gusset plates."}),
    height: score("How tall is the hopper?", ["Low workshop hopper", "Standard gravity hopper", "Tall depot hopper"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#71665c',{metalness:.5}),dark=s.material('#3e423d'),brass=s.material('#b59c66',{metalness:.6}),sand=s.material('#cdbb89'),wood=s.material('#a58b63'),pale=s.material('#d5cbb0');

 const H=1.1+a.height*.85,R=a.shape==='slender'?.32:.5,B=a.shape==='slender'?1.1:.6,fx=.55;
 const mat=a.frame==='timber'?wood:iron,N=a.frame==='tripod'?3:4,legs:[number,number][]=[];for(let j=0;j<N;j++){const t=N===3?j*Math.PI*2/3:Math.PI/4+j*Math.PI/2;const x=Math.cos(t)*.78,z=Math.sin(t)*.78;legs.push([x,z]);s.rod([x*1.15,0,z*1.15],[x,H+.1,z],.04,mat);}
 for(let j=0;j<N;j++){const u=legs[j],v=legs[(j+1)%N];s.rod([u[0],H,u[1]],[v[0],H,v[1]],.035,mat);if(a.braces==='rails')s.rod([u[0]*1.1,.4,u[1]*1.1],[v[0]*1.1,.4,v[1]*1.1],.025,mat);else if(a.braces==='gusset')s.rod([u[0]*1.05,H*.7,u[1]*1.05],[(u[0]+v[0])/2,H,(u[1]+v[1])/2],.065,mat);else{s.rod([u[0]*1.13,.2,u[1]*1.13],[v[0],H,v[1]],.022,mat);if(a.braces==='cross')s.rod([v[0]*1.13,.2,v[1]*1.13],[u[0],H,u[1]],.022,mat);}}
 if(a.frame==='wall')for(const x of [-.55,.55])s.box([.1,H+B,.12],[x,(H+B)/2,-.6],iron);
 for(const [x,z] of legs)s.rod([x,H,z],[0,H,0],.035,mat);const top=H+B;if(a.shape==='square'){s.cylinder(R,R*.12,.55,[0,H-.25,0],iron,4).rotation.y=Math.PI/4;s.box([1,.04,1],[0,H,0],iron);for(const x of [-.49,.49])s.box([.03,B,1],[x,H+B/2,0],iron);for(const z of [-.49,.49])s.box([1,B,.03],[0,H+B/2,z],iron);}else s.lathe([[.06,H-.55],[R,H],[R,top],[R-.025,top],[R-.025,H+.02],[.035,H-.55]],iron);
 if(a.fill!=='empty'){const y=top-(a.fill==='half'?.35:.06);if(a.shape==='square')s.box([.94,.01,.94],[0,y,0],sand);else s.cylinder(R-.03,R-.03,.015,[0,y,0],sand,32);if(a.fill==='cone')s.cylinder(0,R*.7,.23,[0,top+.045,0],sand,24);}
 if(a.mouth==='lid'||a.mouth==='half')s.box([a.mouth==='half'?R:R*2+.05,.025,R*2+.05],[a.mouth==='half'?-R/2:0,top+.015,0],iron);if(a.mouth==='grille')for(let j=-3;j<=3;j++)s.rod([j*R/4,top+.015,-Math.sqrt(R*R-(j*R/4)**2)],[j*R/4,top+.015,Math.sqrt(R*R-(j*R/4)**2)],.012,iron);
 const oy=H-.55;s.cylinder(.065,.065,.13,[0,oy-.065,0],iron,20);s.box([.24,.03,.18],[.04,oy-.05,0],brass);if(a.gate==='wheel'){s.rod([0,oy,0],[.28,oy,0],.012,brass);s.ring(.09,.013,[.28,oy,0],brass).rotation.y=Math.PI/2;}if(a.gate==='lever')s.rod([0,oy,0],[.35,oy+.17,0],.018,brass);if(a.gate==='chute')s.tube([[0,oy,0],[0,oy-.2,.18]],.07,iron);if(a.gate==='slide')s.rod([.1,oy-.05,0],[.35,oy-.05,0],.014,brass);
 if(a.access==='ladder'||a.access==='rungs'){for(const z of [-.17,.17])s.rod([-.72,0,z],[-.57,top,z],.02,iron);for(let j=0;j<Math.floor(top/.22);j++){const y=.18+j*.22;s.rod([-.72+.15*y/top,y,-.17],[-.72+.15*y/top,y,.17],.016,iron);}}if(a.access==='platform'){s.box([.5,.06,1.1],[-.75,H,0],iron);for(const z of [-.5,.5]){s.rod([-.95,0,z],[-.95,H+.8,z],.025,iron);s.rod([-.5,H-.5,z],[-.95,H,z],.025,iron);}s.rod([-.95,H+.8,-.5],[-.95,H+.8,.5],.02,iron);}
 if(a.outlet==='bag'){s.lathe([[0,0],[.18,.03],[.21,oy*.5],[.06,oy-.1]],wood);s.ring(.067,.012,[0,oy-.1,0],brass).rotation.x=Math.PI/2;}if(a.outlet==='box'){s.box([.6,.03,.5],[0,.015,0],wood);for(const z of [-.25,.25])s.box([.6,.2,.025],[0,.1,z],wood);for(const x of [-.3,.3])s.box([.025,.2,.5],[x,.1,0],wood);}if(a.outlet==='hose')s.tube([[0,oy-.1,0],[.1,.25,.15],[.5,.055,.35]],.055,dark);return s.finish();

  },
});

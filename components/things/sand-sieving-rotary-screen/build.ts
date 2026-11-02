import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    drum: choice("What drum form is used?", {"straight": "A straight cylindrical mesh drum.", "taper": "A tapered screening drum.", "stepped": "A drum with two screen diameters.", "short": "A short broad drum."}),
    mesh: choice("What screen weave is visible?", {"coarse": "Coarse square mesh.", "fine": "Close longitudinal bars.", "bands": "Widely spaced hoops and bars.", "open": "A partly opened service section."}),
    frame: choice("What supports the screen?", {"wood": "A timber A-frame.", "steel": "A steel trestle.", "low": "A low masonry cradle.", "wheels": "A mobile wheeled frame."}),
    drive: choice("How is the drum driven?", {"crank": "A hand crank on the axle.", "wheel": "A large spoked wheel.", "pulley": "A belt pulley with belt.", "handle": "A straight turning bar."}),
    feed: choice("What feeds the mouth?", {"chute": "A sloping feed chute.", "funnel": "A short feed funnel.", "scoop": "A loose scoop rests below.", "bare": "An open bare drum mouth."}),
    catch: choice("What catches screened sand?", {"trough": "A long shallow trough.", "buckets": "Two round buckets.", "box": "A deep rectangular box.", "none": "No collection vessel."}),
    load: choice("What is inside the drum?", {"full": "A thick sand bed.", "low": "A small residual bed.", "stones": "Several oversize stones.", "empty": "The drum is clear."}),
    state: choice("What working detail is visible?", {"ready": "The mechanism is ready.", "brush": "A cleaning brush touches the mesh.", "service": "A detached panel rests on the floor.", "tag": "A service tag hangs from the frame."}),
    length: score("How long is the screening drum?", ["Compact hand screen", "Standard screen", "Long depot screen"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#71665c',{metalness:.5}),dark=s.material('#3e423d'),brass=s.material('#b59c66',{metalness:.6}),sand=s.material('#cdbb89'),wood=s.material('#a58b63'),pale=s.material('#d5cbb0');

 const L=a.drum==='short'?.7:1+a.length*.7,R=a.drum==='short'?.4:.3,Y=a.frame==='low'?.6:1,mat=a.frame==='wood'?wood:iron;
 for(const x of [-L*.42,L*.42]){if(a.frame==='low'){s.box([.25,Y-R,.65],[x,(Y-R)/2,0],pale);s.rod([x,Y-R,0],[x,Y,0],.035,iron);}else{for(const z of [-.4,.4])s.rod([x,0,z],[x,Y,0],.035,mat);s.rod([x,.25,-.3],[x,.25,.3],.025,mat);}s.rod([x,Y,0],[x,Y,.08],.045,brass);if(a.frame==='wheels')for(const z of [-.4,.4])s.cylinder(.09,.09,.05,[x,.09,z],dark,16).rotation.z=Math.PI/2;}
 s.rod([-L*.58,Y,0],[L*.58,Y,0],.018,brass);const rad=(u:number)=>a.drum==='taper'?R*(.7+u*.3):a.drum==='stepped'?(u<.5?R*.8:R):R;
 const n=a.mesh==='fine'?22:a.mesh==='coarse'?16:10;for(let j=0;j<n;j++){if(a.mesh==='open'&&j>3&&j<8)continue;const t=j/n*Math.PI*2;if(a.drum==='stepped'){s.rod([-L/2,Y+Math.cos(t)*R*.8,Math.sin(t)*R*.8],[0,Y+Math.cos(t)*R*.8,Math.sin(t)*R*.8],.007,iron);s.rod([0,Y+Math.cos(t)*R*.8,Math.sin(t)*R*.8],[0,Y+Math.cos(t)*R,Math.sin(t)*R],.007,iron);s.rod([0,Y+Math.cos(t)*R,Math.sin(t)*R],[L/2,Y+Math.cos(t)*R,Math.sin(t)*R],.007,iron);}else s.rod([-L/2,Y+Math.cos(t)*rad(0),Math.sin(t)*rad(0)],[L/2,Y+Math.cos(t)*rad(1),Math.sin(t)*rad(1)],.007,iron);}for(let j=0;j<7;j++)s.ring(rad(j/6),.009,[-L/2+j*L/6,Y,0],iron).rotation.y=Math.PI/2;for(const x of [-L/2,L/2])for(let j=0;j<4;j++){const t=j*Math.PI/2;s.rod([x,Y,0],[x,Y+Math.cos(t)*R,Math.sin(t)*R],.014,brass);}
 const dx=L*.6;if(a.drive==='crank'){s.rod([dx,Y,0],[dx,Y+.18,0],.018,iron);s.rod([dx,Y+.18,0],[dx+.14,Y+.18,0],.02,wood);}else if(a.drive==='handle')s.rod([dx,Y-.25,0],[dx,Y+.25,0],.025,wood);else{s.ring(.25,.025,[dx,Y,0],iron).rotation.y=Math.PI/2;for(let j=0;j<6;j++){const t=j*Math.PI/3;s.rod([dx,Y,0],[dx,Y+Math.cos(t)*.25,Math.sin(t)*.25],.016,iron);}if(a.drive==='pulley'){s.cylinder(.12,.12,.08,[dx,.25,0],iron,24).rotation.z=Math.PI/2;s.tube([[dx,Y,.25],[dx,.25,.12],[dx,.13,0],[dx,.25,-.12],[dx,Y,-.25],[dx,Y+.25,0],[dx,Y,.25]],.012,dark);s.box([.2,.2,.3],[dx,.1,0],iron);}}
 if(a.feed==='chute'){s.box([.55,.04,.35],[-L/2-.18,Y+.17,0],wood).rotation.z=-.3;for(const z of [-.19,.19])s.rod([-L/2-.45,0,z],[-L/2-.45,Y+.26,z],.025,wood);}if(a.feed==='funnel'){s.lathe([[.08,0],[.25,.3],[.235,.3],[.065,0]],iron,[-L/2+.1,Y+.3,0]);s.rod([-L/2+.1,Y+.3,0],[-L/2+.1,Y+.1,0],.05,iron);}if(a.feed==='scoop')s.box([.24,.05,.16],[-L/2-.3,.025,.3],iron);
 if(a.catch==='buckets')for(const x of [-.3,.3])s.lathe([[0,0],[.18,0],[.22,.32],[.2,.32],[.16,.025],[0,.025]],iron,[x,0,0]);else if(a.catch!=='none'){const h=a.catch==='box'?.35:.12;s.box([L,.025,.7],[0,.0125,0],wood);for(const z of [-.35,.35])s.box([L,h,.025],[0,h/2,z],wood);for(const x of [-L/2,L/2])s.box([.025,h,.7],[x,h/2,0],wood);}
 if(a.load==='full'||a.load==='low')s.box([L*.9,a.load==='full'?.1:.035,R*.9],[0,Y-R+.08,0],sand);if(a.load==='stones')for(let j=0;j<7;j++)s.ball([.045,.035,.04],[-L*.4+j*L*.8/6,Y-R+.06,0],pale,8);
 if(a.state==='brush'){s.box([L*.6,.04,.08],[0,Y+R,.06],wood);for(const x of [-L*.35,L*.35])s.rod([x,Y,0],[x,Y+R+.03,.06],.015,iron);}if(a.state==='service')s.box([.5,.02,.35],[0,.01,.65],iron);if(a.state==='tag')s.label('SIEVE',.22,.1,[L*.42,.45,.32],'#e0d3ac','#71614b');return s.finish();

  },
});

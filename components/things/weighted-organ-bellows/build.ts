import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    form: choice("What bellows form is used?", {"parallel": "A parallel-rise rectangular reservoir.", "wedge": "A wedge-shaped feeder bellows.", "double": "Two stacked bellows reservoirs.", "round": "A circular rising bellows."}),
    folds: choice("How many leather folds?", {"two": "Two deep folds.", "three": "Three folds.", "four": "Four narrow folds.", "six": "Six fine folds."}),
    weights: choice("What loads the top board?", {"bricks": "Four rectangular weight bricks.", "stones": "Two large stone weights.", "iron": "Stacked iron weights.", "bare": "An unloaded top board."}),
    frame: choice("What supports the bellows?", {"legs": "Four stout timber legs.", "skids": "Two low timber skids.", "stand": "A tall braced timber stand.", "floor": "A broad floor base."}),
    wind: choice("Where does the wind leave?", {"square": "A square side wind trunk.", "round": "A round side duct.", "elbow": "A raised elbow duct.", "hose": "A flexible wind hose."}),
    pump: choice("What pumping control is fitted?", {"lever": "A long hand pumping lever.", "pedal": "A broad foot pedal.", "crank": "A side crank.", "none": "No pumping control."}),
    valves: choice("What inlet valves are visible?", {"flaps": "Two leather flap valves.", "grilles": "Two slatted inlet grilles.", "round": "A round inlet valve.", "plain": "No exposed inlet valves."}),
    state: choice("How is the reservoir charged?", {"full": "The bellows are fully raised.", "half": "The bellows are partly raised.", "empty": "The reservoir is nearly collapsed.", "service": "A spare leather flap lies below."}),
    size: score("How broad is the reservoir?", ["Small chamber-organ reservoir", "Standard bellows", "Large church-organ reservoir"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#a3aaa0',{metalness:.6,roughness:.45}),dark=s.material('#444f47'),brass=s.material('#b89e66',{metalness:.65}),wood=s.material('#a38a62'),pale=s.material('#d9cfb1'),leather=s.material('#77614c');

 const W=.8+a.size*.6,D=.65,Y=a.frame==='stand'?.75:a.frame==='legs'?.3:.08,n={two:2,three:3,four:4,six:6}[a.folds],E=a.state==='empty'?.11:a.state==='half'?.24:.4;
 for(const x of [-W*.4,W*.4])for(const z of [-D*.35,D*.35])s.rod([x,0,z],[x,Y,z],.04,wood);if(a.frame==='skids')for(const z of [-D*.35,D*.35])s.box([W+.2,.06,.12],[0,.03,z],wood);if(a.frame==='stand')for(const z of [-D*.35,D*.35])s.rod([-W*.4,0,z],[W*.4,Y,z],.025,wood);s.box([W+.08,.07,D+.08],[0,Y,0],wood);
 const sets=a.form==='double'?2:1;for(let k=0;k<sets;k++){const by=Y+.035+k*(E+.05);if(a.form==='round'){const pts:[number,number][]=[];for(let j=0;j<=n*2;j++)pts.push([W*.4+(j%2?.035:0),j/(n*2)*E]);s.lathe(pts,leather,[0,by,0]);s.cylinder(W*.45,W*.45,.05,[0,by+E+.025,0],wood,32);}else{for(let j=0;j<n*2;j++){const yy=by+j*E/(n*2),expand=j%2?.04:0;if(a.form==='wedge'){const h=(j+1)*E/(n*2);for(const z of [-D/2,D/2])s.rod([-W/2,by,z],[W/2,by+h,z],.025,leather);}else{s.box([W+expand,.025,D+expand],[0,yy,0],leather);}}const top=s.box([W+.06,.05,D+.06],[0,by+E+.025,0],wood);if(a.form==='wedge'){top.rotation.z=Math.atan(E/W);top.position.y=by+E/2+.025;}}}
 const top=Y+.035+sets*(E+.05),weightY=a.form==='wedge'?Y+.035+E/2+.05:top,weightStart=s.root.children.length;if(a.weights==='bricks')for(const x of [-W*.25,W*.25])for(const z of [-.15,.15])s.box([.2,.1,.18],[x,weightY+.05,z],wood);if(a.weights==='stones')for(const x of [-W*.25,W*.25])s.box([.27,.15,.34],[x,weightY+.075,0],pale);if(a.weights==='iron')for(let j=0;j<3;j++)s.box([W*.6,.04,.35],[0,weightY+.02+j*.04,0],metal);
 if(a.form==='wedge'){const wg=new THREE.Group();wg.position.y=weightY;wg.rotation.z=Math.atan(E/W);for(const obj of s.root.children.slice(weightStart)){obj.position.y-=weightY;wg.add(obj);}s.root.add(wg);}if(a.wind==='square')s.box([.4,.18,.2],[W/2+.15,Y+.12,0],wood);if(a.wind==='round')s.rod([W/2,Y+.12,0],[W/2+.35,Y+.12,0],.08,metal);if(a.wind==='elbow')s.tube([[W/2,Y+.12,0],[W/2+.25,Y+.12,0],[W/2+.25,Y+.5,0]],.07,wood);if(a.wind==='hose')s.tube([[W/2,Y+.12,0],[W/2+.25,.1,0],[W/2+.35,.05,.4]],.045,leather);
 if(a.pump==='lever'){s.rod([-W/2,Y+.1,0],[-W/2-.6,Y+.7,0],.035,wood);s.rod([-W/2-.3,Y+.4,0],[-W/2-.3,0,0],.025,metal);}if(a.pump==='pedal'){s.box([.25,.06,.5],[-W/2-.25,.03,.1],wood);s.rod([-W/2-.25,.06,0],[-W/2,Y+.15,0],.018,metal);}if(a.pump==='crank'){s.rod([-W/2,Y+.1,0],[-W/2-.2,Y+.1,0],.02,metal);s.rod([-W/2-.2,Y+.1,0],[-W/2-.2,Y+.3,0],.02,wood);}
 if(a.valves==='round')s.cylinder(.1,.1,.02,[0,Y+.03,D/2+.03],leather,24).rotation.x=Math.PI/2;else if(a.valves!=='plain')for(const x of [-W*.23,W*.23]){s.box([.18,.1,.025],[x,Y+.03,D/2+.03],dark);if(a.valves==='flaps')s.box([.16,.08,.015],[x,Y+.04,D/2+.05],leather);else for(let j=0;j<4;j++)s.box([.015,.1,.012],[x-.06+j*.04,Y+.03,D/2+.05],wood);}if(a.state==='service')s.box([.15,.012,.2],[0,.006,D/2+.2],leather);return s.finish();

  },
});

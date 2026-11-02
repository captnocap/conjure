import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    blower: choice("What blower housing is used?", {"scroll": "A round centrifugal scroll housing.", "roots": "Two-lobed displacement housing.", "drum": "A cylindrical axial blower.", "twin": "Two compact blower housings."}),
    drive: choice("How is the blower driven?", {"belt": "An exposed belt drive.", "coupling": "A direct shaft coupling.", "crank": "A manual emergency crank.", "gears": "A pair of meshing drive gears."}),
    motor: choice("What prime mover is fitted?", {"electric": "A finned electric motor.", "hand": "A large handwheel.", "turbine": "A compact air-turbine housing.", "none": "A disconnected input shaft."}),
    base: choice("What skid supports the equipment?", {"rails": "Two long steel rails.", "timber": "Two heavy timber skids.", "plate": "A flat steel baseplate.", "wheels": "A low wheeled frame."}),
    filter: choice("What intake filter is visible?", {"drum": "A round mesh filter drum.", "box": "A square filter box.", "cone": "A conical intake screen.", "open": "A plain open intake."}),
    outlet: choice("How does air leave?", {"upright": "A tall upright outlet.", "elbow": "A side outlet elbow.", "twin": "Two divided outlet pipes.", "short": "A short flanged outlet."}),
    guard: choice("What drive guard is fitted?", {"open": "Drive completely exposed.", "half": "A partial belt shield.", "cage": "A barred safety cage.", "cover": "A closed drive cover."}),
    state: choice("What service condition is shown?", {"ready": "Equipment ready.", "gauge": "A small pressure gauge.", "oil": "A filled oil cup.", "service": "A detached inspection cover."}),
    width: score("How long is the skid?", ["Compact blower", "Standard exchange blower", "Large central blower"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#718879',{metalness:.5}),dark=s.material('#3f5247'),brass=s.material('#bca66e',{metalness:.7}),wood=s.material('#a58d64'),pale=s.material('#dbd1b1'),red=s.material('#a86d53');

 const W=1+a.width*.8,Y=.14,bx=W*.22,mx=-W*.28,cy=.46,R=.26;for(const z of [-.25,.25])s.box([W+.25,.1,.12],[0,.05,z],a.base==='timber'?wood:metal);if(a.base==='plate')s.box([W+.25,.05,.65],[0,.1,0],metal);if(a.base==='wheels')for(const x of [-W*.4,W*.4])for(const z of [-.3,.3])s.cylinder(.08,.08,.04,[x,.08,z],dark,16).rotation.x=Math.PI/2;
 for(const x of [bx,mx])s.box([.25,.12,.45],[x,.16,0],metal);if(a.blower==='scroll'||a.blower==='drum')s.cylinder(R,R,.3,[bx,cy,0],metal,32).rotation.z=Math.PI/2;else for(const z of [-.12,.12])s.cylinder(.18,.18,.28,[bx,cy,z],metal,24).rotation.z=Math.PI/2;if(a.blower==='twin')s.cylinder(.2,.2,.22,[bx,cy+.29,0],metal,24).rotation.z=Math.PI/2;
 s.rod([mx-.2,cy,0],[bx+.2,cy,0],.02,brass);if(a.motor==='electric'||a.motor==='turbine'){s.cylinder(.16,.16,.32,[mx,cy,0],dark,24).rotation.z=Math.PI/2;if(a.motor==='electric')for(let j=0;j<7;j++)s.ring(.165,.009,[mx-.14+j*.047,cy,0],metal).rotation.y=Math.PI/2;}if(a.motor==='hand'){s.ring(.24,.02,[mx,cy,0],metal).rotation.y=Math.PI/2;for(let j=0;j<5;j++){const t=j*Math.PI*2/5;s.rod([mx,cy,0],[mx,cy+Math.cos(t)*.24,Math.sin(t)*.24],.015,metal);}}
 const dz=.25;if(a.drive==='belt'){for(const x of [mx,bx])s.cylinder(.13,.13,.06,[x,cy,dz],brass,24).rotation.x=Math.PI/2;s.tube([[mx,cy+.13,dz],[bx,cy+.13,dz],[bx+.13,cy,dz],[bx,cy-.13,dz],[mx,cy-.13,dz],[mx-.13,cy,dz],[mx,cy+.13,dz]],.016,dark);for(const x of [mx,bx])s.rod([x,cy,0],[x,cy,dz],.02,brass);}if(a.drive==='coupling')s.cylinder(.07,.07,.15,[(mx+bx)/2,cy,0],brass,20).rotation.z=Math.PI/2;if(a.drive==='crank'){s.rod([mx-.2,cy,0],[mx-.2,cy+.18,0],.02,brass);s.rod([mx-.2,cy+.18,0],[mx-.35,cy+.18,0],.025,wood);}if(a.drive==='gears')for(const x of [(mx+bx)/2-.07,(mx+bx)/2+.07]){s.cylinder(.08,.08,.05,[x,cy,.16],brass,12).rotation.x=Math.PI/2;s.rod([x,cy,0],[x,cy,.16],.015,brass);}
 if(a.filter==='box')s.box([.15,.32,.32],[bx+.25,cy,0],dark);else{s.cylinder(a.filter==='cone'?.09:.17,.17,.18,[bx+.25,cy,0],metal,24).rotation.z=Math.PI/2;s.cylinder(.13,.13,.008,[bx+.35,cy,0],dark,24).rotation.z=Math.PI/2;}
 const top=cy+R;for(const z of a.outlet==='twin'?[-.1,.1]:[0])s.tube([[bx,cy,z],[bx,top+.12,z],[a.outlet==='elbow'?bx+.3:bx,top+(a.outlet==='upright'?.65:.16),z]],.065,metal);
 if(a.guard==='cover'||a.guard==='half')for(const x of [-W*.3,W*.3])s.rod([x,.1,.34],[x,cy+.2,.34],.02,metal);if(a.guard==='cover'||a.guard==='half')s.box([W*.65,a.guard==='half'?.18:.42,.04],[0,a.guard==='half'?cy+.12:cy,.34],metal);if(a.guard==='cage'){for(let j=0;j<9;j++)s.rod([-W*.36+j*W*.72/8,.1,.34],[-W*.36+j*W*.72/8,cy+.2,.34],.009,metal);s.rod([-W*.4,cy+.2,.34],[W*.4,cy+.2,.34],.015,metal);}if(a.state==='gauge'){s.rod([bx,top,0],[bx,top+.18,.1],.012,brass);s.cylinder(.065,.065,.025,[bx,top+.18,.12],pale,24).rotation.x=Math.PI/2;}if(a.state==='oil')s.cylinder(.035,.035,.06,[bx-.08,top+.03,.02],brass,16);if(a.state==='service')s.cylinder(.2,.2,.02,[W/2+.2,.01,.3],metal,28);return s.finish();

  },
});

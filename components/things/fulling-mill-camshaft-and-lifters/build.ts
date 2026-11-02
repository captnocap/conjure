import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    shaft: choice("What shaft construction is visible?", {"wood": "A large timber shaft.", "iron": "A slim iron shaft.", "sleeved": "A timber shaft with iron sleeves.", "octagon": "An octagonal timber shaft."}),
    cams: choice("What lifter shape is fitted?", {"pegs": "Long radial wooden pegs.", "blocks": "Broad rectangular cam blocks.", "lobes": "Rounded eccentric lobes.", "double": "Paired lifting pegs."}),
    count: choice("How many lifter stations?", {"two": "Two lifting stations.", "three": "Three stations.", "four": "Four stations.", "six": "Six small stations."}),
    bearings: choice("What supports the axle?", {"wood": "Timber bearing trestles.", "stone": "Stone pillow blocks.", "iron": "Iron bearing pedestals.", "frame": "A full timber support frame."}),
    drive: choice("What drive wheel is fitted?", {"gear": "A wooden peg-tooth gear.", "pulley": "A broad belt pulley.", "spokes": "A plain spoked flywheel.", "stub": "A plain coupling stub."}),
    phase: choice("How are cams phased?", {"alternate": "Alternating quarter-turn phases.", "spiral": "A progressive spiral sequence.", "together": "All lifting faces aligned.", "pairs": "Matched pairs of cam phases."}),
    guards: choice("What guard is fitted?", {"open": "The shaft is fully exposed.", "rail": "A low front rail.", "back": "A timber rear shield.", "cover": "A partial upper shield."}),
    state: choice("What workshop detail appears?", {"ready": "The mechanism is assembled.", "spare": "A loose replacement cam.", "oil": "A bearing oil cup.", "marks": "Chalk timing marks on the shaft."}),
    length: score("How long is the camshaft?", ["Short paired-stock shaft", "Standard mill shaft", "Long multi-stock shaft"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9d8159'),light=s.material('#bca272'),dark=s.material('#555b45'),iron=s.material('#61745f',{metalness:.4}),cloth=s.material('#c9c3a4'),stone=s.material('#b3b59a'),water=s.material('#86aca0',{transparent:true,opacity:.55,depthWrite:false});

 const L=1.2+a.length*.9,Y=.7,R=a.shaft==='iron'?.075:.14,n={two:2,three:3,four:4,six:6}[a.count];for(const x of [-L*.42,L*.42]){if(a.bearings==='stone')s.box([.3,Y,.5],[x,Y/2,0],stone);else{for(const z of [-.22,.22])s.rod([x,0,z],[x,Y,0],a.bearings==='iron'?.03:.045,a.bearings==='iron'?iron:wood);s.box([.25,.16,.3],[x,Y,0],wood);}s.ring(R+.025,.025,[x,Y,0],iron).rotation.y=Math.PI/2;}if(a.bearings==='frame')for(const z of [-.22,.22])s.box([L,.1,.1],[0,.08,z],wood);
 s.cylinder(R,R,L,[0,Y,0],a.shaft==='iron'?iron:wood,a.shaft==='octagon'?8:24).rotation.z=Math.PI/2;if(a.shaft==='sleeved')for(const x of [-L*.3,0,L*.3])s.cylinder(R+.01,R+.01,.15,[x,Y,0],iron,24).rotation.z=Math.PI/2;
 for(let j=0;j<n;j++){const x=-L*.3+j*L*.6/(n-1),t=a.phase==='together'?0:a.phase==='alternate'?(j%2)*Math.PI/2:a.phase==='pairs'?Math.floor(j/2)*Math.PI/2:j*Math.PI*2/n;for(const dt of a.cams==='double'?[-.15,.15]:[0]){const ang=t+dt,ey=Y+Math.cos(ang)*.37,ez=Math.sin(ang)*.37;if(a.cams==='lobes')s.ball([.08,.16,.12],[x,Y+Math.cos(ang)*.18,Math.sin(ang)*.18],wood,16).rotation.x=ang;else if(a.cams==='blocks')s.box([.12,.37,.12],[x,Y+Math.cos(ang)*.185,Math.sin(ang)*.185],wood).rotation.x=ang;else s.rod([x,Y,0],[x,ey,ez],.035,wood);}if(a.state==='marks')s.box([.02,.01,.11],[x,Y+R+.008,0],cloth);}
 const dx=L/2+.08,wr=.4;if(a.drive==='stub')s.rod([L/2,Y,0],[L/2+.3,Y,0],.06,iron);else{s.ring(wr,.04,[dx,Y,0],wood).rotation.y=Math.PI/2;for(let j=0;j<8;j++){const t=j*Math.PI/4;s.rod([dx,Y,0],[dx,Y+Math.cos(t)*wr,Math.sin(t)*wr],.025,wood);}s.rod([L/2,Y,0],[dx,Y,0],.05,iron);if(a.drive==='gear')for(let j=0;j<24;j++){const t=j*Math.PI/12;s.rod([dx,Y+Math.cos(t)*wr,Math.sin(t)*wr],[dx,Y+Math.cos(t)*(wr+.08),Math.sin(t)*(wr+.08)],.022,light);}if(a.drive==='pulley')for(const xx of [dx-.06,dx+.06])s.ring(wr,.025,[xx,Y,0],iron).rotation.y=Math.PI/2;}
 if(a.guards==='rail'){for(const x of [-L*.4,L*.4])s.rod([x,0,.45],[x,.6,.45],.03,wood);s.rod([-L*.4,.6,.45],[L*.4,.6,.45],.03,wood);}if(a.guards==='back')s.box([L,.9,.06],[0,.45,-.5],wood);if(a.guards==='cover'){s.box([L*.8,.05,.35],[0,Y+.48,0],wood);for(const x of [-L*.4,L*.4])s.rod([x,0,-.15],[x,Y+.48,-.15],.03,wood);}if(a.state==='spare')s.box([.08,.07,.35],[0,.035,.55],light);if(a.state==='oil')s.cylinder(.04,.04,.06,[-L*.42,Y+.11,0],iron,16);return s.finish();

  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
import { body, materials, orbit, references, ringPoints, rotateToPlane, TAU, type Point } from './orbital';
export default defineThing({
  questions: {
    pattern: choice('Which orbital configuration is visible?', {needle: "One very long thin elliptical path.", wide: "A broad eccentric ellipse with an open far end.", fan: "Three paths spread into a fan around the same stellar focus.", crossed: "Two tilted eccentric paths cross near the star."}),
    companions: choice('What additional bodies accompany this orbital configuration?', {single: "One active comet follows each path.", fragments: "A train of smaller fragments follows each comet.", dust: "Fine dust beads remain along earlier passages.", shells: "Several faint concentric near-star passage marks show repeated approaches."}),
    inclination: choice('How is the system oriented in the picture?', {flat:'The orbital plane lies almost flat.', tilted:'The orbital plane tilts gently toward the viewer.', steep:'A steeply tilted plane exposes its crossings.', edge:'The plane is almost upright, a narrow orbital diagram.'}),
    phase: choice('Which moment in the orbital cycle is shown?', {approach:'Bodies approach their next close alignment.', conjunction:'A close alignment or turning point is taking place.', separation:'The bodies move away from their close alignment.', opposite:'The main bodies occupy opposite parts of the path.'}),
    trace: choice('How are the orbital paths made visible?', {solid:'Fine continuous path lines.', dashed:'Separated short segments along each path.', beads:'A chain of evenly spaced orbital beads.', ribbon:'Broad physical ribbons make the path geometry prominent.'}),
    markers: choice('What marks the reference positions?', {arrows:'Tapered arrows show travel direction.', dots:'Small round position markers.', notches:'Radial notches mark equal angular intervals.', compass:'Four elongated compass rays mark orientation.'}),
    bodies: choice('How are the celestial bodies represented?', {faceted:'Solid faceted bodies with readable angular silhouettes.', shell:'Open wire shells reveal the geometry behind them.', banded:'Smooth bodies crossed by narrow latitude bands.', cratered:'Rocky bodies with raised crater rims.'}),
    frame: choice('What spatial reference accompanies the system?', {none:'Only the orbital paths and their bodies.', equator:'An additional reference equator surrounds the system.', axes:'Three thin perpendicular axes cross at the origin.', cage:'A sparse three-dimensional cage of axes and great circles.'}),
    extent: score('How widely is the system spread?', ['A compact close grouping','Comfortably separated paths','A broad open orbital structure']),
    disparity: score('How unequal are the sizes of the primary and companion bodies?', ['Almost equal apparent sizes','One clear primary and smaller companions','A dominant primary with tiny companions']),
  },
  build(a,context) {
    const s=new Sculpture(context),m=materials(s,context),r=1.6+a.extent*1.15;
    const phase={approach:0.35,conjunction:1.55,separation:2.75,opposite:4.7}[a.phase];
    const tilt={flat:0.08,tilted:0.35,steep:0.82,edge:1.35}[a.inclination];
    const primary=0.2+a.disparity*0.17,secondary=0.2-a.disparity*0.1;
    const start=s.root.children.length;
    const e=a.pattern==='needle'?0.9:a.pattern==='wide'?0.55:0.75,aa=r*0.62,bb=aa*Math.sqrt(1-e*e),count=a.pattern==='fan'?3:a.pattern==='crossed'?2:1;
    body(s,[0,0,0],primary*0.8,m.star,a.bodies==='cratered'?'banded':a.bodies);
    const at=(E:number,i:number):Point=>{const x=aa*(Math.cos(E)-e),z=bb*Math.sin(E),angle=a.pattern==='fan'?(i-1)*0.35:i*0.7;return [x*Math.cos(angle)-z*Math.sin(angle),a.pattern==='crossed'?z*i*0.6:0,x*Math.sin(angle)+z*Math.cos(angle)];};
    const nodes:THREE.Group[]=[],tails:THREE.Group[]=[],fragments:{node:THREE.Group,i:number,lag:number}[]=[];
    for(let i=0;i<count;i++){
      orbit(s,Array.from({length:121},(_,j)=>at(j/120*TAU,i)),m.trace,a.trace,0.01);nodes.push(body(s,at(phase,i),secondary*0.7,m.moon,a.bodies));
      const tail=new THREE.Group();for(let strand=0;strand<3;strand++){const mesh=s.tube([[0,0,0],[0.35,0.025*(strand-1),0.035*(strand-1)],[0.85,0.04*(strand-1),0.1*(strand-1)]],0.009,m.fine);tail.add(mesh);}s.root.add(tail);tails.push(tail);
      if(a.companions==='fragments')for(let j=1;j<=3;j++)fragments.push({node:body(s,at(phase-j*0.1,i),0.035,m.moon,'faceted'),i,lag:j*0.1});
      if(a.companions==='dust')s.scatter(new THREE.IcosahedronGeometry(0.018,0),m.moon,Array.from({length:45},(_,j)=>({at:at(j/45*TAU,i),size:0.5+context.random()})));
    }
    if(a.companions==='shells')for(let i=0;i<4;i++)orbit(s,ringPoints(0.2+i*0.08),m.fine,'dashed',0.005);
    const eccentric=(M:number)=>{let E=M;for(let k=0;k<6;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return E;};
    const animate=(t:number)=>{nodes.forEach((node,i)=>{const p=at(eccentric(phase*0.3+t+i*0.15),i);node.position.set(...p);tails[i].position.copy(node.position);tails[i].rotation.y=-Math.atan2(p[2],p[0]);tails[i].scale.setScalar(0.3+0.5/(0.35+Math.hypot(...p)));});for(const f of fragments)f.node.position.set(...at(eccentric(phase*0.3+t+f.i*0.15-f.lag),f.i));};animate(0);

    references(s,r*1.18,a.frame,a.markers,m.fine);
    rotateToPlane(s,start,tilt);
    return s.finish({update:(_dt,time)=>animate(time*(0.12+context.mood.energy*0.36))});
  },
});

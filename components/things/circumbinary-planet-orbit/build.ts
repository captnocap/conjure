import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
import { body, materials, orbit, references, ringPoints, rotateToPlane, TAU, type Point } from './orbital';
export default defineThing({
  questions: {
    pattern: choice('Which orbital configuration is visible?', {round: "A close nearly circular stellar pair with a circular outer path.", eccentric: "An elongated inner stellar orbit inside a broad outer ellipse.", tilted: "The outer planetary plane tilts against the stellar pair.", retrograde: "The planet moves opposite to the stars on a separate broad orbit."}),
    companions: choice('What additional bodies accompany this orbital configuration?', {one: "A single circumbinary planet.", two: "Two planets occupy separated outer tracks.", three: "Three increasingly wide planetary paths.", moon: "One planet is accompanied by a close moon."}),
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
    const inner=r*0.3,e=a.pattern==='eccentric'?0.5:0.9;
    const starAt=(t:number,sign=1):Point=>[Math.cos(t)*inner*sign,0,Math.sin(t)*inner*e*sign];
    orbit(s,Array.from({length:97},(_,i)=>starAt(i/96*TAU)),m.fine,a.trace,0.01);
    const starA=body(s,starAt(phase),primary,m.star,a.bodies),starB=body(s,starAt(phase,-1),secondary,m.star,a.bodies==='cratered'?'banded':a.bodies);
    const count=a.companions==='two'?2:a.companions==='three'?3:1,nodes:THREE.Group[]=[],radii:number[]=[];
    const outer=(t:number,rr:number):Point=>[Math.cos(t)*rr,Math.sin(t)*rr*(a.pattern==='tilted'?0.42:0),Math.sin(t)*rr*(a.pattern==='eccentric'?0.75:1)];
    for(let i=0;i<count;i++){const rr=r*(0.8+i*0.19);radii.push(rr);orbit(s,Array.from({length:97},(_,j)=>outer(j/96*TAU,rr)),m.trace,a.trace,0.01);nodes.push(body(s,outer(phase+i*1.4,rr),secondary*(0.65+i*0.12),m.planet,a.bodies));}
    const moon=a.companions==='moon'?body(s,[r,0,0],0.06,m.moon,a.bodies):null;
    const animate=(t:number)=>{starA.position.set(...starAt(phase+t*2));starB.position.set(...starAt(phase+t*2,-1));nodes.forEach((node,i)=>node.position.set(...outer(phase+i*1.4+t*(a.pattern==='retrograde'?-1:1)/(1+i*0.6),radii[i])));if(moon)moon.position.copy(nodes[0].position).add(new THREE.Vector3(Math.cos(t*5)*0.23,0,Math.sin(t*5)*0.23));};animate(0);

    references(s,r*1.18,a.frame,a.markers,m.fine);
    rotateToPlane(s,start,tilt);
    return s.finish({update:(_dt,time)=>animate(time*(0.12+context.mood.energy*0.36))});
  },
});

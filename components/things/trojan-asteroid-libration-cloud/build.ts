import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
import { body, materials, orbit, references, ringPoints, rotateToPlane, TAU, type Point } from './orbital';
export default defineThing({
  questions: {
    pattern: choice('Which orbital configuration is visible?', {balanced: "Leading and trailing swarms have similar sizes.", leading: "A large leading swarm and a small trailing remnant.", trailing: "A long trailing swarm and a compact leading cluster.", dispersed: "Both swarms spread widely around their equilibrium regions."}),
    companions: choice('What additional bodies accompany this orbital configuration?', {single: "One main planet defines the shared orbit.", moon: "The planet carries a close small moon.", paired: "A binary pair occupies the planet position.", debris: "Loose small debris extends between the main swarms."}),
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
    orbit(s,ringPoints(r),m.trace,a.trace,0.012);
    body(s,[0,0,0],primary*1.4,m.star,a.bodies==='cratered'?'banded':a.bodies);
    const planet=body(s,[r,0,0],primary,m.planet,a.bodies);
    const cloud=new THREE.Group(),from=s.root.children.length;
    for(const sign of [-1,1]){
      const count=a.pattern==='leading'?(sign>0?75:24):a.pattern==='trailing'?(sign<0?75:24):48;
      const spread=a.pattern==='dispersed'?0.7:0.32;
      const points=Array.from({length:count},()=>{const u=context.random(),v=context.random(),theta=sign*Math.PI/3+(u-0.5)*spread,rad=r+(v-0.5)*r*0.16*(0.35+Math.sin(u*Math.PI));return {at:[Math.cos(theta)*rad,(context.random()-0.5)*r*0.07,Math.sin(theta)*rad] as Point,size:0.028+context.random()*0.04};});
      s.scatter(new THREE.IcosahedronGeometry(1,0),m.moon,points);
      const t=sign*Math.PI/3;s.rod([0,0,0],[Math.cos(t)*r,0,Math.sin(t)*r],0.005,m.fine);s.rod([r,0,0],[Math.cos(t)*r,0,Math.sin(t)*r],0.005,m.fine);
    }
    if(a.companions==='debris')s.scatter(new THREE.IcosahedronGeometry(1,0),m.dark,Array.from({length:30},()=>{const t=(context.random()-0.5)*2.5;return {at:[Math.cos(t)*r,0,Math.sin(t)*r] as Point,size:0.025};}));
    for(const child of s.root.children.slice(from))cloud.add(child);s.root.add(cloud);
    let moon:THREE.Group|null=null;if(a.companions==='moon'||a.companions==='paired')moon=body(s,[r+0.3,0,0],a.companions==='paired'?secondary:0.075,m.moon,a.bodies);
    const animate=(t:number)=>{const theta=phase+t*0.35;cloud.rotation.y=-theta;planet.position.set(Math.cos(theta)*r,0,Math.sin(theta)*r);if(moon)moon.position.set(Math.cos(theta)*r+Math.cos(t*3)*0.32,Math.sin(t*3)*0.07,Math.sin(theta)*r+Math.sin(t*3)*0.32);};animate(0);

    references(s,r*1.18,a.frame,a.markers,m.fine);
    rotateToPlane(s,start,tilt);
    return s.finish({update:(_dt,time)=>animate(time*(0.12+context.mood.energy*0.36))});
  },
});

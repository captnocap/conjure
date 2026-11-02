import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
import { body, materials, orbit, references, ringPoints, rotateToPlane, TAU, type Point } from './orbital';
export default defineThing({
  questions: {
    pattern: choice('Which orbital configuration is visible?', {wide: "A broad horseshoe with deep radial lane changes.", narrow: "A narrow horseshoe hugs the circular reference orbit.", asymmetric: "One turning lobe is broader than the other.", inclined: "The two halves rise and fall on opposite sides of the reference plane."}),
    companions: choice('What additional bodies accompany this orbital configuration?', {pair: "Only the two lane-changing bodies.", escort: "A small escort follows the larger body.", markers: "Four tiny reference moons mark the circular track.", cluster: "A short group of companion fragments follows each body."}),
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
    const width=r*(a.pattern==='narrow'?0.09:a.pattern==='wide'?0.26:0.18),gap=0.42;
    const at=(t:number):Point=>{const theta=Math.PI+(Math.PI-gap)*Math.cos(t),rad=r+width*Math.sin(t)*(a.pattern==='asymmetric'?1+0.35*Math.cos(t):1);return [Math.cos(theta)*rad,a.pattern==='inclined'?Math.sin(t)*r*0.22:0,Math.sin(theta)*rad];};
    orbit(s,Array.from({length:121},(_,i)=>at(i/120*TAU)),m.trace,a.trace,0.016);
    orbit(s,ringPoints(r),m.fine,'dashed',0.006);
    body(s,[0,0,0],primary*1.5,m.star,a.bodies==='cratered'?'banded':a.bodies);
    const first=body(s,at(phase),primary,m.planet,a.bodies),second=body(s,at(phase+Math.PI),secondary,m.moon,a.bodies);
    const escorts: {node:THREE.Group,offset:number,which:number}[]=[];
    if(a.companions==='markers')for(let i=0;i<4;i++){const t=i/4*TAU;body(s,[Math.cos(t)*r,0,Math.sin(t)*r],0.055,m.moon,'faceted');}
    if(a.companions==='escort'||a.companions==='cluster')for(let i=0;i<(a.companions==='escort'?1:6);i++)escorts.push({node:body(s,at(phase+i*0.08),0.055,m.moon,'faceted'),offset:0.1+i*0.06,which:i%2});
    const animate=(t:number)=>{first.position.set(...at(phase+t));second.position.set(...at(phase+t+Math.PI));for(const e of escorts)e.node.position.set(...at(phase+t+e.offset+e.which*Math.PI));};

    references(s,r*1.18,a.frame,a.markers,m.fine);
    rotateToPlane(s,start,tilt);
    return s.finish({update:(_dt,time)=>animate(time*(0.12+context.mood.energy*0.36))});
  },
});

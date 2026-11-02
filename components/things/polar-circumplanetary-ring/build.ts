import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
import { body, materials, orbit, references, ringPoints, rotateToPlane, TAU, type Point } from './orbital';
export default defineThing({
  questions: {
    pattern: choice('Which orbital configuration is visible?', {polar: "A circular polar annulus stands upright across the equator.", tilted: "The polar ring leans away from a true right angle.", warped: "The annulus gently ripples out of its own plane.", broken: "A broad missing arc interrupts the polar ring."}),
    companions: choice('What additional bodies accompany this orbital configuration?', {pair: "Two small shepherd bodies sit on opposite sides.", quartet: "Four shepherds divide the ring into quarters.", clumps: "A chain of small rubble clumps inhabits the annulus.", crossing: "One equatorial moon crosses beneath the polar ring."}),
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
    body(s,[0,0,0],primary*2,m.planet,a.bodies);
    orbit(s,ringPoints(primary*2.2),m.fine,'dashed',0.007);
    const at=(t:number,rr=r):Point=>[a.pattern==='warped'?Math.sin(t*3)*rr*0.12:a.pattern==='tilted'?Math.sin(t)*rr*0.27:0,Math.cos(t)*rr,Math.sin(t)*rr];
    for(let band=0;band<4;band++){const max=a.pattern==='broken'?TAU*0.82:TAU;orbit(s,Array.from({length:97},(_,j)=>at(j/96*max,r*(0.83+band*0.055))),band%2?m.moon:m.trace,a.trace,0.015);}
    const count=a.companions==='quartet'?4:a.companions==='clumps'?12:2,nodes:THREE.Group[]=[];
    for(let i=0;i<count;i++)nodes.push(body(s,at(phase+i/count*TAU),a.companions==='clumps'?0.055:secondary,m.moon,a.bodies));
    const crossing=a.companions==='crossing'?body(s,[r,0,0],0.09,m.star,a.bodies):null;
    const animate=(t:number)=>{nodes.forEach((node,i)=>node.position.set(...at(phase+t+i/count*TAU)));if(crossing)crossing.position.set(Math.cos(t*1.7)*r,0,Math.sin(t*1.7)*r);};animate(0);

    references(s,r*1.18,a.frame,a.markers,m.fine);
    rotateToPlane(s,start,tilt);
    return s.finish({update:(_dt,time)=>animate(time*(0.12+context.mood.energy*0.36))});
  },
});

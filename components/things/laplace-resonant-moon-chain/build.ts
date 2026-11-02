import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
import { body, materials, orbit, references, ringPoints, rotateToPlane, TAU, type Point } from './orbital';
export default defineThing({
  questions: {
    pattern: choice('Which orbital configuration is visible?', {three: "Three moons turn in a four-to-two-to-one cadence.", four: "A fourth outer moon extends the nested chain.", eccentric: "The resonant paths are visibly elongated.", stepped: "Each orbital plane is tilted slightly more than the last."}),
    companions: choice('What additional bodies accompany this orbital configuration?', {bare: "Only the resonant moons and central world.", rings: "A narrow inner dust ring circles the central world.", submoons: "Tiny companion markers follow each resonant moon.", alignment: "Bright spokes connect the moons at their current phases."}),
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
    body(s,[0,0,0],primary*1.8,m.planet,a.bodies);
    const count=a.pattern==='four'?4:3,nodes:THREE.Group[]=[],small:THREE.Group[]=[],spokes:THREE.Mesh[]=[];
    const at=(t:number,i:number):Point=>{const rr=r*(0.43+i*0.21),inc=a.pattern==='stepped'?i*0.13:0;return [Math.cos(t)*rr,Math.sin(t)*rr*Math.sin(inc),Math.sin(t)*rr*Math.cos(inc)*(a.pattern==='eccentric'?0.7:1)];};
    for(let i=0;i<count;i++){orbit(s,Array.from({length:97},(_,j)=>at(j/96*TAU,i)),m.trace,a.trace,0.01);nodes.push(body(s,at(phase+i*1.3,i),secondary*(0.75+i*0.15),m.moon,a.bodies));if(a.companions==='submoons')small.push(body(s,at(phase+i*1.3+0.13,i),0.045,m.star,'faceted'));if(a.companions==='alignment')spokes.push(s.rod([0,0,0],at(phase+i*1.3,i),0.008,m.star));}
    if(a.companions==='rings')for(let i=0;i<3;i++)orbit(s,ringPoints(primary*2.4+i*0.04),m.moon,'solid',0.009);
    const up=new THREE.Vector3(0,1,0);
    const animate=(t:number)=>nodes.forEach((node,i)=>{const p=at(phase+i*1.3+t*4/(2**i),i);node.position.set(...p);if(small[i])small[i].position.set(...at(phase+i*1.3+t*4/(2**i)+0.14,i));if(spokes[i]){const v=new THREE.Vector3(...p),original=r*(0.43+i*0.21);spokes[i].position.copy(v).multiplyScalar(0.5);spokes[i].scale.y=v.length()/original;spokes[i].quaternion.setFromUnitVectors(up,v.normalize());}});animate(0);

    references(s,r*1.18,a.frame,a.markers,m.fine);
    rotateToPlane(s,start,tilt);
    return s.finish({update:(_dt,time)=>animate(time*(0.12+context.mood.energy*0.36))});
  },
});

import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
import { body, materials, orbit, references, ringPoints, rotateToPlane, TAU, type Point } from './orbital';
export default defineThing({
  questions: {
    pattern: choice('Which orbital configuration is visible?', {central: "A moon crosses close to the middle of the planet disc.", grazing: "The transit skims the upper limb.", tilted: "The crossing path runs diagonally across the planet.", double: "Two moons cast separate moving transit shadows."}),
    companions: choice('What additional bodies accompany this orbital configuration?', {bare: "The planet and its transiting moon only.", contacts: "Small contact markers bracket the visible transit chord.", beam: "A sparse parallel light bundle indicates the incoming light direction.", observer: "A small distant observation platform faces the transit."}),
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
    const planetRadius=r*0.43,orbitalRadius=r*0.94;
    body(s,[0,0,0],planetRadius,m.planet,a.bodies);
    const yoffset=a.pattern==='grazing'?planetRadius*0.76:0,diag=a.pattern==='tilted'?0.6:0;
    const at=(t:number):Point=>[Math.sin(t)*orbitalRadius,yoffset+Math.sin(t)*orbitalRadius*diag,Math.cos(t)*orbitalRadius];
    orbit(s,Array.from({length:97},(_,j)=>at(j/96*TAU)),m.trace,a.trace,0.012);
    const count=a.pattern==='double'?2:1,nodes:THREE.Group[]=[],shadows:THREE.Mesh[]=[];
    for(let i=0;i<count;i++){nodes.push(body(s,at(phase+i*0.3),secondary*(0.8+i*0.2),m.moon,a.bodies));shadows.push(s.mesh(new THREE.CircleGeometry(secondary*0.9,28),m.dark));}
    if(a.companions==='contacts')for(const x of [-planetRadius,planetRadius]){s.rod([x,-0.16,planetRadius*1.08],[x,0.16,planetRadius*1.08],0.01,m.star);}
    if(a.companions==='beam')for(let i=-2;i<=2;i++)s.rod([i*planetRadius*0.38,planetRadius*0.6,-r*1.1],[i*planetRadius*0.38,planetRadius*0.6,r*1.1],0.005,m.fine);
    if(a.companions==='observer'){s.box([0.28,0.12,0.13],[r*0.85,0,r*0.85],m.dark);for(const sign of [-1,1])s.box([0.25,0.008,0.16],[r*0.85+sign*0.27,0,r*0.85],m.planet);}
    const animate=(t:number)=>nodes.forEach((node,i)=>{const p=at((phase-1.55)*0.4+t+i*0.3);node.position.set(...p);const rho=p[0]**2+p[1]**2;shadows[i].visible=p[2]>0&&rho<planetRadius**2*0.94;if(shadows[i].visible){const z=Math.sqrt(planetRadius**2-rho);shadows[i].position.set(p[0],p[1],z+0.007);shadows[i].quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(p[0],p[1],z).normalize());}});animate(0);

    references(s,r*1.18,a.frame,a.markers,m.fine);
    rotateToPlane(s,start,tilt);
    return s.finish({update:(_dt,time)=>animate(time*(0.12+context.mood.energy*0.36))});
  },
});

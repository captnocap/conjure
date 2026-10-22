import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    surface: choice('What kind of planet is this?', {ocean:'Blue oceans and green island continents.', gas:'A giant wrapped in cream and ochre cloud bands.', desert:'Rust-red dry basins and pale dunes.', ice:'A pale icy world with blue fractures.', lava:'Black crust with orange molten seams.'}),
    rings: choice('What surrounds the planet?', {none:'No rings.', thin:'A fine narrow ring.', wide:'Several broad icy rings.'}),
    axis: choice('How is its axis inclined?', {calm:'A modest axial tilt.', tipped:'Strongly tipped on its side.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const base={ocean:'#326c93',gas:'#d5b582',desert:'#b76749',ice:'#b5d3d7',lava:'#403d41'}[a.surface];
    const globe=s.ball([1.65,1.65,1.65],[0,0,0],s.material(base),48);
    const crust=s.material({ocean:'#729378',gas:'#966f54',desert:'#dfab77',ice:'#e1edef',lava:'#ef8750'}[a.surface]);
    if(a.surface==='gas') for(let i=0;i<9;i++){const y=-1.35+i*0.33,r=Math.sqrt(1.65**2-y*y);const ring=s.ring(r,0.06,[0,y,0],crust);ring.rotation.x=Math.PI/2;}
    else for(let i=0;i<45;i++){
      const u=random()*Math.PI*2,v=random()*2-1,r=Math.sqrt(1-v*v),p=new THREE.Vector3(r*Math.cos(u),v,r*Math.sin(u));
      const patch=s.ball([0.16+random()*0.25,0.018,0.1+random()*0.24],p.clone().multiplyScalar(1.65).toArray() as [number,number,number],crust,12);
      patch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p);
    }
    if(a.rings!=='none') for(let i=0;i<(a.rings==='wide'?12:3);i++){const ring=s.ring(2.15+i*0.045,0.018,[0,0,0],s.material('#dad7be'));ring.rotation.x=Math.PI/2;}
    s.root.rotation.z=a.axis==='tipped'?0.9:0.22;

    return s.finish();
  },
});

import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    form: choice('How are the stars arranged?', {spiral:'Two graceful spiral arms around a compact nucleus.', barred:'A straight central bar with trailing arms.', elliptical:'A smooth, ancient elliptical swarm.', collision:'Two star cities pulling each other into tidal tails.'}),
    population: choice('What colours dominate its stellar population?', {young:'Blue-white young stars and rose star-forming knots.', old:'Amber and ivory old stars.', strange:'Violet and cyan stars in an unfamiliar universe.'}),
    tilt: choice('How is the galaxy inclined?', {face:'Nearly face-on, showing the complete spiral.', oblique:'Tilted like a floating plate.', edge:'Almost edge-on, a thin bright lens.'}),
    arms: choice('How intricate is the spiral structure, if present?', {two:'Two broad arms.', four:'Four tighter arms.', many:'Six fragmented flocculent arms.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const colours = a.population === 'young' ? ['#b9d5ff','#fff0d7','#e8a2bb'] : a.population === 'old' ? ['#ffe0a1','#efbc7e','#fff4de'] : ['#b9a3ff','#91e8df','#ffc1ed'];
    const count = 1200, armCount = {two:2,four:4,many:6}[a.arms];
    const stars = Array.from({length:count}, (_,i) => {
      const radius = 0.15 + Math.pow(random(),0.7)*4;
      const arm = (i % armCount)*Math.PI*2/armCount;
      const angle = a.form === 'elliptical' ? random()*Math.PI*2 : arm + radius*1.15 + (random()-0.5)*0.65;
      let x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
      let y = (random()-0.5)*(a.form === 'elliptical' ? 2.1 : 0.3) * (1-radius/5);
      if(a.form === 'barred' && radius<1.6){x*=1.7; z*=0.23;}
      if(a.form === 'collision'){x+=(i%2?1:-1)*1.6;z+=Math.sin(radius)*1.1;}
      return {at:[x,y,z] as [number,number,number],size:0.018+random()*0.032,color:colours[i%3]};
    });
    s.scatter(new THREE.IcosahedronGeometry(1,0), new THREE.MeshBasicMaterial({color:'#ffffff'}), stars);
    s.ball([0.43,0.2,0.43],[0,0,0],new THREE.MeshBasicMaterial({color:'#fff1d5'}));
    s.root.rotation.x = {face:0.2,oblique:0.65,edge:1.35}[a.tilt];

    return s.finish();
  },
});

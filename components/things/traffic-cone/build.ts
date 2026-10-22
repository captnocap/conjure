import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    arrangement: choice('How are the traffic cones arranged?', {single:'One upright traffic cone.', pair:'A pair of cones joined by warning tape.', stack:'A nested stack of three cones.'}),
    shape: choice('What form is the cone?', {classic:'A tapered hollow orange cone.', bollard:'A thin flexible cylindrical warning bollard.', barrel:'A wide traffic barrel with a weighted base.'}),
    colour: choice('What is its warning colour?', {orange:'Roadwork orange.', yellow:'Fluorescent yellow.', red:'Red safety plastic.'}),
    band: choice('What reflective pattern does it have?', {one:'One broad white reflective band.', two:'Two narrow white reflective bands.', black:'Alternating dark and bright hazard bands.'}),
    lamp: noul('Is a little battery warning lamp attached at the top?'),
    sign: noul('Does it carry a small ROAD WORK sign?'),
    toppled: noul('Is one extra cone lying on its side nearby?'),
    size: score('How large is the cone?', ['A short parking cone', 'A tall roadworks cone']),
  },
  build(a, context) {

    const s=new Sculpture(context),h=0.45+a.size*0.5,paint=s.material({orange:'#d17a3c',yellow:'#c8c44b',red:'#b65147'}[a.colour]),rubber=s.material('#3e443a'),white=s.material('#eee8d2'),stripe=a.band==='black'?rubber:white;
    const r=a.shape==='bollard'?0.06:a.shape==='barrel'?0.26:0.19;
    const cone=(x:number,z:number,extraY=0)=>{s.box([r*2.6,0.052,r*2.6],[x,0.035+extraY,z],rubber);s.cylinder(a.shape==='classic'?0.034:r*0.8,r,h,[x,h/2+0.059+extraY,z],paint,24);for(let i=0;i<(a.band==='one'?1:2);i++){const yy=h*(0.48+i*0.23), rr=a.shape==='classic'?r-(r-0.034)*yy/h:r*0.9;s.cylinder(rr+0.003,rr+0.022,a.band==='one'?h*0.16:h*0.09,[x,yy+0.06+extraY,z],stripe,24);}s.cylinder(0.029,0.029,0.003,[x,h+0.061+extraY,z],rubber,12);};
    cone(a.arrangement==='pair'?-0.56:0,0);
    if(a.arrangement==='pair'){cone(0.56,0);const tape=s.box([1.11,0.05,0.009],[0,h*0.73+0.06,0.01],white);for(let i=0;i<8;i++){const mark=s.box([0.065,0.055,0.012],[-0.49+i*0.14,h*0.73+0.06,0.017],rubber);mark.rotation.z=-0.6;}}
    if(a.arrangement==='stack')for(let i=1;i<3;i++)cone(0,0,i*0.105);
    const top=h+0.08+(a.arrangement==='stack'?0.21:0),cx=a.arrangement==='pair'?-0.56:0;
    if(a.lamp){s.box([0.12,0.08,0.055],[cx,top+0.035,0],rubber);s.ball([0.074,0.074,0.029],[cx,top+0.14,0],s.material('#dfad46',{emissive:'#b58228',emissiveIntensity:0.25}),16);}
    if(a.sign){s.rod([cx,top,0],[cx,top+0.4,0],0.01,rubber);const sign=s.box([0.27,0.27,0.028],[cx,top+0.43,0],paint);sign.rotation.z=Math.PI/4;s.label('ROAD WORK',0.25,0.095,[cx,top+0.43,0.02],'#394035',{orange:'#d17a3c',yellow:'#c8c44b',red:'#b65147'}[a.colour]);}
    if(a.toppled){const start=s.root.children.length;cone(0,0);for(const mesh of s.root.children.slice(start)){mesh.position.applyAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);mesh.rotateX(Math.PI/2);mesh.position.x+=0.42;mesh.position.y+=r*1.3;mesh.position.z+=0.4;}}
    for(let i=0;i<5;i++)if(context.random()<context.mood.wear)s.box([0.02,0.035,0.003],[cx+(context.random()-0.5)*r,0.1+context.random()*h*0.7,r*0.8],rubber);
    return s.finish();
  },
});

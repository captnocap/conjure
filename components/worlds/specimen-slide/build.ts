import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    support: choice('What holds the specimen?', {slide:'A glass slide on a pale stage.', dish:'A shallow circular specimen dish.', soil:'A little cutaway of dark soil.'}),
    lighting: choice('How is the field presented?', {ivory:'Warm ivory field notes.', blue:'Cool blue laboratory light.', dark:'A dark field with pale edges.'}),
    marks: noul('Are calibration marks and a specimen label visible?'),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background:{ivory:'#e8e4d4',blue:'#dbe7e9',dark:'#303f43'}[a.lighting],floor:a.support==='soil'?'#6f6654':'#bcc8c0',width:12,depth:9,maxHeight:3.8,radius:1.4,pitch:56});

    const edge=s.material('#8a9d95');
    if(a.support==='dish'){const ring=s.ring(5,0.075,[0,0.1,0],edge);ring.rotation.x=Math.PI/2;}
    if(a.support==='slide')s.box([11.3,0.025,8.3],[0,0.012,0],s.material('#d7e3d7',{roughness:0.2}));
    if(a.support==='soil')for(let i=0;i<50;i++)s.mesh(new THREE.IcosahedronGeometry(0.05+random()*0.12,0),edge,[(random()-0.5)*11,0.03,(random()-0.5)*8]);
    if(a.marks){for(let i=0;i<21;i++)s.box([0.015,0.02,i%5===0?0.3:0.15],[-5+i*0.3,0.05,3.6],edge);const label=s.label('SPECIMEN / 01',2.7,0.55,[3.6,0.04,3.3]);label.rotation.x=-Math.PI/2;}

    return world;
  },
});

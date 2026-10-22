import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    cabinet: choice('What kind of gramophone cabinet supports the horn?', {table:'A square tabletop gramophone with carved corners.', floor:'A tall floor-standing gramophone cabinet.', travel:'A compact dark travel gramophone.'}),
    wood: choice('What is the cabinet finish?', {oak:'Golden oak.', walnut:'Deep walnut.', lacquer:'Dark red lacquer.'}),
    horn: choice('What kind of sound horn does it have?', {brass:'A wide golden brass flower horn.', painted:'A green painted horn with a cream inner bell.', black:'A black metal horn with brass edging.'}),
    bell: choice('What shape is the horn mouth?', {round:'A smoothly round horn mouth.', petals:'A scalloped mouth formed by eight petals.', narrow:'A smaller narrow conical horn.'}),
    record: choice('What is on the platter?', {shellac:'A black shellac record with a cream label.', red:'A dark red record with a blue label.', empty:'An empty green felt platter.'}),
    needle: choice('What is the sound head doing?', {playing:'Resting on the record.', parked:'Parked beside the platter.', raised:'Raised clear of the record.'}),
    storage: noul('Are loose record sleeves leaning beside the cabinet?'),
    trim: noul('Does the cabinet have decorative brass corner plates?'),
  },
  build(a, context) {

    const s=new Sculpture(context),floor=a.cabinet==='floor',h=floor?0.92:0.23,w=a.cabinet==='travel'?0.4:0.55,color={oak:'#ae935f',walnut:'#7a6246',lacquer:'#8c5142'}[a.wood],wood=s.material(color),brass=s.material('#bfa566',{metalness:0.65,side:THREE.DoubleSide}),dark=s.material('#36433a'),felt=s.material('#708765');
    s.box([w,h,0.48],[0,h/2+0.03,0],wood);s.box([w+0.05,0.04,0.52],[0,h+0.05,0],wood);for(const x of [-w*0.4,w*0.4])for(const z of [-0.17,0.17])s.ball([0.029,0.025,0.029],[x,0.028,z],brass,12);
    if(floor){s.box([w*0.8,h*0.7,0.022],[0,h*0.52,0.252],wood);s.ring(0.026,0.005,[0,h*0.57,0.27],brass);for(let i=0;i<4;i++)s.box([w*0.77,0.011,0.005],[0,0.14+i*0.17,0.265],brass);}
    const y=h+0.084;s.cylinder(0.176,0.176,0.012,[-0.04,y,0.05],brass,40);s.cylinder(0.165,0.165,0.007,[-0.04,y+0.009,0.05],a.record==='empty'?felt:s.material(a.record==='red'?'#703b36':'#2f3930'),40);if(a.record!=='empty')s.cylinder(0.044,0.044,0.004,[-0.04,y+0.016,0.05],s.material(a.record==='red'?'#81989a':'#d7cba8'),20);
    s.rod([w/2,h*0.61,0],[w/2+0.12,h*0.61,0],0.008,brass);s.rod([w/2+0.12,h*0.61,0],[w/2+0.12,h*0.61+0.07,0],0.01,wood);
    s.tube([[0.17,y,-0.15],[0.19,y+0.18,-0.16],[0.15,y+0.24,-0.13]],0.021,brass);
    const hornMat=a.horn==='brass'?brass:s.material(a.horn==='painted'?'#6f8b64':'#48564a',{metalness:0.4,side:THREE.DoubleSide}),r=a.bell==='narrow'?0.2:0.32;
    const horn=s.lathe([[0.025,0],[0.035,0.08],[0.07,0.2],[0.14,0.32],[r*0.72,0.41],[r,0.47]],hornMat,[0.1,y+0.23,-0.12]);horn.rotation.x=0.85;const rim=s.ring(r,0.009,[0.1,y+0.23+Math.cos(0.85)*0.47,-0.12+Math.sin(0.85)*0.47],brass);rim.rotation.x=Math.PI/2+0.85;
    if(a.bell==='petals')for(let i=0;i<8;i++){const phi=i*Math.PI/4;const local=new THREE.Vector3(Math.sin(phi)*r,0.47,Math.cos(phi)*r).applyAxisAngle(new THREE.Vector3(1,0,0),0.85);s.ball([0.027,0.027,0.027],[0.1+local.x,y+0.23+local.y,-0.12+local.z],brass,10);}
    const headx=a.needle==='parked'?0.2:0.05,headz=a.needle==='parked'?-0.08:0.16,heady=a.needle==='raised'?y+0.11:y+0.033;s.tube([[0.19,y+0.17,-0.12],[0.15,y+0.17,0.1],[headx,heady,headz]],0.01,brass);s.cylinder(0.026,0.026,0.016,[headx,heady,headz],brass,16).rotation.x=Math.PI/2;
    if(a.storage)for(let i=0;i<3;i++){const sleeve=s.box([0.31,0.31,0.012],[-w*0.7-i*0.018,0.18,0.04+i*0.025],s.material(i%2?'#b09b75':'#8f9f89'));sleeve.rotation.z=-0.2-i*0.03;s.label(['VOICES','DANCE','HOME'][i],0.23,0.04,[-w*0.7-i*0.018,0.21,0.05+i*0.025]);}
    if(a.trim)for(const x of [-w/2+0.025,w/2-0.025])for(const yy of [0.1,h-0.04])s.box([0.046,0.06,0.007],[x,yy,0.245],brass);
    const phase=context.random();return s.finish({update:(_dt,time)=>{if(a.needle==='playing'&&a.record!=='empty')horn.rotation.z=Math.sin(time*0.9+phase)*0.001;}});
  },
});

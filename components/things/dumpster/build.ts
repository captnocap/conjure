import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    type: choice('What kind of refuse container is it?', {commercial:'A large rectangular steel dumpster with two lids.', wheelie:'A tall household wheelie bin.', skip:'An open construction skip with sloping ends.'}),
    colour: choice('What colour is the bin?', {green:'Dark service green.', blue:'Municipal blue.', orange:'Construction orange.'}),
    lid: choice('How is the lid positioned?', {closed:'Closed with one small gap.', half:'One lid raised halfway.', open:'Fully open over the contents.'}),
    contents: choice('What is visible inside?', {bags:'Black refuse bags and flattened cartons.', rubble:'Pale chunks of construction debris.', empty:'An empty dark interior.', treasures:'A discarded chair seat, frame and old records.'}),
    warning: choice('What is printed on its side?', {waste:'WASTE ONLY', recycle:'RECYCLING', number:'BIN 07', none:'No printed notice.'}),
    lock: noul('Is a locking bar attached across the lid?'),
    spill: noul('Are a few discarded objects scattered beside it?'),
    length: score('How large is the container?', ['A compact back-door bin', 'A large commercial dumpster']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=a.type==='wheelie'?0.58:1.1+a.length*1.1,d=a.type==='wheelie'?0.57:0.98,h=a.type==='wheelie'?1.03:0.96,body=s.material({green:'#4e7060',blue:'#4e7891',orange:'#b47e48'}[a.colour],{metalness:a.type==='wheelie'?0.08:0.4}),dark=s.material('#333d36'),steel=s.material('#9aa79b',{metalness:0.7});
    const wheelY=a.type==='skip'?0:0.12;
    for(const x of [-w/2+0.05,w/2-0.05]){s.box([0.045,h,d],[x,h/2+wheelY,0],body);if(a.type!=='wheelie'||x>0)for(const z of [-d/2+0.05,d/2-0.05])if(a.type!=='skip')s.cylinder(0.085,0.085,0.044,[x,0.09,z],dark,12).rotation.z=Math.PI/2;}
    s.box([w,h,0.055],[0,h/2+wheelY,-d/2],body);s.box([w,h,0.055],[0,h/2+wheelY,d/2],body);s.box([w,0.05,d],[0,wheelY+0.03,0],dark);s.box([w+0.05,0.035,0.07],[0,h+wheelY,d/2],steel);s.box([w+0.05,0.035,0.07],[0,h+wheelY,-d/2],steel);
    for(let i=0;i<8;i++)s.box([0.02,h*0.78,0.027],[-w*0.43+i*w*0.123,h*0.55+wheelY,d/2+0.04],body);
    if(a.type!=='skip'){const lids=a.type==='commercial'?2:1;for(let i=0;i<lids;i++){const ww=w/lids-0.025,x=(i-(lids-1)/2)*w/lids,angle=a.lid==='closed'?0:a.lid==='half'?(i?0:0.75):1.6;const lid=new THREE.Group();lid.position.set(x,h+wheelY+0.015,-d/2);s.root.add(lid);const mesh=new THREE.Mesh(new THREE.BoxGeometry(ww,0.055,d+0.08),dark);mesh.position.z=d/2;mesh.castShadow=true;lid.add(mesh);for(let j=0;j<5;j++){const rib=new THREE.Mesh(new THREE.BoxGeometry(ww*0.92,0.012,0.018),dark);rib.position.set(0,0.032,0.08+j*d/5);rib.castShadow=true;lid.add(rib);}lid.rotation.x=-angle;}}
    if(a.contents!=='empty'){const count=6+Math.floor(context.mood.density*7);for(let i=0;i<count;i++){const x=(context.random()-0.5)*w*0.8,z=(context.random()-0.5)*d*0.8,y=wheelY+h*0.72+context.random()*h*0.15;if(a.contents==='bags'){s.ball([0.16,0.14,0.14],[x,y,z],dark,12);s.cylinder(0.023,0.04,0.04,[x,y+0.14,z],dark,8);}else if(a.contents==='rubble'){const block=s.box([0.15,0.09,0.13],[x,y,z],s.material('#bcb8a3'));block.rotation.set(context.random(),context.random(),context.random());}else{s.box([0.17,0.025,0.25],[x,y,z],s.material(i%2?'#9b7e57':'#685d53')).rotation.z=(context.random()-0.5)*0.4;}}}
    if(a.warning!=='none')s.label({waste:'WASTE ONLY',recycle:'RECYCLING',number:'BIN 07'}[a.warning],w*0.6,0.2,[0,h*0.54+wheelY,d/2+0.055],'#e4e0c8',{green:'#4e7060',blue:'#4e7891',orange:'#b47e48'}[a.colour]);
    if(a.lock){s.rod([-w*0.4,h+wheelY+0.08,0.07],[w*0.4,h+wheelY+0.08,0.07],0.018,steel);s.box([0.055,0.08,0.025],[w*0.32,h+wheelY+0.03,d/2+0.035],steel);}
    if(a.spill){s.box([0.33,0.08,0.25],[-w*0.64,0.044,0.18],s.material('#b49b73'));s.ball([0.14,0.12,0.14],[w*0.61,0.12,0.23],dark,12);for(let i=0;i<5;i++)s.box([0.08,0.003,0.07],[(context.random()-0.5)*w*1.4,0.006,d*0.65+context.random()*0.25],s.material('#c9bea0'));}
    if(context.mood.wear>0.3)for(let i=0;i<8;i++)s.box([0.04,0.05,0.005],[(context.random()-0.5)*w,0.15+context.random()*h*0.65,d/2+0.055],s.material('#9c795a'));
    return s.finish();
  },
});

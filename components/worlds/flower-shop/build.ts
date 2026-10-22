import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    shop: choice('What kind of florist shop is it?', {corner:'A small cream-painted corner florist.', greenhouse:'A bright glass-front garden florist.', market:'A rough timber flower-market stall.'}),
    palette: choice('What flowers dominate the shop?', {spring:'Cream, yellow and pale pink spring flowers.', crimson:'Deep red and coral flowers.', white:'Mostly white and sage ceremonial flowers.', wild:'A varied collection of meadow colours.'}),
    floor: choice('What is on the floor?', {tiles:'Terracotta ceramic tiles.', stone:'Pale stone slabs.', boards:'Worn timber boards.'}),
    window: choice('What is on the side window?', {clear:'Clear pale glass.', lettering:'Painted FLOWERS lettering.', blinds:'A partially rolled bamboo blind.'}),
    display: choice('How are flowers displayed?', {steps:'Buckets on three wide stepped shelves.', wall:'A long row of buckets below wall-mounted shelves.', crates:'Timber crates stacked into a low display.'}),
    sign: choice('What does the shop sign say?', {daily:'FLOWERS FOR THE DAY', someone:'FOR SOMEONE SPECIAL', roots:'ROOTS & PETALS', open:'OPEN / TAKE YOUR TIME'}),
    wrapping: choice('What is on the wrapping counter?', {paper:'Brown wrapping paper, ribbon and scissors.', bouquet:'An unfinished wrapped bouquet.', empty:'An empty clean worktop.'}),
    watering: noul('Is a little watering can under the counter?'),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#e7e3d1',floor:a.floor==='tiles'?'#b39178':'#c3b89b',width:11,depth:9,pitch:31,yaw:22,maxHeight:2.7,radius:1.16,slots:[[0,1.3],[-2.9,0.8],[2.9,0.8],[-2.5,3.05],[2.5,3.05],[0,-1.45]]});
    const wood=s.material('#ad9669'),wall=s.material(a.shop==='market'?'#b39c75':a.shop==='greenhouse'?'#d7e1ca':'#e3dbc2'),green=s.material('#739473'),metal=s.material('#aab6a4',{metalness:0.55}),paper=s.material('#e4d6b4'),colors=a.palette==='spring'?['#e1d8b4','#c7b766','#c4a49a']:a.palette==='crimson'?['#ab665a','#bf8172','#bc9783']:a.palette==='white'?['#e4e0c8','#c8d0b2','#95b095']:['#c79e7a','#b99aab','#cfbc73'];
    s.box([11,3.8,0.16],[0,1.9,-4.42],wall);s.box([0.16,3.8,8.85],[-5.42,1.9,0],a.shop==='greenhouse'?s.material('#a9bcb0',{transparent:true,opacity:0.38}):wall);
    if(a.shop==='market')for(let i=0;i<22;i++)s.box([0.022,3.7,0.026],[-5.2+i*0.49,1.89,-4.322],wood);
    if(a.floor==='boards')for(let i=0;i<27;i++)s.box([0.009,0.011,8.7],[-5.2+i*0.4,0.012,0],s.material('#8f896d'));else{for(let x=0;x<14;x++)s.box([0.009,0.011,8.7],[-5.2+x*0.8,0.012,0],paper);for(let z=0;z<12;z++)s.box([10.8,0.011,0.009],[0,0.012,-4.2+z*0.76],paper);}
    s.box([0.018,2.1,4.29],[-5.32,2.06,0.25],s.material('#a2bdb4'));for(const z of [-1.93,0.25,2.43])s.box([0.055,2.23,0.055],[-5.29,2.06,z],wood);if(a.window==='lettering'){const l=s.label('FLOWERS',2.05,0.37,[-5.26,2.08,0.25],'#f0ead1','#91aea1');l.rotation.y=Math.PI/2;}if(a.window==='blinds')for(let i=0;i<10;i++)s.box([0.03,0.036,4.27],[-5.25,3.08-i*0.083,0.25],wood);
    const levels=a.display==='steps'?3:a.display==='wall'?1:2;
    const blooms=[] as {at:readonly[number,number,number];size:number;color:string}[];
    const stems=[] as {at:readonly[number,number,number];size:number}[],leaves=[] as {at:readonly[number,number,number];size:number}[];
    for(let row=0;row<levels;row++){const y=a.display==='steps'?row*0.33:row*0.43,z=-3.43+row*0.49;s.box([8.67,0.15+(a.display==='steps'?y:0.28),0.63],[0,(0.15+y)/2,z],a.display==='crates'?wood:green);for(let i=0;i<12;i++){const x=(i-5.5)*0.71,by=y+0.17;s.cylinder(0.12,0.085,0.31,[x,by+0.15,z],metal,16);for(let j=0;j<5;j++){const fx=x+(context.random()-0.5)*0.17,fz=z+(context.random()-0.5)*0.15,fy=by+0.61+context.random()*0.17;stems.push({at:[fx,(fy+by+0.2)/2,fz] as const,size:fy-by-0.2});leaves.push({at:[fx,by+0.4,fz] as const,size:0.045+context.random()*0.017});blooms.push({at:[fx,fy,fz] as const,size:0.04+context.random()*0.017,color:colors[(i+j+row)%3]});}}}
    s.scatter(new THREE.CylinderGeometry(0.008,0.008,1,6),green,stems);
    s.scatter(new THREE.SphereGeometry(1,8,6).scale(0.6,0.15,1),green,leaves);
    s.scatter(new THREE.SphereGeometry(1,12,8),paper,blooms);
    if(a.display==='wall')for(let row=0;row<2;row++){s.box([8.6,0.045,0.29],[0,1.63+row*0.65,-4.1],wood);for(let i=0;i<12;i++){const x=(i-5.5)*0.71;s.cylinder(0.08,0.057,0.13,[x,1.71+row*0.65,-4.03],s.material('#b98459'),14);s.ball([0.1,0.13,0.08],[x,1.89+row*0.65,-4.03],green,12);}}
    s.label({daily:'FLOWERS FOR THE DAY',someone:'FOR SOMEONE SPECIAL',roots:'ROOTS & PETALS',open:'OPEN / TAKE YOUR TIME'}[a.sign],5.6,0.42,[0,3.24,-4.312],'#65805c','#e6dcc0');
    s.box([1.58,0.92,1.62],[4.52,0.46,1.5],wood);s.box([1.69,0.055,1.74],[4.52,0.97,1.5],paper);
    if(a.wrapping!=='empty'){s.box([0.97,0.004,0.73],[4.5,1.003,1.52],s.material('#bfa777'));s.cylinder(0.065,0.065,0.81,[4.5,1.064,0.91],wood,20).rotation.z=Math.PI/2;s.ring(0.035,0.007,[4.11,1.016,1.55],metal).rotation.x=Math.PI/2;s.ring(0.035,0.007,[4.11,1.016,1.64],metal).rotation.x=Math.PI/2;s.rod([4.14,1.016,1.59],[4.35,1.016,1.62],0.004,metal);}
    if(a.wrapping==='bouquet')for(let i=0;i<7;i++){const x=4.47+(context.random()-0.5)*0.18;s.rod([4.4,1.017,1.73],[x,1.028,1.35],0.005,green);s.ball([0.039,0.02,0.038],[x,1.05,1.31],s.material(colors[i%3]),12);}
    if(a.watering){s.cylinder(0.16,0.16,0.31,[4.53,0.16,2.39],green,20);s.rod([4.63,0.12,2.39],[4.83,0.28,2.48],0.035,green,0.023);s.tube([[4.4,0.22,2.39],[4.37,0.46,2.39],[4.68,0.46,2.39],[4.66,0.22,2.39]],0.019,green);}
    const petals=[];for(let i=0;i<18;i++)petals.push({at:[(context.random()-0.5)*8.6,0.018,(context.random()-0.5)*5.5] as const,size:0.018,color:colors[i%3]});s.scatter(new THREE.SphereGeometry(1,8,6),paper,petals);
    return world;
  },
});

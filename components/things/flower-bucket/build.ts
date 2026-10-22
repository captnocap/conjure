import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    vessel: choice('What holds the flowers?', {zinc:'A galvanized florist bucket.', enamel:'A cream enamel pail.', clay:'A broad terracotta flower pot.'}),
    blooms: choice('What flowers are in it?', {daisies:'White daisies with golden centres.', tulips:'Closed red and pink tulips.', roses:'Full warm pink roses.', mixed:'A loose mixture of white, yellow and coral blooms.'}),
    arrangement: choice('How are the stems arranged?', {upright:'Straight stems in a tall tight bunch.', fan:'Stems spreading in a wide fan.', wrapped:'A paper-wrapped bouquet standing in the bucket.'}),
    ribbon: choice('What holds the bouquet together?', {none:'No ribbon.', red:'A narrow red ribbon.', blue:'A soft blue ribbon.', twine:'Natural brown twine.'}),
    fallen: noul('Are loose petals scattered beside the bucket?'),
    card: choice('What is on the florist card?', {none:'No card.', someone:'FOR SOMEONE', sorry:'IM SORRY', home:'WELCOME HOME'}),
    handle: noul('Does the bucket have a carrying handle?'),
    height: score('How tall is the bouquet?', ['A compact hand-sized bouquet', 'A tall extravagant bunch']),
  },
  build(a, context) {

    const s=new Sculpture(context),h=0.45+a.height*0.42,r=0.13,metal=s.material('#a8b4a6',{metalness:0.65}),vessel=s.material(a.vessel==='zinc'?'#a8b4a6':a.vessel==='enamel'?'#dfd8bc':'#b47c51',{metalness:a.vessel==='zinc'?0.65:0.1}),leaf=s.material('#6e8e6c'),paper=s.material('#ded2af');
    s.cylinder(r,r*0.72,0.23,[0,0.125,0],vessel,24);s.ring(r,0.009,[0,0.245,0],metal).rotation.x=Math.PI/2;
    const petals=[] as {at:readonly[number,number,number];size:number;color:string}[];
    for(let i=0;i<10;i++){const phi=i*Math.PI*0.764,broad=a.arrangement==='fan'?0.19:0.085,x=Math.sin(phi)*broad*(0.4+context.random()*0.6),z=Math.cos(phi)*broad*(0.4+context.random()*0.6),y=h-0.09+context.random()*0.16;s.rod([0,0.18,0],[x,y,z],0.004,leaf);for(let j=0;j<2;j++){const yy=0.31+j*0.12;s.ball([0.022,0.008,0.048],[x*0.6+(j?0.025:-0.025),yy,z*0.6],leaf,10).rotation.y=phi;}
      if(a.blooms==='tulips'){s.lathe([[0.006,0],[0.025,0.016],[0.029,0.053],[0.022,0.064]],s.material(i%2?'#b96865':'#c88f8a'),[x,y,z]);}else if(a.blooms==='roses'){for(let j=0;j<7;j++){const ph=j*Math.PI*2/7;s.ball([0.019,0.018,0.025],[x+Math.sin(ph)*0.018,y+0.009,z+Math.cos(ph)*0.018],s.material(j%2?'#b17f79':'#c29388'),10);}s.ball([0.012,0.017,0.012],[x,y+0.018,z],s.material('#a76e68'),10);}else{const color=a.blooms==='daisies'?'#e8e2c8':['#e2d7b4','#c6ac67','#c28b76'][i%3];for(let j=0;j<8;j++){const ph=j*Math.PI/4;petals.push({at:[x+Math.sin(ph)*0.027,y,z+Math.cos(ph)*0.027],size:0.015,color});}s.ball([0.014,0.009,0.014],[x,y+0.006,z],s.material('#beab5f'),10);}}
    if(petals.length)s.scatter(new THREE.SphereGeometry(1,8,6),paper,petals);
    if(a.arrangement==='wrapped'){const wrap=s.cylinder(0.12,0.025,0.31,[0,0.38,0],paper,12);wrap.rotation.z=0.05;}
    if(a.ribbon!=='none'){const mat=s.material(a.ribbon==='red'?'#b16d5d':a.ribbon==='blue'?'#76939e':'#ac9366');s.ring(0.041,0.006,[0,0.36,0],mat).rotation.x=Math.PI/2;for(const x of [-0.038,0.038])s.ring(0.026,0.007,[x,0.36,0.07],mat).scale.set(1.3,0.7,1);}
    if(a.handle)s.tube([[-r,0.2,0],[-r*0.96,0.35,0],[0,0.42,0],[r*0.96,0.35,0],[r,0.2,0]],0.007,metal);
    if(a.card!=='none'){s.rod([0.08,0.1,0.02],[0.08,h*0.69,0.09],0.004,leaf);s.label({someone:'FOR SOMEONE',sorry:'IM SORRY',home:'WELCOME HOME'}[a.card],0.14,0.075,[0.08,h*0.69,0.095]);}
    if(a.fallen)for(let i=0;i<12;i++)s.ball([0.012,0.003,0.019],[(context.random()-0.5)*0.48,0.005,(context.random()-0.5)*0.39],s.material(i%2?'#d0ada0':'#e4dbc0'),8);
    return s.finish();
  },
});

import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';
const questions = {

 layout: choice('How is the shared work arranged?', {long:'One long central work table.',round:'A round shared table.',parallel:'Two parallel preparation tables.',corner:'A central table and a back counter.',low:'Low tables with floor cushions.'}),
 room: choice('What kind of kitchen hosts the gathering?', {home:'A modest tiled family kitchen.',hall:'A community hall with a serving hatch.',courtyard:'A covered courtyard with open sides.',shop:'A small dumpling shop after closing.',farm:'A timber farmhouse kitchen.'}),
 story: choice('Where is the cooking day up to?', {start:'Bowls and empty trays laid out.',busy:'Flour and scraps mark a busy making session.',teach:'A spare place waits beside a demonstration board.',meal:'The table is set with small bowls for eating.',tidy:'Clean stacked trays wait after washing up.'}),
 shelf: choice('What fills the back shelves?', {bowls:'Stacks of blue and white bowls.',steamers:'Nested bamboo steamers.',jars:'Tall jars of flour and dry ingredients.',plates:'Upright serving plates.',cloths:'Folded kitchen cloths and baskets.'}),
 light: choice('What hangs above the gathering?', {paper:'Two round paper lanterns.',shade:'A broad enamel kitchen shade.',bulbs:'A row of small pendant bulbs.',beam:'Bare wooden ceiling beams.',open:'Open sky above the courtyard.'}),
 wall: choice('What makes the kitchen personal?', {recipe:'A handwritten recipe board.',calendar:'A wall calendar beside a clock.',herbs:'Bundles of herbs hung to dry.',window:'A wide window onto a garden.',plain:'A plain tiled wall with a coat rail.'}),
 size: score('How large is the gathering?', ['A few family members','A shared household table','A whole community group']),
 seating: score('How many seats are waiting?', ['Two places','Four places','Eight places']),
 steam: noul('Is the cooking corner fitted with a steaming pot?'),

};
export default defineWorld({questions, build(a, context) {

    const {random,mood}=context,W=5+a.size*2,D=4.5,H=a.layout==='low'?.38:.76;
    const slots:[[number,number],[number,number],[number,number],[number,number]]=[[0,.7],[-W*.28,.5],[W*.28,.5],[0,-1]];
    const {art:s,world}=diorama(context,{width:W,depth:D,background:'#e4dfce',floor:'#c5b797',maxHeight:2,radius:.65,scale:[.8,1.4],pitch:36,yaw:25,slots});
    const wood=s.material('#a47d56'),pale=s.material('#dfd3b2'),dark=s.material('#646956'),blue=s.material('#75959d'),green=s.material('#74845e');
    if(a.room!=='courtyard'){s.box([W,2.9,.14],[0,1.45,-D/2],a.room==='farm'?wood:pale);s.box([.12,2.9,D],[-W/2,1.45,0],pale);if(a.room==='home')for(let i=0;i<12;i++)s.box([.006,1.1,.005],[-W/2+i*W/11,.65,-D/2+.075],dark);}
    else {for(const x of [-W/2,W/2])for(const z of [-D/2,0])s.rod([x,0,z],[x,3,z],.08,wood);s.box([W*.8,1.8,.06],[0,1.95,-D/2],wood);}
    if(a.light!=='open'){for(const x of [-W/2,W/2])s.rod([x,2.9,-D/2],[x,2.9,0],.07,wood);s.box([W,.12,.12],[0,2.9,0],wood);}
    const back=-D/2+.35;for(const x of [-W*.3,W*.3])for(const z of [back-.16,back+.16])s.box([.065,.83,.065],[x,.415,z],wood);s.box([W*.7,.1,.45],[0,.88,back],wood);for(const y of [1.45,2.05]){s.box([W*.72,.06,.3],[0,y,back],wood);for(let i=0;i<6;i++){const x=(i-2.5)*W*.11;if(a.shelf==='bowls')for(let j=0;j<3;j++)s.lathe([[.06,0],[.12,.08],[.105,.08],[.05,.01]],j%2?blue:pale,[x,y+.03+j*.05,back]);if(a.shelf==='steamers')for(let j=0;j<3;j++)s.lathe([[.13,0],[.13,.07],[.12,.07],[.12,.01]],wood,[x,y+.03+j*.07,back]);if(a.shelf==='jars'){s.cylinder(.1,.1,.25,[x,y+.155,back],pale,16);s.cylinder(.11,.11,.025,[x,y+.292,back],wood,16);}if(a.shelf==='plates')s.cylinder(.15,.15,.025,[x,y+.18,back],blue,24).rotation.x=Math.PI/2;if(a.shelf==='cloths')for(let j=0;j<3;j++)s.box([.23,.025,.2],[x,y+.04+j*.026,back],j%2?pale:blue);}}
    const tables:THREE.Object3D[]=[];const table=(x:number,z:number,w:number,d:number,round=false)=>{const top=round?s.cylinder(w/2,w/2,.07,[x,H-.035,z],wood,40):s.box([w,.07,d],[x,H-.035,z],wood);tables.push(top);for(const dx of [-w*.36,w*.36])for(const dz of [-d*.3,d*.3])tables.push(s.box([.07,H-.07,.07],[x+dx,(H-.07)/2,z+dz],wood));};
    if(a.layout==='parallel'){table(-.85,.1,1.2,1.8);table(.85,.1,1.2,1.8);}else table(0,.1,a.layout==='round'?2.2:3+a.size,1.3,a.layout==='round');
    const seats=2+Math.round(a.seating*6);for(let i=0;i<seats;i++){const x=(i%4-1.5)*.85,z=i<4?1.2:-1;const sh=a.layout==='low'?.12:.42;if(a.layout==='low')s.box([.5,.12,.5],[x,.06,z],blue);else{s.cylinder(.23,.22,.05,[x,sh,z],wood,16);for(const dx of [-.14,.14])for(const dz of [-.14,.14])s.rod([x+dx,0,z+dz],[x+dx,sh,z+dz],.02,wood);}}
    if(a.story==='busy')for(let i=0;i<15;i++)s.ball([.02,.002,.025],[(random()-.5)*2.5,H+.004,(random()-.5)*.8],pale,8);if(a.story==='meal')for(let i=0;i<5;i++)s.lathe([[.04,0],[.09,.06],[.08,.06],[.03,.01]],blue,[(i-2)*.55,H,.45]);if(a.story==='teach')s.box([.7,.025,.4],[0,H+.012,0],pale);if(a.story==='tidy')for(let i=0;i<4;i++)s.box([.7,.025,.45],[0,H+.015+i*.03,0],pale);
    if(a.light!=='open')for(const x of [-.9,.9]){s.rod([x,2.9,0],[x,2.25,0],.006,dark);if(a.light==='paper')s.ball([.25,.28,.25],[x,2.15,0],pale,20);if(a.light==='shade')s.lathe([[.32,0],[.12,.2],[.04,.22]],blue,[x,2.1,0]);if(a.light==='bulbs')s.ball([.075,.1,.075],[x,2.2,0],pale,16);if(a.light==='beam')s.box([W,.12,.12],[0,2.8,0],wood);}
    if(a.wall==='recipe')s.label('FOLD • PINCH • SHARE',2,.5,[0,2.55,-D/2+.09]);if(a.wall==='calendar'){s.label('SUNDAY',.55,.7,[-W*.35,1.8,-D/2+.09]);s.cylinder(.22,.22,.03,[W*.35,2.35,-D/2+.09],pale,32).rotation.x=Math.PI/2;}if(a.wall==='herbs')for(let i=0;i<5;i++){s.rod([(i-2)*.35,2.6,-D/2+.15],[(i-2)*.35,2.25,-D/2+.15],.015,green);s.ball([.1,.2,.05],[(i-2)*.35,2.2,-D/2+.15],green,10);}if(a.wall==='window'){s.box([1.5,.9,.025],[0,2.45,-D/2+.09],blue);s.box([.05,.95,.03],[0,2.45,-D/2+.11],wood);}if(a.wall==='plain')s.box([1.6,.05,.05],[0,2.5,-D/2+.1],wood);
    if(a.steam){s.box([.7,.8,.6],[W*.38,.4,back],dark);s.cylinder(.23,.23,.3,[W*.38,.96,back],pale,24);s.cylinder(.25,.25,.04,[W*.38,1.13,back],wood,24);}
    const basePlace=world.place;world.place=(items)=>{const small=items.filter(i=>i.height<.75&&i.radius<.8);basePlace(items);items.forEach((item,i)=>{if(small.includes(item)){item.holder.position.set(a.layout==='parallel'?(i%2?-.85:.85):(i-1)*.65,H,a.layout==='parallel'?Math.floor(i/2)*.65:.1);item.holder.scale.setScalar(Math.min(1.3,.45/Math.max(item.radius,.05)));}else{item.holder.position.set((i-1)*1.35,0,1.35);item.holder.scale.setScalar(Math.min(1.1,1.8/item.height));}item.holder.updateMatrixWorld(true);});};
    return world;
}});

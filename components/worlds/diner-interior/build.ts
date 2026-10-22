import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    era: choice('What kind of diner interior holds the scene?', {chrome:'A chrome-and-red mid-century roadside diner.', mint:'A small mint-green neighbourhood breakfast room.', timber:'A timber-lined highway cafe.'}),
    floor: choice('What is on the floor?', {checker:'Cream and charcoal checker tiles.', red:'Small cream tiles with red border squares.', terrazzo:'A speckled pale terrazzo floor.'}),
    windows: choice('What lies beyond the windows?', {highway:'A quiet highway and low distant hills.', city:'A row of city lights and apartment windows.', rain:'Rain-streaked glass without a clear view.'}),
    counter: choice('How is the service counter arranged?', {straight:'A straight counter along the back wall.', corner:'An L-shaped counter turning into the side wall.', short:'A small cashier counter in the back corner.'}),
    sign: choice('What is the main diner sign?', {open:'OPEN ALL NIGHT', breakfast:'BREAKFAST ANYTIME', last:'LAST COFFEE BEFORE THE COAST', home:'COME ON IN'}),
    clock: noul('Does an old round clock hang above the counter?'),
    menu: choice('What is on the menu board?', {classic:'EGGS / PIE / COFFEE', coast:'FISH / CHOWDER / COFFEE', simple:'TODAY: SOUP & TOAST'}),
    jukebox: noul('Is a tall glowing jukebox tucked into the corner?'),
  },
  build(a, context) {

    const {art:s,world}=diorama(context,{background:'#e9e4d5',floor:'#d2ccba',width:12,depth:9,pitch:30,yaw:23,maxHeight:2.6,radius:1.1,slots:[[0,1.4],[-3,1],[3,1],[-2.5,-1.6],[2.4,-1.4],[0,3.1]]});
    const accent={chrome:'#a04c41',mint:'#7eaaa0',timber:'#8e704e'}[a.era],wall=s.material('#e7dfc7'),trim=s.material(accent),metal=s.material('#b9c5ba',{metalness:0.65}),dark=s.material('#58625a'),glass=s.material(a.windows==='city'?'#74848b':'#93b0b1');
    for(let x=0;x<12;x++)for(let z=0;z<9;z++){if(a.floor==='checker'&&(x+z)%2===0)s.box([0.97,0.01,0.97],[x-5.5,0.013,z-4],dark);if(a.floor==='red'&&(x===0||z===0)&&((x+z)%2===0))s.box([0.97,0.01,0.97],[x-5.5,0.013,z-4],trim);}
    if(a.floor==='terrazzo'){const points=[];for(let i=0;i<120;i++)points.push({at:[(context.random()-0.5)*11.8,0.012,(context.random()-0.5)*8.8] as const,size:0.023+context.random()*0.027,color:i%2?'#9eaa9c':'#b99179'});s.scatter(new THREE.BoxGeometry(1,0.09,1),wall,points);}
    s.box([12,3.8,0.16],[0,1.9,-4.43],wall);s.box([0.15,3.8,8.9],[-5.94,1.9,0],wall);s.box([12,0.3,0.18],[0,1.05,-4.31],trim);s.box([0.18,0.3,8.8],[-5.84,1.05,0],trim);
    for(let i=0;i<3;i++){const z=-2.7+i*2.45;s.box([0.025,1.65,1.97],[-5.842,2.15,z],glass);for(const zz of [z-1.02,z+1.02,z])s.box([0.058,1.83,0.05],[-5.81,2.15,zz],metal);for(const y of [1.25,3.05])s.box([0.05,0.055,2.05],[-5.81,y,z],metal);if(a.windows==='rain')for(let j=0;j<9;j++)s.rod([-5.8,1.5+context.random()*1.3,z+(context.random()-0.5)*1.8],[-5.8,1.2+context.random()*0.1,z+(context.random()-0.5)*1.8],0.006,wall);if(a.windows==='city')for(let j=0;j<4;j++)s.box([0.033,0.13,0.12],[-5.8,1.55+(j%2)*0.6,z-0.7+j*0.4],s.material('#dccd9e',{emissive:'#d6bf7c',emissiveIntensity:0.4}));}
    const cw=a.counter==='short'?3.2:8.4,cx=a.counter==='short'?-3.1:0;s.box([cw,1.02,0.85],[cx,0.51,-3.54],trim);s.box([cw+0.1,0.07,1.04],[cx,1.065,-3.52],metal);for(let i=0;i<(a.counter==='short'?3:6);i++){const x=cx-cw*0.4+i*cw*0.8/(a.counter==='short'?2:5);s.cylinder(0.19,0.23,0.06,[x,0.06,-2.46],metal);s.rod([x,0.06,-2.46],[x,0.74,-2.46],0.045,metal);s.cylinder(0.23,0.23,0.1,[x,0.78,-2.46],trim,24);s.ring(0.17,0.015,[x,0.31,-2.46],metal).rotation.x=Math.PI/2;}
    if(a.counter==='corner'){s.box([1.08,1.02,2.2],[-5.28,0.51,-2.3],trim);s.box([1.16,0.07,2.29],[-5.28,1.065,-2.3],metal);}
    s.label({open:'OPEN ALL NIGHT',breakfast:'BREAKFAST ANYTIME',last:'LAST COFFEE BEFORE THE COAST',home:'COME ON IN'}[a.sign],5.4,0.52,[0,3.24,-4.32],accent,'#eee5cb');
    s.box([2.18,0.96,0.06],[0,2.14,-4.3],dark);s.label({classic:'EGGS / PIE / COFFEE',coast:'FISH / CHOWDER / COFFEE',simple:'TODAY: SOUP & TOAST'}[a.menu],1.97,0.61,[0,2.14,-4.26],'#e4e3cb','#58625a');
    if(a.clock){s.cylinder(0.32,0.32,0.06,[3.85,2.82,-4.3],metal,32).rotation.x=Math.PI/2;s.ball([0.27,0.27,0.008],[3.85,2.82,-4.255],wall);s.rod([3.85,2.82,-4.24],[3.85,3.03,-4.24],0.013,dark);s.rod([3.85,2.82,-4.24],[3.68,2.77,-4.24],0.017,dark);}
    if(a.jukebox){s.box([0.96,1.44,0.48],[4.87,0.73,-3.9],trim);s.ball([0.48,0.28,0.24],[4.87,1.41,-3.9],metal);s.box([0.74,0.93,0.019],[4.87,0.81,-3.644],dark);s.label('SONGS / 5c',0.65,0.19,[4.87,1.37,-3.644]);for(let i=0;i<6;i++)s.box([0.65,0.038,0.02],[4.87,0.46+i*0.1,-3.63],metal);}
    return world;
  },
});

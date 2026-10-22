import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    tank: choice('What is the aquarium shape?', {wide:'A wide rectangular aquarium.', cube:'A compact glass cube.', bowl:'A rounded fishbowl on a small base.'}),
    base: choice('What is beneath the aquarium?', {wood:'A low timber plinth.', steel:'A dark metal stand.', none:'A thin black tank base.'}),
    fish: choice('What fish live in it?', {gold:'Two broad orange goldfish.', tropical:'A little group of blue and yellow tropical fish.', silver:'A school of slim silver fish.', empty:'No fish, only an aquascape.'}),
    landscape: choice('What is the underwater setting?', {rocks:'Smooth stones and tall water plants.', ruin:'A miniature ruined arch with moss.', ship:'A little sunken ship among gravel.'}),
    substrate: choice('What is on the bottom?', {sand:'Pale sand.', gravel:'Mixed brown and grey gravel.', black:'Dark aquascaping soil.'}),
    lid: noul('Does it have a dark cover with an integrated light?'),
    bubbles: noul('Does a column of bubbles rise from an air stone?'),
    waterLevel: score('How full of water is the tank?', ['Two-thirds full', 'Filled nearly to the rim']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=a.tank==='wide'?0.85:0.5,h=a.tank==='bowl'?0.46:0.5,d=a.tank==='wide'?0.4:0.5,baseH=a.base==='steel'?0.37:a.base==='wood'?0.12:0.025,black=s.material('#3b4b3e'),wood=s.material('#9d885d'),glass=s.material('#aac6bc',{transparent:true,opacity:0.14,roughness:0.08,depthWrite:false}),water=s.material('#91b8b3',{transparent:true,opacity:0.1,roughness:0.2,depthWrite:false}),gravel=s.material(a.substrate==='sand'?'#c6bb8d':a.substrate==='black'?'#5b6351':'#9e9a7c'),leaf=s.material('#638a6f');
    s.box([w+0.06,0.035,d+0.06],[0,baseH,0],a.base==='wood'?wood:black);if(a.base==='wood')s.box([w,0.11,d],[0,0.06,0],wood);if(a.base==='steel')for(const x of [-w*0.4,w*0.4])for(const z of [-d*0.4,d*0.4])s.rod([x,0,z],[x,baseH,z],0.012,black);
    const by=baseH+0.033,level=h*(0.67+a.waterLevel*0.3);
    if(a.tank==='bowl')s.ball([w*0.51,h*0.49,d*0.51],[0,by+h/2,0],glass,32);else{for(const x of [-w/2,w/2])s.box([0.008,h,d],[x,by+h/2,0],glass);for(const z of [-d/2,d/2])s.box([w,h,0.008],[0,by+h/2,z],glass);}
    s.box([w*0.96,0.035,d*0.94],[0,by+0.017,0],gravel);s.box([w*0.96,level,d*0.94],[0,by+level/2,0],water);
    for(let i=0;i<12;i++){const x=(context.random()-0.5)*w*0.8,z=(context.random()-0.5)*d*0.75;s.ball([0.026,0.012,0.02],[x,by+0.04,z],s.material(i%2?'#b2b19a':'#8d9a88'),8);if(i%3===0)for(let j=0;j<3;j++)s.tube([[x,by+0.04,z],[x+(j-1)*0.02,by+h*0.35,z],[x+(j-1)*0.06,by+h*0.71,z+0.02]],0.008,leaf);}
    if(a.landscape==='rocks')for(let i=0;i<3;i++)s.ball([0.09,0.08+i*0.02,0.07],[(i-1)*0.11,by+0.1,-d*0.23],s.material('#899989'),12);
    if(a.landscape==='ruin'){const stone=s.material('#9fa891');for(const x of [-0.07,0.07])s.box([0.045,0.18,0.05],[x,by+0.12,-d*0.18],stone);s.ring(0.07,0.024,[0,by+0.21,-d*0.18],stone,Math.PI);}
    if(a.landscape==='ship'){const hull=s.box([0.23,0.06,0.09],[0,by+0.07,-d*0.13],wood);hull.rotation.z=0.2;s.rod([0,by+0.07,-d*0.13],[0.03,by+0.25,-d*0.13],0.005,wood);s.box([0.06,0.065,0.014],[0.04,by+0.19,-d*0.13],gravel);}
    const swimmers: {group:THREE.Group;x:number;y:number;z:number;phase:number}[]=[];
    const count=a.fish==='gold'?2:a.fish==='tropical'?5:a.fish==='silver'?7:0;
    for(let i=0;i<count;i++){const group=new THREE.Group(),x=(context.random()-0.5)*w*0.57,y=by+h*(0.3+context.random()*0.39),z=(context.random()-0.5)*d*0.5,mat=s.material(a.fish==='gold'?'#c99a55':a.fish==='silver'?'#b5c9be':i%2?'#7ba9b2':'#c7b76c');s.root.add(group);group.position.set(x,y,z);const fish=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat);fish.scale.set(a.fish==='gold'?0.056:0.037,0.021,0.015);fish.castShadow=true;group.add(fish);const tail=new THREE.Mesh(new THREE.CylinderGeometry(0,0.024,0.026,3),mat);tail.rotation.z=Math.PI/2;tail.position.x=-0.046;tail.castShadow=true;group.add(tail);swimmers.push({group,x,y,z,phase:context.random()*Math.PI*2});}
    if(a.lid){s.box([w+0.035,0.027,d+0.035],[0,by+h+0.014,0],black);s.box([w*0.72,0.005,0.038],[0,by+h-0.004,0],s.material('#e5e5bd',{emissive:'#d9d7ab',emissiveIntensity:0.4}));}
    if(a.bubbles){const pts=[];for(let i=0;i<12;i++)pts.push({at:[w*0.3+(context.random()-0.5)*0.025,by+0.06+i*level/13,-d*0.3] as const,size:0.004+context.random()*0.006});s.scatter(new THREE.SphereGeometry(1,8,6),s.material('#c7d8cf',{transparent:true,opacity:0.55}),pts);}
    return s.finish({update:(_dt,time)=>{for(const f of swimmers){f.group.position.x=f.x+Math.sin(time*0.35+f.phase)*w*0.055;f.group.position.y=f.y+Math.sin(time*0.6+f.phase)*0.009;}}});
  },
});

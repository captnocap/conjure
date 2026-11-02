import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    frame: choice("How is the winch frame built?", {"plate": "Two thick triangular steel cheek plates.", "open": "An open angle-iron rectangular frame.", "cast": "A heavy cast-iron box frame.", "timber": "An iron mechanism mounted between oak cheeks."}),
    drum: choice("What sort of drum carries the cable?", {"narrow": "A narrow drum with tall flanges.", "wide": "A wide low cable drum.", "split": "A divided drum for two hauling lines.", "bare": "An empty smooth drum."}),
    gear: choice("How are the gears arranged?", {"single": "One large exposed reduction gear.", "double": "A small pinion drives two reduction gears.", "covered": "The gears sit beneath a curved guard.", "missing": "A removed gear leans beside the winch."}),
    cable: choice("What hauling line is fitted?", {"wire": "Grey steel wire rope.", "hemp": "Heavy tan hemp rope.", "chain": "A short length of iron chain.", "none": "No line is fitted to the drum."}),
    handle: choice("How is the crank configured?", {"long": "A long crank with a wooden spinning grip.", "short": "A compact crank close to the gear.", "double": "A double-sided crank for two operators.", "removed": "The crank lies on the mounting timbers."}),
    hook: choice("What terminates the hauling line?", {"hook": "A large open lifting hook.", "shackle": "A closed screw-pin shackle.", "loop": "A spliced loop around a thimble.", "block": "A small snatch block redirects the line."}),
    footing: choice("How is the winch secured?", {"sleepers": "Two long oak sleepers beneath the frame.", "bolts": "Four foundation bolts on a steel plate.", "stakes": "Four driven ground stakes and tie loops.", "skid": "A low steel towing skid."}),
    state: choice("What is the working condition?", {"ready": "The pawl is engaged and the winch is ready.", "service": "A red service tag hangs from the crank.", "jammed": "A loose turn of rope is jammed at the flange.", "oiled": "A small oil can waits beside a freshly serviced gear."}),
    winding: score("How much line remains on the drum?", ["Almost empty", "Half a drum", "Fully wound"])
  },
  build(a,context){

    const s=new Sculpture(context),iron=s.material('#55695c',{metalness:0.65,roughness:0.35+context.mood.wear*0.4}),metal=s.material('#a8afa1',{metalness:0.85}),wood=s.material('#96734a'),dark=s.material('#303c33'),rope=s.material(a.cable==='hemp'?'#a6986b':'#727e70');
    const width=a.drum==='wide'?0.8:0.5;
    if(a.footing==='sleepers')for(const z of [-0.24,0.24])s.box([1.3,0.13,0.18],[0,0.07,z],wood);else s.box([width+0.45,0.06,0.7],[0,0.04,0],iron);
    for(const x of [-width/2-0.07,width/2+0.07]){
      if(a.frame==='plate'){const shape=new THREE.Shape();shape.moveTo(-0.28,0);shape.lineTo(0.28,0);shape.lineTo(0.1,0.65);shape.lineTo(-0.1,0.65);shape.closePath();const plate=s.mesh(new THREE.ExtrudeGeometry(shape,{depth:0.05,bevelEnabled:false}),iron,[x,0.12,0]);plate.rotation.y=Math.PI/2;}
      else{for(const z of [-0.23,0.23])s.box([0.08,0.58,0.08],[x,0.4,z],a.frame==='timber'?wood:iron);s.box([0.1,0.08,0.54],[x,0.69,0],iron);if(a.frame==='cast')s.box([0.1,0.48,0.47],[x,0.4,0],iron);}
    }
    const cy=0.48,r=a.drum==='narrow'?0.23:0.19;const drum=s.cylinder(r*0.48,r*0.48,width,[0,cy,0],dark,32);drum.rotation.z=Math.PI/2;
    for(const x of [-width/2,width/2]){const plate=s.cylinder(r,r,0.025,[x,cy,0],iron,40);plate.rotation.z=Math.PI/2;}
    if(a.drum==='split'){const plate=s.cylinder(r,r,0.02,[0,cy,0],iron,40);plate.rotation.z=Math.PI/2;}
    if(a.cable!=='none'&&a.drum!=='bare')for(let j=0;j<12;j++){const roll=s.ring(r*(0.55+a.winding*0.3),0.012,[-width*0.43+j*width*0.078,cy,0],rope);roll.rotation.y=Math.PI/2;}
    const gear=(x:number,y:number,z:number,radius:number)=>{s.ring(radius,0.03,[x,y,z],metal).rotation.y=Math.PI/2;for(let j=0;j<12;j++){const t=j*Math.PI/6;s.box([0.05,0.05,0.06],[x,y+Math.cos(t)*radius,z+Math.sin(t)*radius],metal).rotation.x=t;}for(let j=0;j<5;j++){const t=j*Math.PI*2/5;s.rod([x,y,z],[x,y+Math.cos(t)*radius,z+Math.sin(t)*radius],0.015,iron);}};
    gear(width/2+0.13,cy,0,0.22);if(a.gear==='double')gear(width/2+0.13,cy+0.22,0.16,0.12);if(a.gear==='covered')s.ball([0.06,0.27,0.27],[width/2+0.16,cy,0],iron,20);if(a.gear==='missing')gear(-0.7,0.23,0.15,0.2);
    const length=a.handle==='short'?0.16:0.31;const hx=width/2+0.24;
    if(a.handle==='removed')s.tube([[0.2,0.16,0.25],[0.5,0.16,0.25],[0.5,0.16,0.42]],0.025,metal);else{for(const side of a.handle==='double'?[-1,1]:[1]){s.rod([side*hx,cy,0],[side*hx,cy+length,0],0.025,iron);s.rod([side*hx,cy+length,0],[side*(hx+0.14),cy+length,0],0.035,wood);}}
    if(a.cable!=='none'){s.tube([[0,cy,0.13],[0.1,0.18,0.4],[0.2,0.03,0.75],[0.1,0.025,1.1]],0.015,rope);if(a.hook==='hook')s.ring(0.12,0.025,[0.1,0.025,1.2],metal,Math.PI*1.6).rotation.x=Math.PI/2;if(a.hook==='shackle'||a.hook==='loop')s.ring(a.hook==='loop'?0.11:0.075,0.02,[0.1,0.03,1.17],metal).rotation.x=Math.PI/2;if(a.hook==='block'){s.box([0.23,0.08,0.3],[0.1,0.05,1.14],iron);s.ring(0.09,0.014,[0.1,0.1,1.14],metal).rotation.x=Math.PI/2;}}
    if(a.footing==='bolts'||a.footing==='stakes')for(const x of [-0.45,0.45])for(const z of [-0.27,0.27])s.cylinder(0.025,0.025,a.footing==='stakes'?0.3:0.1,[x,a.footing==='stakes'?0.16:0.1,z],metal,6);
    if(a.footing==='skid')for(const x of [-0.5,0.5])s.tube([[x,0.05,-0.45],[x,0.02,0],[x,0.1,0.5]],0.035,iron);
    if(a.state==='ready')s.rod([width/2+0.15,0.77,-0.1],[width/2+0.15,0.65,0],0.02,dark);if(a.state==='service')s.label('SERVICE',0.24,0.1,[0,0.38,0.29],'#a13f2c','#e0d2ac');if(a.state==='jammed')s.tube([[-0.2,0.6,0.1],[-0.3,0.8,0.1],[-0.1,0.65,0.2],[0.1,0.45,0.3]],0.025,rope);
    if(a.state==='oiled'){s.cylinder(0.05,0.07,0.16,[-0.65,0.09,0.3],iron,16);s.rod([-0.65,0.16,0.3],[-0.52,0.27,0.3],0.012,metal,0.005);}
    return s.finish();

  },
});

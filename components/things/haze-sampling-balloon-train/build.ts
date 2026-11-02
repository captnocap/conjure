import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({
  questions:{
    envelope: choice('What envelope carries the sampler?', {'sphere': 'A near-spherical gas balloon.', 'pear': 'A pear-shaped high-altitude balloon.', 'pumpkin': 'A ribbed superpressure balloon.', 'tandem': 'Two small balloons share a suspension.'}),
    rig: choice('How are the packages suspended?', {'chain': 'A vertical train of separate packages.', 'ladder': 'Two parallel suspension lines carry paired packages.', 'spread': 'A wide triangular bridle spreads the load.', 'compact': 'All samplers cluster beneath a short yoke.'}),
    samplers: choice('What collection hardware is visible?', {'flasks': 'Several round sealed sample flasks.', 'filters': 'A row of rectangular filter cassettes.', 'tubes': 'Long narrow intake tubes.', 'bottles': 'Pressure bottles in protective cages.'}),
    tail: choice('What stabilises the flight?', {'ribbon': 'A long narrow ribbon tail.', 'vanes': 'Four small rigid vanes.', 'windsock': 'A striped conical windsock.', 'none': 'No separate tail.'}),
    valve: choice('How is the balloon serviced?', {'top': 'A top relief valve and short release line.', 'neck': 'A broad neck valve above the yoke.', 'side': 'A small side valve and service hose.', 'sealed': 'A sealed envelope with a simple tied neck.'}),
    recovery: choice('What recovery equipment is carried?', {'parachute': 'A packed recovery parachute above the payload.', 'float': 'A pale flotation collar around the payload.', 'skids': 'Two lightweight landing skids.', 'beacon': 'A tall tracking antenna and small beacon.'}),
    tether: choice('How is it tethered for sampling?', {'reel': 'A cable leads to a ground reel.', 'stake': 'A thin line leads to a single stake.', 'sled': 'A weighted low sled holds the tether.', 'tripod': 'A small braced tripod anchors the line.'}),
    state: choice('What stage of the operation is shown?', {'ready': 'The balloon is fully inflated and steady.', 'rising': 'A long stretched suspension and streaming tail.', 'partial': 'A partly filled envelope hangs low.', 'retrieved': 'The payload is low and the suspension tilts to one side.'}),
    scale: score('How large is the main envelope?', ['Compact', 'Medium sized', 'Broad and substantial']),
  },
  build(a,context){
    const s=new Sculpture(context),rnd=context.random;
    const skin=s.material('#c4bc86',{roughness:0.42}),seam=s.material('#8d8e6c'),metal=s.material('#9eaaa2',{metalness:0.5}),dark=s.material('#405754');
    const radius=0.65+a.scale*0.55,height=a.state==='partial'?2.2:a.state==='rising'?4.6:3.5;
    const counts=a.envelope==='tandem'?2:1;
    for(let n=0;n<counts;n++){const cx=counts===2?(n-0.5)*radius*1.6:0,rr=counts===2?radius*0.7:radius;
      if(a.envelope==='pear')s.lathe([[0,0],[rr*0.25,0.15],[rr*0.8,0.7],[rr,1.15],[rr*0.7,1.7],[0,1.9]],skin,[cx,height-0.9,0]);else s.ball([rr,a.state==='partial'?rr*0.65:rr,rr],[cx,height,0],skin,28);
      if(a.envelope==='pumpkin')for(let j=0;j<12;j++){const t=j/12*Math.PI*2,p:[number,number,number][]=[];for(let k=0;k<=20;k++){const q=k/20*Math.PI;p.push([cx+Math.sin(q)*rr*Math.cos(t),height+Math.cos(q)*rr,Math.sin(q)*rr*Math.sin(t)]);}s.tube(p,0.012,seam);}
      s.cylinder(0.09,0.04,0.16,[cx,height-rr-0.06,0],metal);
    }
    const py=a.state==='retrieved'?0.35:a.rig==='compact'?height-radius-0.55:1.1,n=a.rig==='compact'?2:4;
    const offset=a.state==='retrieved'?0.8:0;
    for(let j=0;j<n;j++){const y=py+j*0.3,x=offset+(a.rig==='ladder'?(j%2-0.5)*0.42:0);s.rod([x,y,0],[a.rig==='spread'?(j%2-0.5)*radius:0,height-radius,0],0.008,seam);
      if(a.samplers==='flasks')s.ball([0.13,0.15,0.13],[x,y,0],skin,16);
      if(a.samplers==='filters')s.box([0.26,0.12,0.17],[x,y,0],metal);
      if(a.samplers==='tubes')for(const dx of [-0.08,0.08])s.cylinder(0.035,0.035,0.3,[x+dx,y,0],metal,12);
      if(a.samplers==='bottles'){s.cylinder(0.09,0.09,0.22,[x,y,0],metal,16);for(const dx of [-0.12,0.12])s.rod([x+dx,y-0.14,0],[x+dx,y+0.14,0],0.009,dark);}
    }
    if(a.tail==='ribbon')s.surface((u,v,p)=>p.set(offset+0.3+v*0.6,py+0.2-v*0.6+Math.sin(v*8)*0.08,(u-0.5)*0.12),s.material('#a77441',{side:THREE.DoubleSide}),{segments:[2,24]});
    if(a.tail==='vanes')for(let j=0;j<4;j++){const vane=s.box([0.4,0.16,0.015],[offset,py-0.2,0],seam);vane.rotation.y=j*Math.PI/2;}
    if(a.tail==='windsock'){const sock=s.cylinder(0.03,0.16,0.6,[offset+0.4,py,0],seam,16);sock.rotation.z=Math.PI/2;}
    if(a.valve==='top'){s.cylinder(0.08,0.1,0.1,[0,height+radius,0],metal);s.tube([[0,height+radius,0],[radius*0.9,height,0],[radius*0.5,py,0]],0.005,dark);}
    if(a.valve==='neck')s.ring(0.12,0.025,[0,height-radius-0.12,0],metal).rotation.x=Math.PI/2;
    if(a.valve==='side'){s.ball([0.08,0.08,0.06],[radius*0.95,height,0],metal,12);s.tube([[radius,height,0],[radius+0.15,height-0.3,0],[radius*0.5,py+0.4,0]],0.02,dark);}
    if(a.recovery==='parachute')s.box([0.35,0.18,0.28],[offset,py+1.2,0],seam);
    if(a.recovery==='float')s.ring(0.24,0.06,[offset,py,0],skin).rotation.x=Math.PI/2;
    if(a.recovery==='skids')for(const x of [-0.22,0.22])s.tube([[offset+x,py-0.25,-0.3],[offset+x,py-0.4,0],[offset+x,py-0.3,0.3]],0.02,metal);
    if(a.recovery==='beacon'){s.rod([offset,py,0],[offset+0.15,py+0.7,0],0.008,metal);s.ball([0.045,0.045,0.045],[offset+0.15,py+0.7,0],dark,10);}
    s.tube([[offset,py,0],[0.4,0.6,0.2],[0.9,0.08,0.3]],0.01,dark);
    if(a.tether==='reel'){s.cylinder(0.21,0.21,0.16,[0.9,0.22,0.3],metal).rotation.x=Math.PI/2;for(const z of [0.2,0.4])s.ring(0.24,0.025,[0.9,0.22,z],dark);}
    if(a.tether==='stake')s.rod([0.9,0.01,0.3],[0.9,0.45,0.3],0.03,metal);
    if(a.tether==='sled')s.box([0.7,0.15,0.45],[0.9,0.075,0.3],dark);
    if(a.tether==='tripod')for(let j=0;j<3;j++){const t=j/3*Math.PI*2;s.rod([0.9,0.4,0.3],[0.9+Math.cos(t)*0.3,0.01,0.3+Math.sin(t)*0.3],0.025,metal);}

    return s.finish();
  },
});

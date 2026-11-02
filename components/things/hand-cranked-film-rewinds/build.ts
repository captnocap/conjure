import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    frame: choice('How are the rewind stands mounted?', { board:'Both stands on a long oak plank.', clamps:'Two C-clamps grip a narrow bench lip.', cast:'Two heavy cast-iron pedestal feet.', rail:'Two adjustable stands ride a steel rail.' }),
    reels: choice('What form do the reels take?', { spoke:'Six open spokes and a bright outer rim.', triangle:'Three broad triangular spokes.', solid:'Flat dark flanges with circular hubs.', plastic:'Pale plastic four-spoked reels.' }),
    size: choice('How do the reels compare?', { equal:'Two equal medium reels.', supply:'A large supply reel and small receiving reel.', takeup:'A small supply reel and large receiving reel.', tiny:'Two small amateur-film reels.' }),
    stock: choice('What sort of film connects the reels?', { amber:'Translucent amber film.', monochrome:'Dark monochrome film with pale frames.', white:'White protective leader.', red:'Red protective leader.' }),
    path: choice('How does the film cross the gap?', { taut:'A straight taut ribbon between the reels.', droop:'A broad sagging loop hangs in the gap.', broken:'Two disconnected ends hang from the reels.', guides:'The film passes over three inspection rollers.' }),
    crank: choice('Where are the crank handles?', { right:'Only the right reel has a crank.', both:'Both reels have long crank handles.', folded:'Short folded handles sit close to the hubs.', detached:'A detached crank rests on the board.' }),
    fill: score('How much film has moved onto the right reel?', ['Almost none', 'Half the print', 'Nearly all of it']),
    spacing: score('How far apart are the rewind stands?', ['Close together', 'A working gap', 'Widely spaced']),
    counter: noul('Is a frame-counting meter mounted between the reels?'),
    interruption: choice('What marks the interrupted job?', { none:'No interruption marker.', clip:'A red clothespin marks the film end.', glove:'A pale cotton inspection glove rests below.', card:'A yellow DO NOT WIND card hangs from a stand.' }),
  },
  build(a,context){
    const s=new Sculpture(context),metal=s.material('#9ea9a4',{metalness:0.75,roughness:0.3}),dark=s.material('#2c3534'),wood=s.material('#96724c'),film=s.material({amber:'#805632',monochrome:'#3d4341',white:'#dfd9bf',red:'#a84732'}[a.stock]);
    const gap=0.32+a.spacing*0.28;const radius=a.size==='tiny'?0.095:0.145;const height=0.21;
    if(a.frame==='board')s.box([gap+0.2,0.025,0.22],[0,0.015,0],wood);
    if(a.frame==='rail'){s.box([gap+0.25,0.025,0.07],[0,0.015,0],metal);for(const x of [-gap/2,gap/2])s.box([0.13,0.018,0.2],[x,0.01,0],dark);}
    if(a.frame==='clamps')s.box([gap+0.24,0.04,0.1],[0,0.06,-0.03],wood);
    const spinning:THREE.Group[]=[];
    for(const side of [-1,1]){
      const x=side*gap/2,r=radius*(a.size==='supply'?(side<0?1.2:0.72):a.size==='takeup'?(side>0?1.2:0.72):1);
      s.box([0.11,0.02,0.18],[x,0.03,0],dark);s.box([0.032,height-0.03,0.06],[x,height/2+0.02,-0.035],metal);s.rod([x,height,-0.07],[x,height,0.06],0.012,metal);
      if(a.frame==='clamps'){s.tube([[x-0.04,0.08,0.02],[x-0.04,0.005,0.02],[x+0.04,0.005,0.02],[x+0.04,0.08,0.02]],0.009,dark);}
      const start=s.root.children.length,reelMat=a.reels==='plastic'?s.material('#d2cba7'):metal;
      s.ring(r,0.007,[0,0,0],reelMat);
      const hub=s.cylinder(0.026,0.026,0.045,[0,0,-0.01],dark,16);hub.rotation.x=Math.PI/2;
      if(a.reels==='solid'){const disc=s.cylinder(r*0.97,r*0.97,0.008,[0,0,0],dark,40);disc.rotation.x=Math.PI/2;}else{const n=a.reels==='triangle'?3:a.reels==='plastic'?4:6;for(let j=0;j<n;j++){const t=j*2*Math.PI/n;s.rod([0,0,0],[r*Math.sin(t),r*Math.cos(t),0],a.reels==='triangle'?0.018:0.01,reelMat);}}
      const fill=0.025+(r*0.8-0.025)*(side>0?a.fill:1-a.fill);const spool=s.cylinder(fill,fill,0.018,[0,0,-0.017],film,40);spool.rotation.x=Math.PI/2;
      const group=new THREE.Group();for(const mesh of s.root.children.slice(start))group.add(mesh);group.position.set(x,height,0.04);s.root.add(group);spinning.push(group);
      if(a.crank==='both'||a.crank==='folded'||(a.crank==='right'&&side>0)){const reach=a.crank==='folded'?0.035:0.075;s.rod([x,height,0.078],[x+side*reach,height+reach*0.3,0.078],0.009,metal);s.rod([x+side*reach,height+reach*0.3,0.075],[x+side*reach,height+reach*0.3,0.12],0.014,wood);}
    }
    if(a.path==='broken'){for(const side of [-1,1])s.tube([[side*gap/2,height,0.025],[side*gap*0.3,0.12,0.025],[side*gap*0.35,0.07,0.04]],0.005,film);}else{
      const sag=a.path==='droop'?0.14:a.path==='guides'?0.04:0;
      s.surface((u,v,t)=>t.set((u-0.5)*gap,height-Math.sin(u*Math.PI)*sag,0.02+(v-0.5)*0.023),film,{segments:[32,2],flip:true});
      if(a.path==='guides')for(let j=0;j<3;j++){const x=(j-1)*gap*0.2;const roller=s.cylinder(0.015,0.015,0.04,[x,height-0.045,0.02],metal,16);roller.rotation.x=Math.PI/2;s.rod([x,0.03,0],[x,height-0.045,0],0.006,dark);}}
    if(a.crank==='detached')s.tube([[-0.08,0.04,0.09],[0.02,0.04,0.09],[0.02,0.04,0.14]],0.008,metal);
    if(a.counter){s.box([0.08,0.055,0.065],[0,0.06,-0.065],dark);s.label(String(1000+Math.floor(context.random()*8000)),0.065,0.025,[0,0.065,-0.031],'#dedfc1','#242d29');}
    if(a.interruption==='clip')s.box([0.016,0.045,0.015],[-gap*0.3,height+0.015,0.02],s.material('#aa382c')).rotation.z=0.2;
    if(a.interruption==='glove'){const cotton=s.material('#ded8c1');s.ball([0.032,0.008,0.04],[0.03,0.04,0.09],cotton,12);for(let j=0;j<4;j++)s.rod([0.01+j*0.013,0.042,0.11],[0.01+j*0.013,0.042,0.16-(j%2)*0.008],0.006,cotton);}
    if(a.interruption==='card')s.label('DO NOT WIND',0.11,0.045,[-gap/2,0.13,0.075],'#3c3830','#dcca74').rotation.z=-0.1;
    return s.finish({update:dt=>{if(a.path!=='broken'&&a.interruption==='none')for(const reel of spinning)reel.rotation.z+=dt*context.mood.energy*0.7;}});
  },
});

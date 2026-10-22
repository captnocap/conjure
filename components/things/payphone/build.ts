import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    mount: choice('How is the telephone mounted?', {wall:'A metal telephone mounted on a small brick wall panel.', pedestal:'A freestanding pedestal with a rain hood.', twin:'Two public phones back to back on one pole.'}),
    hood: choice('What kind of privacy hood surrounds it?', {square:'A boxy blue acoustic hood.', curved:'A rounded cream weather hood.', none:'No hood, only the exposed telephone.'}),
    body: choice('What is the handset and casing colour?', {black:'Black handset with brushed steel casing.', red:'Red handset with dark casing.', cream:'Cream handset with pale green casing.'}),
    receiver: choice('Where is the receiver?', {hook:'Hanging on its cradle.', loose:'Dangling below the telephone.', held:'Resting on the small shelf, a call still connected.'}),
    notice: choice('What is on the instruction card?', {calls:'LOCAL CALLS 25c', home:'CALL HOME', emergency:'EMERGENCY 112', silence:'PLEASE SPEAK CLEARLY'}),
    directory: noul('Is a hanging phone directory chained underneath?'),
    graffiti: noul('Is a little scratched heart on its face?'),
    dial: choice('How are numbers entered?', {buttons:'A twelve-button keypad.', rotary:'A circular rotary dial.'}),
  },
  build(a, context) {

    const s=new Sculpture(context),steel=s.material('#a8b5ad',{metalness:0.7}),dark=s.material('#3c4640'),paper=s.material('#e5ddc5'),body=s.material(a.body==='cream'?'#9aa995':a.body==='red'?'#555c53':'#b5bcb4'),hand=s.material(a.body==='cream'?'#dbd5ba':a.body==='red'?'#ac5040':'#323d38');
    const y=1.23;
    if(a.mount==='wall'){const wall=s.material('#bda38c');s.box([0.95,1.85,0.16],[0,0.925,-0.28],wall);for(let row=0;row<12;row++)for(let col=0;col<4;col++)s.box([0.012,0.012,0.005],[-0.42+col*0.23+(row%2)*0.1,0.07+row*0.15,-0.196],paper);for(let row=0;row<12;row++)s.box([0.94,0.008,0.006],[0,0.15*row,-0.195],paper);}
    else{s.box([0.45,0.055,0.4],[0,0.033,0],dark);s.box([0.1,1.48,0.12],[0,0.77,-0.16],steel);}
    const make=(back=false)=>{const start=s.root.children.length;s.box([0.39,0.58,0.19],[0,y,0],body);s.box([0.33,0.03,0.27],[0,y-0.3,0.09],steel);s.label({calls:'LOCAL CALLS 25c',home:'CALL HOME',emergency:'EMERGENCY 112',silence:'PLEASE SPEAK CLEARLY'}[a.notice],0.29,0.1,[0,y+0.18,0.102]);s.box([0.053,0.038,0.009],[0.125,y+0.07,0.105],dark);s.box([0.034,0.004,0.007],[0.125,y+0.075,0.114],steel);
      if(a.dial==='buttons')for(let row=0;row<4;row++)for(let col=0;col<3;col++)s.box([0.037,0.028,0.008],[(col-1)*0.049+0.035,y-0.04-row*0.04,0.107],steel);else{s.ring(0.077,0.013,[0.03,y-0.08,0.11],steel);for(let i=0;i<10;i++){const theta=i*Math.PI*2/10;s.ball([0.01,0.01,0.004],[0.03+Math.sin(theta)*0.073,y-0.08+Math.cos(theta)*0.073,0.121],dark,8);}}
      const hx=-0.14,hy=a.receiver==='loose'?y-0.47:a.receiver==='held'?y-0.31:y+0.005,hz=a.receiver==='held'?0.18:0.13;s.rod([hx,hy-0.095,hz],[hx,hy+0.095,hz],0.025,hand);for(const dy of [-0.1,0.1])s.ball([0.045,0.04,0.035],[hx,hy+dy,hz],hand,16);
      const points: [number,number,number][]=[];for(let i=0;i<36;i++){const t=i/35;points.push([hx+Math.sin(t*Math.PI*24)*0.012,Math.min(hy-0.14,y-0.18)-0.14*Math.sin(t*Math.PI),0.13+t*0.025]);}s.tube(points,0.005,dark);s.rod([hx,y-0.27,0.13],[hx,hy-0.1,hz],0.006,dark);
      if(a.hood!=='none'){const mat=s.material(a.hood==='square'?'#577f96':'#d0c8a8');s.box([0.76,0.07,0.48],[0,y+0.4,-0.015],mat);for(const x of [-0.36,0.36])s.box([0.065,0.86,0.44],[x,y,-0.015],mat);if(a.hood==='curved')s.ball([0.39,0.09,0.25],[0,y+0.45,-0.015],mat);}
      if(back)for(const mesh of s.root.children.slice(start)){mesh.position.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI);mesh.rotateY(Math.PI);mesh.position.z-=0.34;}
    };
    make();if(a.mount==='twin')make(true);
    if(a.directory){s.box([0.23,0.32,0.045],[0,0.7,0.08],paper);s.label('DIRECTORY',0.2,0.07,[0,0.75,0.107]);for(let i=0;i<6;i++)s.ring(0.012,0.003,[0.06,0.87+i*0.02,0.06],steel).rotation.y=i%2?Math.PI/2:0;}
    if(a.graffiti){s.label('<3',0.09,0.065,[-0.12,y-0.2,0.115],'#7d5d4c','#b4b9ad');}
    if(context.mood.wear>0.35)for(let i=0;i<8;i++)s.box([0.018,0.004,0.003],[(context.random()-0.5)*0.35,y+(context.random()-0.5)*0.55,0.115],dark);
    return s.finish();
  },
});

import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    era: choice('What type of cooker is it?', {gas:'An enamel gas stove with cast-iron trivets.', electric:'A simple electric coil cooker.', induction:'A flat glass induction cooker.'}),
    enamel: choice('What is the stove colour?', {cream:'Cream enamel.', mint:'Pale green enamel.', steel:'Brushed stainless steel.'}),
    cooking: choice('What is on the hob?', {empty:'An empty clean hob.', kettle:'A whistling kettle and a small saucepan.', supper:'A large lidded pot and frying pan.', baking:'A baking tray waiting on the hob.'}),
    oven: choice('How is the oven door positioned?', {closed:'Closed with a dark glass window.', open:'Folded down with the oven racks visible.', lit:'Closed with warm light showing through the window.'}),
    towel: choice('What hangs from the oven handle?', {none:'No towel.', striped:'A striped blue tea towel.', floral:'A small cream towel with a floral motif.'}),
    hood: noul('Is a small extraction hood included above the cooker?'),
    clock: choice('What does the little timer show?', {zero:'00:00', night:'02:17', dinner:'18:30', old:'A simple mechanical timer dial.'}),
    width: score('How wide is the cooker?', ['A compact two-burner cooker', 'A broad four-burner family cooker']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=0.5+a.width*0.35,color={cream:'#ddd5b9',mint:'#a2b8a1',steel:'#a7b4ad'}[a.enamel],body=s.material(color,{metalness:a.enamel==='steel'?0.7:0.15}),dark=s.material('#37433c'),steel=s.material('#b5beb3',{metalness:0.7}),hot=s.material('#bc784a',{emissive:'#c38344',emissiveIntensity:0.3});
    s.box([w,0.83,0.62],[0,0.45,0],body);s.box([w+0.025,0.025,0.64],[0,0.886,0],a.era==='induction'?dark:body);s.box([w,0.11,0.065],[0,0.99,-0.285],body);
    const n=a.width>0.25?4:2;for(let i=0;i<n;i++){const x=(i%2-0.5)*w*0.48,z=n===2?0:(Math.floor(i/2)-0.5)*0.3;if(a.era==='gas'){s.cylinder(0.06,0.065,0.013,[x,0.907,z],dark,20);for(let j=0;j<4;j++){const phi=j*Math.PI/2;s.rod([x+Math.sin(phi)*0.04,0.93,z+Math.cos(phi)*0.04],[x+Math.sin(phi)*0.105,0.93,z+Math.cos(phi)*0.105],0.009,dark);}}else if(a.era==='electric'){for(let r=0;r<4;r++)s.ring(0.025+r*0.019,0.006,[x,0.91,z],dark).rotation.x=Math.PI/2;}else{s.ring(0.095,0.0018,[x,0.906,z],steel).rotation.x=Math.PI/2;}}
    for(let i=0;i<n;i++){s.cylinder(0.021,0.021,0.025,[(i-(n-1)/2)*w/(n+1),0.79,0.326],dark,16).rotation.x=Math.PI/2;s.rod([(i-(n-1)/2)*w/(n+1),0.79,0.342],[(i-(n-1)/2)*w/(n+1),0.805,0.342],0.002,steel);}
    s.box([w*0.86,0.43,0.025],[0,0.405,0.325],dark);if(a.oven==='open'){for(let j=0;j<3;j++)s.box([w*0.76,0.012,0.4],[0,0.25+j*0.13,0.11],steel);const door=s.box([w*0.91,0.05,0.5],[0,0.15,0.56],body);s.box([w*0.6,0.005,0.28],[0,0.18,0.56],dark);s.rod([-w*0.35,0.2,0.76],[w*0.35,0.2,0.76],0.014,steel);}else{s.box([w*0.92,0.52,0.04],[0,0.405,0.348],body);s.box([w*0.63,0.25,0.011],[0,0.405,0.375],a.oven==='lit'?hot:dark);s.rod([-w*0.37,0.64,0.393],[w*0.37,0.64,0.393],0.015,steel);}
    if(a.clock==='old'){s.cylinder(0.023,0.023,0.018,[w*0.28,0.99,-0.243],dark,16).rotation.x=Math.PI/2;}else s.label({zero:'00:00',night:'02:17',dinner:'18:30'}[a.clock],0.15,0.043,[0,0.99,-0.244],'#bed5a6','#3c4d3f');
    const pot=(x:number,z:number,r:number)=>{s.cylinder(r,r*0.94,0.14,[x,1.005,z],steel,20);s.cylinder(r*1.04,r*1.04,0.012,[x,1.085,z],steel,20);s.ball([0.022,0.013,0.022],[x,1.104,z],dark,12);for(const side of [-1,1])s.rod([x+side*r,1.05,z],[x+side*(r+0.065),1.05,z],0.009,dark);};
    if(a.cooking==='kettle'){s.ball([0.085,0.075,0.085],[-w*0.23,0.999,0.12],steel);s.tube([[-w*0.23-0.07,1.03,0.12],[-w*0.23-0.055,1.13,0.12],[-w*0.23+0.055,1.13,0.12],[-w*0.23+0.07,1.03,0.12]],0.009,dark);s.rod([-w*0.23,1.01,0.17],[-w*0.23,1.065,0.25],0.025,steel,0.013);pot(w*0.23,-0.15,0.072);}
    if(a.cooking==='supper'){pot(-w*0.23,-0.15,0.105);s.cylinder(0.1,0.095,0.035,[w*0.23,0.955,0.15],dark,24);s.rod([w*0.23+0.09,0.967,0.15],[w*0.23+0.27,0.98,0.15],0.012,dark);s.ball([0.04,0.008,0.03],[w*0.23,0.98,0.15],s.material('#d5bb75'),12);}
    if(a.cooking==='baking'){s.box([w*0.68,0.021,0.37],[0,0.93,0],steel);for(let i=0;i<6;i++)s.ball([0.031,0.012,0.026],[(i%3-1)*0.08,0.954,(Math.floor(i/3)-0.5)*0.13],s.material('#b99159'),12);}
    if(a.towel!=='none'){const towel=s.material('#dfdbc3');s.box([0.2,0.26,0.014],[0,0.52,0.411],towel);for(let i=0;i<4;i++)if(a.towel==='striped')s.box([0.2,0.016,0.003],[0,0.42+i*0.065,0.42],s.material('#7196a0'));else s.ball([0.01,0.01,0.002],[(context.random()-0.5)*0.16,0.42+i*0.065,0.42],s.material('#b58785'),8);}
    if(a.hood){s.box([w+0.1,0.12,0.51],[0,1.74,-0.02],body);s.box([w*0.36,0.44,0.2],[0,2.01,-0.17],steel);s.box([w*0.8,0.012,0.3],[0,1.674,0],dark);}
    return s.finish();
  },
});

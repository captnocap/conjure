import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    cart: choice("What carries the cylinders?", {"hand": "A tilted two-wheel hand trolley.", "four": "A four caster service cart.", "rack": "A fixed workshop cylinder rack.", "cage": "An enclosed protective cage."}),
    bottles: choice("How are the cylinders proportioned?", {"matched": "Two matching tall cylinders.", "unequal": "One tall and one short cylinder.", "compact": "Two squat compact cylinders.", "single": "One cylinder with a second empty restraint."}),
    colours: choice("What marks the cylinder pair?", {"green": "Green and dark red cylinders.", "blue": "Blue and cream cylinders.", "grey": "Grey and black cylinders.", "yellow": "Ochre and charcoal cylinders."}),
    regulator: choice("What is fitted to the valves?", {"double": "Two round gauges per cylinder.", "single": "One gauge per cylinder.", "cap": "Protective valve caps.", "bare": "Bare valves awaiting regulators."}),
    hoses: choice("Where are the hoses?", {"coil": "Coiled on the handle.", "floor": "Looped on the floor.", "tray": "Folded in the top tray.", "straight": "Hanging in two long loops."}),
    torch: choice("Where is the brazing torch?", {"hook": "Hanging from the cart side.", "tray": "Resting across the service tray.", "up": "Clipped upright at the handle.", "absent": "Torch removed from the hoses."}),
    restraint: choice("What secures the bottles?", {"chain": "Metal chains around the bottles.", "strap": "Wide canvas straps.", "bar": "Rigid steel retaining bars.", "double": "Two levels of chain restraint."}),
    state: choice("What marks the current job?", {"ready": "A clean prepared brazing outfit.", "rods": "A tube of long brazing rods.", "gloves": "Heavy gloves left in the tray.", "tagged": "A service tag hanging from a valve."}),
    height: score("How tall is the outfit?", ["A compact portable set", "A full workshop set", "A tall cylinder set"])
  },
  build(a,context){

    const s=new Sculpture(context),steel=s.material('#53615a',{metalness:0.65}),brass=s.material('#ac9759',{metalness:0.75}),rubber=s.material('#554e40'),h=0.85+a.height*0.55,w=0.65;
    s.box([0.75,0.08,0.6],[0,0.16,0],steel);for(const x of [-0.35,0.35])s.rod([x,0.18,-0.25],[x,h+0.25,-0.25],0.025,steel);s.rod([-0.35,h+0.25,-0.25],[0.35,h+0.25,-0.25],0.025,steel);
    for(const x of [-0.39,0.39])for(const z of a.cart==='four'?[-0.2,0.2]:[-0.18])s.cylinder(a.cart==='four'?0.075:0.15,a.cart==='four'?0.075:0.15,0.06,[x,a.cart==='four'?0.075:0.15,z],rubber,24).rotation.z=Math.PI/2;
    if(a.cart==='rack')s.box([0.95,0.08,0.75],[0,0.04,0],steel);if(a.cart==='cage')for(const z of [-0.3,0.3])for(const x of [-0.37,0.37])s.rod([x,0.18,z],[x,h+0.2,z],0.018,steel);
    const colors={green:['#60715e','#99594b'],blue:['#608696','#c8c2a7'],grey:['#939b91','#424c48'],yellow:['#b99b50','#4a504c']}[a.colours];
    for(let i=0;i<(a.bottles==='single'?1:2);i++){const x=(i-0.5)*0.34,bh=(a.bottles==='compact'?h*0.7:a.bottles==='unequal'&&i===1?h*0.75:h);const mat=s.material(colors[i],{metalness:0.45});s.cylinder(0.145,0.145,bh-0.15,[x,0.2+(bh-0.15)/2,0],mat,28);s.ball([0.145,0.13,0.145],[x,bh+0.05,0],mat,24);s.rod([x,bh+0.12,0],[x,bh+0.22,0],0.025,brass);s.box([0.12,0.025,0.025],[x,bh+0.22,0],brass);
      if(a.regulator==='cap')s.cylinder(0.065,0.065,0.16,[x,bh+0.2,0],steel,20);else if(a.regulator!=='bare')for(let j=0;j<(a.regulator==='double'?2:1);j++){const gx=x+(j-0.4)*0.11;s.cylinder(0.055,0.055,0.03,[gx,bh+0.2,0.08],brass,24).rotation.x=Math.PI/2;s.cylinder(0.046,0.046,0.006,[gx,bh+0.2,0.1],s.material('#e0d9bd'),24).rotation.x=Math.PI/2;s.rod([gx,bh+0.2,0.106],[gx+0.025,bh+0.23,0.106],0.003,steel);}
    }
    for(const y of a.restraint==='double'?[h*0.4,h*0.75]:[h*0.65]){if(a.restraint==='bar'||a.restraint==='strap')s.box([0.72,a.restraint==='strap'?0.09:0.04,0.04],[0,y,0.17],a.restraint==='strap'?rubber:steel);else s.tube([[-0.35,y,-0.2],[-0.35,y,0.16],[0,y-0.04,0.2],[0.35,y,0.16],[0.35,y,-0.2]],0.012,steel);}
    s.box([0.5,0.025,0.22],[0,h*0.77,-0.34],steel);
    for(let i=0;i<2;i++){const hose=s.material(i?'#a26750':'#68816c');if(a.hoses==='floor')s.tube([[-0.15+i*0.3,h,0.07],[0.45,h*0.5,0.1],[0.6,0.03,0.25],[0.3,0.03,0.65],[-0.4,0.03,0.55],[-0.5,0.03,0.15]],0.012,hose);else if(a.hoses==='coil')for(let j=0;j<3;j++)s.ring(0.18+j*0.014,0.012,[i*0.04,h*0.7,0.2+i*0.025],hose);else s.tube([[-0.15+i*0.3,h,0.05],[-0.25+i*0.1,a.hoses==='tray'?h*0.8:0.3,0.25],[0.25,a.hoses==='tray'?h*0.8:0.3,0.28],[0.38,h*0.7,0.12]],0.012,hose);}
    if(a.torch!=='absent'){
      const x=a.torch==='tray'?-0.25:0.42,y=a.torch==='up'?h+0.15:a.torch==='tray'?h*0.77+0.04:h*0.55,z=a.torch==='tray'?-0.34:0.12;
      s.rod([x,y,z],[x+0.15,y+0.12,z],0.018,brass);s.rod([x+0.15,y+0.12,z],[x+0.3,y+0.24,z],0.008,steel);s.box([0.06,0.025,0.025],[x+0.04,y+0.07,z],steel);
      if(a.torch!=='tray'){s.rod([0.35,y-0.03,-0.25],[x,y-0.03,z],0.012,steel);s.ring(0.026,0.008,[x,y,z],steel).rotation.x=Math.PI/2;}
      s.tube([[0.17,h,0.08],[0.4,h*0.6,0.25],[x,y,z]],0.012,s.material('#a26750'));
    }
    if(a.state==='rods')for(let i=0;i<8;i++)s.rod([-0.42+i*0.008,0.18,0],[-0.42+i*0.008,h*0.9,0],0.004,brass);if(a.state==='gloves')for(const x of [-0.08,0.08])s.ball([0.07,0.025,0.09],[x,h*0.8,-0.34],s.material('#b18c58'),12);if(a.state==='tagged')s.label('SERVICE',0.2,0.1,[0.25,h,0.17],'#6b5144','#d9c18d');
    if(a.cart==='hand')s.root.rotation.x=-0.09;return s.finish();

  },
});

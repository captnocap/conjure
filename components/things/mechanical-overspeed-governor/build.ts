import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    wheel: choice("What governor wheel is fitted?", {"spoke": "A six spoke wheel.", "solid": "A solid cast wheel.", "double": "Two closely spaced grooved wheels.", "open": "A thin open rim and hub."}),
    weights: choice("What centrifugal weights are visible?", {"balls": "Two round bob weights.", "blocks": "Two rectangular hinged weights.", "four": "Four small balanced weights.", "shoes": "Two curved weighted shoes."}),
    frame: choice("What supports the governor?", {"pedestal": "A single cast pedestal.", "fork": "A two-sided bearing fork.", "plate": "A flat mounting plate.", "legs": "Four narrow support legs."}),
    finish: choice("What is the machine finish?", {"green": "Green painted iron.", "grey": "Grey cast metal.", "blue": "Blue enamel.", "black": "Blackened steel."}),
    rope: choice("What governor rope is fitted?", {"loop": "A taut loop below the wheel.", "tails": "Two straight hanging tails.", "coil": "A loose rope coil on the base.", "none": "No governor rope fitted."}),
    trip: choice("How is the trip lever arranged?", {"long": "A long side trip arm.", "short": "A short red trigger lever.", "latch": "A raised pawl and latch.", "covered": "A small protective trigger box."}),
    mark: choice("What marks the setting?", {"dial": "A circular speed dial.", "plate": "A rectangular speed plate.", "arrow": "A red direction arrow.", "none": "No setting label."}),
    state: choice("What state is the mechanism in?", {"reset": "Trip mechanism reset.", "tripped": "Trip lever visibly down.", "sealed": "A lead seal on the adjustment.", "service": "A weight is removed for service."}),
    size: score("How large is the governor?", ["A compact governor", "A standard governor", "A large industrial governor"])
  },
  build(a,context){

    const s=new Sculpture(context),body=s.material({green:'#597565',grey:'#8d9a88',blue:'#648390',black:'#445246'}[a.finish],{metalness:0.6}),metal=s.material('#a8b09f',{metalness:0.75}),red=s.material('#a6684c'),r=0.22+a.size*0.16,cy=r+0.38;
    s.box([1,0.1,0.7],[0,0.05,0],body);if(a.frame==='pedestal')s.box([0.24,cy-0.1,0.24],[0,cy/2,0],body);else for(const z of a.frame==='fork'?[-0.14,0.14]:[-0.24,0.24])for(const x of a.frame==='legs'?[-0.3,0.3]:[0])s.rod([x,0.1,z],[0,cy,z],a.frame==='plate'?0.07:0.03,body);
    for(const z of a.wheel==='double'?[-0.055,0.055]:[0]){s.ring(r,0.035,[0,cy,z],body);if(a.wheel==='solid')s.cylinder(r-0.02,r-0.02,0.06,[0,cy,z],body,32).rotation.x=Math.PI/2;else for(let j=0;j<6;j++)s.rod([0,cy,z],[Math.cos(j*Math.PI/3)*r,cy+Math.sin(j*Math.PI/3)*r,z],0.018,body);}
    s.rod([0,cy,-0.24],[0,cy,0.19],0.025,metal);const n=a.weights==='four'?4:2;for(let j=0;j<n;j++){if(a.state==='service'&&j===0)continue;const t=j/n*Math.PI*2,rr=r*0.55,x=Math.cos(t)*rr,y=cy+Math.sin(t)*rr;s.rod([0,cy,0.13],[x,y,0.13],0.012,metal);if(a.weights==='balls')s.ball([0.06,0.06,0.06],[x,y,0.13],metal,16);else if(a.weights==='shoes')s.ring(0.09,0.025,[x,y,0.13],metal,Math.PI).rotation.z=t;else s.box([0.1,0.08,0.06],[x,y,0.13],metal).rotation.z=t;}
    if(a.rope==='loop')s.tube([[-r,cy,0],[-r,0.15,0],[0,0.08,0],[r,0.15,0],[r,cy,0],[0,cy+r,0],[-r,cy,0]],0.009,metal);if(a.rope==='tails')for(const x of [-r,r])s.rod([x,cy,0],[x,0.08,0],0.009,metal);if(a.rope==='coil')for(let j=0;j<4;j++)s.ring(0.12+j*0.014,0.008,[0.25,0.12,0.22],metal).rotation.x=Math.PI/2;
    const ty=a.state==='tripped'?0.25:cy;if(a.trip==='covered')s.box([0.18,0.22,0.22],[r+0.12,cy,0],body);else{s.rod([r,cy,0],[r+(a.trip==='long'?0.35:0.16),ty,0.12],0.018,red);if(a.trip==='latch'){s.rod([r,cy,0],[r+0.1,cy+0.08,0],0.018,metal);s.box([0.09,0.08,0.07],[r+0.1,cy+0.08,0],metal);}}
    if(a.mark==='dial'){s.cylinder(0.09,0.09,0.015,[0,cy,0.21],s.material('#d7cdae'),24).rotation.x=Math.PI/2;s.rod([0,cy,0.223],[0.05,cy+0.05,0.223],0.004,red);}if(a.mark==='plate')s.label('1.6 m/s',0.3,0.12,[0,0.21,0.16],'#dcd1ae','#5b6c57');if(a.mark==='arrow')s.label('>',0.2,0.12,[r*0.5,cy+0.05,0.1],'#ae6849','#6c7c63');if(a.state==='sealed')s.tube([[r,cy,0.1],[r+0.1,cy-0.2,0.1],[r,cy,0.1]],0.004,metal);if(a.state==='service')s.box([0.1,0.08,0.06],[-0.3,0.14,0.2],metal);return s.finish();

  },
});

import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    style: choice('What kind of shelter is it?', {glass:'A light steel frame with glass screens.', concrete:'A heavy municipal concrete shelter.', timber:'A modest timber rural shelter.'}),
    roof: choice('What shape is the roof?', {flat:'A flat projecting canopy.', pitched:'A shallow pitched roof.'}),
    notice: choice('What is on the timetable?', {service:'LAST SERVICE 23:40', delayed:'SERVICE DELAYED', route:'ROUTE 07 / TOWN CENTRE'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const frame=s.material(a.style==='timber'?'#9c805e':a.style==='concrete'?'#b2b4a7':'#5b7677',{metalness:a.style==='glass'?0.4:0}),glass=s.material('#b5cbcb',{transparent:true,opacity:0.25,depthWrite:false});
    for(const x of [-1.6,1.6])for(const z of [-0.6,0.6])s.box([0.1,2.35,0.1],[x,1.175,z],frame);
    s.box([3.2,1.8,0.065],[0,1.3,-0.65],a.style==='glass'?glass:frame);
    if(a.roof==='flat')s.box([3.6,0.14,1.6],[0,2.4,0],frame);else for(const side of [-1,1]){const roof=s.box([3.6,0.12,0.88],[0,2.5,side*0.38],frame);roof.rotation.x=side*0.22;}
    s.box([2.3,0.11,0.4],[0,0.53,-0.15],frame);for(const x of [-0.8,0.8])s.box([0.09,0.5,0.25],[x,0.25,-0.15],frame);
    s.label({service:'LAST SERVICE 23:40',delayed:'SERVICE DELAYED',route:'ROUTE 07 / TOWN CENTRE'}[a.notice],1.15,0.28,[0,1.6,-0.60]);

    return s.finish();
  },
});

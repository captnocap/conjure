import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    type: choice('What type of postbox is it?', {pillar:'A cylindrical pillar box with a domed cap.', collection:'A rectangular postal collection box on stout legs.', rural:'A little rounded rural mailbox on a wooden post.'}),
    paint: choice('What is its postal colour?', {red:'Deep postal red.', blue:'Slate blue.', green:'Forest green.'}),
    flap: choice('How is the letter flap positioned?', {closed:'A dark closed letter slot.', open:'The flap is lifted for posting.', letter:'A letter protrudes halfway through.'}),
    marking: choice('What does the postal marking say?', {post:'POST', letters:'LETTERS', mail:'MAIL', beyond:'TO ANYWHERE'}),
    flag: noul('Does it carry a raised outgoing-mail flag?'),
    parcel: noul('Is a tied parcel leaning beside it?'),
    notice: choice('What is the collection notice?', {daily:'COLLECTION 17:00', sunday:'NO SUNDAY SERVICE', tomorrow:'NEXT COLLECTION TOMORROW'}),
    height: score('How tall is the box?', ['A low neighbourhood box', 'A tall civic pillar']),
  },
  build(a, context) {

    const s=new Sculpture(context),h=1.04+a.height*0.5,paint=s.material({red:'#a8443e',blue:'#47758e',green:'#3f6950'}[a.paint],{metalness:0.3}),dark=s.material('#363f35'),paper=s.material('#e6dec5'),wood=s.material('#94794e');
    const y=a.type==='rural'?h*0.85:h*0.58;
    if(a.type==='pillar'){s.cylinder(0.27,0.3,0.1,[0,0.06,0],dark);s.cylinder(0.24,0.25,h-0.19,[0,(h-0.19)/2+0.11,0],paint);s.ball([0.27,0.095,0.27],[0,h-0.09,0],paint);s.cylinder(0.27,0.27,0.06,[0,h-0.16,0],dark);s.box([0.3,0.075,0.028],[0,y+0.23,0.235],dark);}
    else if(a.type==='collection'){for(const x of [-0.19,0.19])s.box([0.07,0.43,0.28],[x,0.23,0],dark);s.box([0.56,h-0.39,0.45],[0,(h+0.39)/2,0],paint);s.box([0.59,0.055,0.49],[0,h+0.025,0],paint);s.box([0.37,0.09,0.03],[0,y+0.23,0.235],dark);}
    else{s.box([0.1,h*0.85,0.1],[0,h*0.425,-0.08],wood);s.box([0.56,0.055,0.25],[0,h*0.71,-0.08],wood);s.box([0.44,0.22,0.57],[0,h*0.87,0],paint);s.cylinder(0.22,0.22,0.57,[0,h*0.98,0],paint,20).rotation.x=Math.PI/2;s.box([0.39,0.21,0.025],[0,h*0.87,0.295],paint);s.box([0.12,0.03,0.03],[0,h*0.89,0.319],dark);}
    const face=a.type==='rural'?0.32:0.258;
    s.label({post:'POST',letters:'LETTERS',mail:'MAIL',beyond:'TO ANYWHERE'}[a.marking],a.type==='rural'?0.3:0.36,0.1,[0,y+0.08,face],'#efe5c9',{red:'#a8443e',blue:'#47758e',green:'#3f6950'}[a.paint]);
    if(a.type!=='rural')s.label({daily:'COLLECTION 17:00',sunday:'NO SUNDAY SERVICE',tomorrow:'NEXT COLLECTION TOMORROW'}[a.notice],0.28,0.16,[0,y-0.15,face]);else{const label=s.label({daily:'17:00',sunday:'NO SUNDAY',tomorrow:'TOMORROW'}[a.notice],0.32,0.07,[0.227,h*0.88,0]);label.rotation.y=Math.PI/2;}
    if(a.flap==='open'){const flap=s.box([0.32,0.055,0.02],[0,y+0.29,face+0.045],paint);flap.rotation.x=-0.8;}if(a.flap==='letter'){const letter=s.box([0.23,0.009,0.13],[0,y+0.24,face+0.055],paper);letter.rotation.x=-0.25;s.box([0.035,0.003,0.026],[0.065,y+0.265,face+0.095],s.material('#739188'));}
    if(a.flag){s.rod([0.25,y-0.05,0],[0.25,y+0.34,0],0.016,dark);s.box([0.12,0.11,0.027],[0.28,y+0.29,0],s.material('#c07c4c'));}
    if(a.parcel){s.box([0.32,0.3,0.22],[-0.38,0.15,0.06],s.material('#b8a072'));s.box([0.016,0.304,0.225],[-0.38,0.15,0.06],paper);s.box([0.326,0.014,0.23],[-0.38,0.17,0.06],paper);s.label('HANDLE WITH CARE',0.23,0.09,[-0.38,0.18,0.174]);}
    for(let i=0;i<6;i++)if(context.random()<context.mood.wear)s.box([0.018,0.045,0.006],[(context.random()-0.5)*0.3,0.19+context.random()*h*0.6,face+0.004],s.material('#9c7958'));
    return s.finish();
  },
});

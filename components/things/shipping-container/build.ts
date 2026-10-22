import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    colour: choice('What colour is the container?', {ochre:'Weathered ochre.', blue:'Marine blue.', green:'Faded forest green.', red:'Oxide red.'}),
    use: choice('What has it become?', {freight:'An ordinary sealed freight container.', workshop:'A workshop with a small side window.', shelter:'A temporary shelter with a door and awning.'}),
    length: choice('What are its proportions?', {short:'A compact short container.', long:'A long freight container.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const l=a.length==='long'?6:3,paint=s.material({ochre:'#b69760',blue:'#597e94',green:'#738b71',red:'#a96952'}[a.colour],{metalness:0.35}),trim=s.material('#a7afa6',{metalness:0.6});
    s.box([l,2.4,2.2],[0,1.2,0],paint);
    for(let i=0;i<l*6;i++)for(const side of [-1,1])s.box([0.035,2.25,0.05],[-l/2+0.1+i/6,1.2,side*1.12],paint);
    for(const side of [-1,1])s.rod([side*l*0.28,0.1,1.16],[side*l*0.28,2.3,1.16],0.026,trim);
    s.label('CJR  004821',1.2,0.24,[l/2-0.8,2,1.155],'#e3dfc8',{ochre:'#b69760',blue:'#597e94',green:'#738b71',red:'#a96952'}[a.colour]);
    if(a.use==='workshop')s.box([1.1,0.75,0.04],[0,1.5,1.16],s.material('#bad0cb'));
    if(a.use==='shelter'){s.box([0.8,1.85,0.05],[0,0.94,1.16],trim);const awning=s.box([1.7,0.07,1],[0,2.2,1.6],trim);awning.rotation.x=-0.1;}

    return s.finish();
  },
});

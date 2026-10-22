import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    tails: choice('Which tails are visible?', {dust:'One broad, curling golden dust tail.', ion:'One narrow electric-blue ion tail.', twin:'Both the curved dust tail and the straight blue ion tail.'}),
    activity: choice('How active is its nucleus?', {quiet:'A small compact coma.', erupting:'An active nucleus shedding bright fragments.'}),
    arc: choice('How curved is its path?', {straight:'A long almost straight passage.', hooked:'A sharply hooked sweep.'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    s.mesh(new THREE.IcosahedronGeometry(0.48,1),s.material('#b2c6c6',{flatShading:true}));
    const dots=[];for(let i=0;i<550;i++){const t=random(),spread=t*0.6;const dust=a.tails==='dust'||(a.tails==='twin'&&i%2===0);dots.push({at:[t*5,(dust?Math.sin(t*(a.arc==='hooked'?2.1:0.7))*2:0)+(random()-0.5)*spread,(random()-0.5)*spread] as [number,number,number],size:0.015+random()*0.04,color:dust?'#e8c895':'#8cc8ed'});}
    s.scatter(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#ffffff'}),dots);
    if(a.activity==='erupting')for(let i=0;i<12;i++)s.ball([0.04,0.04,0.04],[(random()-0.5)*1.6,(random()-0.5)*1.6,(random()-0.5)*1.6],s.material('#e5f3ee'),8);

    return s.finish();
  },
});

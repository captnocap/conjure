import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    backdrop: choice('What frames the orbital scene?', {navy:'A navy observatory view.', parchment:'A cream astronomical model.', blue:'A pale blue mission diagram.'}),
    orbits: choice('How are the orbits drawn?', {none:'Open space with no diagrams.', rings:'Fine concentric orbital tracks.', sector:'A partial orbital arc and range markers.'}),
    horizon: noul('Is a low planetary limb visible along the back?'),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background: {navy:'#182735',parchment:'#eae3d1',blue:'#d5e1e7'}[a.backdrop], floor:null, width:14, depth:10, floating:true, maxHeight:4, radius:1.7, pitch:42});

    const orbit=s.material(a.backdrop==='navy'?'#8fabb5':'#a29b7f');
    if(a.orbits!=='none')for(let i=0;i<4;i++){const ring=s.ring(2+i*1.35,0.012,[0,-0.3,0],orbit,a.orbits==='sector'?Math.PI*1.4:Math.PI*2);ring.rotation.x=Math.PI/2;}
    if(a.horizon)s.ball([6,0.6,1.5],[0,-0.6,-4],s.material('#687f87'),48);

    return world;
  },
});

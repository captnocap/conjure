import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What are the pigeons doing?", {"perched": "Both stand quietly on a perch.", "court": "One bird bows with its breast puffed out.", "preen": "One bird turns its head into its wing.", "feed": "Both birds dip toward scattered grain.", "launch": "One bird spreads its wings before takeoff."}),
  state: choice("How are the two birds relating?", {"pair": "Standing close as a bonded pair.", "watch": "Facing in opposite directions.", "follow": "One bird follows behind the other.", "space": "Keeping a cautious distance.", "nest": "Gathered around a little straw nest."}),
  detail: choice("What plumage do they have?", {"blue": "Blue-grey bodies with black wing bars.", "white": "Mostly white plumage.", "red": "Red and russet plumage.", "pied": "Grey birds with pale wing patches.", "mixed": "One blue bird and one white bird."}),
  support: choice("What do they stand on?", {"beam": "A weathered timber beam.", "wire": "A stout wire over two posts.", "ledge": "A broad loft window ledge.", "stone": "A low stone coping.", "floor": "A bare patch of loft floor."}),
  extra: choice("What identifies the racing birds?", {"red": "Red and yellow leg bands.", "blue": "Blue and green leg bands.", "number": "Numbered white leg bands.", "single": "Only one bird wears a blue band.", "none": "No visible leg bands."}),
  mark: choice("What is around their feet?", {"grain": "A small scattering of pale grain.", "feather": "A loose moulted feather.", "straw": "A few pieces of straw.", "water": "A tiny drinking dish.", "clear": "A clean perch."}),
  extent: score("How large are the birds?", ["Small young pigeons", "Average adult pigeons", "Large well-fed pigeons"]),
  load: score("How far apart are they standing?", ["Almost touching", "A comfortable pair spacing", "Well separated"]),
  closed: noul("Does one pigeon have a small raised crest?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const k=.8+a.extent*.4,gap=.16+a.load*.2,base=u===0?.14:u===1?.3:u===2?.12:u===3?.1:.015,width=gap*2+.35;
    if(u===0)s.box([width,.14,.15],[0,.07,0],wood);if(u===1){for(const x of [-width/2,width/2])s.rod([x,0,0],[x,base,0],.018,wood);s.rod([-width/2,base,0],[width/2,base,0],.006,metal);}if(u===2)s.box([width,.12,.35],[0,.06,0],wood);if(u===3)s.box([width,.1,.28],[0,.05,0],pale);
    for(let b=0;b<2;b++){const bird=new THREE.Group(),body=s.material(d===4?(b?'#d3d5c5':'#7d8b95'):['#7d8c94','#d5d6c7','#aa795c','#919d9e'][d]),wingMat=d===3?pale:body;bird.add(s.ball([.085,.1,.14],[0,.18,0],body,18));bird.add(s.ball([.055,.07,.06],[0,f===3?.23:f===1&&b===0?.28:.31,f===3?.075:.055],s.material(d===1?'#d9d9ca':d===2?'#98714f':'#677d78'),16));const head=s.ball([.04,.045,.045],[f===2&&b===0?.065:0,f===3?.17:.37,f===3?.13:.08],body,16);bird.add(head);const beak=s.mesh(new THREE.ConeGeometry(.012,.038,6),pale,[head.position.x,head.position.y-.006,head.position.z+.05]);beak.rotation.x=Math.PI/2;bird.add(beak);for(const side of [-1,1])bird.add(s.ball([.004,.004,.003],[head.position.x+side*.034,head.position.y+.008,head.position.z+.025],dark,8));
      for(const side of [-1,1]){const wing=s.ball([.025,.075,.125],[side*(f===4&&b===0?.17:.07),.2,0],wingMat,16);wing.rotation.z=side*(f===4&&b===0?1.2:.15);bird.add(wing);if(d!==1)for(const zz of [-.025,.025])bird.add(s.rod([side*.08,.22,zz-.04],[side*.09,.17,zz+.025],.008,dark));bird.add(s.rod([side*.026,.035,.015],[side*.026,.1,0],.006,s.material('#a57463')));for(const dz of [-.02,0,.02])bird.add(s.rod([side*.026,.035,.015],[side*.026+dz,.025,.06],.004,s.material('#a57463')));if(e<3||e===3&&b===0){const band=s.cylinder(.009,.009,.018,[side*.026,.06,.01],s.material(e===0?(b?'#c6ad51':'#a55b4d'):e===1?(b?'#6c935c':'#638c9e'):e===2?'#ddd8bd':'#638c9e'),10);bird.add(band);}}
      for(let j=0;j<5;j++)bird.add(s.box([.017,.01,.14],[(j-2)*.015,.11,-.15],body));if(a.closed&&b===0)for(let j=0;j<3;j++)bird.add(s.ball([.013,.024,.012],[head.position.x+(j-1)*.016,head.position.y+.045,head.position.z-.025],body,10));bird.position.set((b-.5)*gap*2,base,t===2?(b-.5)*.18:0);bird.rotation.y=t===1&&b===1?Math.PI:t===0?(b-.5)*-.25:0;bird.scale.setScalar(k);s.root.add(bird);
    }
    if(t===4){s.ring(.1,.015,[0,.015,.15],wood).rotation.x=Math.PI/2;for(let i=0;i<12;i++)s.rod([(random()-.5)*.17,.01,.15+(random()-.5)*.12],[(random()-.5)*.17,.014,.15+(random()-.5)*.12],.002,pale);}
    if(m===0)for(let i=0;i<10;i++)s.ball([.006,.004,.004],[(random()-.5)*width,.006,.18+random()*.1],pale,6);if(m===1)s.ball([.015,.004,.065],[0,.006,.23],pale,10);if(m===2)for(let i=0;i<6;i++)s.rod([-.1+random()*.2,.005,.2],[random()*.2,.005,.28],.002,pale);if(m===3)s.lathe([[.04,0],[.06,.025],[.05,.025],[.03,.005]],pale,[0,0,.25]);return s.finish();
  },
});

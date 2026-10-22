import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    style: choice('What kind of luggage is it?', {vintage:'A leather trunk-style suitcase with straps.', roller:'A ribbed modern rolling suitcase.', soft:'A rounded canvas travel bag.'}),
    colour: choice('What is the luggage colour?', {brown:'Cognac brown.', green:'Moss green.', blue:'Faded navy blue.', pink:'Dusty rose.'}),
    position: choice('How is the case arranged?', {standing:'Standing upright, ready to leave.', flat:'Lying flat with the handle facing us.', open:'Open on the floor, partly packed.'}),
    packing: choice('If it is open, what is packed inside?', {clothes:'Folded clothes and a pair of shoes.', souvenirs:'Postcards, a small camera and a notebook.', empty:'An empty lined interior.'}),
    tag: choice('What destination is on the luggage tag?', {home:'HOME', coast:'THE COAST', nowhere:'NOWHERE YET', return:'RETURN TO SENDER'}),
    stickers: noul('Does it carry colourful travel stickers?'),
    handle: noul('Is the telescoping handle extended?'),
    size: score('How large is the case?', ['Small weekend luggage', 'A large case for a long journey']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=0.42+a.size*0.22,h=0.57+a.size*0.24,d=0.22+a.size*0.1,c={brown:'#9c7049',green:'#718268',blue:'#576d83',pink:'#b88c85'}[a.colour],body=s.material(c,{metalness:a.style==='roller'?0.15:0}),edge=s.material('#6a5642'),steel=s.material('#b6bcae',{metalness:0.7}),inside=s.material('#c4bca0');
    const flat=a.position!=='standing';const by=flat?d/2+0.025:h/2+0.035;const size: [number,number,number]=flat?[w,d,h]:[w,h,d];s.box(size,[0,by,0],body);
    if(a.position==='open'){s.box([w*0.9,0.03,h*0.9],[0,d+0.05,0],inside);const lid=s.box([w,d*0.18,h],[0,d+0.27,-h*0.61],body);lid.rotation.x=-0.85;const lining=s.box([w*0.9,0.025,h*0.88],[0,d+0.29,-h*0.6],inside);lining.rotation.x=-0.85;
      if(a.packing==='clothes'){for(let i=0;i<3;i++)s.box([w*0.58,0.025,h*0.24],[-w*0.12,d+0.08+i*0.024,-h*0.12],s.material(['#9baba2','#d4c5a3','#a88477'][i]));for(const x of [w*0.2,w*0.34])s.ball([0.045,0.028,0.12],[x,d+0.095,h*0.17],edge,12);}
      if(a.packing==='souvenirs'){s.box([0.17,0.035,0.23],[-w*0.15,d+0.09,0],edge);for(let i=0;i<3;i++){const card=s.box([0.12,0.003,0.08],[w*0.18,d+0.072+i*0.003,h*0.11],s.material(i%2?'#c4b075':'#829e9d'));card.rotation.y=i*0.15;}s.box([0.14,0.065,0.045],[w*0.19,d+0.1,-h*0.2],steel);s.cylinder(0.034,0.034,0.022,[w*0.19,d+0.1,-h*0.2+0.035],edge,16).rotation.x=Math.PI/2;}}
    const front=flat?h/2+0.01:d/2+0.01;
    if(a.style==='vintage')for(const x of [-w*0.31,w*0.31]){s.box([0.035,flat?d+0.02:h+0.02,flat?h+0.02:d+0.02],[x,by,0],edge);s.box([0.055,0.055,0.007],[x,by,front+0.016],steel);}
    if(a.style==='roller')for(let i=0;i<7;i++)s.box([0.012,flat?d:h*0.9,0.018],[(i-3)*w*0.115,by,front],inside);
    for(const x of [-w/2,w/2])for(const yy of flat?[0.04,d]:[0.07,h])s.ball([0.035,0.032,0.02],[x,yy,front],edge,8);
    const hy=flat?d+0.06:h+0.065;s.tube([[-0.07,hy,0],[-0.065,hy+0.05,0],[0.065,hy+0.05,0],[0.07,hy,0]],0.014,edge);
    if(a.style==='roller'){for(const x of [-w*0.32,w*0.32])s.cylinder(0.035,0.035,0.032,[x,0.038,-d*0.37],edge,12).rotation.z=Math.PI/2;if(a.handle&&a.position==='standing'){for(const x of [-0.08,0.08])s.rod([x,h,-d*0.35],[x,h+0.38,-d*0.35],0.009,steel);s.rod([-0.085,h+0.38,-d*0.35],[0.085,h+0.38,-d*0.35],0.018,edge);}}
    s.tube([[0.065,hy+0.03,0],[0.12,hy-0.02,front],[0.08,hy-0.11,front]],0.002,edge);s.box([0.13,0.09,0.006],[0.08,hy-0.14,front+0.005],inside);s.label({home:'HOME',coast:'THE COAST',nowhere:'NOWHERE YET',return:'RETURN TO SENDER'}[a.tag],0.12,0.06,[0.08,hy-0.14,front+0.01]);
    if(a.stickers)for(let i=0;i<3;i++){const label=s.label(['PARIS','PACIFIC','07'][i],0.12,0.075,[(i-1)*w*0.23,by+(flat?0:h*0.2),front+0.014],'#f0e7ce',['#8d6d57','#688c87','#ad9061'][i]);label.rotation.z=(context.random()-0.5)*0.28;}
    return s.finish();
  },
});

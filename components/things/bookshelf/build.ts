import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    silhouette: choice('What form is the bookcase?', {tall:'A tall narrow upright bookcase.', low:'A long low bookcase.', ladder:'A ladder shelf leaning backward.'}),
    material: choice('What is its frame material?', {oak:'Pale oak timber.', walnut:'Dark walnut timber.', painted:'Muted blue painted wood.'}),
    collection: choice('What is the main collection?', {books:'Mixed books with cloth and paper spines.', records:'Albums and music scores.', archive:'Numbered archival boxes and notebooks.'}),
    order: choice('How is the collection arranged?', {upright:'Books neatly upright in rows.', stacked:'Small horizontal book piles.', leaning:'Loose books leaning against each other.'}),
    bookends: noul('Are there sculptural metal bookends?'),
    objects: choice('What personal object rests on a shelf?', {none:'No ornament.', globe:'A small globe.', photograph:'A framed photograph.', plant:'A trailing plant in a clay pot.'}),
    ladder: noul('Does a little library ladder lean against the shelves?'),
    breadth: score('How wide is the bookcase?', ['A slim private collection', 'A broad wall of collected volumes']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=(a.silhouette==='low'?1.5:0.7)+a.breadth*0.85,h=a.silhouette==='low'?0.9:1.9,depth=a.silhouette==='ladder'?0.4:0.31,wood=s.material({oak:'#b4a075',walnut:'#806b4d',painted:'#718d99'}[a.material]),dark=s.material('#556251'),cream=s.material('#dfd6b9'),levels=a.silhouette==='low'?3:5;
    for(const x of [-w/2,w/2]){if(a.silhouette==='ladder')s.rod([x,0,0.15],[x,h,-0.1],0.031,wood);else s.box([0.044,h,depth],[x,h/2,0],wood);}if(a.silhouette!=='ladder')s.box([w,h,0.02],[0,h/2,-depth/2],wood);
    const colors=['#a96753','#708983','#b9a068','#778a9c','#968375'].map(c=>s.material(c));
    for(let row=0;row<levels;row++){const y=0.07+row*(h-0.18)/(levels-1),z=a.silhouette==='ladder'?-row*0.05+0.05:0;s.box([w,0.034,depth],[0,y,z],wood);if(row===levels-1)continue;const count=Math.floor(w/0.09);for(let i=0;i<count;i++){if(context.random()>0.61+context.mood.density*0.36)continue;const x=-w/2+0.07+i*(w-0.14)/(count-1),bh=a.collection==='archive'?0.21:0.21+context.random()*0.1,bw=a.collection==='archive'?0.072:0.034+context.random()*0.025;
      if(a.order==='stacked'){if(i%3!==0)continue;for(let j=0;j<4;j++)s.box([0.18,0.033,0.21],[x,y+0.04+j*0.033,z+0.025],colors[(i+j+row)%5]);}else{const book=s.box([bw,bh,a.collection==='records'?0.27:0.21],[x,y+0.022+bh/2,z+0.017],colors[(i+row)%5]);if(a.order==='leaning')book.rotation.z=(context.random()-0.5)*0.18;s.box([bw*0.65,0.012,0.003],[x,y+bh*0.75,z+0.128],cream);}}
      if(a.bookends)for(const x of [-w*0.39,w*0.39])s.box([0.016,0.2,0.2],[x,y+0.11,z],dark);
    }
    const oy=h*0.51;
    if(a.objects==='globe'){s.cylinder(0.07,0.09,0.015,[0.15,oy+0.025,0.13],wood);s.rod([0.15,oy+0.04,0.13],[0.15,oy+0.11,0.13],0.01,dark);s.ball([0.096,0.096,0.096],[0.15,oy+0.19,0.13],s.material('#83a49e'),16);s.ring(0.104,0.006,[0.15,oy+0.19,0.13],dark).rotation.z=0.3;}
    if(a.objects==='photograph'){s.box([0.16,0.21,0.024],[-0.15,oy+0.12,0.145],wood);s.box([0.125,0.17,0.006],[-0.15,oy+0.12,0.163],s.material('#9cafa1'));s.ball([0.025,0.035,0.003],[-0.15,oy+0.13,0.168],cream,10);}
    if(a.objects==='plant'){s.cylinder(0.07,0.046,0.1,[0.15,oy+0.065,0.12],s.material('#b37c52'),14);for(let i=0;i<5;i++)s.ball([0.027,0.035,0.035],[0.15+Math.sin(i)*0.09,oy+0.15-i*0.035,0.15+i*0.025],s.material('#66856d'),10);}
    if(a.ladder){const x=-w*0.42;for(const dx of [-0.13,0.13])s.rod([x+dx,0,0.68],[x+dx,h*0.9,0.03],0.019,wood);for(let i=0;i<6;i++)s.rod([x-0.13,0.18+i*h*0.12,0.6-i*0.085],[x+0.13,0.18+i*h*0.12,0.6-i*0.085],0.015,wood);}
    return s.finish();
  },
});

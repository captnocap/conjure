import * as THREE from 'three';
import { Sculpture, choice, score, noul, mix, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {

    stock: choice('What does this shelf sell?', {snacks:'Bright crinkled bags of crisps and sweets.', drinks:'Bottles and cans in cool colours.', pantry:'Tins, cereal boxes and dry goods.', hardware:'Boxes of bulbs, batteries and repair supplies.', strange:'Unfamiliar violet jars and mysterious numbered cartons.'}),
    layout: choice('What form is the shelving?', {gondola:'Four shelves on a supermarket gondola.', endcap:'A narrow freestanding endcap.', crates:'A low timber crate display.'}),
    sign: choice('What is the shelf heading?', {essentials:'EVERYDAY ESSENTIALS', special:'THIS WEEK', local:'LOCAL FAVOURITES', supplies:'SUPPLIES'}),

  },
  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;

    const width=a.layout==='endcap'?0.95:1.8, levels=a.layout==='crates'?2:4;
    const frame=s.material(a.layout==='crates'?'#a48b66':'#c4c5b9',{metalness:a.layout==='crates'?0:0.3}),lip=s.material('#9b6450');
    s.box([width,levels*0.42+0.3,0.06],[0,(levels*0.42+0.3)/2,-0.3],frame);
    for(const x of [-width/2,width/2])s.box([0.07,levels*0.42+0.3,0.68],[x,(levels*0.42+0.3)/2,0],frame);
    const paints=['#c87448','#c6b46b','#719184','#7694a6','#a47a8d'].map(c=>s.material(c));
    for(let row=0;row<levels;row++){const y=0.13+row*0.42;s.box([width,0.045,0.68],[0,y,0],frame);s.box([width,0.065,0.035],[0,y+0.01,0.36],lip);
      const n=a.layout==='endcap'?4:7;
      for(let i=0;i<n;i++){if(random()>0.58+mood.density*0.4)continue;const x=-width/2+0.14+i*(width-0.28)/(n-1),z=0.08+(random()-0.5)*0.08,h=0.21+random()*0.08,mat=paints[(row+i)%5];
        if(a.stock==='drinks'||a.stock==='strange'){s.cylinder(0.07,0.07,h,[x,y+0.03+h/2,z],mat,12);s.cylinder(0.033,0.033,0.06,[x,y+h+0.05,z],frame,10);}
        else {const pack=s.box([a.stock==='snacks'?0.18:0.16,h,0.16],[x,y+0.03+h/2,z],mat);pack.rotation.z=(random()-0.5)*0.09;}
        s.box([0.09,0.07,0.005],[x,y+0.18,z+0.086],s.material('#e6dfc6'));
      }
      s.label('1.99   2.49   3.50',width*0.86,0.046,[0,y+0.006,0.381]);
    }
    s.label({essentials:'EVERYDAY ESSENTIALS',special:'THIS WEEK',local:'LOCAL FAVOURITES',supplies:'SUPPLIES'}[a.sign],width,0.2,[0,levels*0.42+0.22,-0.24]);

    return s.finish();
  },
});

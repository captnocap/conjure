import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    silhouette: choice('What is the sign silhouette?', {starburst:'A broad mid-century starburst on a tall pole.', blade:'A narrow vertical MOTEL blade with an arrow.', marquee:'A rectangular roof-style marquee between two posts.'}),
    name: choice('What is the motel name?', {moon:'BLUE MOON', palms:'TWIN PALMS', comet:'COMET INN', sleep:'SLEEP EASY'}),
    colour: choice('What are the main sign colours?', {teal:'Teal, ivory and coral.', blue:'Deep blue, cream and yellow.', red:'Red, cream and dark brown.'}),
    vacancy: choice('What does the vacancy panel say?', {yes:'VACANCY', no:'NO VACANCY', last:'ONE ROOM LEFT'}),
    arrow: choice('Which way does the arrow point?', {left:'A bent arrow pointing left.', right:'An arrow pointing right.', down:'An arrow pointing down at the entrance.'}),
    bulbs: noul('Are rows of individual bulbs visible around its edge?'),
    rate: choice('What is on the lower rate panel?', {cheap:'ROOMS $29', pool:'POOL / CABLE TV', weekly:'WEEKLY RATES', welcome:'TRAVELLERS WELCOME'}),
    height: score('How tall is this roadside sign?', ['A small courtyard sign', 'A tall landmark above the highway']),
  },
  build(a, context) {

    const s=new Sculpture(context),h=2.4+a.height*3.2,w=a.silhouette==='blade'?0.82:2.5,colors={teal:['#447f7d','#c87965'],blue:['#486781','#c6a752'],red:['#a65646','#795c43']}[a.colour],body=s.material(colors[0],{metalness:0.25}),trim=s.material(colors[1]),cream=s.material('#e9e0bf'),steel=s.material('#8d9d93',{metalness:0.6}),lit=s.material('#e7d994',{emissive:'#dec67a',emissiveIntensity:0.35+context.mood.energy*0.4});
    for(const x of a.silhouette==='marquee'?[-w*0.41,w*0.41]:[0]){s.box([0.55,0.12,0.58],[x,0.06,0],steel);s.rod([x,0.1,0],[x,h-0.3,0],0.065,steel);}
    const sy=h-0.7,sh=a.silhouette==='blade'?1.85:1.1;s.box([w+0.13,sh+0.13,0.22],[0,sy,0],trim);s.box([w,sh,0.245],[0,sy,0],body);
    if(a.silhouette==='starburst')for(let i=0;i<10;i++){const angle=i*Math.PI*2/10;s.rod([Math.sin(angle)*w*0.39,sy+Math.cos(angle)*0.4,0],[Math.sin(angle)*w*0.66,sy+Math.cos(angle)*0.82,0],0.07,trim,0.005);}
    if(a.silhouette==='blade'){for(let i=0;i<5;i++)s.label('MOTEL'[i],0.62,0.27,[0,sy+0.6-i*0.31,0.13],'#eee2bb',colors[0]);s.label({moon:'BLUE MOON',palms:'TWIN PALMS',comet:'COMET INN',sleep:'SLEEP EASY'}[a.name],1.3,0.2,[0,sy+1.13,0.13]);}
    else{s.label({moon:'BLUE MOON',palms:'TWIN PALMS',comet:'COMET INN',sleep:'SLEEP EASY'}[a.name],w*0.9,0.35,[0,sy+0.18,0.132],'#ede0b6',colors[0]);s.label('MOTEL',w*0.83,0.34,[0,sy-0.24,0.134],'#e4c57c',colors[0]);}
    s.box([1.47,0.38,0.18],[0,sy-sh/2-0.36,0],trim);s.label({yes:'VACANCY',no:'NO VACANCY',last:'ONE ROOM LEFT'}[a.vacancy],1.33,0.23,[0,sy-sh/2-0.36,0.1],a.vacancy==='no'?'#b9a489':'#eee0a1','#526253');
    s.box([1.77,0.4,0.14],[0,Math.max(0.65,sy-sh/2-0.86),0],cream);s.label({cheap:'ROOMS $29',pool:'POOL / CABLE TV',weekly:'WEEKLY RATES',welcome:'TRAVELLERS WELCOME'}[a.rate],1.61,0.23,[0,Math.max(0.65,sy-sh/2-0.86),0.08]);
    const ax=a.arrow==='left'?-1:a.arrow==='right'?1:0,ay=a.arrow==='down'?-0.55:0;const cy=sy-0.4; s.rod([0.1,cy,0.2],[ax*1.7,cy+ay,0.2],0.055,lit);if(a.arrow==='down'){s.rod([0,cy+ay,0.2],[-0.22,cy+ay+0.28,0.2],0.055,lit);s.rod([0,cy+ay,0.2],[0.22,cy+ay+0.28,0.2],0.055,lit);}else{for(const dy of [-0.23,0.23])s.rod([ax*1.7,cy,0.2],[ax*1.4,cy+dy,0.2],0.055,lit);}
    if(a.bulbs){const points=[];for(let i=0;i<14;i++)for(const dy of [-sh/2,sh/2])points.push({at:[-w/2+i*w/13,sy+dy,0.15] as const,size:0.028});s.scatter(new THREE.SphereGeometry(1,8,6),lit,points);}
    s.label('OFFICE',0.42,0.14,[0,0.52,0.085]);
    return s.finish({footprint:a.silhouette==='marquee'?1.2:0.45});
  },
});

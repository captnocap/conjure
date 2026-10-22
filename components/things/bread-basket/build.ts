import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    form: choice('What is the basket shape?', {oval:'A shallow oval serving basket.', round:'A round woven bread basket.', hamper:'A deeper rectangular bakery hamper.'}),
    weave: choice('What is it woven from?', {willow:'Golden willow strands.', dark:'Dark stained wicker.', pale:'Pale reed.'}),
    bread: choice('What kind of bread fills it?', {baguettes:'Long crusty baguettes.', rolls:'Round seeded rolls.', mixed:'A boule, small rolls and a sliced loaf.', pastries:'Croissants and spiral pastries.'}),
    liner: choice('What cloth lines the basket?', {none:'No cloth liner.', cream:'Plain cream linen.', red:'A red checked cloth.', blue:'A blue striped cloth.'}),
    handle: choice('What kind of handle does it have?', {none:'No handle.', sides:'Two little side handles.', arch:'One broad carrying arch.'}),
    card: choice('What does the little card say?', {none:'No card.', fresh:'FRESH TODAY', share:'PLEASE HELP YOURSELF', home:'HOMEMADE'}),
    knife: noul('Does a bread knife lie beside the basket?'),
    size: score('How large is the basket?', ['A small basket for one breakfast', 'A generous basket for a shared table']),
  },
  build(a, context) {

    const s=new Sculpture(context),w=0.31+a.size*0.25,d=a.form==='round'?w:w*0.7,h=a.form==='hamper'?0.19:0.11,color={willow:'#b39a63',dark:'#8e744a',pale:'#c9b789'}[a.weave],wicker=s.material(color),shadow=s.material('#8d754b'),bread=s.material('#c8a364'),cut=s.material('#e0ca92');
    s.box([w*0.8,0.015,d*0.8],[0,0.015,0],wicker);
    for(let row=0;row<8;row++){const frac=row/7,ww=w*(0.77+frac*0.23),dd=d*(0.77+frac*0.23),y=0.02+frac*h;if(a.form==='hamper'){for(const z of [-dd/2,dd/2])s.rod([-ww/2,y,z],[ww/2,y,z],0.005,wicker);for(const x of [-ww/2,ww/2])s.rod([x,y,-dd/2],[x,y,dd/2],0.005,wicker);}else{const ring=s.ring(1,0.015,[0,y,0],wicker);ring.rotation.x=Math.PI/2;ring.scale.set(ww/2,dd/2,0.3);}}
    for(let i=0;i<18;i++){const phi=i*Math.PI*2/18;s.rod([Math.sin(phi)*w*0.38,0.025,Math.cos(phi)*d*0.38],[Math.sin(phi)*w*0.5,h+0.02,Math.cos(phi)*d*0.5],0.004,shadow);}
    if(a.liner!=='none'){const cloth=s.material(a.liner==='blue'?'#829da7':a.liner==='red'?'#b46f5e':'#e2d6b6');s.box([w*0.88,0.013,d*0.84],[0,0.034,0],cloth);s.box([w*0.4,0.05,0.012],[w*0.15,h-0.005,d*0.51],cloth);}
    const count=3+Math.floor(context.mood.density*4);
    for(let i=0;i<count;i++){const x=(context.random()-0.5)*w*0.65,z=(context.random()-0.5)*d*0.55,y=h*0.5+0.045;if(a.bread==='baguettes'){const loaf=s.ball([0.034,0.035,w*0.42],[x,y,z],bread,16);loaf.rotation.y=(context.random()-0.5)*0.35;for(let j=0;j<4;j++)s.rod([x-0.022,y+0.03,z-w*0.24+j*w*0.13],[x+0.017,y+0.035,z-w*0.2+j*w*0.13],0.003,cut);}else if(a.bread==='pastries'){const roll=s.ring(0.036,0.015,[x,y,z],bread,Math.PI*1.65);roll.rotation.x=Math.PI/2;roll.rotation.y=context.random()*0.2;}else{s.ball([0.049,0.044,0.045],[x,y,z],bread,16);s.rod([x-0.024,y+0.04,z],[x+0.024,y+0.04,z],0.003,cut);for(let j=0;j<5;j++)s.ball([0.002,0.001,0.003],[x+(context.random()-0.5)*0.05,y+0.039,z+(context.random()-0.5)*0.04],cut,6);}}
    if(a.bread==='mixed'){s.ball([w*0.17,0.075,d*0.2],[0,0.12,0],bread,20);s.rod([-w*0.11,0.183,0],[w*0.11,0.183,0],0.004,cut);}
    if(a.handle==='sides')for(const x of [-w*0.51,w*0.51])s.tube([[x,h*0.6,-0.04],[x,h+0.085,-0.03],[x,h+0.085,0.03],[x,h*0.6,0.04]],0.006,wicker);
    if(a.handle==='arch')s.tube([[-w*0.48,h,0],[-w*0.42,h+0.2,0],[0,h+0.28,0],[w*0.42,h+0.2,0],[w*0.48,h,0]],0.011,wicker);
    if(a.card!=='none'){s.box([0.16,0.065,0.006],[0,h+0.045,d*0.4],cut);s.label({fresh:'FRESH TODAY',share:'HELP YOURSELF',home:'HOMEMADE'}[a.card],0.15,0.05,[0,h+0.045,d*0.4+0.005]);}
    if(a.knife){s.rod([w*0.57,0.011,-d*0.34],[w*0.57,0.011,-d*0.01],0.012,shadow);s.box([0.023,0.008,d*0.43],[w*0.57,0.012,d*0.2],s.material('#abb6a7',{metalness:0.65}));}
    return s.finish();
  },
});

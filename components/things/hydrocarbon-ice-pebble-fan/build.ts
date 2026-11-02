import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({
  questions:{
    plan: choice('What is the deposit plan?', {'delta': 'A broad triangular delta spreading from a throat.', 'radial': 'A nearly circular radial fan.', 'fingers': 'Three narrow fingers of gravel.', 'channel': 'One long bar inside a shallow channel.'}),
    clasts: choice('What shapes do the ice cobbles have?', {'round': 'Rounded smooth river cobbles.', 'angular': 'Fresh angular broken blocks.', 'flat': 'Flattened disk-like stones.', 'mixed': 'A mixture of rounded and broken clasts.'}),
    grading: choice('How are sizes sorted?', {'coarse': 'Large cobbles gather at the inlet.', 'reverse': 'A coarse fringe lies along the outer toe.', 'bands': 'Alternating coarse and fine bands.', 'unsorted': 'Large and small clasts are mixed throughout.'}),
    rills: choice('How do channels divide the deposit?', {'single': 'One dark central rill.', 'braided': 'Three intertwining rills.', 'diverging': 'Channels diverge from the head of the fan.', 'abandoned': 'Only pale abandoned channel scars remain.'}),
    bars: choice('What ridges break the surface?', {'low': 'Two low transverse bars.', 'crescent': 'Three crescent shaped gravel ridges.', 'islands': 'Small isolated raised gravel islands.', 'none': 'A smooth fan without raised bars.'}),
    matrix: choice('What fills the spaces between stones?', {'sand': 'Pale fine sandy grains.', 'mud': 'Dark fine sediment between pale cobbles.', 'frost': 'A bright frost-like coating around the stones.', 'bare': 'A smooth exposed substrate.'}),
    stage: choice('What flow history is visible?', {'fresh': 'Wet dark channels still pass through fresh sediment.', 'dry': 'Dry channel beds cut the deposit.', 'flooded': 'A thin dark water sheet covers the toe.', 'eroded': 'A new channel cuts through older bars.'}),
    margin: choice('How does the fan meet its surroundings?', {'smooth': 'A soft thin margin merges into the ground.', 'scarp': 'An abrupt low erosion scarp.', 'boulders': 'A few large isolated blocks mark its edge.', 'cracked': 'Polygon cracks surround the outer edge.'}),
    scale: score('How wide is the ice cobble fan?', ['Compact', 'Medium sized', 'Broad and substantial']),
  },
  build(a,context){
    const s=new Sculpture(context),rnd=context.random;
    const size=0.8+a.scale*1.1,base=s.material(a.matrix==='mud'?'#6f7568':a.matrix==='frost'?'#d1ccb5':'#a7a38b'),ice=s.material('#c5c7b7'),dark=s.material('#3d5450',{roughness:0.3});
    const pad=s.cylinder(size,size*0.92,0.08,[0,0.04,0],base,48);pad.scale.z=a.plan==='channel'?1.5:0.85;
    const points:{at:[number,number,number],size:number,color:string}[]=[];
    for(let i=0;i<150+Math.round(context.mood.density*100);i++){
      const u=rnd(),v=rnd();let x:number,z:number;
      if(a.plan==='radial'){const t=u*Math.PI*2,r=Math.sqrt(v)*size*0.93;x=Math.cos(t)*r;z=Math.sin(t)*r*0.85;}
      else {z=(u-0.5)*size*1.65;const spread=a.plan==='channel'?size*0.25:a.plan==='fingers'?size*(0.12+u*0.22):size*(0.07+u*0.84);x=(v-0.5)*2*spread;if(a.plan==='fingers')x+=(i%3-1)*size*0.45*u;}
      const f=a.grading==='coarse'?1-u:a.grading==='reverse'?u:a.grading==='bands'?(Math.sin(u*20)+1)/2:rnd();
      points.push({at:[x,0.09,z],size:0.026+f*0.08,color:i%3?'#c6c5b2':'#a6b0a4'});
    }
    const geometry=a.clasts==='round'?new THREE.SphereGeometry(1,10,7):a.clasts==='angular'?new THREE.IcosahedronGeometry(1,0):new THREE.DodecahedronGeometry(1,0);
    if(a.clasts==='flat')geometry.scale(1,0.35,1);else geometry.scale(1,0.62,0.85);
    s.scatter(geometry,ice,points);
    const count=a.rills==='single'?1:3;
    for(let j=0;j<count;j++){const pts:[number,number,number][]=[];for(let k=0;k<18;k++){const u=k/17,z=(u-0.5)*size*1.8;const x=a.rills==='diverging'?(j-1)*u*size*0.55:Math.sin(u*8+j)*size*0.12+(j-(count-1)/2)*size*0.3;pts.push([x,0.095,z]);}const rill=s.tube(pts,a.stage==='eroded'?0.055:0.024,a.rills==='abandoned'||a.stage==='dry'?s.material('#8a8f7a'):dark);rill.scale.y=0.2;rill.position.y=0.08;}
    if(a.bars==='low')for(const z of [-0.2,0.35])s.ball([size*0.65,0.07,0.09],[0,0.095,z*size],ice,16);
    if(a.bars==='crescent')for(let j=0;j<3;j++){const p:[number,number,number][]=[];for(let k=0;k<20;k++){const t=-1.1+k/19*2.2;p.push([Math.sin(t)*size*(0.4+j*0.18),0.11,Math.cos(t)*size*(0.4+j*0.18)-size*0.45]);}s.tube(p,0.035,ice);}
    if(a.bars==='islands')for(let j=0;j<4;j++)s.ball([0.16,0.09,0.22],[(j%2-0.5)*size,0.1,(Math.floor(j/2)-0.5)*size],ice,12);
    if(a.stage==='flooded'){const pool=s.cylinder(size*0.82,size*0.82,0.012,[0,0.11,size*0.3],dark,32);pool.scale.z=0.52;}
    if(a.margin==='scarp')s.box([size*1.35,0.12,0.09],[0,0.06,size*0.78],s.material('#827b62'));
    if(a.margin==='boulders')for(let j=0;j<5;j++){const t=j/5*Math.PI*2;s.ball([0.13,0.09,0.12],[Math.cos(t)*size*0.91,0.12,Math.sin(t)*size*0.79],ice,9);}
    if(a.margin==='cracked')for(let j=0;j<9;j++){const t=j/9*Math.PI*2;s.rod([Math.cos(t)*size*0.8,0.083,Math.sin(t)*size*0.7],[Math.cos(t+0.1)*size,0.083,Math.sin(t+0.1)*size*0.85],0.008,dark);}
    if(a.clasts==='mixed')for(let j=0;j<5;j++){const rock=s.mesh(new THREE.IcosahedronGeometry(0.12),ice,[(rnd()-0.5)*size,0.12,(rnd()-0.5)*size]);rock.rotation.y=rnd()*3;}

    return s.finish();
  },
});

import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions:{
    housing:choice('What kind of light-table housing is it?',{wood:'A deep oak cabinet.',steel:'A brushed steel inspection box.',cream:'A cream enamel desktop viewer.',black:'A black technical light table.'}),
    arrangement:choice('How are the film strips laid out?',{parallel:'Three parallel rows of frames.',crossed:'Two strips cross diagonally.',contact:'A grid of individual slide frames.',single:'One long strip crosses the centre.'}),
    image:choice('What kind of images are in the frames?',{landscape:'Tiny hills and a pale sky.',portrait:'Bust-like portrait silhouettes.',architecture:'Blocky buildings and a roofline.',abstract:'High contrast calibration bars.'}),
    stock:choice('What colour is the photographic stock?',{sepia:'Amber film and warm shadows.',negative:'Blue-green negatives with pale subjects.',mono:'Silver black-and-white frames.',red:'Red-stained damaged stock.'}),
    lamp:choice('How is the light table powered?',{on:'The whole viewing surface glows.',half:'Only the left half of the diffuser glows.',off:'The diffuser is unlit and grey.',warm:'A warm yellow lamp glows through the diffuser.'}),
    loupe:choice('How is the magnifier arranged?',{none:'No magnifier.',cup:'A black cup-shaped loupe sits on the film.',arm:'A magnifier on an articulated arm hovers over it.',pair:'Two different magnifiers wait beside the table.'}),
    damage:choice('What needs attention on the film?',{clean:'The strip is clean and continuous.',tear:'A diagonal missing corner interrupts one frame.',tape:'Pale joining tape crosses the strip.',scratch:'Pale scratches run through the images.'}),
    tilt:score('How steeply does the viewing panel slope?',['Nearly flat','Gently sloped','Steeply inclined']),
    ruler:noul('Is a metal measuring ruler aligned along the viewing panel?'),
    annotation:choice('What annotations surround the work?',{none:'No annotations.',arrows:'Red arrows point toward suspect frames.',numbers:'Frame numbers are written beside the strip.',reject:'A red RECHECK card rests along the edge.'}),
  },
  build(a,context){
    const s=new Sculpture(context),color={wood:'#92714d',steel:'#b7bdb8',cream:'#d4c9ad',black:'#303835'}[a.housing],body=s.material(color,{metalness:a.housing==='steel'?0.7:0.1,roughness:0.4+context.mood.wear*0.3}),black=s.material('#303b37'),silver=s.material('#b9bdb6',{metalness:0.8}),red=s.material('#a33e2a');
    const h=0.07+a.tilt*0.1,top=(z:number)=>0.06+(-z+0.19)/0.38*h;
    s.box([0.57,0.055,0.43],[0,0.029,0],body);s.box([0.57,h,0.035],[0,0.056+h/2,-0.2],body);
    const lamp=s.material(a.lamp==='off'?'#9ea99a':a.lamp==='warm'?'#e6d29c':'#dbebce',{emissive:a.lamp==='warm'?'#d6bd75':'#d5e9ce',emissiveIntensity:a.lamp==='off'?0:0.7});
    s.surface((u,v,t)=>{const z=(v-0.5)*0.38;t.set((u-0.5)*0.52,top(z),z);},lamp,{segments:[1,1],flip:true});
    for(const x of [-0.272,0.272])s.rod([x,top(0.19),0.19],[x,top(-0.19),-0.19],0.012,body);
    if(a.lamp==='half')s.surface((u,v,t)=>{const z=(v-0.5)*0.36;t.set(0.01+u*0.24,top(z)+0.001,z);},s.material('#929b8c'),{segments:[1,1],flip:true});
    const film=s.material({sepia:'#7d5738',negative:'#547e78',mono:'#3c4845',red:'#965347'}[a.stock]),light=s.material(a.stock==='negative'?'#dccead':'#c9c0a0');
    const strips=a.arrangement==='single'?1:a.arrangement==='crossed'?2:3;
    for(let row=0;row<strips;row++)for(let col=0;col<5;col++){
      const x=(col-2)*0.087,z=a.arrangement==='crossed'?(col-2)*0.034*(row?1:-1):(row-(strips-1)/2)*0.102,y=top(z)+0.004;
      if(a.damage==='tear'&&row===0&&col===2)continue;
      s.box([0.083,0.003,0.072],[x,y,z],film).rotation.x=Math.atan(h/0.38);
      s.box([0.067,0.003,0.048],[x,y+0.004,z],light).rotation.x=Math.atan(h/0.38);
      if(a.arrangement==='contact')for(const edge of [-1,1])s.box([0.006,0.006,0.074],[x+edge*0.041,y+0.004,z],body);
      for(const edge of [-1,1])for(let p=0;p<3;p++)s.box([0.008,0.003,0.005],[x+(p-1)*0.024,top(z+edge*0.029)+0.01,z+edge*0.029],lamp);
      const fz=z+0.007;
      if(a.image==='portrait'){s.ball([0.011,0.002,0.014],[x,top(z)+0.012,z-0.009],film,10);s.ball([0.021,0.002,0.013],[x,top(fz)+0.012,fz],film,10);}
      if(a.image==='architecture')for(let j=0;j<3;j++)s.box([0.013,0.002,0.013+j*0.005],[x+(j-1)*0.018,top(fz)+0.012,fz],film);
      if(a.image==='landscape'){s.box([0.062,0.002,0.017],[x,top(fz)+0.012,fz],film);s.ball([0.025,0.002,0.011],[x-0.008,top(z)+0.012,z],film,10);}
      if(a.image==='abstract')for(let j=0;j<5;j++)s.box([0.005,0.002,0.04],[x+(j-2)*0.01,top(z)+0.012,z],film);
      if(a.damage==='scratch')s.box([0.065,0.002,0.002],[x,top(z)+0.016,z],lamp);
      if(a.damage==='tape'&&col===2)s.box([0.015,0.002,0.085],[x,top(z)+0.02,z],s.material('#ded2aa'));
    }
    const loupe=(x:number,z:number,r:number)=>{const y=top(z);s.cylinder(r,r*1.2,0.04,[x,y+0.025,z],black,20);s.ring(r*0.7,0.003,[x,y+0.048,z],silver).rotation.x=Math.PI/2;};
    if(a.loupe==='cup'||a.loupe==='pair')loupe(0.13,0.03,0.025);if(a.loupe==='pair')loupe(-0.16,-0.1,0.018);
    if(a.loupe==='arm'){s.rod([-0.26,0.07,0.13],[-0.28,0.26,0.1],0.007,silver);s.rod([-0.28,0.26,0.1],[-0.1,0.25,0.03],0.007,silver);s.ring(0.05,0.005,[-0.08,0.25,0.03],black).rotation.x=Math.PI/2;}
    if(a.ruler){s.box([0.45,0.004,0.024],[0,top(0.16)+0.008,0.16],silver);for(let j=0;j<20;j++)s.box([0.002,0.002,j%5===0?0.016:0.008],[(j-9.5)*0.021,top(0.16)+0.012,0.16],black);}
    if(a.annotation==='arrows')for(const x of [-0.15,0.1])s.rod([x,top(0.13)+0.02,0.13],[x+0.035,top(0.09)+0.02,0.09],0.003,red);
    if(a.annotation==='numbers'||a.annotation==='reject'){const note=s.label(a.annotation==='reject'?'RECHECK':'012 / 013 / 014',0.18,0.04,[0,top(-0.165)+0.01,-0.165],'#a33e2a','#e2d7b5');note.rotation.x=-Math.PI/2+Math.atan(h/0.38);}
    s.cylinder(0.012,0.012,0.008,[0.235,0.062,0.17],black,12);
    return s.finish();
  },
});

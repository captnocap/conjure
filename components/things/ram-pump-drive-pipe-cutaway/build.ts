import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    section: choice("How is the pipe opened?", {"half": "The upper half is removed along the length.", "window": "A rectangular upper inspection window.", "quarter": "One upper quadrant is removed.", "ends": "A complete tube with open ends."}),
    material: choice("How is the pipe made?", {"iron": "Thick grey cast iron.", "wood": "Bound timber staves around a dark bore.", "steel": "Thin rolled steel with raised seams.", "lined": "Iron lined with a pale ceramic sleeve."}),
    coupling: choice("What joins the pipe sections?", {"flanges": "Two wide bolted flanges.", "bands": "Two broad coupling bands.", "socket": "A deep central socket joint.", "plain": "An uninterrupted pipe barrel."}),
    supports: choice("What supports the specimen?", {"stone": "Two masonry cradles.", "timber": "Two broad timber saddles.", "steel": "A braced metal test frame.", "blocks": "Three low support blocks."}),
    water: choice("How much water fills the bore?", {"empty": "An empty dry bore.", "low": "A low shallow stream.", "half": "Water fills the lower half.", "full": "A nearly full blue water column."}),
    markers: choice("What explains the flow?", {"arrows": "Three broad arrows point along the pipe.", "ruler": "A measuring scale runs alongside.", "rings": "Three pressure stations are ringed in brass.", "none": "No markers."}),
    entry: choice("What is fitted at the upstream end?", {"plain": "A plain open pipe end.", "strainer": "A barred inlet strainer.", "flare": "A flared inlet bell.", "cap": "A removable blanking plate beside the pipe."}),
    state: choice("What is being demonstrated?", {"steady": "A smooth steady column.", "pulse": "Three brighter bands show a pressure pulse.", "air": "A visible pocket of air interrupts the water.", "sediment": "A patch of brown sediment rests in the bore."}),
    length: score("How long is the demonstration?", ["A short cutaway", "A broad teaching specimen", "A long section of drive pipe"])
  },
  build(a,context){

 const s=new Sculpture(context),iron=s.material(a.material==='steel'?'#9ba99b':'#5d7568',{metalness:.6,side:THREE.DoubleSide}),wood=s.material('#9f875d'),stone=s.material('#b3b49b'),dark=s.material('#43594d'),brass=s.material('#bda167',{metalness:.75}),L=1+a.length*1.2,r=.18,cy=.3;
 const support=a.supports==='timber'?wood:a.supports==='stone'?stone:iron;for(const x of a.supports==='blocks'?[-L*.35,0,L*.35]:[-L*.32,L*.32]){s.box([.18,cy-r,.45],[x,(cy-r)/2,0],support);for(const z of [-.14,.14])s.box([.18,.08,.06],[x,cy-r+.04,z],support);}if(a.supports==='steel')for(const z of [-.2,.2])s.rod([-L*.4,.05,z],[L*.4,.05,z],.025,iron);
 const wall=(start:number,span:number,x0:number,len:number,rad:number,mat:THREE.Material)=>s.surface((u,v,t)=>{const a=start+u*span;t.set(x0+v*len,cy+Math.cos(a)*rad,Math.sin(a)*rad);},mat,{segments:[32,24]});
 if(a.section==='window'){wall(0,Math.PI*2,-L/2,L*.18,r,iron);wall(0,Math.PI*2,L*.32,L*.18,r,iron);wall(Math.PI*.35,Math.PI*1.3,-L*.32,L*.64,r,iron);}else wall(a.section==='half'?Math.PI/2:a.section==='quarter'?Math.PI/2:0,a.section==='half'?Math.PI:a.section==='quarter'?Math.PI*1.5:Math.PI*2,-L/2,L,r,iron);
 if(a.material==='lined')wall(a.section==='ends'?0:Math.PI/2,a.section==='ends'?Math.PI*2:Math.PI,-L/2,L,r-.018,s.material('#c9c8ac',{side:THREE.DoubleSide}));if(a.material==='wood')for(let j=0;j<9;j++){const t=Math.PI/2+j*Math.PI/8;s.rod([-L/2,cy+Math.cos(t)*r,Math.sin(t)*r],[L/2,cy+Math.cos(t)*r,Math.sin(t)*r],.02,wood);}
 const ring=(x:number,rad:number)=>s.ring(rad,.018,[x,cy,0],a.material==='wood'?dark:iron).rotation.y=Math.PI/2;
 if(a.coupling==='flanges')for(const x of [-L*.28,L*.28]){ring(x,r+.035);for(let j=0;j<8;j++){const t=j*Math.PI/4;s.rod([x-.03,cy+Math.cos(t)*(r+.035),Math.sin(t)*(r+.035)],[x+.03,cy+Math.cos(t)*(r+.035),Math.sin(t)*(r+.035)],.01,brass);}}if(a.coupling==='bands')for(const x of [-L*.3,L*.3])ring(x,r+.015);if(a.coupling==='socket')for(const x of [-.07,0,.07])ring(x,r+.025);
 const level=a.water==='low'?cy-r*.7:a.water==='half'?cy:cy+r*.65;if(a.water!=='empty'){const ww=Math.sqrt(r*r-(level-cy)*(level-cy))*2;s.box([L-.04,.008,ww],[0,level,0],s.material('#85b4aa',{transparent:true,opacity:.65,depthWrite:false}));if(a.state==='pulse')for(const x of [-L*.3,0,L*.3])s.box([.045,.005,ww],[x,level+.008,0],s.material('#bed1b2'));if(a.state==='air')s.ball([L*.16,.035,.09],[L*.1,level+.012,0],s.material('#d5dfcf',{transparent:true,opacity:.5,depthWrite:false}),20);}
 if(a.markers==='ruler'){s.box([L,.015,.09],[0,.02,.37],wood);for(let j=0;j<20;j++)s.box([.004,.004,j%5===0?.07:.035],[-L*.47+j*L*.94/19,.03,.37],dark);}if(a.markers==='rings')for(const x of [-L*.3,0,L*.3])s.ring(r+.008,.008,[x,cy,0],brass).rotation.y=Math.PI/2;if(a.markers==='arrows')for(const x of [-L*.3,0,L*.3]){s.rod([x-.1,.018,-.32],[x+.1,.018,-.32],.008,brass);s.rod([x+.1,.018,-.32],[x+.04,.018,-.37],.008,brass);s.rod([x+.1,.018,-.32],[x+.04,.018,-.27],.008,brass);}
 if(a.entry==='strainer'){ring(-L/2,r);for(const z of [-.1,0,.1]){const hh=Math.sqrt(r*r-z*z);s.rod([-L/2,cy-hh,z],[-L/2,cy+hh,z],.012,iron);}}if(a.entry==='flare')s.lathe([[r,0],[r*1.5,.15],[r*1.5,.17],[r-.015,.03]],iron,[-L/2,cy,0]).rotation.z=Math.PI/2;if(a.entry==='cap')s.cylinder(r+.03,r+.03,.025,[L*.25,.0125,.45],iron,28);if(a.state==='sediment')for(let j=0;j<12;j++)s.ball([.025,.012,.024],[-L*.35+context.random()*L*.25,cy-r+.013,(context.random()-.5)*.1],wood,8);return s.finish();

  },
});

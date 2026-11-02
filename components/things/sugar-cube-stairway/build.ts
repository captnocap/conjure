import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {choice,defineThing,defineWorld,diorama,figure,mix,score,Sculpture} from '@conjure/kit';
type P=readonly [number,number,number];
function hollow(s:Sculpture,r:number,h:number,t:number,at:P,mat:THREE.Material){return s.lathe([[r-t,0],[r,0],[r,h],[r-t,h],[r-t,t]],mat,at);}
function disk(s:Sculpture,r:number,t:number,at:P,mat:THREE.Material){return s.cylinder(r,r,t,at,mat,48);}
function arc(s:Sculpture,c:P,rx:number,ry:number,start:number,end:number,t:number,mat:THREE.Material){const points:P[]=[];for(let i=0;i<=32;i++){const a=start+(end-start)*i/32;points.push([c[0]+Math.cos(a)*rx,c[1]+Math.sin(a)*ry,c[2]]);}return s.tube(points,t,mat);}
function leaf(s:Sculpture,at:P,length:number,width:number,mat:THREE.Material,arch=.16){return s.surface((u,v,p)=>{const x=(u-.5)*length,z=Math.sin(Math.PI*u)*(v-.5)*width;p.set(x,Math.sin(Math.PI*u)*arch-Math.abs(v-.5)*.08,z);},mat,{segments:[24,10],at});}
function groundNode(node:THREE.Object3D,top:number){node.updateMatrixWorld(true);node.position.y+=top-new THREE.Box3().setFromObject(node,true).min.y;node.updateMatrixWorld(true);}

export default defineThing({
 questions:{
  route:choice("How does the staircase climb?",{"straight": "A straight flight of sugar steps.", "bend": "A quarter-turn flight around a corner.", "switchback": "A folded flight that turns back at a landing.", "curve": "A broad curved flight."}),
  rise:score('How many rises make the stair?', ['Five broad rises','Seven rises','Nine rises','Eleven high rises']),
  blocks:choice("How are the sugar blocks shaped?",{"square": "Regular sharp-edged cubes.", "rounded": "Softened rounded cube corners.", "rough": "Broken and chipped cube edges.", "pressed": "Pressed blocks with indented faces."}),
  joints:choice("What joins the blocks?",{"dry": "Dry stacked blocks with tiny gaps.", "syrup": "Amber syrup seams.", "icing": "White icing mortar.", "crystals": "Sparkling crystal clusters at the joints."}),
  rail:choice("What guards the exposed side?",{"licorice": "Dark twisted licorice rails.", "spoons": "Tiny spoon-shaped balusters.", "thread": "Fine thread between wooden posts.", "bare": "Low sugar curbs without a tall rail."}),
  foot:choice("What supports the stairs?",{"saucer": "A broad porcelain saucer.", "board": "A wooden serving board.", "crumbs": "A firm slab sprinkled with crumbs.", "brick": "A low brick-built foundation."}),
  landing:choice("What stands on the top landing?",{"tray": "A small round serving tray.", "cup": "A tiny open teacup.", "garden": "A raised planter with leaves.", "empty": "A clear landing with two gateposts."}),
  support:choice("How are the rising blocks supported?",{"solid": "Solid stacks continue to the foundation.", "piers": "Paired cube piers support broad stair slabs.", "arch": "An open central arch under the top landing.", "taper": "Wide lower courses taper toward the steps."}),
  stripe:choice("What marks the stair edges?",{"rose": "Rose-coloured sugar edge blocks.", "mint": "Pale mint-green edge blocks.", "caramel": "Brown caramel edge blocks.", "white": "Plain white sugar with grey shadow seams."}),
  story:choice("What happened on the stair?",{"delivery": "A tied parcel waits at the top.", "footprints": "Small muddy prints cross the treads.", "spill": "Loose cubes and crumbs lie at the foot.", "celebrate": "A pennant stands on the top gatepost."}),
  width:score('How broad are the treads?', ['Narrow single-file steps','A small footway','A shared stair','A wide ceremonial flight'])
 },
 build(a,context){

 const s=new Sculpture(context),sugar=s.material('#eee5d0'),edge=s.material(a.stripe==='rose'?'#d6a19c':a.stripe==='mint'?'#a6bfac':a.stripe==='caramel'?'#a67b43':'#d8d2c4'),wood=s.material('#846443'),porcelain=s.material('#d7e1dc',{roughness:.25}),dark=s.material('#514535'),green=s.material('#607d50',{side:THREE.DoubleSide}),joint=s.material(a.joints==='syrup'?'#bb893e':a.joints==='icing'?'#f5eee2':'#c8c1ae');
 const count=Math.round(mix(5,11,a.rise)),unit=.16,w=mix(.28,.58,a.width),rise=.13,base=.08;const pos=(i:number):[number,number]=>{const t=i/(count-1),x=(t-.5)*count*unit;return a.route==='straight'?[x,0]:a.route==='bend'?(t<.5?[x,-.3]:[0,-.3+(t-.5)*count*unit]):a.route==='switchback'?(t<.5?[x,-.22]:[(-t+.5)*count*unit,.22]):[Math.sin((t-.5)*1.7)*count*unit*.6,Math.cos((t-.5)*1.7)*count*unit*.6-.5];};
 const pts=Array.from({length:count},(_,i)=>pos(i));const bounds=new THREE.Box2();for(const [x,z]of pts)bounds.expandByPoint(new THREE.Vector2(x,z));const c=bounds.getCenter(new THREE.Vector2()),ext=bounds.getSize(new THREE.Vector2());const fw=ext.x+w+.45,fd=ext.y+w+.45;
 if(a.foot==='saucer'){const plate=disk(s,1,.08,[c.x,.04,c.y],porcelain);plate.scale.set(fw*.55,1,fd*.55);}else{s.box([fw,.08,fd],[c.x,.04,c.y],a.foot==='board'?wood:porcelain);if(a.foot==='brick')for(let i=0;i<8;i++)s.box([fw/8-.01,.055,.15],[c.x-fw/2+(i+.5)*fw/8,.1,c.y-fd/2+.08],edge);}
 const block=(sz:P,at:P,mat:THREE.Material)=>{if(a.blocks==='rounded')return s.mesh(new RoundedBoxGeometry(sz[0],sz[1],sz[2],2,Math.min(...sz)*.12),mat,at);return s.box(sz,at,mat);};
 const railPaths:[P[],P[]]=[[],[]];
 for(let i=0;i<count;i++){const[x,z]=pts[i],top=base+(i+1)*rise,angle=i<count-1?Math.atan2(pts[i+1][1]-z,pts[i+1][0]-x):Math.atan2(z-pts[i-1][1],x-pts[i-1][0]);const slab=block([unit*1.12,.065,w],[x,top-.0325,z],sugar);slab.rotation.y=-angle;
 const columns=a.support==='solid'||a.support==='taper'?Math.max(1,Math.round(w/unit)):2;for(let col=0;col<columns;col++){const zz=(col-(columns-1)/2)*(a.support==='solid'?unit:w*.72),xx=x-Math.sin(angle)*zz,z2=z+Math.cos(angle)*zz;if(a.support==='arch'&&i>count*.62&&i<count-1)continue;for(let j=0;j<=i;j++){const wide=a.support==='taper'?unit*(1+(i-j)*.07):unit;block([wide,.13,unit*.95],[xx,base+j*rise+.065,z2],j===i?edge:sugar);if(a.joints==='syrup'||a.joints==='icing')s.box([unit*.96,.008,unit*.94],[xx,base+j*rise+.125,z2],joint);}}
 if(a.support==='arch'&&i>=count*.62){const lower=top-.065;s.rod([pts[Math.floor(count*.6)][0],base+Math.floor(count*.6)*rise,pts[Math.floor(count*.6)][1]],[x,lower,z],.035,porcelain);}
 if(a.blocks==='pressed')for(const sign of[-1,1])s.box([.05,.045,.004],[x-Math.sin(angle)*sign*w*.5,top-.03,z+Math.cos(angle)*sign*w*.5],edge).rotateY(-angle);if(a.blocks==='rough')for(let k=0;k<3;k++)s.ball([.025,.02,.025],[x+(context.random()-.5)*unit,top+.012,z+(context.random()-.5)*w],sugar,8);if(a.joints==='crystals')for(const sign of[-1,1])s.ball([.018,.018,.018],[x-Math.sin(angle)*sign*w*.5,top-.05,z+Math.cos(angle)*sign*w*.5],porcelain,6);
 for(const sign of[-1,1]){const xx=x-Math.sin(angle)*sign*w*.48,zz=z+Math.cos(angle)*sign*w*.48;railPaths[sign<0?0:1].push([xx,top+.3,zz]);if(a.rail==='bare')s.box([unit*.8,.055,.04],[xx,top+.025,zz],edge);else{s.rod([xx,top,zz],[xx,top+.3,zz],.012,a.rail==='licorice'?dark:wood);if(a.rail==='spoons')s.ball([.025,.05,.012],[xx,top+.29,zz],porcelain,12);}}
 if(a.story==='footprints')for(const sign of[-1,1])s.ball([.028,.005,.016],[x+sign*.025,top+.005,z+sign*.045],dark,8);
 }
 if(a.rail!=='bare')for(const sign of[-1,1]){const points=railPaths[sign<0?0:1];s.tube(points,a.rail==='thread'?.007:.017,a.rail==='licorice'?dark:wood);}
 const[x,z]=pts[count-1],top=base+count*rise+.04,dz=z+w*.22;s.box([unit*1.7,.04,w*1.3],[x,top-.02,z],sugar);if(a.landing==='tray')disk(s,w*.4,.025,[x,top+.0125,dz],porcelain);if(a.landing==='cup'){hollow(s,w*.2,.15,.025,[x,top,dz],porcelain);arc(s,[x+w*.22,top+.08,dz],.06,.06,-Math.PI/2,Math.PI/2,.015,porcelain);}if(a.landing==='garden'){s.box([unit*.9,.08,w*.8],[x,top+.04,dz],wood);for(let j=0;j<4;j++)leaf(s,[x+(context.random()-.5)*unit,top+.08,dz+(context.random()-.5)*w*.6],.15,.07,green,.08);}if(a.landing==='empty')for(const sign of[-1,1])s.rod([x,top,z+sign*w*.55],[x,top+.24,z+sign*w*.55],.018,wood);
 if(a.story==='delivery'){s.box([.13,.11,.13],[x,top+.055,z-w*.35],wood);s.box([.014,.115,.135],[x,top+.055,z-w*.35],porcelain);}if(a.story==='spill'||a.foot==='crumbs')for(let i=0;i<12;i++){const sz=.02+context.random()*.035;s.box([sz,sz,sz],[pts[0][0]+(context.random()-.5)*.45,.08+sz/2,pts[0][1]+(context.random()-.5)*.55],sugar);}if(a.story==='celebrate'){s.rod([x,top,z-w*.55],[x,top+.5,z-w*.55],.012,wood);const flag=s.box([.18,.11,.009],[x+.08,top+.42,z-w*.55],edge);flag.rotation.z=-.12;}
 return s.finish();

 }
});

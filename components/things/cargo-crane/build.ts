import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 type:choice('What supports the lifting crane?',{tower:'A latticed tower with a rotating horizontal boom.',dock:'A wide dock gantry on four steel legs.',mobile:'A wheeled compact crane with outriggers.'}),
 reach:score('How far does the boom reach?', ['A five-metre lifting radius','A twenty-metre lifting radius']),
 boom:choice('How is the boom set?',{level:'A nearly level horizontal boom.',raised:'A boom raised toward the sky.',folded:'A shorter steeply parked boom.'}),
 load:choice('What hangs from the hoist?',{hook:'An empty double lifting hook.',crate:'A large strapped cargo crate.',bucket:'A clamshell bulk-cargo grab bucket.'}),
 drop:score('How low does the hook hang?', ['Close below the boom','Near the ground']),
 paint:choice('What safety livery does the crane wear?',{yellow:'Muted yellow steel with dark hazard bands.',red:'Oxide red paint with cream trim.',blue:'Slate blue frame with orange control boxes.'}),
 cab:noul('Is a glazed operator cab attached?'),
},build(a,c){
 const s=new Sculpture(c),l=5+a.reach*15,h=l*.7,steel=s.material(a.paint==='yellow'?'#b8a260':a.paint==='red'?'#a96d59':'#698796'),dark=s.material('#435965'),metal=s.material('#8d9da3',{metalness:.5}),glass=s.material('#6c99a8'),wood=s.material('#ab8e65');
 if(a.type==='dock')for(const x of [-1,1])for(const z of [-1,1]){s.rod([x*l*.25,0,z*l*.18],[x*l*.25,h,z*l*.18],.16,steel);s.rod([x*l*.25,h*.1,z*l*.18],[-x*l*.25,h*.9,z*l*.18],.055,dark);}
 else if(a.type==='tower')for(const x of [-1,1])for(const z of [-1,1]){s.rod([x*.6,0,z*.6],[x*.6,h,z*.6],.1,steel);for(let j=0;j<5;j++)s.rod([x*.6,j*h/5,z*.6],[-x*.6,(j+1)*h/5,z*.6],.04,dark);}
 else{s.box([3,.5,4],[0,.65,0],dark);for(const x of [-1,1])for(const z of [-1,1]){s.rod([0,.5,z*1.2],[x*3,.25,z*1.2],.1,steel);const wheel=s.cylinder(.45,.45,.25,[x*1.35,.45,z*1.2],dark,16);wheel.rotation.z=Math.PI/2;}s.cylinder(.4,.7,h,[0,h/2+.9,0],steel);}
 const endY=h+(a.boom==='level'?.2:a.boom==='raised'?l*.5:l*.65),endX=a.boom==='folded'?l*.5:l;
 for(const z of [-.3,.3]){s.rod([-l*.28,h,z],[endX,endY,z],.08,steel);s.rod([-l*.28,h+.6,z],[endX,endY+.6,z],.08,steel);for(let i=0;i<12;i++){const q=i/12,x=-l*.28+q*(endX+l*.28),y=h+q*(endY-h);s.rod([x,y,z],[x+(endX+l*.28)/12,y+.6+(endY-h)/12,z],.035,dark);}}
 s.box([1.7,.8,1.4],[-l*.26,h+.2,0],dark);const hy=Math.max(.9,endY-(1+a.drop*(endY-1.5)));for(const z of [-.12,.12])s.rod([endX,endY,z],[endX,hy,z],.025,metal);s.ball([.2,.2,.2],[endX,hy,0],dark);
 if(a.load==='hook')s.tube([[endX,hy,0],[endX,hy-.3,0],[endX+.2,hy-.45,0],[endX+.35,hy-.2,0]],.06,metal);
 if(a.load==='crate'){for(const x of [-1,1])s.rod([endX,hy,0],[endX+x*.6,hy-.6,0],.025,dark);s.box([1.5,.9,1.3],[endX,hy-1.05,0],wood);for(const x of [-.45,.45])s.box([.08,.95,1.34],[endX+x,hy-1.05,0],dark);}
 if(a.load==='bucket'){for(const x of [-1,1]){const b=s.mesh(new THREE.SphereGeometry(.65,16,10,0,Math.PI,0,Math.PI/2),metal,[endX+x*.35,hy-.55,0]);b.rotation.z=x*.5;}}
 if(a.cab){s.box([1.15,1.25,1.3],[1,h+.5,0],steel);s.box([.03,.7,1.05],[1.59,h+.7,0],glass);s.box([.8,.7,.03],[1,h+.7,.67],glass);}
 return s.finish();}});

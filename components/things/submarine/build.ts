import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';
export default defineThing({questions:{
 purpose:choice('What kind of submarine is this?',{research:'A compact yellow research submersible with viewports.',patrol:'A long dark patrol submarine with a tall sail.',rescue:'A white rescue vehicle with manipulator arms.'}),
 length:score('How long is the vessel?', ['A five-metre coastal submersible','A sixty-metre ocean-going submarine']),
 hull:choice('How is the pressure hull shaped?',{round:'A smooth torpedo-shaped pressure hull.',segmented:'A hull broken into visible cylindrical pressure sections.',twin:'Two smaller pressure hulls under one control deck.'}),
 periscope:score('How far is the sensor mast deployed?', ['Mast folded near the sail','A fully raised observation mast']),
 windows:choice('What viewports are visible?',{single:'One large forward observation port.',row:'A row of small round side viewports.',none:'A sealed pressure hull without viewports.'}),
 propeller:choice('How is the stern driven?',{screw:'An exposed four-bladed screw.',duct:'A propeller enclosed in a protective ring.',jets:'Twin shrouded water-jet outlets.'}),
 arm:noul('Is a sampling arm extended near the bow?'),
},build(a,c){
 const s=new Sculpture(c),l=5+a.length*55,r=l*(a.purpose==='patrol'?.08:.13),y=r,body=s.material(a.purpose==='research'?'#c4ac62':a.purpose==='rescue'?'#cdd2ca':'#475965',{metalness:.3}),dark=s.material('#2d424b'),metal=s.material('#83969d',{metalness:.65}),glass=s.material('#6996a8',{metalness:.4,roughness:.2});
 if(a.hull==='twin')for(const x of [-1,1])s.ball([r*.65,r*.65,l*.5],[x*r*.7,y,0],body,32);else s.ball([r,r,l*.5],[0,y,0],body,32);
 if(a.hull==='segmented')for(let i=-2;i<=2;i++){const q=i*.18*l,rr=r*Math.sqrt(1-(q/(l*.5))**2);const band=s.ring(rr,.02*r,[0,y,q],metal);}
 s.box([r*.8,r*1.1,l*.12],[0,y+r*.8,-l*.03],body);s.ball([r*.4,r*.2,l*.06],[0,y+r*1.36,-l*.03],body);
 const mast=r*(.3+a.periscope*1.5);s.rod([0,y+r*1.4,-l*.03],[0,y+r*1.4+mast,-l*.03],r*.055,metal);s.rod([0,y+r*1.4+mast,-l*.03],[0,y+r*1.4+mast,l*.02],r*.055,metal);
 for(const z of [-l*.35,l*.08])for(const x of [-1,1]){const fin=s.box([r*1.25,r*.1,l*.07],[x*r*1.1,y,z],dark);fin.rotation.z=x*.12;}
 s.box([r*.12,r*1.8,l*.08],[0,y,-l*.4],dark);
 if(a.windows==='single'){s.ball([r*.42,r*.42,r*.08],[0,y,l*.49],glass);s.ring(r*.45,r*.06,[0,y,l*.49],metal);}
 if(a.windows==='row')for(const x of [-1,1])for(let i=0;i<5;i++){const p=s.cylinder(r*.13,r*.13,r*.025,[x*r*.92,y,l*(.24-i*.105)],glass);p.rotation.z=Math.PI/2;}
 const end=-l*.53;s.rod([0,y,-l*.4],[0,y,end],r*.08,metal);
 if(a.propeller==='jets')for(const x of [-1,1]){const jet=s.cylinder(r*.3,r*.3,l*.08,[x*r*.55,y,-l*.48],dark);jet.rotation.x=Math.PI/2;}
 else{for(let i=0;i<4;i++){const q=i*Math.PI/2,blade=s.box([r*.2,r*.85,r*.08],[Math.sin(q)*r*.4,y+Math.cos(q)*r*.4,end],metal);blade.rotation.z=-q;blade.rotation.y=.3;}if(a.propeller==='duct')s.ring(r*.91,r*.09,[0,y,end],dark);}
 if(a.arm){s.rod([r*.75,y,l*.3],[r*1.4,y*.8,l*.47],r*.06,metal);s.rod([r*1.4,y*.8,l*.47],[r*.9,.3,l*.62],r*.04,metal);for(const x of [-1,1])s.rod([r*.9,.3,l*.62],[r*.9+x*r*.1,.15,l*.64],r*.025,dark);}
 return s.finish();}});

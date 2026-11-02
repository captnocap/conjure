import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    trough: choice("What shape is the trough?", {"wood": "A timber lined rectangular trough.", "metal": "A riveted steel tank.", "round": "A rounded half pipe tank.", "stone": "A deep stone basin."}),
    stand: choice("What supports it?", {"legs": "Four trestle legs.", "skids": "Two heavy low skids.", "blocks": "Two masonry blocks.", "cart": "A wheeled service stand."}),
    splice: choice("What is exposed in the cable?", {"copper": "A bright joined copper conductor.", "wrapped": "A fresh insulating wrap.", "armour": "Splayed steel armour wires.", "cut": "Two separated cable ends."}),
    water: choice("How is the bath filled?", {"full": "Water near the rim.", "half": "A half-filled bath.", "empty": "An empty drained trough.", "buckets": "An empty bath with two water pails."}),
    ends: choice("What holds the cable ends?", {"forks": "Two tall forked cable rests.", "rollers": "Two grooved roller rests.", "clamps": "Two screw clamp blocks.", "boards": "Broad timber end boards."}),
    tools: choice("What tools lie on the shelf?", {"knife": "A cable knife and sharpening stone.", "pliers": "Two broad-jaw cable pliers.", "wrap": "Rolls of insulating wrap.", "none": "A clear tool shelf."}),
    drain: choice("Where does water leave?", {"tap": "A brass drain tap at one end.", "hose": "A bent rubber drain hose.", "plug": "A round drain plug.", "pail": "A drain tap above a pail."}),
    state: choice("What repair stage is shown?", {"joining": "The stripped ends meet over water.", "testing": "A small test lead reaches the splice.", "sealed": "A finished thick insulated joint.", "tagged": "A repair tag hangs from the end."}),
    length: score("How long is the repair bath?", ["A short bench bath", "A normal splice trough", "A long shore cable bath"])
  },
  build(a,context){

 const s=new Sculpture(context),wood=s.material('#9d8657'),metal=s.material('#788c7a',{metalness:0.55}),dark=s.material('#4c5d4d'),copper=s.material('#b48c59',{metalness:0.7}),L=1.5+a.length,by=a.stand==='skids'?0.22:0.7,m=a.trough==='wood'?wood:a.trough==='stone'?s.material('#b0b39a'):metal;
 if(a.trough==='round'){m.side=THREE.DoubleSide;s.surface((u,v,p)=>{const t=Math.PI+v*Math.PI;p.set((u-0.5)*L,by+0.3+Math.sin(t)*0.3,Math.cos(t)*0.3);},m,{segments:[20,24]});for(const x of [-L/2,L/2])s.box([0.04,0.3,0.6],[x,by+0.15,0],m);}else{s.box([L,0.06,0.65],[0,by,0],m);for(const z of [-0.32,0.32])s.box([L,0.35,0.045],[0,by+0.16,z],m);for(const x of [-L/2,L/2])s.box([0.045,0.35,0.65],[x,by+0.16,0],m);}
 for(const x of [-L*0.38,L*0.38]){if(a.stand==='blocks')s.box([0.3,by,0.65],[x,by/2,0],s.material('#a4ac94'));else for(const z of [-0.25,0.25]){s.box([0.07,by,0.07],[x,by/2,z],metal);if(a.stand==='cart')s.cylinder(0.09,0.09,0.055,[x,0.09,z],dark,20).rotation.x=Math.PI/2;}}
 if(a.water==='full'||a.water==='half')s.box([L-0.08,0.015,a.trough==='round'&&a.water==='half'?0.46:0.56],[0,by+(a.water==='full'?0.27:0.13),0],s.material('#8fae9f',{transparent:true,opacity:0.65,depthWrite:false}));
 const cy=by+0.42;for(const side of [-1,1]){const x=side*(L/2-0.1);s.box([0.1,0.4,0.1],[x,by+0.2,0],metal);if(a.ends==='rollers')s.rod([x,cy,-0.17],[x,cy,0.17],0.07,metal);else if(a.ends==='boards')s.box([0.24,0.06,0.5],[x,cy,0],wood);else for(const z of [-0.1,0.1])s.rod([x,cy-0.06,z],[x,cy+0.1,z],0.016,metal);s.rod([side*(L/2+0.3),cy+0.05,0],[side*0.25,cy+0.05,0],0.055,dark);}
 const join=a.state==='sealed'||a.splice==='wrapped';if(a.splice!=='cut'||join)s.rod([-0.3,cy+0.05,0],[0.3,cy+0.05,0],join?0.07:0.012,join?wood:copper);if(a.splice==='armour')for(const side of [-1,1])for(let j=0;j<7;j++){const t=j*Math.PI*2/7;s.rod([side*0.28,cy+0.05+Math.cos(t)*0.05,Math.sin(t)*0.05],[side*0.08,cy+0.05+Math.cos(t)*0.17,Math.sin(t)*0.17],0.006,metal);}if(a.splice==='wrapped')for(let j=0;j<10;j++)s.ring(0.071,0.004,[-0.23+j*0.05,cy+0.05,0],dark).rotation.y=Math.PI/2;
 s.box([0.75,0.035,0.25],[0,by+0.2,0.46],wood);for(const x of [-0.3,0.3])s.rod([x,by-0.1,0.3],[x,by+0.18,0.48],0.02,metal);if(a.tools==='knife')s.box([0.4,0.012,0.05],[0,by+0.23,0.46],metal);if(a.tools==='pliers')for(const z of [0.41,0.51])s.rod([-0.18,by+0.23,z],[0.15,by+0.23,0.46],0.018,metal);if(a.tools==='wrap')for(const x of [-0.2,0.2])s.ring(0.06,0.025,[x,by+0.24,0.46],wood).rotation.x=Math.PI/2;
 if(a.drain==='hose')s.tube([[L/2,by+0.08,0.2],[L/2+0.2,by+0.04,0.2],[L/2+0.2,0.05,0.35]],0.02,dark);else s.rod([L/2,by+0.08,0.2],[L/2+0.15,by+0.08,0.2],0.025,copper);if(a.drain==='pail'||a.water==='buckets')for(const x of a.water==='buckets'?[-0.5,0.5]:[L/2+0.16])s.lathe([[0,0],[0.12,0],[0.15,0.25],[0.13,0.25],[0.1,0.02],[0,0.02]],metal,[x,0,0.45]);if(a.state==='testing')s.tube([[0,cy+0.05,0],[0,cy+0.1,0.3],[0.3,by+0.23,0.46]],0.006,copper);if(a.state==='tagged')s.label('JOINT 12',0.25,0.12,[L/2,by+0.22,0.35],'#5a6c53','#d8cca6');return s.finish();

  },
});

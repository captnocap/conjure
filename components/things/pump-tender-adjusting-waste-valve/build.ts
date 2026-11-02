import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    task: choice("What is the pump tender doing?", {"turn": "Turning the valve adjustment handle.", "gauge": "Reading a small pressure gauge.", "spanner": "Holding a spanner against a locking nut.", "inspect": "Holding a removed valve cover for inspection."}),
    clothes: choice("What work clothes are worn?", {"overalls": "Plain blue work overalls.", "apron": "A pale shirt under a brown apron.", "coat": "A short green waterproof work coat.", "waistcoat": "A dark waistcoat over a cream shirt."}),
    head: choice("What headwear is visible?", {"cap": "A close work cap.", "hat": "A broad brim work hat.", "short": "Short uncovered hair.", "bun": "Hair tied in a bun."}),
    station: choice("What valve station is in front?", {"pipe": "A valve on a low horizontal pipe.", "plinth": "A round valve on a stone plinth.", "bench": "A disassembled valve on a timber bench.", "rail": "A valve bolted to a narrow metal frame."}),
    handle: choice("What adjustment is touched?", {"wheel": "A small horizontal handwheel.", "bar": "A straight sliding T-bar.", "nut": "A large hexagonal adjusting nut.", "lever": "A short side lever."}),
    equipment: choice("What extra equipment is at hand?", {"bucket": "A small drained bucket at the foot.", "chest": "A closed wooden tool chest.", "rag": "A cloth draped over the valve support.", "none": "Only the working valve."}),
    water: choice("What discharge is visible?", {"dry": "A dry floor around the valve.", "pool": "A shallow pool below the pipe.", "channel": "A narrow drained stone channel.", "grate": "A grated drain under the outlet."}),
    state: choice("What work status is shown?", {"routine": "The mechanism is in routine adjustment.", "isolated": "A red service tag marks the shutoff.", "notes": "A small logbook rests nearby.", "night": "A hooded task lamp is fixed to the station."}),
    height: score("How tall is the tender?", ["A shorter adult", "An average adult", "A taller adult"])
  },
  build(a,context){

 const s=new Sculpture(context),iron=s.material('#5d7768',{metalness:.55}),wood=s.material('#947c55'),pale=s.material('#d7cfb0'),brass=s.material('#b8a16a',{metalness:.7}),dark=s.material('#40554a'),H=1.58+a.height*.24;
 const person=figure(s,{height:H,pose:'standing',style:'doll',hair:a.head,top:{overalls:'#6c8591',apron:'#c4bea2',coat:'#6c8370',waistcoat:'#544f43'}[a.clothes],bottom:'#526357',shoes:'#394d43',skin:'#ba9875'});s.root.add(person.root);person.root.position.set(0,0,-.25);
 const vx=-.18,vz=.25,hy=H*.58;if(a.station==='bench'){s.box([.8,.06,.5],[0,hy-.2,vz],wood);for(const x of [-.32,.32])for(const z of [vz-.18,vz+.18])s.rod([x,0,z],[x,hy-.23,z],.03,wood);}else if(a.station==='plinth')s.cylinder(.23,.29,hy-.12,[vx,(hy-.12)/2,vz],pale,24);else{for(const x of [-.4,.15])s.box([.1,hy-.24,.28],[x,(hy-.24)/2,vz],iron);s.rod([-.45,hy-.2,vz],[.25,hy-.2,vz],a.station==='pipe'?.1:.035,iron);}
 s.cylinder(.12,.12,.16,[vx,hy-.11,vz],iron,24);s.rod([vx,hy-.04,vz],[vx,hy+.06,vz],.015,brass);
 const grip=new THREE.Vector3(vx-.08,hy+.06,vz);if(a.handle==='wheel'){s.ring(.09,.013,[vx,hy+.06,vz],iron).rotation.x=Math.PI/2;for(let j=0;j<4;j++){const t=j*Math.PI/2;s.rod([vx,hy+.06,vz],[vx+Math.cos(t)*.09,hy+.06,vz+Math.sin(t)*.09],.008,iron);}}if(a.handle==='bar')s.rod([vx-.12,hy+.06,vz],[vx+.12,hy+.06,vz],.012,brass);if(a.handle==='nut'){s.cylinder(.055,.055,.035,[vx,hy+.06,vz],brass,6);grip.set(vx-.04,hy+.06,vz);}if(a.handle==='lever')s.rod([vx,hy+.06,vz],[vx-.12,hy+.12,vz],.012,iron);
 if(a.clothes==='apron'){const apron=s.box([.33,.55,.015],[0,H*.54,-.07],wood);apron.rotation.x=.05;}
 if(a.task==='inspect'){const cy=hy+.13;s.cylinder(.11,.11,.025,[.14,cy,.19],brass,24).rotation.x=Math.PI/2;person.reach('left',{x:.23,y:cy,z:.2},{space:s.root});person.reach('right',{x:.05,y:cy,z:.2},{space:s.root});person.lookAt({x:.14,y:cy,z:.19},s.root);}else{person.reach('right',grip,{space:s.root});person.reach('left',{x:.15,y:hy-.12,z:.25},{space:s.root});person.lookAt({x:vx,y:hy,z:vz},s.root);if(a.task==='spanner'){s.rod([grip.x,grip.y,grip.z],[vx,hy+.06,vz],.012,brass);s.ring(.06,.009,[vx,hy+.06,vz],brass,Math.PI*1.6).rotation.x=Math.PI/2;}}
 if(a.task==='gauge'){s.rod([vx+.12,hy-.12,vz],[vx+.2,hy+.18,vz],.012,brass);s.cylinder(.065,.065,.025,[vx+.2,hy+.18,vz],pale,24).rotation.x=Math.PI/2;s.rod([vx+.2,hy+.18,vz+.015],[vx+.23,hy+.21,vz+.015],.003,dark);}
 if(a.equipment==='bucket'){s.lathe([[.12,0],[.15,.23],[.13,.23],[.1,.02]],iron,[.48,0,.05]);s.tube([[.48-.14,.2,.05],[.48,.38,.05],[.48+.14,.2,.05]],.009,dark);}if(a.equipment==='chest'){s.box([.4,.23,.27],[.45,.115,.05],wood);s.box([.12,.025,.035],[.45,.242,.05],iron);}if(a.equipment==='rag')s.drape({size:[.35,.4],at:[.1,hy+.1,.28],over:[{cylinder:[.12,.16],at:[vx,hy-.11,vz]}],floor:0,stiffness:.7,detail:12},s.material('#c3c2a6',{side:THREE.DoubleSide}));
 if(a.water==='pool')s.cylinder(.3,.3,.006,[vx,.003,.48],s.material('#87b5a8',{transparent:true,opacity:.45,depthWrite:false}),32);if(a.water==='channel'){for(const x of [vx-.2,vx+.2])s.box([.045,.06,.6],[x,.03,.52],pale);}if(a.water==='grate'){s.box([.45,.025,.5],[vx,.0125,.5],dark);for(let j=0;j<8;j++)s.box([.41,.01,.02],[vx,.03,.28+j*.06],iron);}
 if(a.state==='isolated'){s.rod([vx,hy+.06,vz],[vx+.09,hy-.08,vz+.15],.003,wood);s.label('ISOLATED',.19,.08,[vx+.09,hy-.1,vz+.15],'#d9d1b0','#9d6751');}if(a.state==='notes'){s.box([.2,.025,.14],[.52,.0125,-.25],pale);s.box([.003,.004,.14],[.52,.027,-.25],wood);}if(a.state==='night'){s.rod([.23,0,.45],[.23,hy+.4,.45],.018,iron);s.cylinder(.09,.04,.1,[.23,hy+.4,.45],iron,20);s.cylinder(.07,.07,.006,[.23,hy+.347,.45],s.material('#e5d18b',{emissive:'#c1ac66',emissiveIntensity:.3}),20);}return s.finish();

  },
});

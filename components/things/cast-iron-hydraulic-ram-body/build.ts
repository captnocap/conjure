import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    body: choice("What shape is the ram casting?", {"straight": "A long straight cylindrical barrel.", "bulb": "A rounded bulbous central chamber.", "tee": "A broad T-shaped manifold.", "taper": "A tapered barrel with a narrow inlet."}),
    waste: choice("What waste-valve head is fitted?", {"cage": "An open four-post valve cage.", "cap": "A domed cap with a narrow outlet gap.", "weighted": "A tall exposed weighted valve stem.", "bell": "A wide flared discharge bell."}),
    delivery: choice("How does the delivery branch leave?", {"upright": "A short vertical flanged outlet.", "elbow": "A curved pipe turns toward the side.", "twin": "Two narrow outlet branches.", "blank": "A bolted blank plate closes the branch."}),
    bed: choice("What supports the ram?", {"sleepers": "Two heavy timber sleepers.", "stone": "A rectangular stone plinth.", "frame": "A braced iron skid.", "feet": "Four individual mounting feet."}),
    inlet: choice("What inlet connection is fitted?", {"flange": "A broad flange with eight bolts.", "socket": "A deep socket with a clamping band.", "reducer": "A stepped reducing coupling.", "open": "An open circular inlet mouth."}),
    service: choice("What inspection fitting is present?", {"round": "A round bolted inspection cover.", "square": "A square service door on the barrel.", "gauge": "A small pressure gauge on a rising tube.", "none": "An uninterrupted casting."}),
    outflow: choice("What lies below the waste valve?", {"trough": "A narrow drained stone trough.", "splash": "A shallow blue splash pool.", "grate": "A slotted iron drainage grate.", "dry": "A dry supporting surface."}),
    state: choice("What is the ram doing?", {"closed": "The waste valve is seated.", "open": "The waste valve is lifted.", "service": "The valve cap rests beside the machine.", "tag": "A small service tag hangs on the valve cage."}),
    length: score("How large is the pump body?", ["A small estate pump", "A substantial mill pump", "A broad waterworks ram"])
  },
  build(a,context){

 const s=new Sculpture(context),iron=s.material('#526c61',{metalness:.62,roughness:.5+context.mood.wear*.25}),steel=s.material('#aab5a1',{metalness:.8}),wood=s.material('#99805a'),stone=s.material('#b0b39c'),water=s.material('#87b7af',{transparent:true,opacity:.42,depthWrite:false}),L=.75+a.length*.65,R=.18,base=.16,cy=.38;
 if(a.bed==='stone')s.box([L+.4,.16,.75],[0,.08,0],stone);else if(a.bed==='sleepers')for(const x of [-L*.3,L*.3])s.box([.2,.16,.8],[x,.08,0],wood);else{for(const x of [-L*.35,L*.35])for(const z of [-.24,.24])s.box([.12,.16,.12],[x,.08,z],iron);for(const x of [-L*.35,L*.35])s.box([.16,.06,.6],[x,.15,0],iron);if(a.bed==='frame')for(const z of [-.24,.24])s.rod([-L*.4,.14,z],[L*.4,.14,z],.035,iron);}
 for(const x of [-L*.3,L*.3])s.box([.15,.12,.3],[x,.22,0],iron);
 s.cylinder(a.body==='taper'?.13:R,R,L,[0,cy,0],iron,32).rotation.z=Math.PI/2;if(a.body==='bulb')s.ball([.28,.24,.24],[0,cy,0],iron,24);if(a.body==='tee')s.rod([0,cy,-.35],[0,cy,.35],.16,iron);
 const flange=(x:number,r:number)=>{s.ring(r,.027,[x,cy,0],iron).rotation.y=Math.PI/2;for(let j=0;j<8;j++){const t=j*Math.PI/4;s.rod([x-.035,cy+Math.cos(t)*r,Math.sin(t)*r],[x+.035,cy+Math.cos(t)*r,Math.sin(t)*r],.012,steel);}};
 if(a.inlet==='open'){s.cylinder(.14,.14,.008,[-L/2-.006,cy,0],s.material('#263e39'),32).rotation.z=Math.PI/2;flange(-L/2,.18);}else if(a.inlet==='socket')s.cylinder(.215,.215,.16,[-L/2,cy,0],steel,32).rotation.z=Math.PI/2;else if(a.inlet==='reducer'){s.cylinder(.11,.18,.22,[-L/2-.08,cy,0],iron,24).rotation.z=Math.PI/2;flange(-L/2-.19,.12);}else flange(-L/2,.21);
 const vx=L*.22,vy=cy+.19;s.cylinder(.13,.13,.1,[vx,vy,0],iron,28);const lift=a.state==='open'?.075:0;
 if(a.waste==='cap'&&a.state!=='service')s.lathe([[.15,0],[.15,.05],[.1,.13],[0,.17]],iron,[vx,vy+.05,0]);else if(a.waste==='bell')s.lathe([[.11,0],[.13,.13],[.23,.19],[.23,.21],[.2,.21],[.11,.04]],iron,[vx,vy,0]);else{for(const dx of [-.12,.12])for(const z of [-.1,.1])s.rod([vx+dx,vy,z],[vx+dx,vy+.3,z],.016,iron);s.box([.3,.035,.25],[vx,vy+.3,0],iron);}
 s.cylinder(.105,.105,.025,[vx,vy+.055+lift,0],steel,24);s.rod([vx,vy+.06+lift,0],[vx,vy+.4+lift,0],.018,steel);if(a.waste==='weighted')s.cylinder(.07,.07,.1,[vx,vy+.34+lift,0],iron,20);
 const dx=-L*.25;if(a.delivery==='elbow')s.tube([[dx,cy,0],[dx,cy+.3,0],[dx,cy+.35,-.28]],.075,iron);else if(a.delivery==='twin')for(const z of [-.1,.1])s.rod([dx,cy,z],[dx,cy+.28,z],.05,iron);else s.cylinder(.09,.09,a.delivery==='blank'?.04:.27,[dx,cy+(a.delivery==='blank'?.2:.25),0],iron,24);
 if(a.service==='round'){s.cylinder(.11,.11,.04,[0,cy,.18],steel,24).rotation.x=Math.PI/2;for(let j=0;j<6;j++){const t=j*Math.PI/3;s.ball([.012,.012,.012],[Math.cos(t)*.09,cy+Math.sin(t)*.09,.21],iron,8);}}if(a.service==='square')s.box([.25,.18,.035],[0,cy,.19],steel);if(a.service==='gauge'){s.rod([0,cy+.1,0],[0,cy+.46,0],.012,steel);s.cylinder(.07,.07,.025,[0,cy+.46,0],stone,24).rotation.x=Math.PI/2;s.rod([0,cy+.46,.015],[.04,cy+.49,.015],.003,iron);}
 if(a.outflow==='trough'){s.box([.5,.22,.5],[vx,.11,.38],stone);for(const x of [vx-.24,vx+.24])s.box([.035,.14,.5],[x,.25,.38],stone);s.box([.43,.008,.46],[vx,.225,.38],water);}if(a.outflow==='splash')s.cylinder(.3,.3,.008,[vx,.006,.35],water,40);if(a.outflow==='grate'){s.box([.48,.16,.4],[vx,.08,.28],stone);for(let j=0;j<7;j++)s.box([.45,.025,.025],[vx,.1725,.12+j*.055],iron);}
 if(a.state==='service')s.cylinder(.15,.15,.05,[-L*.2,.025,.5],iron,24);if(a.state==='tag'){s.rod([vx,vy+.4,0],[vx+.16,vy+.17,.15],.003,wood);s.label('SERVICE',.16,.08,[vx+.16,vy+.14,.15],'#4d5b49','#d1c49d');}return s.finish();

  },
});

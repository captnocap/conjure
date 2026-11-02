import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';
const questions = {

  layout: choice('How are the bocce lanes arranged?', {single:'One generous central lane.',twin:'Two narrow lanes side by side.',practice:'A short practice court with a wide social terrace.',garden:'A single lane enclosed by planted borders.',tournament:'Two lanes with marked spectator strips.'}),
  edge: choice('What bounds the court?', {timber:'Low timber rails.',stone:'Low pale stone kerbs.',brick:'Old red brick borders.',rope:'Ropes between short posts.',hedge:'Clipped hedges outside the rails.'}),
  surface: choice('What is under the balls?', {sand:'Pale sandy gravel.',red:'Warm crushed brick dust.',grey:'Grey crushed limestone.',earth:'Hard-packed ochre earth.',oyster:'Pale shell-speckled gravel.'}),
  story: choice('What is happening here?', {morning:'Freshly brushed lanes before the first game.',match:'A close match with balls clustered at the far end.',break:'A break in play with cups on the terrace.',party:'A club tournament with pennants and a results board.',closed:'A rope closes the lane for resurfacing.'}),
  shade: choice('What shades the spectators?', {trees:'Broad clipped trees.',pergola:'A light wooden pergola.',canvas:'A low striped canvas shelter.',wall:'A high courtyard wall.',open:'An open sunny sideline.'}),
  neighbour: choice('What lies beyond the back rail?', {club:'A small stucco club doorway.',garden:'A row of kitchen garden beds.',fence:'A painted timber fence.',cafe:'A cafe serving window.',park:'A grassy park with a curving path.'}),
  length: score('How long is the court?', ['A compact courtyard lane','A neighbourhood court','A long club lane']),
  seating: score('How much spectator seating is there?', ['One bench','A few benches','Seats along both sides']),
  lamps: noul('Are low court lamps installed for evening play?'),

};
export default defineWorld({questions, build(a, context) {

    const {random,mood}=context;const length=8+a.length*5,width=a.layout==='twin'||a.layout==='tournament'?10:8;
    const {art:s,world}=diorama(context,{background:'#d8dece',floor:'#a9ad8a',width:width+3,depth:length+2,maxHeight:2.1,radius:.75,pitch:35,yaw:21,scale:[.7,1.5],slots:[[0,length*.15],[-width*.38,-1],[width*.38,1],[0,-length*.2],[-width*.4,length*.3],[width*.4,-length*.3]]});
    const wood=s.material('#a27d52'),pale=s.material('#d1c8a5'),green=s.material('#7c9066'),dark=s.material('#5c6650'),brick=s.material('#ad7862'),metal=s.material('#747e72',{metalness:.55});
    const two=a.layout==='twin'||a.layout==='tournament',laneW=two?3.5:4.3,count=two?2:1,laneL=a.layout==='practice'?length*.72:length;
    for(let l=0;l<count;l++){const cx=two?(l-.5)*4.2:0;s.box([laneW,.035,laneL],[cx,.02,0],s.material({sand:'#cab78d',red:'#b77e61',grey:'#a6a694',earth:'#b79a6c',oyster:'#d2c8ab'}[a.surface]));
      for(const x of [-laneW/2,laneW/2]){const mat=a.edge==='brick'?brick:a.edge==='stone'?pale:wood;if(a.edge==='rope'){for(let i=0;i<7;i++)s.rod([cx+x,.05,-laneL/2+i*laneL/6],[cx+x,.35,-laneL/2+i*laneL/6],.025,wood);s.rod([cx+x,.28,-laneL/2],[cx+x,.28,laneL/2],.009,pale);}else s.box([.12,.18,laneL+.2],[cx+x,.09,0],mat);if(a.edge==='hedge')for(let i=0;i<8;i++)s.ball([.4,.35,.65],[cx+x+Math.sign(x)*.45,.35,-laneL*.44+i*laneL*.126],green,10);}
      for(const z of [-laneL/2,laneL/2])s.box([laneW+.2,.28,.14],[cx,.14,z],wood);
      for(const z of [-laneL*.36,laneL*.36])s.box([laneW,.008,.035],[cx,.044,z],pale);
      if(a.story==='morning')for(let i=0;i<17;i++)s.box([laneW-.2,.003,.012],[cx,.043,-laneL*.45+i*laneL*.9/16],pale);
      if(a.story==='match')for(let i=0;i<6;i++)s.ball([.09,.09,.09],[cx+(random()-.5)*1.5,.13,-laneL*.32+random()*.7],s.material(i%2?'#9c5844':'#4e7b61'),12);
      if(a.story==='closed'){s.rod([cx-laneW/2,.55,laneL*.3],[cx+laneW/2,.55,laneL*.3],.014,pale);s.label('RESTING THE COURT',2,.3,[cx,.6,laneL*.3]);}}
    const benches=1+Math.round(a.seating*4);for(let i=0;i<benches;i++){const side=i%2?1:-1,z=-length*.33+Math.floor(i/2)*2.8,x=side*(width/2+.35);s.box([.52,.08,1.8],[x,.5,z],wood);s.box([.06,.45,1.8],[x+side*.25,.72,z],wood);for(const dz of [-.65,.65])s.box([.42,.46,.08],[x,.23,z+dz],dark);}
    if(a.layout==='garden')for(const z of [-length*.35,0,length*.35])for(const x of [-width/2-.6,width/2+.6]){s.cylinder(.32,.25,.4,[x,.2,z],brick,12);s.ball([.48,.4,.5],[x,.7,z],green,12);}
    if(a.shade==='trees')for(const z of [-length*.3,length*.25]){s.cylinder(.13,.22,2.7,[-width/2-.3,1.35,z],wood,12);s.ball([1.2,.85,1.1],[-width/2-.3,3,z],green,12);}
    if(a.shade==='pergola'||a.shade==='canvas'){for(const z of [-2.3,2.3])for(const x of [-width/2-1,-width/2+.4])s.rod([x,0,z],[x,2.5,z],.045,wood);for(let i=0;i<8;i++)s.box([1.6,.05,.08],[-width/2-.3,2.55,-2.3+i*4.6/7],wood);if(a.shade==='canvas')for(let i=0;i<10;i++)s.box([1.6,.025,.46],[-width/2-.3,2.57,-2.1+i*.46],i%2?pale:green);}
    if(a.shade==='wall')s.box([.2,2.7,length],[-width/2-1,1.35,0],pale);
    const back=-length/2-.6;if(a.neighbour==='club'||a.neighbour==='cafe'){s.box([width,.2,1],[0,.1,back],pale);s.box([width,2.9,.2],[0,1.45,back],pale);s.box([a.neighbour==='club'?1.1:2.5,a.neighbour==='club'?2.1:1.15,.035],[0,a.neighbour==='club'?1.05:1.65,back+.12],dark);s.label(a.neighbour==='club'?'CIRCOLO BOCCE':'CAFE',3,.35,[0,2.55,back+.13]);if(a.neighbour==='cafe')s.box([2.9,.1,.55],[0,1.1,back+.3],wood);}
    if(a.neighbour==='garden')for(let i=0;i<5;i++){s.box([1.3,.18,.65],[-width*.4+i*width*.2,.09,back],wood);for(let j=0;j<5;j++)s.ball([.13,.17,.16],[-width*.4+i*width*.2-.5+j*.25,.3,back],green,10);}
    if(a.neighbour==='fence')for(let i=0;i<25;i++)s.box([width/27,1.4,.05],[-width/2+i*width/24,.7,back],i%2?wood:pale);
    if(a.neighbour==='park'){s.box([width,.02,1],[0,.02,back],green);s.box([width,.025,.35],[0,.04,back],pale);}
    if(a.story==='party'){s.rod([-width/2,2.2,back+.4],[width/2,2.2,back+.4],.008,dark);for(let i=0;i<12;i++)s.mesh(new THREE.ConeGeometry(.12,.25,3),i%2?green:brick,[-width/2+(i+.5)*width/12,2.05,back+.4]).rotation.z=Math.PI;}
    if(a.story==='break'){s.box([.8,.05,.8],[width/2+.2,.75,0],wood);s.cylinder(.055,.04,.14,[width/2+.2,.85,0],pale,12);}
    if(a.layout==='tournament')for(const x of [-width/2-.1,width/2+.1])s.box([.06,.005,length],[x,.02,0],pale);
    if(a.lamps)for(const z of [-length*.3,length*.3]){s.rod([width/2+.4,0,z],[width/2+.4,2.9,z],.03,metal);s.box([.45,.1,.25],[width/2+.25,2.95,z],s.material('#e7dfb5',{emissive:'#dfd3a2',emissiveIntensity:.15+mood.energy*.3}));}
    return world;
}});

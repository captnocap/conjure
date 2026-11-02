import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    ports: choice("How many destination tubes?", {"three": "Three destination ports.", "four": "Four destination ports.", "five": "Five destination ports.", "six": "Six destination ports."}),
    layout: choice("How are the ports arranged?", {"fan": "A fan above the selector.", "row": "A straight horizontal row.", "circle": "A circular valve face.", "tiers": "Two stepped rows of ports."}),
    selector: choice("What route selector is used?", {"wheel": "A large spoked selector wheel.", "handle": "A long operating handle.", "dial": "A circular index dial.", "drum": "A broad rotating drum."}),
    mount: choice("What supports the bank?", {"cabinet": "A waist-high cabinet.", "frame": "An open iron frame.", "wall": "A freestanding backboard.", "desk": "A sloping desk base."}),
    mouths: choice("What is at the tube mouths?", {"open": "Open dark receiving mouths.", "caps": "Hinged end caps.", "hoods": "Curved impact hoods.", "glass": "Clear inspection sleeves."}),
    routing: choice("What pipe routing is visible?", {"up": "Tubes rise vertically.", "bend": "Tubes bend toward the rear.", "side": "Tubes sweep sideways.", "short": "Short exposed connection stubs."}),
    labels: choice("How are routes identified?", {"numbers": "Numbered destination plates.", "colours": "Broad coloured route bands.", "names": "Small lettered route cards.", "none": "No route labels."}),
    state: choice("What operational detail appears?", {"ready": "All routes ready.", "carrier": "A carrier waits at the inlet.", "service": "A detached valve cap rests below.", "locked": "A red lock bar crosses the selector."}),
    width: score("How broad is the routing bank?", ["Small office exchange", "Standard sorting bank", "Large central exchange"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#718879',{metalness:.5}),dark=s.material('#3f5247'),brass=s.material('#bca66e',{metalness:.7}),wood=s.material('#a58d64'),pale=s.material('#dbd1b1'),red=s.material('#a86d53');

 const n={three:3,four:4,five:5,six:6}[a.ports],W=1+a.width*.7,Y=.75,R=.07;const fw=W+.2;if(a.mount==='cabinet')s.box([fw,Y,.55],[0,Y/2,0],wood);else{for(const x of [-fw*.43,fw*.43])for(const z of [-.22,.22])s.rod([x,0,z],[x,Y,z],.035,metal);s.box([fw,.07,.55],[0,Y-.035,0],wood);}if(a.mount==='wall')s.box([fw,1.7,.07],[0,.85,-.3],wood);
 if(a.mount==='desk'){s.box([fw,.18,.06],[0,Y+.09,-.23],wood);const top=s.box([fw,.04,.58],[0,Y+.05,0],wood);top.rotation.x=.2;}
 const vy=Y+.3;s.box([.28,.19,.25],[0,Y+.095,0],metal);s.cylinder(.23,.23,.22,[0,vy,0],metal,32).rotation.x=Math.PI/2;for(let j=0;j<n;j++){const t=(j-(n-1)/2)/(Math.max(1,n-1))*Math.PI*.7,x=a.layout==='circle'?Math.sin(t)*.42:(j-(n-1)/2)*W/(n+1),y=a.layout==='circle'?vy+Math.cos(t)*.42:a.layout==='tiers'?Y+.65+(j%2)*.25:Y+.72,ex=a.routing==='side'?x+.25:x,ey=a.routing==='short'?y+.22:y+.7,ez=a.routing==='bend'?-.4:0;
 s.tube([[Math.sin(t)*.18,vy+Math.cos(t)*.18,0],[x,y,0],[ex,ey,ez]],R,metal);s.cylinder(R*.85,R*.85,.008,[ex,ey+.004,ez],dark,20);s.ring(R+.008,.012,[ex,ey,ez],brass).rotation.x=Math.PI/2;if(a.mouths==='caps')s.cylinder(R+.015,R+.015,.018,[ex+.05,ey+.06,ez],metal,24).rotation.z=.8;if(a.mouths==='hoods')s.tube([[ex,ey-.08,ez],[ex,ey+.12,ez],[ex,ey+.16,ez+.18]],R,metal);if(a.mouths==='glass')s.cylinder(R+.006,R+.006,.16,[ex,ey-.1,ez],s.material('#a8c5b4',{transparent:true,opacity:.25,depthWrite:false}),24);
 if(a.labels==='numbers'||a.labels==='names')s.label(a.labels==='numbers'?String(j+1):String.fromCharCode(65+j),.11,.075,[x,y-.03,.09],'#dfd5b1','#56614b');if(a.labels==='colours')s.ring(R+.01,.023,[ex,ey-.08,ez],j%2?red:brass).rotation.x=Math.PI/2;}
 s.rod([0,vy,.1],[0,vy,.25],.02,brass);if(a.selector==='wheel'){s.ring(.17,.02,[0,vy,.25],brass);for(let j=0;j<5;j++){const t=j*Math.PI*2/5;s.rod([0,vy,.25],[Math.sin(t)*.17,vy+Math.cos(t)*.17,.25],.012,brass);}}if(a.selector==='handle')s.rod([0,vy,.25],[.25,vy+.2,.25],.025,dark);if(a.selector==='dial'){s.cylinder(.18,.18,.02,[0,vy,.25],pale,28).rotation.x=Math.PI/2;s.rod([0,vy,.265],[.1,vy+.08,.265],.008,dark);}if(a.selector==='drum')s.cylinder(.18,.18,.22,[0,vy,.28],metal,24).rotation.x=Math.PI/2;
 if(a.state==='carrier')s.cylinder(.065,.065,.28,[.35,Y+.065,.16],brass,24).rotation.z=Math.PI/2;if(a.state==='service')s.cylinder(.22,.22,.025,[.4,.0125,.5],metal,28);if(a.state==='locked')s.rod([-.2,vy,.28],[.2,vy,.28],.018,red);return s.finish();

  },
});

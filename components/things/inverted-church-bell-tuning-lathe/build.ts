import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    bell: choice("What bell profile is being tuned?", {"church": "A broad flared church bell.", "slender": "A tall narrow tower bell.", "heavy": "A short thick chime bell.", "ribbed": "A bell with decorative shoulder ribs."}),
    bronze: choice("What finish covers the bell?", {"gold": "Warm golden bronze.", "brown": "Dark brown aged bronze.", "green": "Green patinated bronze.", "silver": "Silvery test metal."}),
    lathe: choice("What machine bed supports it?", {"round": "A circular cast iron machine bed.", "square": "A square bolted machine frame.", "pit": "A low circular pit rim.", "legs": "A tall four-legged machine bed."}),
    cutter: choice("How is the cutter carried?", {"arm": "A long radial cutting arm.", "bridge": "A cross bridge over the bell.", "post": "A short side cutting post.", "withdrawn": "The cutting arm is swung away."}),
    clamps: choice("How is the bell fixed?", {"three": "Three radial clamping jaws.", "four": "Four broad clamping blocks.", "straps": "Two crossed steel securing straps.", "chuck": "A dark circular chuck plate."}),
    drive: choice("What drives the turntable?", {"belt": "A visible side belt pulley.", "gear": "An exposed toothed drive wheel.", "motor": "A compact covered motor.", "hand": "A long handwheel feed."}),
    measurement: choice("What measures the cut?", {"dial": "A small dial indicator.", "scale": "A long graduated feed scale.", "caliper": "A large profile caliper.", "none": "No measuring attachment."}),
    state: choice("What tuning stage is visible?", {"cutting": "Fresh bronze shavings on the bed.", "paused": "A cutter resting against the lip.", "finished": "A smooth bright inner cut band.", "inspection": "A marked band awaits cutting."}),
    diameter: score("How wide is the bell mouth?", ["A small church bell", "A substantial bell", "A large tower bell"])
  },
  build(a,context){

 const s=new Sculpture(context),bronze=s.material({gold:'#b59a5e',brown:'#8b704a',green:'#789883',silver:'#a9b5a0'}[a.bronze],{metalness:0.75,roughness:0.3}),iron=s.material('#597564',{metalness:0.6}),steel=s.material('#a4b19b',{metalness:0.8}),dark=s.material('#425346'),r=0.4+a.diameter*0.3,h=a.bell==='slender'?r*1.6:a.bell==='heavy'?r*0.8:r*1.1,by=a.lathe==='legs'?0.65:a.lathe==='pit'?0.12:0.22;
 if(a.lathe==='square'||a.lathe==='legs')s.box([r*2.8,0.18,r*2.8],[0,by-0.09,0],iron);else if(a.lathe==='pit'){s.ring(r*1.3,0.1,[0,0.1,0],iron).rotation.x=Math.PI/2;s.cylinder(r*0.6,r*0.6,by,[0,by/2,0],dark,32);}else s.cylinder(r*1.4,r*1.4,by,[0,by/2,0],iron,48);if(a.lathe==='legs')for(const x of [-r,r])for(const z of [-r,r])s.box([0.15,by-0.18,0.15],[x,(by-0.18)/2,z],iron);s.cylinder(r*1.1,r*1.1,0.09,[0,by+0.045,0],dark,48);
 const y=by+0.09; s.lathe([[0,0],[r*0.27,0],[r*0.35,h*0.2],[r*0.48,h*0.55],[r*0.72,h*0.82],[r,h],[r-0.045,h],[r*0.67,h*0.8],[r*0.42,h*0.52],[r*0.28,h*0.16],[0,h*0.12]],bronze,[0,y,0]);if(a.bell==='ribbed')for(let j=0;j<3;j++)s.ring(r*0.5+j*0.05,0.012,[0,y+h*0.6+j*0.05,0],bronze).rotation.x=Math.PI/2;
 const n=a.clamps==='three'?3:4;if(a.clamps==='three'||a.clamps==='four')for(let j=0;j<n;j++){const t=j/n*Math.PI*2;s.box([0.18,0.12,0.1],[Math.cos(t)*r*0.35,y+0.04,Math.sin(t)*r*0.35],steel).rotation.y=-t;}if(a.clamps==='straps')for(const z of [-0.1,0.1])s.rod([-r*0.7,y+0.04,z],[r*0.7,y+0.04,z],0.02,steel);
 const x=r*1.3;s.box([0.2,h+0.45,0.25],[x,by+(h+0.45)/2,0],iron);const cy=y+h+0.16;if(a.cutter==='bridge'){s.rod([-x,by,0],[-x,cy,0],0.05,iron);s.rod([-x,cy,0],[x,cy,0],0.055,iron);}else s.rod([x,cy,0],[a.cutter==='withdrawn'?x+0.5:a.cutter==='post'?r*0.65:0,cy,0],0.045,iron);const tx=a.cutter==='withdrawn'?x+0.5:a.cutter==='post'?r*0.65:0;const cutY=a.state==='paused'?y+h-0.025:y+h*0.65,cutX=a.state==='paused'?r-0.04:r*0.54;s.rod([tx,cy,0],[tx,cutY,0],0.022,steel);if(a.cutter!=='withdrawn'){s.rod([tx,cutY,0],[cutX,cutY,0],0.018,steel);s.box([0.04,0.045,0.05],[cutX,cutY,0],dark);}
 if(a.drive==='motor')s.box([0.35,0.28,0.4],[-r*1.35,0.14,0],iron);else{const rr=a.drive==='hand'?0.25:0.2,xx=-r*1.4,yy=by+0.1;s.rod([xx,yy,0],[-r,yy,0],0.03,steel);s.ring(rr,0.025,[xx,yy,0],iron).rotation.y=Math.PI/2;for(let j=0;j<6;j++)s.rod([xx,yy,0],[xx,yy+Math.cos(j*Math.PI/3)*rr,Math.sin(j*Math.PI/3)*rr],0.018,iron);if(a.drive==='gear')for(let j=0;j<16;j++)s.box([0.06,0.04,0.04],[xx,yy+Math.cos(j*Math.PI/8)*(rr+0.02),Math.sin(j*Math.PI/8)*(rr+0.02)],steel);}
 if(a.measurement==='dial')s.cylinder(0.07,0.07,0.025,[x,cy,0.16],s.material('#d6cba7'),24).rotation.x=Math.PI/2;if(a.measurement==='scale')for(let j=0;j<10;j++)s.box([0.008,0.025,0.02],[x-j*0.08,cy+0.045,0],steel);if(a.measurement==='caliper')s.tube([[-r,y+h+0.02,0.2],[-r*0.6,y+h+0.2,0.2],[r*0.6,y+h+0.2,0.2],[r,y+h+0.02,0.2]],0.014,steel);
 if(a.state==='cutting')for(let j=0;j<12;j++)s.ring(0.025,0.004,[(context.random()-0.5)*r*2,by+0.025,(context.random()-0.5)*r*2],bronze,Math.PI*1.5).rotation.x=Math.PI/2;if(a.state==='finished'||a.state==='inspection')s.ring(r-0.035,0.013,[0,y+h-0.02,0],a.state==='finished'?steel:s.material('#d1c29a')).rotation.x=Math.PI/2;return s.finish();

  },
});

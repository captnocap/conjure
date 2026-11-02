import * as THREE from 'three';
import { Sculpture, choice, defineThing, score } from '@conjure/kit';
export default defineThing({questions:{
    hoops:choice('What shape are the flight gates?', {'rectangle': 'Tall rectangular hoops.', 'round': 'Circular hoops on short stands.', 'arch': 'Rounded arches with straight lower sides.', 'hexagon': 'Six-sided open gates.'}),
    count:choice('How many gates form the tunnel?', {'two': 'Two widely spaced gates.', 'three': 'Three sequential gates.', 'four': 'Four repeated gates.', 'six': 'Six closely spaced gates.'}),
    route:choice('How does the passage run?', {'straight': 'A straight flight corridor.', 'bend': 'The corridor bends gently to one side.', 'narrow': 'Each successive gate narrows.', 'offset': 'Alternating gates shift side to side.'}),
    baffles:choice('What encloses the sides?', {'open': 'The sides remain open.', 'mesh': 'Fine side mesh panels.', 'fabric': 'Dark fabric baffles.', 'clear': 'Clear observation windows.'}),
    sensors:choice('How is flight detected?', {'pairs': 'One emitter and receiver pair per gate.', 'grid': 'Three parallel beam pairs per gate.', 'corners': 'Four corner sensor modules.', 'overhead': 'Small overhead optical sensors.'}),
    mount:choice('How are the hoops supported?', {'feet': 'Two broad flat feet per gate.', 'rail': 'Two continuous floor rails.', 'wheels': 'Small locking wheels under each gate.', 'blocks': 'Low heavy acoustic isolation blocks.'}),
    markers:choice('What identifies the measurement planes?', {'numbers': 'Numbered plates above the gates.', 'bands': 'Contrasting bands on the uprights.', 'flags': 'A small triangular marker at one side.', 'none': 'No separate markings.'}),
    state:choice('What is the tunnel state?', {'open': 'The passage is open for flight.', 'netted': 'A soft catch net closes the last gate.', 'calibration': 'A small calibration target hangs in the first gate.', 'service': 'One side baffle is folded outward.'}),
    size:score('How broad is the flight passage?', ['Compact','Medium','Broad']),
},build(a,context){
const s=new Sculpture(context),rnd=context.random;
const metal=s.material('#9da7a1',{metalness:0.65}),dark=s.material('#3e5150'),pale=s.material('#c6c5ad'),accent=s.material('#b27a47'),foam=s.material('#7a8374');
const R=0.55+a.size*0.4,H=1.8,n={two:2,three:3,four:4,six:6}[a.count],step=0.6;const centers:[number,number,number][]=[];
for(let j=0;j<n;j++){const z=(j-(n-1)/2)*step,x=a.route==='bend'?j*j*0.035:a.route==='offset'?(j%2?0.15:-0.15):0,r=R*(a.route==='narrow'?1-j*0.07:1);centers.push([x,r,z]);if(a.hoops==='round')s.ring(r,0.025,[x,H*0.55,z],metal);else if(a.hoops==='hexagon'){const pts:[number,number,number][]=Array.from({length:7},(_,k)=>{const t=k/6*Math.PI*2;return [x+Math.cos(t)*r,H*0.55+Math.sin(t)*H*0.48,z];});s.tube(pts,0.025,metal);}else{for(const xx of [-r,r])s.rod([x+xx,0.12,z],[x+xx,a.hoops==='arch'?H*0.7:H,z],0.025,metal);if(a.hoops==='arch'){const pts:[number,number,number][]=Array.from({length:17},(_,k)=>{const t=k/16*Math.PI;return [x+Math.cos(t)*r,H*0.7+Math.sin(t)*0.45,z];});s.tube(pts,0.025,metal);}else s.rod([x-r,H,z],[x+r,H,z],0.025,metal);}
for(const sign of [-1,1]){const xx=x+sign*r;if(a.mount==='feet')s.box([0.18,0.05,0.45],[xx,0.025,z],dark);if(a.mount==='blocks')s.box([0.22,0.14,0.25],[xx,0.07,z],foam);if(a.mount==='wheels'){s.box([0.15,0.04,0.2],[xx,0.11,z],metal);for(const dz of [-0.07,0.07])s.cylinder(0.06,0.06,0.035,[xx,0.06,z+dz],dark,12).rotation.z=Math.PI/2;}if(a.hoops==='round'||a.hoops==='hexagon')s.rod([xx,0.1,z],[x+sign*r*0.7,H*0.3,z],0.025,metal);}
const top=a.hoops==='round'?H*0.55+r:a.hoops==='arch'?H*0.7+0.45:a.hoops==='hexagon'?H*0.55+H*0.48*Math.sin(Math.PI/3):H;
const edgeAt=(yy:number)=>{if(a.hoops==='round')return Math.sqrt(Math.max(0,r*r-(yy-H*0.55)**2));if(a.hoops==='arch'&&yy>H*0.7)return r*Math.sqrt(Math.max(0,1-((yy-H*0.7)/0.45)**2));if(a.hoops==='hexagon')return r*(1-Math.abs(yy-H*0.55)/(H*0.48*Math.sin(Math.PI/3))*0.5);return r;};
const ys=a.sensors==='grid'?[0.3,0.5,0.7]:a.sensors==='corners'?[0.25,0.75]:[0.5];if(a.sensors!=='overhead')for(const v of ys){const yy=a.hoops==='round'?H*0.55+(v-0.5)*r*1.7:0.15+v*(top-0.2),xx=edgeAt(yy);for(const sign of [-1,1])s.box([0.08,0.08,0.1],[x+sign*xx,yy,z],dark);}if(a.sensors==='overhead')s.box([0.14,0.08,0.15],[x,top-0.03,z],dark);
if(a.markers==='numbers')s.label(String(j+1),0.18,0.12,[x,top+0.04,z+0.02],'#334847','#dad4b8');if(a.markers==='bands')for(const sign of [-1,1])for(const y of [0.6,1.3])s.box([0.06,0.15,0.06],[x+sign*r,y,z],accent);if(a.markers==='flags')s.box([0.16,0.12,0.01],[x+r+0.07,1.6,z],accent);
if(j>0&&a.baffles!=='open')for(const sign of [-1,1]){const prev=centers[j-1],xx=(prev[0]+x)/2+sign*(prev[1]+r)/2,mat=a.baffles==='clear'?s.material('#a1b6ad',{transparent:true,opacity:0.32,depthWrite:false}):foam;const b=s.box([0.015,1.4,step],[xx,0.9,z-step/2],mat);b.rotation.y=Math.atan2(x-prev[0]+sign*(r-prev[1]),step);if(a.state==='service'&&j===n-1&&sign===1)b.rotation.y+=0.8;if(a.baffles==='mesh'){b.material=s.material('#94a093',{transparent:true,opacity:0.15,depthWrite:false});for(let k=0;k<8;k++)s.rod([xx,0.22+k*0.18,z-step],[xx,0.22+k*0.18,z],0.004,dark);}}}
if(a.mount==='rail')for(const x of [-R,R])s.box([0.08,0.05,n*step],[x,0.025,0],dark);
if(a.state==='netted'){const [x,r,z]=centers[n-1];for(let k=0;k<9;k++){s.rod([x-r,H*k/8,z],[x+r,H*k/8,z],0.006,foam);s.rod([x-r+k*r/4,0.1,z],[x-r+k*r/4,H,z],0.006,foam);}}
if(a.state==='calibration'){const [x,,z]=centers[0];s.rod([x,H,z],[x,0.95,z],0.005,dark);s.ball([0.1,0.1,0.1],[x,0.85,z],accent,16);}

return s.finish();
}});

import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    rack: choice("How is the dipping frame built?", {"wood": "A slatted timber lifting frame.", "steel": "A thin steel basket frame.", "hooks": "Individual hanging hooks.", "tray": "A perforated draining tray."}),
    pieces: choice("What pieces are being glazed?", {"pin": "Short pin insulators.", "spool": "Squat spool insulators.", "post": "Tall multi-shed posts.", "disc": "Broad shallow disc insulators."}),
    glaze: choice("What glaze is in the vat?", {"brown": "Deep brown glaze.", "white": "Milky white glaze.", "green": "Green-grey glaze.", "blue": "Muted blue glaze."}),
    vat: choice("What holds the liquid glaze?", {"round": "A round metal vat.", "square": "A square timber lined tank.", "twin": "Two small dipping tubs.", "shallow": "A broad shallow glaze trough."}),
    position: choice("Where is the rack in the process?", {"raised": "Raised above the vat to drain.", "low": "Lowered close to the liquid.", "side": "Resting on the draining side board.", "empty": "The frame is empty between batches."}),
    handles: choice("How is the frame lifted?", {"bars": "Two broad side handles.", "chains": "Four lifting chains meet above.", "cross": "A single overhead cross handle.", "rope": "Rope loops on each corner."}),
    drain: choice("What catches the drips?", {"board": "A grooved draining board.", "mesh": "A metal draining grille.", "tray": "A shallow catch tray.", "none": "Only the main glaze vat."}),
    state: choice("What marks the current batch?", {"fresh": "Smooth fresh glazed pieces.", "drips": "Long glaze drips below the rack.", "stir": "A stirring paddle rests in the vat.", "tag": "A batch tag on the rack."}),
    batch: score("How many pieces are in the batch?", ["Four pieces", "Nine pieces", "Sixteen pieces"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#a28a5c'),metal=s.material('#7e9183',{metalness:0.5}),glaze=s.material({brown:'#765b44',white:'#d4d0b6',green:'#8a9a83',blue:'#819da0'}[a.glaze],{roughness:0.21}),raw=s.material('#d3cfb4'),dark=s.material('#596b5d');
    const vh=a.vat==='shallow'?0.22:0.48;function vat(x:number,r:number){s.lathe([[0,0],[r,0],[r,vh],[r-0.035,vh],[r-0.045,0.04],[0,0.04]],metal,[x,0,0]);s.cylinder(r-0.045,r-0.045,0.02,[x,vh-0.05,0],glaze,32);}
    if(a.vat==='round')vat(0,0.65);else if(a.vat==='twin'){vat(-0.37,0.35);vat(0.37,0.35);}else{s.box([1.3,0.05,0.95],[0,0.025,0],wood);for(const x of [-0.63,0.63])s.box([0.05,vh,0.95],[x,vh/2,0],wood);for(const z of [-0.45,0.45])s.box([1.3,vh,0.05],[0,vh/2,z],wood);s.box([1.2,0.02,0.85],[0,vh-0.05,0],glaze);}
    const ry=a.position==='raised'?vh+0.4:a.position==='side'?0.65:vh+0.08,rx=a.position==='side'?1.25:0,n=2+Math.round(a.batch*2),mat=a.rack==='wood'?wood:metal;
    for(const z of [-0.36,0.36])s.box([1.1,0.04,0.04],[rx,ry,z],mat);for(let i=0;i<n;i++)s.box([0.035,0.04,0.72],[rx-0.45+i*0.9/(n-1),ry,0],mat);
    if(a.position!=='empty')for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=rx-0.4+i*0.8/(n-1),z=-0.28+j*0.56/(n-1),count=a.pieces==='post'?4:a.pieces==='spool'?2:1;for(let k=0;k<count;k++)s.cylinder(a.pieces==='disc'?0.12:0.07,0.045,0.035,[x,ry+0.055+k*0.06,z],glaze,20);s.cylinder(0.035,0.035,count*0.06,[x,ry+0.035+count*0.03,z],a.pieces==='spool'?raw:glaze,16);if(a.rack==='hooks')s.rod([x,ry+0.3,z],[x,ry+0.05,z],0.006,metal);if(a.state==='drips'&&(i+j)%2===0)s.rod([x,ry,z],[x,ry-0.15,z],0.005,glaze);}
    for(const x of [rx-0.53,rx+0.53]){if(a.handles==='bars')s.tube([[x,ry,-0.3],[x,ry+0.25,-0.3],[x,ry+0.25,0.3],[x,ry,0.3]],0.018,metal);else for(const z of [-0.3,0.3])s.rod([x,ry,z],[rx,ry+0.55,0],a.handles==='rope'?0.014:0.009,a.handles==='rope'?wood:metal);}
    if(a.handles==='cross')s.rod([rx-0.35,ry+0.55,0],[rx+0.35,ry+0.55,0],0.03,wood);
    if(a.position==='raised'||a.position==='low')for(const x of [-0.75,0.75]){s.rod([x,0,0],[x,ry,0],0.025,metal);s.rod([x,ry,0],[x*0.7,ry,0],0.025,metal);}
    if(a.drain!=='none'||a.position==='side'){s.box([0.9,0.06,1],[1.25,0.62,0],a.drain==='tray'?metal:wood);for(const x of [0.9,1.6])for(const z of [-0.4,0.4])s.box([0.05,0.59,0.05],[x,0.295,z],wood);if(a.drain==='mesh'||a.drain==='board')for(let i=0;i<8;i++)s.box([0.8,0.01,0.012],[1.25,0.657,-0.4+i*0.11],dark);}
    if(a.state==='stir')s.rod([-0.5,0.1,0.2],[0.25,vh+0.35,0.2],0.025,wood);if(a.state==='tag')s.label('GLAZE 8',0.25,0.1,[rx,ry,0.4],'#65735a','#ded0a8');return s.finish();

  },
});

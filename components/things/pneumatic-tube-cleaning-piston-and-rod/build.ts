import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    head: choice("What cleaning piston is fitted?", {"discs": "Two broad rubber sealing discs.", "brush": "A dense circular brush head.", "felt": "A thick felt cleaning plug.", "scraper": "A metal scraper disc."}),
    rod: choice("What push rod is used?", {"straight": "A single long straight rod.", "jointed": "Three joined rod sections.", "handle": "A rod with a broad T handle.", "coil": "A flexible coiled cleaning cable."}),
    count: choice("How many spare heads?", {"one": "One spare head.", "two": "Two spare heads.", "three": "Three spare heads.", "none": "No spare head."}),
    tray: choice("What holds the service kit?", {"wood": "A long timber service tray.", "metal": "A shallow steel tray.", "rack": "A raised maintenance rack.", "board": "A plain work board."}),
    tube: choice("What tube sample is included?", {"cut": "A split inspection tube.", "short": "A short complete tube section.", "elbow": "A curved tube elbow.", "none": "No tube sample."}),
    couplings: choice("What couplings join the rods?", {"brass": "Threaded brass sleeves.", "pins": "Pinned steel couplings.", "knobs": "Large hand-tightened knobs.", "plain": "Plain smooth joints."}),
    tools: choice("What service tool lies nearby?", {"wrench": "A long service wrench.", "oil": "A small oil bottle.", "rag": "A folded cleaning rag.", "none": "No extra tool."}),
    state: choice("What use state is visible?", {"ready": "A clean assembled kit.", "dirty": "A dark deposit on the piston.", "removed": "The piston is detached from the rod.", "packed": "Spare heads are stacked together."}),
    length: score("How long is the service rod?", ["Short office tube kit", "Standard service kit", "Long exchange cleaning kit"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#718879',{metalness:.5}),dark=s.material('#3f5247'),brass=s.material('#bca66e',{metalness:.7}),wood=s.material('#a58d64'),pale=s.material('#dbd1b1'),red=s.material('#a86d53');

 const L=.8+a.length*.9,Y=a.tray==='rack'?.55:.035,W=L+.3,D=.6;s.box([W,.035,D],[0,Y-.0175,0],a.tray==='metal'?metal:wood);if(a.tray==='rack')for(const x of [-W*.43,W*.43])for(const z of [-.23,.23])s.rod([x,0,z],[x,Y,z],.022,metal);if(a.tray==='wood'||a.tray==='metal')for(const z of [-D/2,D/2])s.box([W,.05,.025],[0,Y+.025,z],wood);
 if(a.rod!=='coil')for(const x of [-L*.35,L*.2])s.box([.08,.08,.08],[x,Y+.04,0],wood);
 const ry=Y+.09;if(a.rod==='coil'){const pts:[number,number,number][]=[];for(let j=0;j<130;j++){const t=j/129*Math.PI*6;pts.push([Math.cos(t)*.23,Y+.012+j/129*.035,Math.sin(t)*.23]);}s.tube(pts,.007,dark);s.rod([.23,Y+.04,0],[L/2-.12,ry,0],.01,metal);}else{s.rod([-L/2,ry,0],[L/2-.1,ry,0],.01,metal);if(a.rod==='handle')s.rod([-L/2,ry,-.12],[-L/2,ry,.12],.025,wood);if(a.rod==='jointed')for(const x of [-L*.18,L*.18]){s.cylinder(a.couplings==='knobs'?.03:.02,a.couplings==='knobs'?.03:.02,.06,[x,ry,0],a.couplings==='brass'?brass:metal,16).rotation.z=Math.PI/2;if(a.couplings==='pins')s.rod([x,ry-.025,0],[x,ry+.025,0],.006,brass);}}
 const hx=a.state==='removed'?L/2+.06:L/2-.08,hz=a.state==='removed'?.17:0;const head=(x:number,y:number,z:number)=>{if(a.head==='brush'){s.cylinder(.05,.05,.08,[x,y,z],wood,20).rotation.z=Math.PI/2;for(let j=0;j<24;j++){const t=j*Math.PI/12;s.rod([x,y+Math.cos(t)*.04,z+Math.sin(t)*.04],[x,y+Math.cos(t)*.085,z+Math.sin(t)*.085],.004,dark);}}else for(const dx of a.head==='discs'?[-.035,.035]:[0])s.cylinder(.08,.08,a.head==='felt'?.09:.018,[x+dx,y,z],a.head==='scraper'?metal:dark,24).rotation.z=Math.PI/2;};head(hx,ry,hz);
 const n={one:1,two:2,three:3,none:0}[a.count];for(let j=0;j<n;j++){const x=a.state==='packed'?-L*.35:-L*.35+j*.19;const disk=s.cylinder(.08,.08,.015,[x,Y+.008+(a.state==='packed'?j*.016:0),.2],dark,24);}
 if(a.tube==='short')s.lathe([[.11,0],[.11,.25],[.095,.25],[.095,0]],metal,[-L*.3,Y,-.2]);if(a.tube==='elbow')s.tube([[-L*.3,Y+.11,-.23],[-L*.1,Y+.11,-.23],[0,Y+.3,-.23]],.1,metal);if(a.tube==='cut')s.surface((u,v,p)=>p.set(-L*.3+u*.4,Y+.11+Math.cos(Math.PI/2+v*Math.PI)*.1,-.2+Math.sin(Math.PI/2+v*Math.PI)*.1),metal,{segments:[3,16]});
 if(a.tools==='wrench'){s.rod([-.2,Y+.012,.24],[.15,Y+.012,.24],.012,metal);s.ring(.035,.01,[.18,Y+.012,.24],metal,Math.PI*1.5).rotation.x=Math.PI/2;}if(a.tools==='oil'){s.cylinder(.04,.04,.12,[0,Y+.06,-.2],wood,16);s.cylinder(.02,.02,.025,[0,Y+.13,-.2],brass,12);}if(a.tools==='rag')s.box([.2,.02,.15],[0,Y+.01,-.2],pale);if(a.state==='dirty')s.cylinder(.06,.06,.008,[hx+.05,ry,hz],wood,24).rotation.z=Math.PI/2;return s.finish();

  },
});

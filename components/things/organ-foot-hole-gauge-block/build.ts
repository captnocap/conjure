import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    block: choice("What is the gauge body?", {"wood": "A rectangular hardwood block.", "brass": "A brass gauge plate.", "round": "A circular gauge block.", "steps": "A stepped measuring block."}),
    holes: choice("How are gauge holes arranged?", {"row": "One straight row of holes.", "double": "Two rows of holes.", "arc": "A curved fan of holes.", "circle": "A circular hole pattern."}),
    count: choice("How many gauge positions?", {"five": "Five gauge sizes.", "seven": "Seven gauge sizes.", "nine": "Nine gauge sizes.", "eleven": "Eleven gauge sizes."}),
    mandrels: choice("What mandrels are present?", {"cones": "Three graduated conical mandrels.", "pins": "Four straight steel pins.", "handled": "Two wooden-handled reamers.", "none": "Only the gauge block."}),
    mount: choice("What supports the gauge?", {"flat": "Flat on the work surface.", "feet": "Four short rubber feet.", "box": "A shallow tool storage box.", "stand": "A small inclined stand."}),
    sample: choice("What pipe foot is compared?", {"metal": "A metal conical pipe foot.", "wood": "A square wooden pipe foot.", "pair": "Two different pipe feet.", "none": "No sample pipe foot."}),
    marks: choice("What measuring marks appear?", {"numbers": "Numbers identify the holes.", "ticks": "A fine measuring rule.", "bands": "Size bands beside each hole.", "plain": "An unmarked gauge."}),
    state: choice("What working detail appears?", {"ready": "A clean gauge setup.", "inserted": "A mandrel occupies one hole.", "shavings": "A few metal shavings.", "notes": "A measurement card lies alongside."}),
    size: score("How wide is the gauge?", ["Small portable gauge", "Standard bench gauge", "Large shop comparison gauge"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#a3aaa0',{metalness:.6,roughness:.45}),dark=s.material('#444f47'),brass=s.material('#b89e66',{metalness:.65}),wood=s.material('#a38a62'),pale=s.material('#d9cfb1'),leather=s.material('#77614c');

 const W=.45+a.size*.3,D=.22,Y=a.mount==='box'?.12:a.mount==='stand'?.1:.025,n={five:5,seven:7,nine:9,eleven:11}[a.count],mat=a.block==='brass'?brass:wood;
 if(a.mount==='feet')for(const x of [-W*.4,W*.4])for(const z of [-.08,.08])s.cylinder(.018,.018,.025,[x,.0125,z],dark,12);if(a.mount==='box')s.box([W+.06,Y,.3],[0,Y/2,0],wood);if(a.mount==='stand')for(const x of [-W*.4,W*.4])s.box([.025,Y,.2],[x,Y/2,0],wood);
 if(a.block==='round')s.cylinder(W/2,W/2,.05,[0,Y+.025,0],mat,32);else s.box([W,.05,D],[0,Y+.025,0],mat);if(a.block==='steps')s.box([W*.45,.04,D],[W*.25,Y+.07,0],mat);
 for(let j=0;j<n;j++){const t=j/n*Math.PI*2,x=a.holes==='circle'?Math.cos(t)*W*.32:-W*.4+j*W*.8/(n-1),z=a.holes==='circle'?Math.sin(t)*W*.32:a.holes==='arc'?.05*Math.sin(j/(n-1)*Math.PI):a.holes==='double'?(j%2?-.045:.045):0,y=Y+.05+(a.block==='steps'&&x>W*.025?.04:0),r=.005+j*.0012;s.cylinder(r,r,.002,[x,y+.001,z],dark,16);s.ring(r,.0015,[x,y+.003,z],brass).rotation.x=Math.PI/2;if(a.marks==='numbers')s.label(String(j+1),.035,.025,[x,y+.015,z+.04],'#dfd2b0','#5c533f');if(a.marks==='bands')s.box([.015,.002,.012],[x,y+.003,z-.035],brass);if(a.state==='inserted'&&j===Math.floor(n/2))s.cylinder(.002,.012,.18,[x,y+.09,z],metal,12);}
 const mz=D/2+.1;if(a.mandrels==='cones')for(let j=0;j<3;j++)s.cylinder(.002,.012+j*.003,.2,[(-1+j)*.08,.015,mz],metal,16).rotation.z=Math.PI/2;if(a.mandrels==='pins')for(let j=0;j<4;j++)s.rod([-.2+j*.1,.01,mz],[.02+j*.1,.01,mz],.005,metal);if(a.mandrels==='handled')for(const z of [mz,mz+.07]){s.rod([-.18,.012,z],[.1,.012,z],.005,metal);s.rod([.1,.012,z],[.22,.012,z],.012,wood);}
 if(a.sample!=='none')for(const x of a.sample==='pair'?[-W/2-.1,W/2+.1]:[W/2+.1]){if(a.sample==='wood')s.box([.08,.15,.08],[x,.075,0],wood);else s.lathe([[.008,0],[.05,.18],[.04,.18],[.005,.02]],metal,[x,0,0]);}if(a.marks==='ticks')for(let j=0;j<15;j++)s.box([.002,.002,.015],[-W*.4+j*W*.8/14,Y+.052,-.09],dark);if(a.state==='shavings')for(let j=0;j<5;j++)s.ring(.012,.002,[-.15+j*.065,.004,-D/2-.07],metal,Math.PI*1.5).rotation.x=Math.PI/2;if(a.state==='notes')s.box([.16,.003,.12],[0,.0015,-D/2-.12],pale);return s.finish();

  },
});

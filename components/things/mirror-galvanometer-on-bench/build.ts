import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    case: choice("What encloses the instrument?", {"round": "A round brass instrument case.", "square": "A glazed square enclosure.", "open": "An exposed circular coil and mirror.", "tall": "A tall cylindrical glass case."}),
    coil: choice("How is the measuring coil arranged?", {"single": "One large circular coil.", "double": "Two narrow adjacent coils.", "square": "A square framed coil.", "covered": "A covered black coil housing."}),
    base: choice("What supports the instrument?", {"wood": "A polished wood optical bench.", "stone": "A heavy stone base.", "tripod": "Three adjustable levelling feet.", "rail": "A long metal optical rail."}),
    scale: choice("What readout catches the light?", {"arc": "A curved graduated scale.", "straight": "A long straight scale board.", "card": "A small ruled card.", "none": "No separate scale."}),
    lamp: choice("What is the light source?", {"oil": "A small brass oil lamp.", "electric": "A cylindrical electric lamp.", "hood": "A lamp inside a black hood.", "none": "No lamp fitted."}),
    terminals: choice("Where are the electrical contacts?", {"front": "Two front binding posts.", "sides": "One binding post on each side.", "four": "Four colour coded terminal posts.", "covered": "A covered terminal box."}),
    glass: choice("What glass covers the case?", {"clear": "Nearly clear glass.", "green": "Faintly green glass.", "amber": "Amber protective glass.", "none": "Glass removed."}),
    state: choice("What reading is visible?", {"centre": "A light spot near the centre.", "left": "A spot toward the left end.", "right": "A spot toward the right end.", "service": "A small cover rests on the bench."}),
    width: score("How long is the optical bench?", ["A compact instrument", "A standard cable instrument", "A long sensitive instrument"])
  },
  build(a,context){

 const s=new Sculpture(context),brass=s.material('#b49d62',{metalness:0.75}),dark=s.material('#465548'),wood=s.material('#91744b'),paper=s.material('#d6d0ae'),w=0.75+a.width*0.6;
 const b=a.base==='stone'?s.material('#aeb29c'):a.base==='rail'?dark:wood;if(a.base==='tripod')s.cylinder(w*0.55,w*0.55,0.08,[0,0.12,0],b,40).scale.z=0.6;else s.box([w,0.08,0.65],[0,0.12,0],b);for(const [x,z] of a.base==='tripod'?[[-w*0.38,0.2],[w*0.38,0.2],[0,-0.25]]:[[-w*0.38,-0.22],[-w*0.38,0.22],[w*0.38,-0.22],[w*0.38,0.22]])s.cylinder(0.045,0.045,0.08,[x,0.04,z],brass,16);const cy=0.42;s.box([0.25,0.1,0.2],[0,0.2,-0.12],brass);
 if(a.coil==='square'){for(const x of [-0.17,0.17])s.box([0.04,0.34,0.09],[x,cy,-0.12],dark);for(const y of [cy-0.17,cy+0.17])s.box([0.38,0.04,0.09],[0,y,-0.12],dark);}else for(const z of a.coil==='double'?[-0.17,-0.08]:[-0.12]){s.ring(0.17,0.045,[0,cy,z],a.coil==='covered'?dark:brass);for(let j=0;j<5;j++)s.ring(0.16+j*0.01,0.004,[0,cy,z+0.05],dark);}
 s.cylinder(0.055,0.055,0.008,[0,cy,-0.05],s.material('#b8c9bd',{metalness:1,roughness:0.05}),24).rotation.x=Math.PI/2;s.rod([0,cy+0.24,-0.06],[0,cy,-0.06],0.002,brass);
 if(a.case!=='open'){const mat=s.material(a.glass==='amber'?'#c3aa72':a.glass==='green'?'#9bbca5':'#c1d3c5',{transparent:true,opacity:a.glass==='none'?0:0.17,depthWrite:false});if(a.case==='square'){for(const x of [-0.24,0.24])for(const z of [-0.3,0.08])s.rod([x,0.16,z],[x,0.72,z],0.012,brass);s.box([0.5,0.025,0.4],[0,0.72,-0.11],brass);s.box([0.48,0.54,0.38],[0,0.44,-0.11],mat);}else{s.cylinder(0.25,0.25,a.case==='tall'?0.7:0.5,[0,a.case==='tall'?0.51:0.41,-0.1],mat,32);s.cylinder(0.26,0.26,0.025,[0,a.case==='tall'?0.86:0.66,-0.1],brass,32);}}
 if(a.case==='round'||a.case==='tall')for(const x of [-0.22,0.22])s.rod([x,0.16,-0.17],[x,a.case==='tall'?0.86:0.66,-0.17],0.009,brass);if(a.case==='open'){s.rod([0,0.16,-0.22],[0,cy+0.24,-0.22],0.012,brass);s.rod([0,cy+0.24,-0.22],[0,cy+0.24,-0.06],0.012,brass);}else s.rod([0,cy+0.24,-0.06],[0,a.case==='tall'?0.86:a.case==='square'?0.72:0.66,-0.06],0.002,brass);if(a.scale!=='none'){const sw=a.scale==='card'?0.35:w*0.9;for(const x of [-sw*0.4,sw*0.4])s.rod([x,0.16,0.25],[x,0.38,0.25],0.012,brass);s.box([sw,0.18,0.02],[0,0.38,0.25],paper);for(let j=0;j<15;j++)s.box([0.004,j%5===0?0.08:0.04,0.007],[-sw*0.45+j*sw*0.9/14,0.38,0.264],dark);const spot=a.state==='left'?-sw*0.3:a.state==='right'?sw*0.3:0;s.ball([0.013,0.018,0.003],[spot,0.36,0.27],s.material('#e6d28a',{emissive:'#d9bd5a',emissiveIntensity:0.6}),12);if(a.scale==='arc')s.ring(sw*0.5,0.008,[0,0.28,0.25],brass,Math.PI);}
 if(a.lamp!=='none'){const x=-w*0.38;s.cylinder(0.065,0.09,0.13,[x,0.22,-0.1],brass,24);s.cylinder(a.lamp==='hood'?0.1:0.055,a.lamp==='hood'?0.1:0.055,0.18,[x,0.38,-0.1],a.lamp==='hood'?dark:brass,24);s.ball([0.035,0.035,0.03],[x,0.38,0],paper,12);}
 for(let j=0;j<(a.terminals==='four'?4:2);j++){const x=a.terminals==='sides'?(j?0.28:-0.28):(j-0.5)*0.12;s.cylinder(0.018,0.018,0.045,[x,0.185,a.terminals==='front'?0.06:-0.28],brass,12);}if(a.terminals==='covered')s.box([0.25,0.08,0.12],[0,0.2,-0.27],dark);if(a.state==='service')s.cylinder(0.1,0.1,0.015,[w*0.35,0.17,-0.15],brass,24);return s.finish();

  },
});

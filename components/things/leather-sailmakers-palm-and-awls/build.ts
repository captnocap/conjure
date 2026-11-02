import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    palm: choice("What sort of leather palm is it?", {"brown": "A broad brown leather palm.", "black": "A black leather palm with brass plate.", "red": "A worn reddish hide palm.", "open": "An unbuckled palm spread open."}),
    plate: choice("What pushes the needle?", {"round": "A round dimpled steel plate.", "square": "A square metal plate.", "brass": "A polished brass oval.", "worn": "A plate with a dark worn central hollow."}),
    needles: choice("How are the needles arranged?", {"fan": "Five needles spread in a fan.", "book": "Needles held in a folding canvas book.", "threaded": "One long needle carries a trailing thread.", "tin": "A shallow tin holds spare needles."}),
    awl: choice("Which awl is ready?", {"straight": "A straight awl with a bulbous wood handle.", "curved": "A hooked awl for pulling stitches.", "pair": "Two awls with different handle sizes.", "broken": "A snapped awl lies beside its tip."}),
    thread: choice("How is waxed thread stored?", {"coil": "A loose coil of pale thread.", "spool": "A squat wooden spool.", "ball": "A tight ball of dark twine.", "card": "Thread wound around a cardboard card."}),
    canvas: choice("What canvas sample is present?", {"patch": "A square patch with sewn edges.", "corner": "A reinforced triangular sail corner.", "strip": "A narrow hemmed strip.", "none": "No canvas sample."}),
    wax: choice("How is the stitching wax supplied?", {"block": "A yellow beeswax block.", "tin": "A small round wax tin.", "cake": "A dark scored wax cake.", "none": "No wax remains."}),
    order: choice("What shows the work in progress?", {"stitch": "A half-finished row of stitches.", "thimble": "A metal thimble waits beside the tools.", "tag": "A REPAIR label is tied to the palm.", "snips": "Small thread snips lie ready."}),
    spread: score("How widely are the tools spread?", ["A compact roll", "A normal working spread", "Laid out for inspection"])
  },
  build(a,context){

    const s=new Sculpture(context),leather=s.material({brown:'#8b6041',black:'#393c32',red:'#985c46',open:'#a47a50'}[a.palm]),metal=s.material(a.plate==='brass'?'#ad9356':'#a9afa1',{metalness:0.8}),wood=s.material('#9f7a4e'),thread=s.material('#b7a878'),cloth=s.material('#ded6b4'),dark=s.material('#414638');const gap=0.12+a.spread*0.13;
    const palm=s.ring(0.07,0.022,[-gap,0.025,0],leather,a.palm==='open'?Math.PI*1.3:Math.PI*2);palm.rotation.x=Math.PI/2;s.box([0.1,0.025,0.11],[-gap,0.03,0.045],leather);
    if(a.plate==='square')s.box([0.045,0.005,0.045],[-gap,0.047,0.045],metal);else{s.cylinder(0.025,a.plate==='brass'?0.018:0.025,0.006,[-gap,0.048,0.045],metal,24);for(let j=0;j<7;j++)s.ball([0.002,0.001,0.002],[-gap+Math.cos(j)*0.016,0.053,0.045+Math.sin(j)*0.016],dark,8);}
    if(a.plate==='worn')s.cylinder(0.01,0.01,0.002,[-gap,0.052,0.045],dark,16);
    const n=a.needles==='threaded'?1:5;if(a.needles==='book')s.box([0.12,0.006,0.14],[0,0.005,-0.04],cloth);if(a.needles==='tin')s.box([0.14,0.02,0.15],[0,0.012,-0.04],metal);
    for(let j=0;j<n;j++){const x=(j-(n-1)/2)*0.02;s.rod([x,0.035,-0.1],[x+(a.needles==='fan'?(j-2)*0.01:0),0.035,0.04],0.0018,metal);s.ring(0.003,0.001,[x,0.035,-0.1],metal).rotation.x=Math.PI/2;}
    if(a.needles==='threaded')s.tube([[0,0.035,-0.1],[0.06,0.01,-0.16],[0.12,0.01,-0.1],[0.05,0.01,-0.03]],0.002,thread);
    for(let i=0;i<(a.awl==='pair'?2:1);i++){const x=gap+i*0.055;s.ball([0.022,0.02,0.043],[x,0.025,0.06],wood,16);s.rod([x,0.025,0.025],[x,0.025,-0.09],0.003,metal,0.001);if(a.awl==='curved')s.ring(0.018,0.003,[x+0.018,0.025,-0.09],metal,Math.PI).rotation.x=Math.PI/2;if(a.awl==='broken')s.rod([x+0.03,0.008,-0.12],[x+0.04,0.008,-0.15],0.002,metal);}
    if(a.thread==='coil')for(let j=0;j<5;j++)s.ring(0.04+j*0.004,0.003,[-gap,0.01,0.18],thread).rotation.x=Math.PI/2;if(a.thread==='spool'){s.cylinder(0.035,0.035,0.05,[-gap,0.035,0.18],thread,24);for(const y of [0.008,0.061])s.cylinder(0.044,0.044,0.007,[-gap,y,0.18],wood,24);}if(a.thread==='ball')s.ball([0.04,0.035,0.04],[-gap,0.036,0.18],dark,20);if(a.thread==='card'){s.box([0.09,0.006,0.06],[-gap,0.008,0.18],cloth);for(let j=0;j<8;j++)s.box([0.004,0.009,0.065],[-gap+(j-3.5)*0.008,0.014,0.18],thread);}
    if(a.canvas!=='none'){s.box([a.canvas==='strip'?0.24:0.15,0.005,a.canvas==='strip'?0.035:0.12],[0.06,0.005,0.19],cloth);if(a.canvas==='corner'){const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(0.16,0);shape.lineTo(0,0.14);shape.closePath();s.mesh(new THREE.ShapeGeometry(shape),cloth,[0.02,0.009,0.12]).rotation.x=-Math.PI/2;}if(a.order==='stitch')for(let j=0;j<9;j++)s.box([0.002,0.002,0.012],[-0.005+j*0.016,0.009,0.225],dark);}
    if(a.wax!=='none'){const wax=s.material(a.wax==='cake'?'#7d6943':'#c2ab60');if(a.wax==='tin')s.cylinder(0.034,0.034,0.025,[gap,0.015,0.19],metal,24);s.box([0.05,0.023,0.045],[gap,0.025,0.19],wax);}
    if(a.order==='thimble')s.cylinder(0.012,0.018,0.025,[0,0.013,0.3],metal,18);if(a.order==='tag'){const tag=s.label('REPAIR',0.08,0.035,[-gap,0.06,0.045],'#48513b','#ded4b0');tag.rotation.x=-Math.PI/2;}if(a.order==='snips')for(const side of [-1,1])s.rod([0,0.009,0.27],[0.07,0.009,0.27+side*0.02],0.004,metal);
    return s.finish();

  },
});

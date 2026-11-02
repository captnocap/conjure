import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    coil: choice("How is the rope coiled?", {"flat": "A broad flat spiral.", "stack": "A tall stack of circular turns.", "figure": "A figure-eight coil.", "hank": "A long folded hank."}),
    fibre: choice("What fibre is visible?", {"hemp": "Golden laid hemp.", "sisal": "Pale sisal rope.", "tar": "Dark tarred maritime rope.", "white": "Cream cotton rope."}),
    skid: choice("What supports the coil?", {"pallet": "A slatted timber pallet.", "sled": "Two heavy skid beams.", "round": "A round timber reel board.", "mat": "A coarse square fibre mat."}),
    end: choice("How is the end finished?", {"eye": "A large spliced eye.", "whip": "A tightly whipped end.", "fray": "A fan of loose fibres.", "knot": "A heavy stopper knot."}),
    ties: choice("How is the coil secured?", {"two": "Two crossing flat ties.", "four": "Four narrow lashing ties.", "net": "A loose cord retaining net.", "none": "No shipping ties."}),
    tail: choice("Where does the tail lie?", {"front": "A long tail trails forward.", "side": "The tail bends around one side.", "top": "The tail rests on top.", "tucked": "The tail is tucked within the coil."}),
    tag: choice("What identifies the rope?", {"length": "A paper length tag.", "diameter": "A painted diameter disc.", "shipping": "A shipping destination tag.", "none": "No identification mark."}),
    state: choice("What happened to the load?", {"fresh": "Freshly laid rope ready to ship.", "opened": "One tie is opened and hanging.", "wet": "A dark patch marks soaked rope.", "sample": "A short sample cut lies beside it."}),
    amount: score("How much rope has been coiled?", ["A modest coil", "A heavy coil", "A large working coil"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#977a4e'),rope=s.material({hemp:'#b59f6d',sisal:'#c6b98c',tar:'#505747',white:'#d6ceab'}[a.fibre]),tie=s.material('#787759'),r=0.32+a.amount*0.22,n=7+Math.round(a.amount*7),y=0.2;
    if(a.skid==='round')s.cylinder(r+0.12,r+0.12,0.08,[0,0.1,0],wood,32);else if(a.skid==='mat')s.box([r*2.4,0.025,r*2.4],[0,0.015,0],wood);else{for(const x of [-r*0.7,r*0.7])s.box([0.14,0.12,r*2.4],[x,0.06,0],wood);for(let j=0;j<(a.skid==='pallet'?5:2);j++)s.box([r*2.4,0.06,0.15],[0,0.15,(j-(a.skid==='pallet'?2:0.5))*r*0.45],wood);}
    const baseY=a.skid==='mat'?0.06:y;for(let j=0;j<n;j++){if(a.coil==='figure')s.tube(Array.from({length:65},(_,i)=>{const t=i/64*Math.PI*2;return [Math.sin(t)*r,baseY+j*0.035,Math.sin(t*2)*r*0.55] as [number,number,number];}),0.023,rope,true);else if(a.coil==='hank')s.tube([[-r,baseY+j*0.025,-r*0.4],[r,baseY+j*0.025,-r*0.4],[r+0.08,baseY+j*0.025,0],[r,baseY+j*0.025,r*0.4],[-r,baseY+j*0.025,r*0.4],[-r-0.08,baseY+j*0.025,0]],0.023,rope,true);else s.ring(a.coil==='flat'?0.12+j*(r-0.12)/n:r,0.025,[0,baseY+(a.coil==='stack'?j*0.045:0),0],rope).rotation.x=Math.PI/2;}
    const top=baseY+(a.coil==='stack'?(n-1)*0.045+0.025:a.coil==='flat'?0.025:a.coil==='figure'?(n-1)*0.035+0.023:(n-1)*0.025+0.023);
    if(a.ties!=='none')for(let j=0;j<(a.ties==='four'?4:2);j++){const x=a.ties==='four'?(j-1.5)*r*0.42:(j%2?1:-1)*r*0.55;s.tube([[x,0.12,-r-0.04],[x,top+0.02,-r],[x,top+0.02,r],[x,a.state==='opened'&&j===0?0.03:0.12,r+0.08]],a.ties==='net'?0.008:0.018,tie);}if(a.ties==='net')for(const z of [-r*0.4,r*0.4])s.rod([-r,top+0.03,z],[r,top+0.03,z],0.008,tie);
    const ex=a.tail==='side'?r+0.25:0,ez=a.tail==='top'?0:a.tail==='tucked'?r*0.3:r+0.4,ey=a.tail==='top'?top+0.03:0.04;s.tube([[0,top,r],[ex,ey,ez]],0.025,rope);
    if(a.end==='eye')s.ring(0.12,0.025,[ex,ey,ez+0.1],rope).rotation.x=Math.PI/2;if(a.end==='knot')s.ball([0.07,0.06,0.07],[ex,ey,ez],rope,16);if(a.end==='whip')for(let j=0;j<7;j++)s.ring(0.028,0.005,[ex,ey,ez-j*0.012],tie);if(a.end==='fray')for(let j=0;j<7;j++)s.rod([ex,ey,ez],[ex+(j-3)*0.025,0.025,ez+0.15],0.004,rope);
    if(a.tag!=='none')s.label(a.tag==='length'?'120 m':a.tag==='diameter'?'36 mm':'DOCK STORES',0.35,0.15,[0,top+0.005,-r*0.6],'#5e624e','#ded1a9').rotation.x=-Math.PI/2;if(a.state==='wet')s.ring(r,0.028,[0,baseY+0.05,0],tie,Math.PI*0.6).rotation.x=Math.PI/2;if(a.state==='sample')s.rod([-r-0.25,0.03,0],[-r-0.25,0.03,0.4],0.025,rope);return s.finish();

  },
});

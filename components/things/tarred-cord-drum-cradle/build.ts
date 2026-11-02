import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    drum: choice("What kind of drum is fitted?", {"wood": "Timber flanges with iron bands.", "iron": "Dark metal flanges.", "open": "Open spoke flanges.", "small": "Two narrow drums side by side."}),
    cord: choice("What is wound on it?", {"tar": "Black tarred cord.", "brown": "Brown hemp rope.", "cream": "Pale untreated line.", "red": "Red marked serving cord."}),
    fill: choice("How full is the drum?", {"full": "Full to the flange rim.", "half": "A half filled spindle.", "core": "A nearly empty core.", "uneven": "An uneven lumpy winding."}),
    cradle: choice("How is the axle held?", {"trestle": "Two wooden A-frame ends.", "steel": "An iron axle stand.", "skid": "A low timber skid.", "wheels": "A wheeled pay-off cart."}),
    guide: choice("How is line led off?", {"eye": "A tall guide eye.", "roller": "A low horizontal guide roller.", "horn": "A curved guiding horn.", "none": "No line guide."}),
    loose: choice("Where is the line end?", {"coil": "Coiled in front of the cradle.", "tail": "A short trailing tail.", "loop": "A loop over the frame.", "clear": "No loose line is visible."}),
    treatment: choice("What treatment tool remains?", {"pot": "A small black tar pot.", "brush": "A short stiff brush.", "rag": "A folded wiping rag.", "none": "No treatment tools."}),
    state: choice("What state is the drum in?", {"ready": "Ready to pay out rope.", "locked": "A locking peg arrests the axle.", "tagged": "A length label is tied on.", "repair": "One flange has a pale replacement board."}),
    width: score("How wide is the cord drum?", ["A narrow drum", "A normal drum", "A wide drum"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material('#96784b'),iron=s.material('#58665a',{metalness:0.6}),rope=s.material({tar:'#454c40',brown:'#927b4e',cream:'#c9bb8c',red:'#a36d50'}[a.cord]),w=0.55+a.width*0.6,y=0.5,r=a.fill==='full'?0.32:a.fill==='half'?0.24:a.fill==='core'?0.13:0.29;
    for(const x of [-w/2-0.1,w/2+0.1]){for(const z of [-0.3,0.3])s.rod([x,0.04,z],[x,y,0],0.04,a.cradle==='steel'?iron:wood);s.box([0.14,0.07,0.7],[x,0.04,0],wood);if(a.cradle==='wheels')for(const z of [-0.25,0.25])s.cylinder(0.07,0.07,0.05,[x,0.07,z],iron,16).rotation.z=Math.PI/2;}
    s.rod([-w/2-0.2,y,0],[w/2+0.2,y,0],0.035,iron);for(const x of [-w/2,w/2]){if(a.drum==='open'){s.ring(0.37,0.025,[x,y,0],iron).rotation.y=Math.PI/2;for(let j=0;j<8;j++)s.rod([x,y,0],[x,y+Math.cos(j*Math.PI/4)*0.37,Math.sin(j*Math.PI/4)*0.37],0.025,wood);}else s.cylinder(0.37,0.37,0.055,[x,y,0],a.drum==='iron'?iron:wood,32).rotation.z=Math.PI/2;}
    s.cylinder(r,r,w-0.08,[0,y,0],rope,32).rotation.z=Math.PI/2;for(let j=0;j<24;j++)s.ring(r+(a.fill==='uneven'?Math.sin(j)*0.025:0),0.01,[-w/2+0.05+j*(w-0.1)/23,y,0],rope).rotation.y=Math.PI/2;if(a.drum==='small')s.cylinder(0.36,0.36,0.035,[0,y,0],wood,32).rotation.z=Math.PI/2;
    if(a.guide==='eye'){s.rod([0.4,0.04,0.55],[0.4,0.65,0.55],0.018,iron);s.ring(0.08,0.015,[0.4,0.7,0.55],iron);}if(a.guide==='roller'){s.rod([-0.3,0.15,0.5],[0.3,0.15,0.5],0.04,wood);for(const x of [-0.28,0.28])s.box([0.07,0.15,0.08],[x,0.075,0.5],iron);}if(a.guide==='horn')s.tube([[0,0.04,0.5],[0,0.3,0.5],[0.12,0.4,0.5]],0.025,iron);
    if(a.loose==='coil'){s.tube([[0,y,r],[0,0.05,0.55],[0.2,0.03,0.75]],0.015,rope);for(let j=0;j<5;j++)s.ring(0.13+j*0.018,0.012,[0.2,0.025+j*0.01,0.75],rope).rotation.x=Math.PI/2;}if(a.loose==='tail')s.tube([[0,y,r],[0,0.03,0.5],[0.3,0.03,0.7]],0.016,rope);if(a.loose==='loop')s.tube([[0,y,r],[w/2+0.12,0.7,0.12],[w/2+0.2,0.15,0.12],[0,y,r]],0.014,rope);
    if(a.treatment==='pot'){s.cylinder(0.12,0.1,0.18,[-w/2-0.28,0.09,0.4],iron,24);s.ring(0.12,0.012,[-w/2-0.28,0.2,0.4],wood);}if(a.treatment==='brush'){s.box([0.2,0.025,0.05],[-0.2,0.025,0.55],wood);s.box([0.08,0.035,0.06],[-0.27,0.04,0.55],rope);}if(a.treatment==='rag')s.box([0.22,0.03,0.18],[0.4,0.02,0.65],s.material('#c2b695'));
    if(a.state==='locked')s.rod([w/2+0.04,y+0.25,0.1],[w/2+0.15,0.15,0.1],0.018,iron);if(a.state==='tagged')s.label('48 m',0.2,0.1,[w/2+0.04,y,0.32],'#ded3ad','#555d48');if(a.state==='repair')s.box([0.06,0.65,0.08],[w/2+0.033,y,0],s.material('#c2a777'));return s.finish();

  },
});

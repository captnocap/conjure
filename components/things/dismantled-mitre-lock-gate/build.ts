import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    shape: choice("What form does the gate take?", {"mitre": "A tall rectangular mitre gate.", "low": "A broad low pound-lock gate.", "arched": "A gate with a rising arched top rail.", "narrow": "A narrow side-lock gate."}),
    position: choice("How has the removed gate been set down?", {"upright": "Propped upright for inspection.", "leaning": "Leaning back against timber props.", "flat": "Laid face upward on the repair apron.", "edge": "Resting on one long edge."}),
    straps: choice("What ironwork braces the gate?", {"cross": "Two diagonal iron cross braces.", "bands": "Three broad horizontal iron bands.", "corner": "Heavy corner plates and short tie bars.", "repairs": "Several short mismatched repair straps."}),
    damage: choice("What timber repair is needed?", {"sound": "All planks are complete.", "missing": "One central plank has been removed.", "broken": "Two shortened planks leave a broken lower edge.", "patched": "A pale new board patches the centre."}),
    paddle: choice("What water paddle is fitted?", {"square": "A square opening with a raised sliding paddle.", "round": "A round iron sluice grille.", "closed": "A shut square timber paddle.", "none": "A solid gate with no paddle opening."}),
    beam: choice("What shape is the balance beam?", {"long": "A long straight oak beam.", "fork": "A forked pair of pushing handles.", "short": "A short heavy beam with an iron cap.", "broken": "A snapped beam with a pale broken end."}),
    catch: choice("What holds the gate when shut?", {"chain": "A slack iron chain hangs from the stile.", "bar": "A sliding iron latch bar.", "hook": "A curved retaining hook.", "none": "Only the empty latch mounting plates."}),
    wood: choice("What timber is exposed?", {"oak": "Deep honey-coloured oak.", "tar": "Nearly black tarred wood.", "fresh": "Pale freshly sawn replacement timber.", "bleached": "Silver-grey water-bleached boards."}),
    width: score("How broad is this gate leaf?", ["A narrow side gate", "A normal canal gate", "A broad navigation gate"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material({oak:'#816142',tar:'#454039',fresh:'#bba17a',bleached:'#9c9c86'}[a.wood],{roughness:0.65+context.mood.wear*0.3}),iron=s.material('#46524b',{metalness:0.65,roughness:0.5}),fresh=s.material('#c2aa80');
    const w=(1.5+a.width*1.5)*(a.shape==='narrow'?0.7:1),h=a.shape==='low'?1.65:2.55;
    for(let i=0;i<9;i++){if(a.damage==='missing'&&i===4)continue;const x=(i-4)*w/9,height=h-(a.damage==='broken'&&(i===3||i===4)?0.5:0);s.box([w/9-0.018,height,0.14],[x,h-height/2,0],a.damage==='patched'&&i===4?fresh:wood);}
    for(const x of [-w/2,w/2])s.box([0.2,h+0.12,0.22],[x,h/2,0.02],wood);
    for(const y of [0.28,h*0.52,h-0.15])s.box([w+0.2,0.17,0.18],[0,y,0.14],wood);
    if(a.shape==='arched')s.tube([[-w/2,h,0],[0,h+0.28,0],[w/2,h,0]],0.09,wood);
    if(a.straps==='cross')for(const side of [-1,1])s.rod([-w*0.43,side>0?0.3:h-0.25,0.26],[w*0.43,side>0?h-0.25:0.3,0.26],0.045,iron);
    if(a.straps==='bands')for(const y of [0.35,h*0.55,h-0.2])s.box([w+0.25,0.085,0.035],[0,y,0.26],iron);
    if(a.straps==='corner')for(const x of [-w*0.44,w*0.44])for(const y of [0.35,h-0.2])s.box([0.4,0.22,0.04],[x,y,0.26],iron);
    if(a.straps==='repairs')for(let i=0;i<5;i++)s.box([0.42,0.08,0.04],[(i-2)*w/5,0.5+(i%3)*0.58,0.26],iron).rotation.z=(i%2?1:-1)*0.28;
    for(const x of [-w*0.44,w*0.44])for(const y of [0.35,h*0.55,h-0.2])s.ball([0.035,0.035,0.025],[x,y,0.3],iron,10);
    if(a.paddle==='round'){s.ring(0.28,0.05,[0,0.6,0.28],iron);for(let i=-2;i<=2;i++)s.box([0.04,0.42,0.035],[i*0.09,0.6,0.29],iron);}else if(a.paddle!=='none'){
      s.box([0.67,0.6,0.025],[0,0.62,0.25],s.material('#2d3831'));s.box([0.62,0.56,0.1],[0,a.paddle==='square'?1.13:0.62,0.31],wood);for(const x of [-0.36,0.36])s.box([0.06,1.2,0.08],[x,0.9,0.3],iron);
    }
    const length={long:w+1.7,fork:w+1.3,short:w+0.5,broken:w+0.8}[a.beam];s.box([length,0.22,0.26],[(length-w)/2,h+0.08,0],wood);
    if(a.beam==='fork')for(const z of [-0.22,0.22])s.box([0.8,0.13,0.1],[length/2+0.25,h+0.08,z],wood);
    if(a.beam==='broken')s.box([0.035,0.22,0.26],[length-w/2,h+0.08,0],fresh);
    if(a.beam==='short')s.box([0.12,0.24,0.28],[length-w/2-0.06,h+0.08,0],iron);
    if(a.catch==='chain')for(let i=0;i<8;i++){const link=s.ring(0.045,0.012,[w/2+0.08,1.6-i*0.065,0.25],iron);link.rotation.y=i%2*Math.PI/2;}
    if(a.catch==='bar')s.box([0.6,0.055,0.06],[w/2,1.6,0.26],iron);
    if(a.catch==='hook')s.ring(0.13,0.025,[w/2+0.1,1.6,0.25],iron,Math.PI*1.5);
    if(a.catch==='none')s.box([0.12,0.16,0.04],[w/2,1.6,0.26],iron);
    s.root.rotation.x=a.position==='flat'?-Math.PI/2:a.position==='leaning'?-0.26:0;if(a.position==='edge')s.root.rotation.z=Math.PI/2;
    return s.finish();

  },
});

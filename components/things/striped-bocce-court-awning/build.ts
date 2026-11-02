import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the shade?", {"gable": "A peaked rectangular canopy.", "flat": "A flat sloping sun awning.", "barrel": "A shallow rounded barrel canopy.", "sail": "A stretched triangular shade sail.", "umbrella": "A broad square parasol."}),
  state: choice("What is happening at the court?", {"open": "The canopy is stretched open for play.", "closing": "The fabric is rolled up on one side.", "party": "Small pennants celebrate a club tournament.", "repair": "A corner is temporarily tied with extra rope.", "empty": "The canopy stands over an empty sideline."}),
  detail: choice("Which stripes cover the cloth?", {"green": "Green and cream club stripes.", "red": "Red and cream fairground stripes.", "ochre": "Ochre and cream summer stripes.", "blue": "Blue and pale-grey seaside stripes.", "plain": "Unstriped warm canvas."}),
  support: choice("What anchors the posts?", {"stakes": "Short stakes and taut guy ropes.", "pots": "Heavy terracotta plant pots.", "blocks": "Square concrete ballast blocks.", "feet": "Broad metal cross feet.", "sockets": "Low timber ground sockets."}),
  extra: choice("What hangs beneath the shade?", {"lamp": "A small shielded pendant lamp.", "board": "A MATCH TODAY notice.", "clock": "A round club clock.", "basket": "A hanging flower basket.", "none": "Nothing hangs from the ridge."}),
  mark: choice("What trim finishes the edge?", {"scallops": "A row of soft scallops.", "fringe": "A short hanging fringe.", "band": "A broad contrasting edge band.", "ties": "Repeated cotton tie loops.", "plain": "A plain hem."}),
  extent: score("How wide is the canopy?", ["A compact sideline shade", "A broad shelter", "A long club canopy"]),
  load: score("How deep is the shade?", ["A narrow strip", "A small seating area", "Room for several spectators"]),
  closed: noul("Are light curtains tied back at the rear corners?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=1.6+a.extent*1.5,depth=1.2+a.load*1.2,h=2.05,cloth=s.material(['#6e8b68','#a85e4a','#c4a25c','#7896a1','#cfc1a1'][d],{side:THREE.DoubleSide}),stripe=pale;
    for(const x of [-w/2,w/2])for(const z of [-depth/2,depth/2])s.rod([x,0,z],[x,h,z],.035,wood);
    const rise=f===0?.42:f===2?.3:f===4?.46:f===3?.3:.15;
    s.surface((u,v,p)=>{u=t===1?u*.55:u;const x=(u-.5)*w*(f===3?1-v:1),z=(v-.5)*depth;let y=h+(f===4?rise*(1-Math.max(Math.abs(u-.5),Math.abs(v-.5))*2):f===0?rise*(1-Math.abs(u-.5)*2):f===2?rise*Math.sin(u*Math.PI):f===3?rise*u*v:rise*v);p.set(x,y,z);},cloth,{segments:[20,10]});
    if(d!==4&&t!==1)for(let i=0;i<10;i+=2){const x0=i/10;s.surface((u,v,p)=>{const q=x0+u*.08;let y=h+.006+(f===4?rise*(1-Math.max(Math.abs(q-.5),Math.abs(v-.5))*2):f===0?rise*(1-Math.abs(q-.5)*2):f===2?rise*Math.sin(q*Math.PI):f===3?rise*q*v:rise*v);p.set((q-.5)*w*(f===3?1-v:1),y,(v-.5)*depth);},stripe,{segments:[3,8]});}
    if(t===1){s.cylinder(.08,.08,depth,[w*.05,h+rise*.9,0],cloth,16).rotation.x=Math.PI/2;}
    for(const z of [-depth/2,depth/2]){const y=h+(f===1&&z>0?rise:0);s.rod([-w/2,y,z],[w/2,y,z],.02,wood);if(f===0||f===2||f===4){s.rod([-w/2,h,z],[0,h+rise,z],.018,wood);s.rod([0,h+rise,z],[w/2,h,z],.018,wood);}if(f===1&&z>0)for(const x of [-w/2,w/2])s.rod([x,h,z],[x,y,z],.035,wood);}if(f===0||f===2||f===4)s.rod([0,h+rise,-depth/2],[0,h+rise,depth/2],.018,wood);if(f===3){s.rod([0,0,depth/2],[0,h+rise*.5,depth/2],.035,wood);for(const x of [-w/2,w/2])s.rod([x,h,-depth/2],[0,h+rise*.5,depth/2],.012,wood);}
    for(const x of [-w/2,w/2])for(const z of [-depth/2,depth/2]){if(u===0||t===3)s.rod([x,h*.75,z],[x*1.2,0,z*1.2],.004,pale);if(u===1)s.lathe([[.15,0],[.22,.28],[.2,.28],[.13,.02]],s.material('#b57d59'),[x,0,z]);if(u===2)s.box([.28,.16,.28],[x,.08,z],s.material('#a5a597'));if(u===3){s.box([.5,.035,.05],[x,.018,z],metal);s.box([.05,.035,.5],[x,.018,z],metal);}if(u===4)s.box([.2,.14,.2],[x,.07,z],wood);}
    for(let i=0;i<12;i++){const x=-w/2+(i+.5)*w/12;if(m===0)s.ball([w/24,.09,.012],[x,h-.04,depth/2],cloth,10);if(m===1)s.rod([x,h,depth/2],[x,h-.17,depth/2],.006,pale);if(m===3)s.ring(.025,.004,[x,h-.03,depth/2],pale);if(t===2)s.mesh(new THREE.ConeGeometry(.07,.14,3),i%2?cloth:pale,[x,h-.2,depth/2]).rotation.z=Math.PI;}
    if(m===2)s.box([w,.12,.014],[0,h-.055,depth/2],pale);
    if(e<4&&t!==4){s.rod([0,h+.1,0],[0,h-.32,0],.004,dark);if(e===0)s.lathe([[.16,0],[.08,.16],[.025,.18]],metal,[0,h-.5,0]);if(e===1)s.label('MATCH TODAY',.65,.24,[0,h-.4,.015]);if(e===2){s.cylinder(.17,.17,.035,[0,h-.4,0],pale,24).rotation.x=Math.PI/2;s.rod([0,h-.4,.025],[.09,h-.35,.025],.008,dark);s.rod([0,h-.4,.025],[0,h-.28,.025],.008,dark);}if(e===3){s.lathe([[.08,0],[.18,.17]],wood,[0,h-.5,0]);for(let j=0;j<8;j++)s.ball([.07,.05,.07],[(random()-.5)*.25,h-.3,(random()-.5)*.25],green,8);}}
    if(a.closed)for(const x of [-w/2,w/2]){s.surface((u,v,p)=>p.set(x+(u-.5)*(.3-Math.sin(v*Math.PI)*.14),h-v*1.4,-depth/2+Math.sin(u*Math.PI*4)*.012),s.material('#d6ceb1',{side:THREE.DoubleSide}),{segments:[10,14]});s.ring(.055,.008,[x,h-.65,-depth/2],wood).rotation.x=Math.PI/2;}
    return s.finish();
  },
});

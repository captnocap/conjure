import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    iron: choice("What cracking iron shape is used?", {"straight": "A straight full-length cracking bar.", "hook": "A long iron with a hooked tip.", "blade": "A broad flat heated blade.", "pair": "Two thin parallel cracking irons."}),
    handle: choice("What handle is fitted?", {"wood": "A turned wooden handle.", "cross": "A broad wooden cross grip.", "wrap": "A bound insulated grip.", "loop": "A forged loop handle."}),
    stand: choice("What holds the tool?", {"bench": "A narrow iron-leg bench.", "blocks": "Two low refractory rests.", "tray": "A shallow service tray.", "rack": "A vertical storage rack."}),
    heat: choice("What heats the working end?", {"box": "A small brick heating box.", "pot": "A round charcoal pot.", "slot": "A narrow enclosed heating slot.", "none": "An unheated service stand."}),
    water: choice("What cooling aid is nearby?", {"cup": "A small water cup.", "bowl": "A broad shallow cooling bowl.", "brush": "A damp marking brush.", "none": "No cooling vessel."}),
    sample: choice("What glass sample accompanies it?", {"slit": "A narrow slit tube offcut.", "half": "A half-cylinder sample.", "flat": "A small flat pane.", "none": "No glass sample."}),
    gauge: choice("What alignment aid is shown?", {"rule": "A straight edge rule.", "blocks": "Two timber end stops.", "chalk": "A pale chalk guide stick.", "none": "No alignment aid."}),
    state: choice("What working state is visible?", {"hot": "A glowing hot working tip.", "cool": "A cooling bare iron.", "wrapped": "A protective cloth near the grip.", "label": "A small length label."}),
    length: score("How long is the cracking iron?", ["Short sample iron", "Standard cracking iron", "Long cylinder cracking bar"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#536c67',{metalness:.45,roughness:.55}),wood=s.material('#a58d65'),brick=s.material('#af8b6c'),pale=s.material('#d6c8a6'),dark=s.material('#4d5951'),glass=s.material('#a3c8b9',{transparent:true,opacity:.46,depthWrite:false,roughness:.18,metalness:.1,side:THREE.DoubleSide}),edge=s.material('#829e8e',{metalness:.2}),hot=s.material('#c58952',{emissive:'#b65527',emissiveIntensity:.12+context.mood.energy*.5});

 const L=1+a.length*.9,Y=a.stand==='bench'?.7:a.stand==='rack'?.12:.05,W=L+.35;s.box([W,.05,.7],[0,Y-.025,0],wood);if(a.stand==='bench')for(const x of [-W*.42,W*.42])for(const z of [-.28,.28])s.rod([x,0,z],[x,Y,z],.025,iron);if(a.stand==='rack'){for(const x of [-L*.35,L*.35])s.rod([x,0,0],[x,.5,0],.025,iron);s.rod([-L*.35,.42,0],[L*.35,.42,0],.025,iron);}const ry=a.stand==='rack'?.46:Y+.12;
 for(const x of [-L*.33,L*.33])s.box([.12,ry-Y-.014,.12],[x,(ry+Y-.014)/2,0],brick);for(const z of a.iron==='pair'?[-.045,.045]:[0]){if(a.iron==='blade')s.box([L*.85,.015,.065],[0,ry,z],iron);else s.rod([-L/2,ry,z],[L/2,ry,z],.012,iron);if(a.iron==='hook')s.tube([[L/2-.1,ry,z],[L/2,ry,z],[L/2+.05,ry,z+.1]],.012,iron);if(a.state==='hot')s.rod([L*.25,ry,z],[L/2,ry,z],.014,hot);}
 const hx=-L*.42;if(a.handle==='wood'||a.handle==='wrap')s.rod([hx-.1,ry,0],[hx+.1,ry,0],.03,wood);if(a.handle==='cross')s.rod([hx,ry,-.13],[hx,ry,.13],.025,wood);if(a.handle==='loop')s.ring(.065,.012,[hx-.03,ry,0],iron).rotation.x=Math.PI/2;if(a.handle==='wrap')for(let j=0;j<8;j++)s.ring(.031,.003,[hx-.09+j*.025,ry,0],pale).rotation.y=Math.PI/2;
 if(a.heat==='box'||a.heat==='slot'){s.box([.32,.22,.25],[L*.34,Y+.11,-.22],brick);s.box([a.heat==='slot'?.15:.22,.1,.01],[L*.34,Y+.1,-.087],dark);s.box([.18,.035,.012],[L*.34,Y+.075,-.078],hot);}if(a.heat==='pot'){s.lathe([[0,0],[.13,0],[.16,.2],[.14,.2],[.1,.04],[0,.04]],iron,[L*.34,Y,-.22]);s.cylinder(.12,.12,.02,[L*.34,Y+.12,-.22],hot,24);}
 if(a.water==='cup'||a.water==='bowl'){const r=a.water==='bowl'?.12:.065,h=a.water==='bowl'?.06:.12;s.lathe([[0,0],[r*.8,0],[r,h],[r-.008,h],[r*.7,.01],[0,.01]],iron,[-L*.25,Y,.24]);}if(a.water==='brush'){s.rod([-L*.2,Y+.018,.25],[0,Y+.018,.25],.01,wood);s.box([.07,.025,.05],[.02,Y+.02,.25],dark);}
 if(a.sample==='flat')s.box([.3,.012,.18],[L*.1,Y+.008,.24],glass);if(a.sample==='slit'||a.sample==='half')s.surface((u,v,p)=>{const t=Math.PI+(v-.5)*(a.sample==='slit'?5.9:Math.PI);p.set((u-.5)*.28+L*.1,Y+.08+.08*Math.cos(t),.23+.08*Math.sin(t));},glass,{segments:[4,24]});if(a.gauge==='rule')s.box([L*.6,.015,.04],[0,Y+.01,.33],wood);if(a.gauge==='blocks')for(const x of [-L*.4,L*.4])s.box([.05,.07,.16],[x,Y+.035,.28],wood);if(a.gauge==='chalk')s.rod([-.15,Y+.01,.31],[.05,Y+.01,.31],.01,pale);if(a.state==='wrapped')s.box([.24,.03,.16],[-L*.35,Y+.016,-.23],pale);if(a.state==='label')s.label('CYLINDER',.24,.06,[0,Y+.04,.356],'#ded0ad','#536052');return s.finish();

  },
});

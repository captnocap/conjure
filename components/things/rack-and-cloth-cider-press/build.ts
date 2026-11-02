import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What frame carries the press?", {"oak": "A heavy oak portal with four legs.", "iron": "An arched iron frame.", "twin": "Two screw columns and a broad crossbeam.", "bench": "A short press bolted to a workbench.", "stone": "A timber frame anchored to a stone base."}),
  state: choice("What stage is the pressing at?", {"loading": "Loose cloths and a low stack await pressure.", "pressing": "The platen is lowered onto a full stack.", "draining": "Juice runs from the spout into a bucket.", "spent": "The squeezed stack is low and flattened.", "cleaning": "The empty tray is exposed for washing."}),
  detail: choice("How are the press cheeses wrapped?", {"cream": "Plain cream filter cloth.", "blue": "Blue-edged cotton cloth.", "brown": "Old tan press cloth.", "striped": "Cloth with narrow woven stripes.", "green": "Dark green synthetic press bags."}),
  support: choice("What turns the screw?", {"bar": "A long horizontal turning bar.", "wheel": "A broad spoked handwheel.", "cross": "A four-armed wooden cross handle.", "ratchet": "A short ratchet lever.", "double": "Two opposing bent handles."}),
  extra: choice("What catches the cider?", {"bucket": "A stave-built wooden bucket.", "pail": "A metal dairy pail.", "jug": "A large ceramic jug.", "tray": "A shallow catching pan.", "hose": "A hose leading to a low barrel."}),
  mark: choice("What marks the frame?", {"date": "An 1898 brass date plate.", "orchard": "ORCHARD PRESS across the beam.", "repair": "Iron repair straps on the uprights.", "notches": "Height notches beside the platen.", "plain": "Unmarked oak or iron."}),
  extent: score("How broad is the press?", ["A small household press", "An orchard press", "A communal harvest press"]),
  load: score("How many cloth cheeses are stacked?", ["Two layers", "Five layers", "Eight layers"]),
  closed: noul("Is a spare slatted pressing rack leaning beside the frame?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const w=.65+a.extent*.6,h=1.65,fw=w*.8,cloth=s.material(['#c9bea0','#aebdc0','#a38c65','#d0c1a0','#6d7c59'][d]),frame=f===1?metal:wood,base=f===3?.55:.16;
    s.box([w+.3,.12,.8],[0,base-.06,0],f===4?dark:wood);for(const x of [-fw/2,fw/2]){s.box([.11,h-base,.13],[x,(h+base)/2,0],frame);s.box([.15,.12,.9],[x,.06,0],wood);}s.box([fw+.25,.13,.18],[0,h,0],frame);
    if(f===3)for(const x of [-fw*.5,fw*.5])for(const z of [-.3,.3])s.rod([x,0,z],[x,.5,z],.035,wood);
    s.box([w,.025,.65],[0,base+.02,.02],metal);for(const x of [-w/2,w/2])s.box([.025,.075,.65],[x,base+.05,.02],wood);s.box([w,.06,.025],[0,base+.045,-.3],wood);
    const n=t===4?0:2+Math.round(a.load*6),layer=t===3?.035:.065,stack=base+.04+n*layer;
    for(let i=0;i<n;i++){s.box([w*.75,layer*.7,.48],[0,base+.04+i*layer+layer*.35,0],cloth);for(let j=0;j<7;j++)s.box([w*.72,.012,.038],[0,base+.04+(i+1)*layer-.006,-.22+j*.073],wood);if(d===1||d===3)s.box([w*.7,.008,.012],[0,base+.045+i*layer,.245],s.material('#6e8a90'));}
    const py=t===0||t===4?1.15:stack+.035;s.box([w*.78,.075,.5],[0,py,0],wood);const screwX=f===2?[-fw*.28,fw*.28]:[0];for(const x of screwX){s.cylinder(.025,.025,h-py+.16,[x,(h+py)/2+.06,0],metal,16);for(let i=0;i<12;i++)s.ring(.029,.003,[x,py+.1+i*(h-py)/13,0],dark).rotation.x=Math.PI/2;}
    const turn=new THREE.Group();turn.position.set(0,h+.13,0);if(u===0)turn.add(s.rod([-w*.65,0,0],[w*.65,0,0],.025,wood));if(u===1){const ring=s.ring(w*.42,.025,[0,0,0],metal);ring.rotation.x=Math.PI/2;turn.add(ring);for(let i=0;i<4;i++)turn.add(s.rod([0,0,0],[Math.cos(i*Math.PI/2)*w*.42,0,Math.sin(i*Math.PI/2)*w*.42],.013,metal));}if(u===2)for(const ang of [0,Math.PI/2])turn.add(s.rod([-Math.cos(ang)*w*.45,0,-Math.sin(ang)*w*.45],[Math.cos(ang)*w*.45,0,Math.sin(ang)*w*.45],.025,wood));if(u===3)turn.add(s.rod([0,0,0],[w*.55,.08,0],.018,metal));if(u===4)for(const sign of [-1,1])turn.add(s.tube([[0,0,0],[sign*w*.35,0,0],[sign*w*.35,.1,0]],.02,wood));s.root.add(turn);
    const z=.64,r=.18;if(e===0||e===1)s.lathe([[r*.8,0],[r,.3],[r-.012,.3],[r*.75,.02]],e===0?wood:metal,[0,0,z]);if(e===2)s.lathe([[.12,0],[.19,.13],[.15,.27],[.07,.34],[.06,.34],[.1,.1]],pale,[0,0,z]);if(e===3)s.lathe([[0,0],[.24,.015],[.25,.06],[.23,.06],[0,.025]],metal,[0,0,z]);if(e===4){s.cylinder(.18,.18,.4,[w*.65,.2,z],wood,20);s.tube([[0,base+.03,.35],[0,.2,.55],[w*.65,.4,z]],.015,dark);}
    s.box([.1,.018,.2],[0,base+.025,.4],metal).rotation.x=.1;if(t===2&&e!==4)s.rod([0,base+.02,.49],[0,.09,z],.007,s.material('#a9924f',{transparent:true,opacity:.7,depthWrite:false}));
    if(m===0||m===1)s.label(m===0?'1898':'ORCHARD PRESS',w*.7,.08,[0,h,.1]);if(m===2)for(const x of [-fw/2,fw/2])for(const y of [.5,1.3])s.box([.14,.08,.015],[x,y,.08],metal);if(m===3)for(let i=0;i<10;i++)s.box([.045,.006,.01],[-fw/2,.4+i*.08,.08],dark);
    if(a.closed){const rack=new THREE.Group();for(let i=0;i<7;i++)rack.add(s.box([w*.65,.025,.04],[0,0,-.25+i*.08],wood));for(const x of [-w*.23,w*.23])rack.add(s.box([.04,.025,.56],[x,-.025,0],wood));rack.rotation.x=1.1;rack.position.set(w*.8,.26,-.05);s.root.add(rack);}return s.finish({update:dt=>{if(t===1)turn.rotation.y+=dt*(.05+mood.energy*.2);}});
  },
});

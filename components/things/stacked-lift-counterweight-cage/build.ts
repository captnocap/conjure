import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    cage: choice("What is the cage construction?", {"channel": "Two deep channel steel uprights.", "angle": "Four narrow angle iron corners.", "boxed": "A broad enclosed back frame.", "timber": "Temporary timber service supports."}),
    weights: choice("What ballast fills the cage?", {"iron": "Dark iron slotted plates.", "concrete": "Pale concrete blocks.", "steel": "Thin steel slabs.", "mixed": "Alternating iron and concrete blocks."}),
    load: choice("How complete is the stack?", {"full": "The cage is filled nearly to the top.", "half": "Only the lower half is filled.", "gap": "One slot is deliberately left empty.", "service": "Several weights are removed beside it."}),
    hitch: choice("How are ropes attached?", {"single": "One central rope hitch.", "triple": "Three rope sockets.", "cross": "A broad equalizing crosshead.", "eye": "A large central lifting eye."}),
    guides: choice("What guide shoes are fitted?", {"roller": "Small guide rollers.", "sliding": "Rectangular sliding shoes.", "brass": "Brass-lined guide blocks.", "none": "The guide shoes are removed."}),
    restraint: choice("What secures the weights?", {"bar": "A front retaining bar.", "strap": "Two broad vertical straps.", "bolts": "Bolted corner retainers.", "none": "Exposed unrestrained stack."}),
    base: choice("What supports it in the shop?", {"feet": "Two broad service feet.", "skid": "A wooden skid.", "stand": "A braced service stand.", "blocks": "Four concrete support blocks."}),
    state: choice("What maintenance detail appears?", {"ready": "Clean loaded counterweight.", "number": "Weight numbers painted on the slabs.", "tag": "A red service tag.", "spare": "A removed guide shoe beside it."}),
    height: score("How tall is the weight cage?", ["A short counterweight", "A normal cage", "A tall counterweight cage"])
  },
  build(a,context){

    const s=new Sculpture(context),frame=s.material(a.cage==='timber'?'#a38a58':'#607366',{metalness:a.cage==='timber'?0:0.6}),iron=s.material('#697466'),concrete=s.material('#b2b29a'),metal=s.material('#a1ad9a',{metalness:0.7}),h=1.3+a.height*1.3,base=0.18,n=Math.floor((h-0.35)/0.15);
    for(const x of [-0.36,0.36])for(const z of a.cage==='angle'?[-0.15,0.15]:[0])s.box([0.07,h,0.35],[x,base+h/2,z],frame);for(const y of [base,base+h])s.box([0.8,0.1,0.4],[0,y,0],frame);if(a.cage==='boxed')s.box([0.75,h,0.04],[0,base+h/2,-0.2],frame);
    for(let j=0;j<n;j++){if(a.load==='half'&&j>=n/2||a.load==='gap'&&j===Math.floor(n/2)||a.load==='service'&&j>n-3)continue;const mat=a.weights==='concrete'||a.weights==='mixed'&&j%2?concrete:iron;const yy=base+0.12+j*0.15;s.box([0.64,a.weights==='steel'?0.07:0.135,0.3],[0,yy,0],mat);if(a.weights==='iron')s.box([0.09,0.045,0.012],[0,yy,0.157],frame);if(a.state==='number')s.label(String(50+j),0.12,0.07,[0.17,yy,0.158],'#dcd2b1','#687361');}
    if(a.restraint==='bar')s.box([0.76,0.1,0.04],[0,base+h*0.6,0.23],frame);if(a.restraint==='strap')for(const x of [-0.2,0.2])s.box([0.06,h,0.035],[x,base+h/2,0.22],frame);if(a.restraint==='bolts')for(const x of [-0.32,0.32])for(const y of [base+0.2,base+h-0.2])s.cylinder(0.035,0.035,0.04,[x,y,0.22],metal,6).rotation.x=Math.PI/2;
    for(const x of [-0.42,0.42])for(const y of [base+0.2,base+h-0.2]){if(a.guides==='roller')s.cylinder(0.07,0.07,0.09,[x,y,0],metal,20).rotation.x=Math.PI/2;else if(a.guides!=='none')s.box([0.14,0.15,0.22],[x,y,0],a.guides==='brass'?s.material('#ac985e'):metal);}
    if(a.hitch==='eye')s.ring(0.11,0.025,[0,base+h+0.15,0],metal);else for(const x of a.hitch==='triple'?[-0.22,0,0.22]:[0]){s.rod([x,base+h,0],[x,base+h+0.25,0],0.025,metal);s.cylinder(0.055,0.03,0.12,[x,base+h+0.1,0],metal,16);}if(a.hitch==='cross')s.box([0.65,0.08,0.18],[0,base+h+0.18,0],frame);
    for(const x of [-0.3,0.3]){s.box([a.base==='skid'?0.2:0.16,0.14,0.9],[x,0.07,0],a.base==='blocks'?concrete:a.base==='skid'?s.material('#96794b'):frame);if(a.base==='stand')for(const z of [-0.35,0.35])s.rod([x,0.1,z],[x,base+h*0.5,0],0.025,frame);}
    if(a.load==='service')for(let j=0;j<2;j++)s.box([0.64,0.12,0.3],[0.85,0.06+j*0.13,0],iron);if(a.state==='tag')s.rod([0.1,base+h,0.2],[0.1,base+h*0.8,0.24],0.004,metal);if(a.state==='tag')s.label('SERVICE',0.28,0.13,[0.1,base+h*0.8,0.24],'#e4d4ae','#a35f44');if(a.state==='spare')s.box([0.14,0.15,0.22],[-0.7,0.075,0.2],metal);return s.finish();

  },
});

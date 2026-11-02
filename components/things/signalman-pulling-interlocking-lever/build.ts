import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    task: choice("What is the operator doing?", {"pull": "Pulling the centre lever forward.", "hold": "Holding an upright lever.", "latch": "Holding the latch and lever together.", "check": "Holding the lever while checking the route card."}),
    clothes: choice("What clothes are worn?", {"jacket": "A buttoned work jacket.", "waistcoat": "A fitted waistcoat.", "shirt": "A plain shirt.", "coat": "A long station coat."}),
    head: choice("What headwear is shown?", {"cap": "A railway cap.", "bare": "Short uncovered hair.", "bun": "Hair in a bun.", "hat": "A brimmed felt hat."}),
    bank: choice("What surrounds the working lever?", {"single": "A single isolated lever.", "three": "A three-lever frame.", "five": "A compact five-lever bank.", "pedestal": "A single lever in a solid pedestal."}),
    grip: choice("What handle does the operator use?", {"plain": "A straight black grip.", "swan": "A curved swan-neck grip.", "cross": "A short crossbar grip.", "long": "A long polished handle."}),
    floor: choice("What is underfoot?", {"boards": "A low timber platform.", "grate": "A slatted metal platform.", "bare": "The bare floor.", "mat": "A rectangular standing mat."}),
    equipment: choice("What equipment is nearby?", {"bell": "A small block bell on a shelf.", "card": "A freestanding route card.", "stool": "A small wooden stool.", "none": "No extra equipment."}),
    state: choice("What operating detail is visible?", {"normal": "Normal active working state.", "locked": "A locking pin crosses a spare lever.", "night": "A hanging hand lantern.", "register": "A closed register lies beside the frame."}),
    height: score("How tall is the operator?", ["Short adult", "Average adult", "Tall adult"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#52665c',{metalness:.5}),dark=s.material('#39463f'),brass=s.material('#b79d67',{metalness:.7}),wood=s.material('#947651'),pale=s.material('#d8ceb3'),red=s.material('#a45f4f');

 const H=1.58+a.height*.25,by=.05,Y=.4,L=H*.47,ang=a.task==='pull'?-.3:0;const p=figure(s,{height:H,pose:'standing',style:'doll',hair:a.head==='bare'?'short':a.head,top:a.clothes==='shirt'?'#d8ceb3':'#52665c',bottom:'#39463f',shoes:'#39463f',skin:'#bd9d78'});p.root.position.set(0,a.floor==='bare'?0:by,-.2);s.root.add(p.root);if(a.clothes==='waistcoat')s.box([.28,.35,.018],[0,H*.64,-.16],dark);if(a.clothes==='coat')s.box([.31,.3,.2],[0,H*.46,-.3],iron);
 const n=a.bank==='five'?5:a.bank==='three'?3:1,W=n*.2+.2;s.box([W,.06,.4],[0,.03,.3],wood);for(const x of [-W*.42,W*.42])for(const z of [.16,.44])s.rod([x,.05,z],[x,Y,z],.025,iron);s.rod([-W/2,Y,.3],[W/2,Y,.3],.025,iron);if(a.bank==='pedestal')s.box([.3,Y,.3],[0,Y/2,.3],iron);
 for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.2,active=j===Math.floor(n/2),g=new THREE.Group();g.position.set(x,Y,.3);g.rotation.x=active?ang:.15;s.root.add(g);g.add(s.rod([0,0,0],[0,L,0],.022,active?red:iron));g.add(s.rod([0,L-.13,0],[0,L+.05,0],.03,dark));if(a.grip==='swan'&&active)g.add(s.tube([[0,L,0],[0,L+.08,.05],[0,L+.15,.05]],.025,dark));if(a.grip==='cross'&&active)g.add(s.rod([-.08,L,0],[.08,L,0],.025,dark));if(a.grip==='long'&&active)g.add(s.rod([0,L-.05,0],[0,L+.18,0],.025,brass));}
 const hy=Y+L*Math.cos(ang),hz=.3+L*Math.sin(ang);p.reach('right',new THREE.Vector3(0,hy,hz),{space:s.root});if(a.task==='check'){s.box([.16,.2,.012],[.2,hy-.08,hz],pale);p.reach('left',new THREE.Vector3(.2,hy-.12,hz),{space:s.root});}else p.reach('left',new THREE.Vector3(0,hy-.1,hz-.1*Math.sin(ang)),{space:s.root});p.lookAt(new THREE.Vector3(0,hy,hz),s.root);
 if(a.floor==='boards'||a.floor==='mat')s.box([.75,.05,.9],[0,.025,-.17],a.floor==='boards'?wood:dark);if(a.floor==='grate'){s.box([.75,.04,.9],[0,.02,-.17],iron);for(let j=0;j<13;j++)s.box([.75,.01,.025],[0,.045,-.58+j*.067],brass);}
 if(a.equipment==='stool'){s.cylinder(.18,.18,.06,[.6,.45,-.2],wood,20);for(const x of [.5,.7])for(const z of [-.3,-.1])s.rod([x,0,z],[x,.42,z],.02,wood);}if(a.equipment==='card'||a.equipment==='bell'){s.box([.28,.03,.25],[.6,.85,.15],wood);s.rod([.6,0,.15],[.6,.85,.15],.025,iron);if(a.equipment==='card')s.label('ROUTE 3',.22,.15,[.6,.96,.15],'#e3d7b4','#595746');else{s.cylinder(.1,.1,.06,[.6,.9,.15],brass,20);s.rod([.6,.88,.15],[.6,1,.15],.006,iron);}}if(a.state==='locked')s.rod([-.25,Y+.1,.3],[.25,Y+.1,.3],.01,red);if(a.state==='register')s.box([.24,.035,.18],[.55,.0175,.45],dark);if(a.state==='night'){s.rod([-.45,.05,.4],[-.45,.75,.4],.018,iron);s.box([.12,.2,.12],[-.45,.6,.4],brass);}return s.finish();

  },
});

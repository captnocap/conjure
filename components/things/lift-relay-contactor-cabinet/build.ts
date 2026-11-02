import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    case: choice("What kind of cabinet is used?", {"tall": "A tall narrow steel cabinet.", "wide": "A wide two-bay cabinet.", "open": "An open relay board on a stand.", "wall": "A shallow wall panel on service feet."}),
    finish: choice("What colour is the enclosure?", {"green": "Grey-green enamel.", "cream": "Cream industrial paint.", "grey": "Plain grey steel.", "blue": "Faded blue enamel."}),
    door: choice("How is the cabinet door positioned?", {"open": "Fully swung open.", "ajar": "Partly open.", "closed": "Closed with a small meter window.", "removed": "Door removed and resting beside it."}),
    relays: choice("What relay bank is visible?", {"large": "Six large open contactors.", "dense": "Many small enclosed relays.", "mixed": "Large contactors above small relays.", "empty": "An empty rail prepared for new relays."}),
    wiring: choice("How is the wiring dressed?", {"neat": "Straight vertical wire bundles.", "loops": "Broad service loops.", "duct": "Covered slotted wiring ducts.", "bare": "Only copper bus bars remain."}),
    meters: choice("What indicators are fitted?", {"round": "Two round analog meters.", "lamps": "Three coloured pilot lamps.", "switches": "A row of toggle switches.", "none": "No external indicators."}),
    base: choice("What enters below the cabinet?", {"conduit": "Three rigid steel conduits.", "cables": "Heavy cable loops.", "tray": "A short cable tray.", "feet": "Only plain service feet."}),
    state: choice("What service state is shown?", {"ready": "Cabinet ready for operation.", "diagram": "A wiring diagram inside the door.", "lock": "A red service lock tag.", "spare": "A removed relay lies at the base."}),
    height: score("How tall is the control cabinet?", ["A compact controller", "A normal controller", "A tall controller"])
  },
  build(a,context){

    const s=new Sculpture(context),body=s.material({green:'#849482',cream:'#c9c5a8',grey:'#96a18e',blue:'#748f96'}[a.finish],{metalness:0.4}),back=s.material('#66755f'),metal=s.material('#b5ad7e',{metalness:0.65}),dark=s.material('#465346'),h=1.2+a.height*0.9,w=a.case==='wide'?1.4:0.86,d=a.case==='wall'?0.24:0.42;
    s.box([w,0.09,d],[0,0.15,0],body);s.box([w,h,0.04],[0,h/2+0.2,-d/2],back);if(a.case!=='open'){for(const x of [-w/2,w/2])s.box([0.045,h,d],[x,h/2+0.2,0],body);s.box([w,0.045,d],[0,h+0.2,0],body);}for(const x of [-w*0.35,w*0.35])s.box([0.08,0.15,d+0.12],[x,0.075,0],back);
    const rows=a.relays==='dense'?5:3,cols=a.case==='wide'?5:3;if(a.relays!=='empty')for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const x=-w*0.35+j*w*0.7/(cols-1),y=0.4+i*(h-0.3)/rows,large=a.relays==='large'||a.relays==='mixed'&&i>1;s.box([large?0.16:0.11,large?0.2:0.12,0.09],[x,y,-d/2+0.07],dark);for(const yy of [y-0.07,y+0.07])s.box([0.08,0.025,0.04],[x,yy,-d/2+0.13],metal);if(large)s.rod([x-0.05,y-0.08,-d/2+0.15],[x+0.05,y+0.08,-d/2+0.15],0.009,metal);}
    for(const x of [-w*0.43,w*0.43]){if(a.wiring==='duct')s.box([0.08,h-0.1,0.06],[x,h/2+0.2,-d/2+0.1],body);else for(let j=0;j<5;j++){if(a.wiring==='loops')s.tube([[x,0.4+j*0.2,-d/2+0.12],[x*0.5,0.35+j*0.2,-d/2+0.15],[x,0.6+j*0.2,-d/2+0.12]],0.004,metal);else s.rod([x+j*0.009,0.3,-d/2+0.12],[x+j*0.009,h+0.05,-d/2+0.12],a.wiring==='bare'?0.008:0.004,metal);}}
    if(a.case!=='open'){const g=new THREE.Group(),start=s.root.children.length;s.box([w, h,0.035],[w/2,h/2,0],body);s.box([0.025,0.16,0.04],[w-0.1,h*0.5,0.03],dark);if(a.state==='diagram')s.label('L1  L2  L3\n|   |   |\nUP  -- DOWN',w*0.6,h*0.35,[w/2,h*0.6,-0.022],'#566651','#d8cfac').rotation.y=Math.PI;
      if(a.meters==='round')for(const x of [w*0.3,w*0.7])s.cylinder(0.07,0.07,0.015,[x,h*0.8,0.025],s.material('#d7d0b2'),24).rotation.x=Math.PI/2;else if(a.meters!=='none')for(let i=0;i<3;i++){if(a.meters==='lamps')s.ball([0.022,0.022,0.015],[w*0.3+i*w*0.2,h*0.8,0.03],s.material(['#a66749','#c0ac66','#759476'][i]),10);else s.rod([w*0.3+i*w*0.2,h*0.8,0.025],[w*0.3+i*w*0.2,h*0.8+0.04,0.05],0.009,metal);}
      for(const c of s.root.children.slice(start))g.add(c);g.position.set(-w/2,0.2,d/2);g.rotation.y=a.door==='open'?-2.1:a.door==='ajar'?-0.9:0;if(a.door==='removed'){g.position.set(w/2+0.25,0.02,0);g.rotation.set(0,0,-0.08);}s.root.add(g);}
    if(a.base==='conduit')for(let i=0;i<3;i++)s.tube([[-0.2+i*0.2,0.2,0],[-0.2+i*0.2,0.03,0],[-0.2+i*0.2,0.03,0.6]],0.022,back);if(a.base==='cables')for(let j=0;j<3;j++)s.ring(0.14+j*0.025,0.014,[0,0.03,0.45],dark).rotation.x=Math.PI/2;if(a.base==='tray')s.box([w*0.7,0.045,0.7],[0,0.03,0.35],back);
    if(a.state==='lock')s.label('LOCK OUT',0.28,0.14,[w/2+0.03,h*0.6,d/2+0.03],'#e1d2ad','#a36347');if(a.state==='spare')s.box([0.16,0.12,0.1],[-w/2-0.2,0.06,0.3],dark);return s.finish();

  },
});

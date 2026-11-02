import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    flap: choice("What flap forms are laid out?", {"round": "Round bronze flap discs.", "oval": "Oval valve doors.", "square": "Square leather faced flaps.", "double": "Pairs of semicircular butterfly flaps."}),
    count: choice("How many valve sets are present?", {"one": "One large valve set.", "two": "Two matching sets.", "three": "Three graduated sets.", "four": "Four small sample sets."}),
    tray: choice("What carries the parts?", {"wood": "A divided timber tray.", "steel": "A shallow steel pan.", "felt": "A felt lined service board.", "bench": "A small raised inspection stand."}),
    seal: choice("What seals the flaps?", {"leather": "Dark leather sealing rings.", "rubber": "Thick black rubber rings.", "copper": "Bright copper sealing washers.", "bare": "Bare metal seats without seals."}),
    hinges: choice("How are the hinges shown?", {"joined": "Hinge pins remain fitted.", "removed": "Pins lie parallel to the flaps.", "open": "One flap stands partly open in its hinge.", "broken": "One short broken pin lies beside the rest."}),
    tools: choice("What tool accompanies them?", {"caliper": "A small open caliper.", "brush": "A short cleaning brush.", "spanner": "A flat two jaw spanner.", "none": "Only the valve parts."}),
    marks: choice("How are the parts identified?", {"numbers": "Numbered compartment tabs.", "arrows": "Stamped flow direction arrows.", "tags": "Small tied inspection tags.", "none": "No marks."}),
    state: choice("What inspection result is visible?", {"clean": "Freshly cleaned sealing faces.", "crack": "A dark crack marks one flap.", "pitted": "Several small pits mark one face.", "replacement": "A bright replacement flap lies at the front."}),
    size: score("How large are the inspected valves?", ["Small water line valves", "Substantial pump flaps", "Large slow-moving flaps"])
  },
  build(a,context){

 const s=new Sculpture(context),wood=s.material('#9c845d'),metal=s.material('#b39a62',{metalness:.7}),dark=s.material('#45574b'),seal=s.material(a.seal==='copper'?'#b48254':a.seal==='leather'?'#715c41':'#35483e'),n={one:1,two:2,three:3,four:4}[a.count],r=.1+a.size*.045,w=n*(r*2+.08)+.12,d=.52,by=a.tray==='bench'?.5:.04;
 s.box([w,.04,d],[0,by-.02,0],a.tray==='steel'?dark:wood);if(a.tray==='bench')for(const x of [-w*.43,w*.43])for(const z of [-d*.4,d*.4])s.box([.05,by-.04,.05],[x,(by-.04)/2,z],wood);if(a.tray==='felt')s.box([w-.02,.004,d-.02],[0,by+.002,0],dark);else for(const z of [-d/2,d/2])s.box([w,.045,.025],[0,by+.012,z],wood);
 for(let i=0;i<n;i++){const x=(i-(n-1)/2)*(r*2+.08),rr=a.count==='three'?r*(1-i*.12):r,y=by+.016;let flap:THREE.Object3D;
 if(a.flap==='square')flap=s.box([rr*1.8,.025,rr*1.8],[x,y,-.035],metal);else{flap=s.cylinder(rr,rr,.025,[x,y,-.035],metal,28);if(a.flap==='oval')flap.scale.z=1.35;if(a.flap==='double')s.box([.008,.003,rr*2],[x,y+.014,-.035],dark);}
 if(a.hinges==='open'&&i===0){const hinge=new THREE.Group();flap.position.sub(new THREE.Vector3(x,y,-.035-rr));hinge.add(flap);hinge.position.set(x,y,-.035-rr);hinge.rotation.x=-.6;s.root.add(hinge);}
 if(a.seal!=='bare')s.ring(rr*.82,.009,[x,by+.015,.16],seal).rotation.x=Math.PI/2;const hz=-.035-rr;for(const dx of [-rr*.5,rr*.5])s.box([.035,.045,.035],[x+dx,by+.0225,hz],metal);if(a.hinges==='joined'||a.hinges==='open')s.rod([x-rr*.7,by+.025,hz],[x+rr*.7,by+.025,hz],.008,dark);else s.rod([x-rr*.7,by+.009,.05],[x+(a.hinges==='broken'&&i===0?0:rr*.7),by+.009,.05],.008,dark);
 if(a.marks==='numbers')s.label(String(i+1),.055,.035,[x,by+.004,.225],'#394f43','#d7cdac').rotation.x=-Math.PI/2;if(a.marks==='arrows'){s.rod([x-.035,y+.014,-.035],[x+.035,y+.014,-.035],.003,dark);s.rod([x+.035,y+.014,-.035],[x+.012,y+.014,-.055],.003,dark);}if(a.marks==='tags'){s.label('CHECK',.075,.035,[x+rr*.4,by+.003,.22],'#44564a','#d5c9a8').rotation.x=-Math.PI/2;s.rod([x+rr*.4,by+.006,.2],[x,by+.006,.1],.002,wood);}
 if(i===0&&a.state==='crack')s.tube([[x-.06,y+.014,-.04],[x-.02,y+.014,-.015],[x+.015,y+.014,-.04],[x+.05,y+.014,.015]],.003,dark);if(i===0&&a.state==='pitted')for(let j=0;j<7;j++)s.cylinder(.006,.006,.002,[x+(context.random()-.5)*rr,y+.014,-.035+(context.random()-.5)*rr],dark,8);}
 if(a.state==='replacement')s.cylinder(r*.8,r*.8,.018,[0,.009,d/2+r+.04],s.material('#c4b579',{metalness:.85}),28);
 const tx=-w/2-.08;if(a.tools==='brush'){s.box([.045,.02,.18],[tx,.01,0],wood);for(let j=0;j<7;j++)s.rod([tx-.02+j*.006,.01,.09],[tx-.025+j*.008,.008,.14],.003,metal);}if(a.tools==='spanner'){s.box([.03,.012,.24],[tx,.006,0],metal);for(const z of [-.13,.13])s.ring(.032,.009,[tx,.01,z],metal,Math.PI*1.6).rotation.x=Math.PI/2;}if(a.tools==='caliper'){s.rod([tx-.06,.009,-.1],[tx+.06,.009,.1],.006,dark);for(const z of [-.08,.08])s.rod([tx+z*.5,.009,z],[tx+z*.5+.06,.009,z-.035],.005,dark);}return s.finish();

  },
});

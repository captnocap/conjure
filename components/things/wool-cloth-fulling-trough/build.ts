import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    shape: choice("What trough form is used?", {"rectangle": "A long rectangular trough.", "round": "A broad round tub.", "twin": "Two adjoining trough cells.", "taper": "A deep tapered trough."}),
    sides: choice("How are the sides built?", {"planks": "Horizontal timber planks.", "staves": "Vertical stave walls.", "stone": "Heavy stone slab sides.", "iron": "Riveted metal sides."}),
    cloth: choice("How is the wool cloth arranged?", {"folds": "A stack of wet folds.", "coil": "A loose rolled coil.", "spread": "A broad sheet across one rim.", "empty": "An empty trough."}),
    water: choice("What water level is visible?", {"low": "A shallow pool.", "half": "Water halfway up the trough.", "full": "A nearly full bath.", "dry": "No standing water."}),
    supports: choice("What supports the trough?", {"floor": "Directly on the floor.", "feet": "Four short timber feet.", "rails": "Two long support rails.", "blocks": "Two stone blocks."}),
    drain: choice("What drain is fitted?", {"tap": "A side drain tap.", "spout": "A broad wooden spout.", "plug": "A low plugged drain hole.", "none": "No visible drain."}),
    bars: choice("What lifting bars are fitted?", {"pair": "Two crossbars above the bath.", "single": "One long wooden lifting pole.", "rack": "A raised cloth-draining rack.", "none": "No lifting bars."}),
    state: choice("What working detail appears?", {"working": "A normal fulling bath.", "soap": "A small soap tray beside it.", "brush": "A stiff cloth brush.", "cover": "A half-width removable cover."}),
    length: score("How long is the trough?", ["Small cloth bath", "Standard fulling trough", "Long mill trough"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#9d8159'),light=s.material('#bca272'),dark=s.material('#555b45'),iron=s.material('#61745f',{metalness:.4}),cloth=s.material('#c9c3a4',{side:THREE.DoubleSide}),stone=s.material('#b3b59a'),water=s.material('#86aca0',{transparent:true,opacity:.55,depthWrite:false});

 const L=1+a.length*.8,D=a.shape==='round'?L:.75,H=.5,Y=a.supports==='floor'?0:.15,mat=a.sides==='stone'?stone:a.sides==='iron'?iron:wood;if(a.supports==='feet')for(const x of [-L*(a.shape==='round'?.3:.4),L*(a.shape==='round'?.3:.4)])for(const z of [-.28,.28])s.box([.12,Y,.12],[x,Y/2,z],wood);if(a.supports==='rails')for(const z of [-.28,.28])s.box([L+.2,Y,.12],[0,Y/2,z],wood);if(a.supports==='blocks')for(const x of [-L*.35,L*.35])s.box([.2,Y,.8],[x,Y/2,0],stone);
 if(a.shape==='round')s.lathe([[0,0],[L*.45,0],[L*.5,H],[L*.45,H],[L*.4,.06],[0,.06]],mat,[0,Y,0]);else{s.box([L,.06,D],[0,Y+.03,0],mat);for(const z of [-D/2,D/2])s.box([L,H,.05],[0,Y+H/2,z],mat);for(const x of [-L/2,L/2])s.box([.06,H,D],[x,Y+H/2,0],mat);if(a.shape==='twin')s.box([.06,H,D],[0,Y+H/2,0],wood);if(a.shape==='taper')for(const z of [-D/2-.03,D/2+.03])s.box([L,.12,.08],[0,Y+H-.06,z],wood);if(a.sides==='planks')for(const z of [-D/2-.027,D/2+.027])for(let j=1;j<5;j++)s.box([L,.008,.005],[0,Y+j*H/5,z],dark);if(a.sides==='staves')for(let j=0;j<13;j++)for(const z of [-D/2-.027,D/2+.027])s.box([.008,H,.005],[-L/2+j*L/12,Y+H/2,z],dark);}
 const wl={low:.1,half:.25,full:.43,dry:.06}[a.water];if(a.water!=='dry'){if(a.shape==='round')s.cylinder(L*.4,L*.4,.008,[0,Y+wl,0],water,32);else s.box([L-.1,.008,D-.1],[0,Y+wl,0],water);}
 if(a.cloth==='folds')for(const x of a.shape==='twin'?[-L*.25,L*.25]:[0])for(let j=0;j<5;j++)s.box([Math.min(L*(a.shape==='twin'?.35:.7),.85),.035,.4],[x,Y+.08+j*.035,0],cloth);if(a.cloth==='coil'&&a.shape!=='twin'){s.cylinder(.14,.14,Math.min(L*.7,.75),[0,Y+.2,0],cloth,24).rotation.z=Math.PI/2;for(let j=0;j<4;j++)s.ring(.05+j*.025,.008,[Math.min(L*.7,.75)/2+.002,Y+.2,0],dark).rotation.y=Math.PI/2;}if(a.cloth==='coil'&&a.shape==='twin')for(const x of [-L*.25,L*.25])s.cylinder(.14,.14,L*.35,[x,Y+.2,0],cloth,24).rotation.z=Math.PI/2;if(a.cloth==='spread')s.surface((u,v,p)=>p.set((u-.5)*Math.min(L*.65,.8),Y+H+.02-Math.max(0,v*(D/2+.3)-.1-D/2-.025)*1.5,v*(D/2+.3)-.1),cloth,{segments:[8,16]});
 const drainX=a.shape==='round'?L*.462:L/2;if(a.drain==='tap')s.tube([[drainX,Y+.12,0],[drainX+.15,Y+.12,0],[drainX+.15,Y+.06,0]],.025,iron);if(a.drain==='spout')s.box([.3,.06,.16],[drainX+.1,Y+.12,0],wood);if(a.drain==='plug')s.cylinder(.04,.04,.035,[a.shape==='round'?L*.46+.01:L/2+.015,Y+.1,0],dark,20).rotation.z=Math.PI/2;
 if(a.bars==='pair')for(const x of [-L*.3,L*.3])s.rod([x,Y+H+.02,-D*.65],[x,Y+H+.02,D*.65],.025,wood);if(a.bars==='single')s.rod([-L*.65,Y+H+.02,0],[L*.65,Y+H+.02,0],.025,wood);if(a.bars==='rack'){for(const x of [-L*.4,L*.4])s.rod([x,Y,-.25],[x,Y+H+.3,-.25],.025,wood);for(const x of [-L*.4,L*.4])s.rod([x,Y+H+.25,-.25],[x,Y+H+.25,.23],.02,wood);for(let j=0;j<5;j++)s.rod([-L*.45,Y+H+.25,-.2+j*.1],[L*.45,Y+H+.25,-.2+j*.1],.018,wood);}
 if(a.state==='soap')s.box([.18,.04,.15],[L/2+.2,.02,.35],cloth);if(a.state==='brush'){s.box([.18,.04,.1],[0,.02,.55],dark);s.rod([-.05,.05,.55],[.05,.05,.55],.015,wood);}if(a.state==='cover')s.box([L/2,.04,D+.08],[-L/4,Y+H+.02,0],wood);return s.finish();

  },
});

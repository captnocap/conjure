import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What scoring tool is used?", {"curved": "A curved razor on a slim wood handle.", "straight": "A straight razor on a short holder.", "round": "A round palm-held lame.", "long": "A long handled scoring blade.", "pair": "Two different lames lie together."}),
  state: choice("What is being scored?", {"round": "A round proofed loaf.", "oval": "A long oval loaf.", "rolls": "Three small rolls.", "cut": "A loaf with a deep opened slash.", "empty": "Only the tools on a clean board."}),
  detail: choice("What is the handle finish?", {"wood": "Pale natural timber.", "dark": "Dark walnut wood.", "red": "A red-painted handle.", "green": "A green-painted handle.", "bone": "Pale cream handle."}),
  support: choice("What work surface is used?", {"round": "A round wooden bread board.", "rect": "A rectangular cutting board.", "cloth": "A board under a linen cloth.", "tray": "A low metal baking tray.", "slats": "A small slatted work board."}),
  extra: choice("What else is on the board?", {"flour": "A small flour pile.", "brush": "A flour brush.", "cover": "A protective blade cover.", "card": "A simple scoring-pattern card.", "none": "Only bread and the lame."}),
  mark: choice("What pattern is cut into the loaf?", {"ear": "One long side slash.", "cross": "A crossed top cut.", "leaf": "A central stem with short leaf cuts.", "grid": "A small crossed grid.", "three": "Three parallel diagonal slashes."}),
  extent: score("How broad is the scoring board?", ["A small loaf board", "A family baking board", "A broad shared board"]),
  load: score("How large is the loaf?", ["A small loaf", "A medium loaf", "A generous round loaf"]),
  closed: noul("Is a thin pale flour layer dusted over the loaf?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const W=.4+a.extent*.3,D=.45,base=.025,R=.09+a.load*.07,mat=s.material(['#bda173','#806c53','#aa7158','#789267','#d1c6a7'][d]);if(u===0)s.cylinder(W*.55,W*.55,base,[0,base/2,0],wood,30);else if(u===4)for(let i=0;i<6;i++)s.box([W,base,.07],[0,base/2,(i-2.5)*.075],wood);else s.box([W,base,D],[0,base/2,0],u===3?metal:wood);if(u===2)s.box([W*.95,.004,D*.95],[0,base+.002,0],pale);const dough=s.material(a.closed?'#d0c39b':'#c0aa78'),x=-W*.16,dh=.06;if(t!==4){const n=t===2?3:1;for(let i=0;i<n;i++){const xx=x+(i-(n-1)/2)*(t===2?.1:0),rr=t===2?.055:R,z=t===1?.03:0;s.ball([rr,dh,t===1?rr*1.35:rr],[xx,base+dh,z],dough,22);const cut=(x1:number,z1:number,x2:number,z2:number,width=.003)=>{const pts:Array<[number,number,number]>=[];for(let k=0;k<=12;k++){const px=x1+(x2-x1)*k/12,pz=z1+(z2-z1)*k/12;const norm=Math.pow((px-xx)/rr,2)+Math.pow((pz-z)/(t===1?rr*1.35:rr),2);pts.push([px,base+dh+dh*Math.sqrt(Math.max(.01,1-norm))+.001,pz]);}s.tube(pts,width,wood);};if(m===0||t===3)cut(xx-rr*.5,z-rr*.55,xx-rr*.5,z+rr*.55,t===3?.006:.003);if(m===1)for(const q of [-1,1])cut(xx-rr*.5,z-q*rr*.5,xx+rr*.5,z+q*rr*.5);if(m===2){cut(xx,z-rr*.7,xx,z+rr*.7);for(let j=0;j<5;j++)cut(xx,z-rr*.5+j*rr*.23,xx+(j%2?-rr*.3:rr*.3),z-rr*.65+j*rr*.23);}if(m===3||m===4)for(let j=0;j<3;j++){cut(xx-rr*.55,z+(j-1)*rr*.4,xx+rr*.55,z+(j-1)*rr*.4);if(m===3)cut(xx+(j-1)*rr*.4,z-rr*.55,xx+(j-1)*rr*.4,z+rr*.55);}}}const n=f===4?2:1;for(let i=0;i<n;i++){const xx=W*.32,zz=(i-(n-1)/2)*.14;if(f===2)s.cylinder(.035,.035,.018,[xx,base+.01,zz],mat,18);else s.rod([xx,base+.012,zz-.07],[xx,base+.012,zz+.05+(f===3?.06:0)],.012,mat);if(f===0||f===4)s.tube([[xx-.02,base+.015,zz-.1],[xx,base+.025,zz-.12],[xx+.02,base+.015,zz-.1]],.005,metal);else s.box([.035,.003,.05],[xx,base+.02,zz-.09],metal);}if(e===0)s.ball([.045,.007,.04],[W*.25,base+.008,.17],pale,16);if(e===1){s.box([.1,.02,.045],[-W*.28,base+.04,.17],wood);s.box([.1,.025,.045],[-W*.28,base+.014,.17],pale);}if(e===2)s.box([.04,.012,.08],[W*.3,base+.006,.15],dark);if(e===3)s.label('LEAF CUT',.15,.08,[-W*.25,base+.004,.16]).rotation.x=-Math.PI/2;return s.finish();
  },
});

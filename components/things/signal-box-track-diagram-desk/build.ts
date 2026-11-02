import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    diagram: choice("What track plan is drawn?", {"junction": "A branching junction.", "station": "Two platform loops.", "crossing": "A diamond crossing.", "yard": "A fan of sidings."}),
    board: choice("What carries the diagram?", {"slope": "A low sloping diagram board.", "upright": "A tall upright board.", "double": "Two joined diagram panels.", "small": "A compact desk panel."}),
    stand: choice("What supports the desk?", {"legs": "Four timber legs.", "cabinet": "A full pedestal cabinet.", "steel": "A braced metal stand.", "table": "A wide worktable."}),
    lights: choice("What route indicators appear?", {"dots": "Round route indicator lamps.", "flags": "Small raised signal flags.", "boxes": "Square annunciator boxes.", "plain": "Only the painted diagram."}),
    controls: choice("What desk controls are visible?", {"buttons": "A row of route buttons.", "keys": "Four small locking keys.", "switches": "Four toggle switches.", "none": "No electrical controls."}),
    shelf: choice("What working ledge is fitted?", {"wide": "A broad writing ledge.", "narrow": "A narrow pencil ledge.", "drawer": "A shallow pull-out drawer.", "none": "No extra shelf."}),
    record: choice("What paperwork is present?", {"book": "An open train register.", "slips": "Three train-report slips.", "clock": "A small clock.", "none": "A clear desk."}),
    sign: choice("What identification is shown?", {"title": "A station name strip.", "numbers": "Numbered route ends.", "plate": "A side inventory plate.", "none": "No extra lettering."}),
    width: score("How wide is the desk?", ["Small station diagram", "Standard signal desk", "Wide junction diagram"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#52665c',{metalness:.5}),dark=s.material('#39463f'),brass=s.material('#b79d67',{metalness:.7}),wood=s.material('#947651'),pale=s.material('#d8ceb3'),red=s.material('#a45f4f');

 const W=.9+a.width*.7,H=.8,D=.55;const m=a.stand==='steel'?iron:wood;s.box([W,.06,D],[0,H-.03,0],m);if(a.stand==='cabinet')s.box([W*.85,H-.06,D*.8],[0,(H-.06)/2,0],wood);else for(const x of [-W*.43,W*.43])for(const z of [-.21,.21])s.rod([x,0,z],[x,H,z],.03,m);if(a.stand==='steel')for(const z of [-.21,.21])s.rod([-W*.43,0,z],[W*.43,H,z],.015,iron);
 const bh=a.board==='small'?.35:.55,angle=a.board==='upright'?0:-.45,g=new THREE.Group();g.position.set(0,H,-.16);g.rotation.x=angle;s.root.add(g);const start=s.root.children.length;s.box([W,bh,.045],[0,bh/2,0],dark);s.box([W-.06,bh-.06,.008],[0,bh/2,.028],pale);if(a.board==='double')s.box([.025,bh,.02],[0,bh/2,.04],wood);
 const line=(x1:number,y1:number,x2:number,y2:number)=>s.rod([x1,y1,.038],[x2,y2,.038],.006,iron);line(-W*.42,bh*.43,W*.42,bh*.43);if(a.diagram==='junction'){line(-W*.1,bh*.43,W*.4,bh*.8);line(-W*.1,bh*.43,W*.4,bh*.15);}if(a.diagram==='station'){line(-W*.3,bh*.43,-W*.16,bh*.7);line(-W*.16,bh*.7,W*.18,bh*.7);line(W*.18,bh*.7,W*.32,bh*.43);line(-W*.3,bh*.43,W*.32,bh*.2);}if(a.diagram==='crossing')line(-W*.4,bh*.15,W*.4,bh*.8);if(a.diagram==='yard')for(let j=0;j<4;j++)line(-W*.25,bh*.43,W*.4,bh*(.18+j*.2));
 for(let j=0;j<5;j++){const x=-W*.35+j*W*.7/4,y=bh*.43;if(a.lights==='dots')s.ball([.014,.014,.008],[x,y,.049],j%2?red:iron,8);if(a.lights==='boxes')s.box([.04,.025,.015],[x,y+.04,.045],iron);if(a.lights==='flags'){s.rod([x,y,.04],[x,y+.09,.04],.003,iron);s.box([.045,.02,.008],[x+.02,y+.08,.045],red);}if(a.sign==='numbers')s.label(String(j+1),.055,.04,[x,y-.055,.047],'#dfd6b6','#4e5448');}
 if(a.sign==='title')s.label('JUNCTION',W*.7,.07,[0,bh-.055,.045],'#d7ceb1','#4d574b');for(const obj of s.root.children.slice(start))g.add(obj);
 if(a.shelf!=='none'){const d=a.shelf==='wide'?.35:.16;s.box([W,.04,d],[0,H-.035,.24],wood);if(a.shelf==='drawer'){s.box([W*.6,.1,.3],[0,H-.14,.3],wood);s.rod([-.08,H-.14,.46],[.08,H-.14,.46],.01,brass);}}
 for(let j=0;j<4;j++){const x=-W*.32+j*W*.64/3;if(a.controls==='buttons')s.cylinder(.017,.017,.025,[x,H+.012,.14],j%2?red:iron,12);if(a.controls==='keys')s.rod([x,H+.01,.08],[x,H+.01,.2],.009,brass);if(a.controls==='switches')s.rod([x,H,.14],[x+.02,H+.05,.14],.008,iron);}
 if(a.record==='book')for(const x of [-.1,.1])s.box([.19,.02,.19],[x,H+.01,.25],pale).rotation.z=x<0?-.08:.08;if(a.record==='slips')for(let j=0;j<3;j++)s.box([.15,.003,.12],[W*.25,H+.003+j*.004,.18+j*.025],pale);if(a.record==='clock'){s.cylinder(.07,.07,.04,[W*.3,H+.08,.17],wood,24).rotation.x=Math.PI/2;s.cylinder(.06,.06,.006,[W*.3,H+.08,.195],pale,24).rotation.x=Math.PI/2;s.rod([W*.3,H+.08,.2],[W*.3+.03,H+.11,.2],.003,dark);}if(a.sign==='plate')s.label('BOX 12',.2,.07,[W/2+.006,H-.2,0],'#d8c9a4','#595441').rotation.y=Math.PI/2;return s.finish();

  },
});

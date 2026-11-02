import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    network: choice("What route network is drawn?", {"star": "Routes radiate from a central exchange.", "loop": "A circular distribution loop.", "branches": "A branching tree of destinations.", "grid": "A rectangular network of routes."}),
    panel: choice("What panel form is used?", {"upright": "A tall vertical board.", "desk": "A sloping desktop panel.", "double": "Two hinged panels.", "cabinet": "A full-height console cabinet."}),
    destinations: choice("How many destinations are shown?", {"four": "Four destinations.", "six": "Six destinations.", "eight": "Eight destinations.", "ten": "Ten destinations."}),
    connectors: choice("What routing connectors are fitted?", {"jacks": "Round patch jacks.", "switches": "Toggle route selectors.", "plugs": "Large removable route plugs.", "buttons": "Small push buttons."}),
    patches: choice("What patch connections are visible?", {"pair": "Two curved patch cords.", "many": "Several crossing patch cords.", "one": "One active patch cord.", "none": "No patch cords."}),
    mount: choice("What supports the display?", {"legs": "Four timber legs.", "steel": "A braced iron frame.", "base": "A broad low base.", "wall": "A freestanding wall panel."}),
    records: choice("What recordkeeping aid is fitted?", {"slots": "Three paper slip slots.", "shelf": "A narrow writing shelf.", "clock": "A small station clock.", "plain": "No recordkeeping aid."}),
    state: choice("What operational detail appears?", {"ready": "All routes available.", "blocked": "One route marked closed.", "service": "A spare plug rests below.", "labels": "Lettered destination cards."}),
    width: score("How broad is the route display?", ["Small exchange diagram", "Standard routing display", "Large network panel"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#718879',{metalness:.5}),dark=s.material('#3f5247'),brass=s.material('#bca66e',{metalness:.7}),wood=s.material('#a58d64'),pale=s.material('#dbd1b1'),red=s.material('#a86d53');

 const W=.8+a.width*.7,B=a.mount==='base'?.12:.65,H=.7,n={four:4,six:6,eight:8,ten:10}[a.destinations];s.box([W+.12,.06,.4],[0,B-.03,0],wood);if(a.mount==='steel'||a.mount==='legs')for(const x of [-W*.45,W*.45])for(const z of [-.16,.16])s.rod([x,0,z],[x,B,z],.025,a.mount==='steel'?metal:wood);else s.box([W,.08,.45],[0,.04,0],wood);if(a.panel==='cabinet'||a.mount==='wall')s.box([W,B,.2],[0,B/2,-.08],wood);
 const g=new THREE.Group();g.position.y=B;g.rotation.x=a.panel==='desk'?-.35:0;s.root.add(g);const start=s.root.children.length;s.box([W,H,.05],[0,H/2,0],wood);s.box([W-.05,H-.05,.008],[0,H/2,.029],pale);if(a.panel==='double')s.box([.02,H,.018],[0,H/2,.045],metal);
 const pts:[number,number][]=[];for(let j=0;j<n;j++){const t=j/n*Math.PI*2,x=Math.cos(t)*W*.37,y=H*.5+Math.sin(t)*H*.34;pts.push([x,y]);}
 const line=(u:[number,number],v:[number,number])=>s.rod([u[0],u[1],.04],[v[0],v[1],.04],.005,metal);for(let j=0;j<n;j++){const p=pts[j];if(a.network==='star')line([0,H*.5],p);else if(a.network==='loop')line(p,pts[(j+1)%n]);else if(a.network==='branches'){line([0,H*.2],[p[0]*.5,H*.5]);line([p[0]*.5,H*.5],p);}else{line([p[0],H*.5],p);line([-W*.37,H*.5],[W*.37,H*.5]);}
 s.cylinder(.018,.018,.014,[p[0],p[1],.047],dark,16).rotation.x=Math.PI/2;if(a.connectors==='plugs')s.cylinder(.012,.012,.04,[p[0],p[1],.068],brass,12).rotation.x=Math.PI/2;if(a.connectors==='switches')s.rod([p[0],p[1],.055],[p[0],p[1]+.035,.08],.005,brass);if(a.connectors==='buttons')s.ball([.015,.015,.009],[p[0],p[1],.065],j%2?red:metal,8);if(a.state==='labels')s.label(String.fromCharCode(65+j),.05,.035,[p[0],p[1]-.035,.045],'#e2d8b7','#56614a');}
 const count=a.patches==='many'?4:a.patches==='pair'?2:a.patches==='one'?1:0;for(let j=0;j<count;j++){const u=pts[j],v=pts[(j+Math.floor(n/2))%n];s.tube([[u[0],u[1],.06],[(u[0]+v[0])/2,H*.18,.14],[v[0],v[1],.06]],.007,j%2?red:dark);}if(a.state==='blocked')s.box([.09,.02,.012],[pts[0][0],pts[0][1],.07],red);for(const o of s.root.children.slice(start))g.add(o);
 if(a.records==='shelf'||a.records==='slots')s.box([W,.035,.24],[0,B-.03,.2],wood);if(a.records==='slots')for(let j=0;j<3;j++){s.box([.22,.04,.015],[-.26+j*.26,B+.02,.26],metal);s.box([.18,.09,.003],[-.26+j*.26,B+.06,.245],pale);}if(a.records==='clock'){s.cylinder(.08,.08,.04,[W*.3,B+H+.05,0],wood,24).rotation.x=Math.PI/2;s.cylinder(.065,.065,.005,[W*.3,B+H+.05,.023],pale,24).rotation.x=Math.PI/2;}if(a.state==='service')s.cylinder(.018,.018,.06,[0,B+.018,.2],brass,16).rotation.z=Math.PI/2;return s.finish();

  },
});

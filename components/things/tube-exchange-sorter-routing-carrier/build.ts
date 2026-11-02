import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    task: choice("What is the clerk doing?", {"insert": "Guiding a carrier into the receiving mouth.", "hold": "Inspecting a carrier in both hands.", "select": "Holding a carrier while selecting a route.", "unpack": "Holding an open carrier over the sorting desk."}),
    clothes: choice("What clothing is worn?", {"coat": "A short work coat.", "vest": "A waistcoat.", "apron": "A sorting apron.", "shirt": "A plain office shirt."}),
    head: choice("What hair or headwear is shown?", {"short": "Short uncovered hair.", "bun": "Hair tied in a bun.", "cap": "A small office cap.", "none": "A bare head."}),
    station: choice("What receiving station is used?", {"single": "One upright receiving tube.", "pair": "Two receiving tubes.", "cabinet": "A tube mounted in a desk cabinet.", "wall": "A freestanding tube panel."}),
    mouth: choice("What receiving mouth is fitted?", {"flared": "A flared loading mouth.", "round": "A plain circular mouth.", "door": "A mouth with an open hinged flap.", "glass": "A clear inspection sleeve."}),
    carrier: choice("What carrier is handled?", {"brass": "A brass capsule.", "wood": "A wooden capsule.", "clear": "A transparent capsule.", "ribbed": "A ribbed metal capsule."}),
    sorting: choice("What sorting aid is nearby?", {"slots": "A row of slip slots.", "tray": "A shallow message tray.", "basket": "A small dispatch basket.", "none": "No extra sorting aid."}),
    state: choice("What dispatch detail is visible?", {"ready": "Normal dispatch work.", "label": "A destination label is fitted.", "spare": "A spare capsule rests below.", "receipt": "A receipt lies beside the tube."}),
    height: score("How tall is the clerk?", ["Short adult", "Average adult", "Tall adult"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#718879',{metalness:.5}),dark=s.material('#3f5247'),brass=s.material('#bca66e',{metalness:.7}),wood=s.material('#a58d64'),pale=s.material('#dbd1b1'),red=s.material('#a86d53');

 const H=1.58+a.height*.25,Y=H*.55,z=.32;const p=figure(s,{height:H,pose:'standing',style:'doll',hair:a.head,top:a.clothes==='coat'?'#688275':'#d7c9a7',bottom:'#605f4e',shoes:'#3f5146',skin:'#bc9c75'});p.root.position.z=-.13;s.root.add(p.root);if(a.clothes==='apron')s.box([.3,.5,.025],[0,H*.49,-.025],wood);if(a.clothes==='vest')s.box([.28,.32,.02],[0,H*.64,-.025],dark);
 s.box([.8,.06,.6],[0,Y-.16,z],wood);if(a.station==='cabinet')s.box([.7,Y-.19,.5],[0,(Y-.19)/2,z],wood);else for(const x of [-.3,.3])for(const zz of [z-.22,z+.22])s.rod([x,0,zz],[x,Y-.19,zz],.025,metal);if(a.station==='wall')s.box([.7,Y+.35,.06],[0,(Y+.35)/2,-.48],wood);
 const tx=-.1,ty=Y+.05;for(const x of a.station==='pair'?[tx,tx+.27]:[tx]){s.tube([[x,0,z],[x,Y-.1,z],[x,ty,z]],.07,metal);s.cylinder(.06,.06,.008,[x,ty+.005,z],dark,24);s.ring(a.mouth==='flared'?.1:.075,.014,[x,ty,z],brass).rotation.x=Math.PI/2;if(a.mouth==='glass')s.cylinder(.075,.075,.18,[x,ty-.08,z],s.material('#aac8b8',{transparent:true,opacity:.25,depthWrite:false}),24);if(a.mouth==='door')s.cylinder(.08,.08,.012,[x-.07,ty+.06,z],metal,24).rotation.z=.9;}
 const cy=a.task==='insert'?ty+.14:Y+.28,cx=a.task==='insert'?tx:0,cz=a.task==='insert'?z:.18,cm=a.carrier==='wood'?wood:a.carrier==='clear'?s.material('#b8cbb8',{transparent:true,opacity:.45,depthWrite:false}):brass;s.cylinder(.045,.045,.22,[cx,cy,cz],cm,24);for(const yy of [cy-.085,cy+.085])s.ring(.047,.008,[cx,yy,cz],dark).rotation.x=Math.PI/2;if(a.carrier==='ribbed')for(let j=0;j<6;j++)s.ring(.046,.003,[cx,cy-.07+j*.028,cz],metal).rotation.x=Math.PI/2;
 p.reach('right',new THREE.Vector3(cx-.045,cy-.04,cz),{space:s.root});if(a.task==='select'){s.cylinder(.04,.04,.03,[.28,Y+.1,z+.07],brass,16).rotation.x=Math.PI/2;p.reach('left',new THREE.Vector3(.28,Y+.1,z+.09),{space:s.root});}else p.reach('left',new THREE.Vector3(cx+.045,cy+.05,cz),{space:s.root});if(a.task==='unpack')s.cylinder(.045,.045,.012,[.28,Y-.12,z+.12],brass,20);p.lookAt(new THREE.Vector3(cx,cy,cz),s.root);
 if(a.sorting==='slots')for(let j=0;j<3;j++)s.box([.03,.14,.18],[.12+j*.08,Y-.06,z+.1],wood);if(a.sorting==='tray')s.box([.24,.025,.2],[.23,Y-.115,z+.1],metal);if(a.sorting==='basket'){s.box([.22,.1,.2],[.5,.05,.3],wood);for(let j=0;j<6;j++)s.box([.23,.008,.01],[.5,.025+j*.012,.405],dark);}if(a.state==='label')s.label('OUT',.12,.07,[tx,Y-.04,z+.085],'#dfd1ac','#53604b');if(a.state==='spare')s.cylinder(.045,.045,.23,[.5,.045,0],brass,24).rotation.z=Math.PI/2;if(a.state==='receipt')s.box([.15,.002,.1],[.25,Y-.128,z+.1],pale);return s.finish();

  },
});

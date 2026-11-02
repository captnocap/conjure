import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    task: choice("What is the voicer adjusting?", {"lip": "Pressing a thin tool against the upper lip.", "tune": "Holding the top tuning sleeve.", "foot": "Inspecting a removed pipe foot.", "ear": "Adjusting a small side ear."}),
    clothes: choice("What work clothes are worn?", {"apron": "A protective work apron.", "coat": "A short shop coat.", "vest": "A waistcoat over a pale shirt.", "shirt": "A plain shirt."}),
    head: choice("What hair or headwear is shown?", {"short": "Short uncovered hair.", "bun": "Hair in a bun.", "cap": "A close workshop cap.", "none": "A bare head."}),
    pipe: choice("What pipe is being voiced?", {"metal": "A cylindrical metal flue pipe.", "wood": "A square wooden pipe.", "stopped": "A short stopped pipe.", "reed": "A narrow conical reed pipe."}),
    bench: choice("What supports the work?", {"chest": "A rectangular windchest bench.", "round": "A small round test stand.", "trestle": "A narrow timber trestle.", "cabinet": "A broad shop cabinet."}),
    tools: choice("What tools lie on the bench?", {"knife": "A spare reed knife.", "mallet": "A small wooden mallet.", "gauges": "Three measuring pins.", "none": "No spare tools."}),
    air: choice("What wind connection is visible?", {"hose": "A curved wind hose.", "pedal": "A floor pumping pedal.", "trunk": "A square wind trunk.", "none": "A disconnected test chest."}),
    state: choice("What inspection detail is shown?", {"working": "Normal voicing work.", "tag": "A note tag attached to the pipe.", "sample": "A short comparison pipe.", "book": "A small notebook on the bench."}),
    height: score("How tall is the voicer?", ["Short adult", "Average adult", "Tall adult"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#a3aaa0',{metalness:.6,roughness:.45}),dark=s.material('#444f47'),brass=s.material('#b89e66',{metalness:.65}),wood=s.material('#a38a62'),pale=s.material('#d9cfb1'),leather=s.material('#77614c');

 const H=1.58+a.height*.25,Y=H*.48,z=.3;const p=figure(s,{height:H,pose:'standing',style:'doll',hair:a.head,top:a.clothes==='coat'?'#657966':'#d0c4a4',bottom:'#625c4b',shoes:'#424b40',skin:'#b99a75'});p.root.position.z=-.15;s.root.add(p.root);if(a.clothes==='apron')s.box([.3,H*.3,.025],[0,H*.5,-.04],wood);if(a.clothes==='vest')s.box([.27,.32,.025],[0,H*.65,-.045],dark);
 if(a.bench==='cabinet')s.box([.75,Y,.5],[0,Y/2,z],wood);else if(a.bench==='round')s.cylinder(.08,.15,Y,[0,Y/2,z],wood,20);else for(const x of [-.3,.3])for(const zz of [z-.2,z+.2])s.rod([x,0,zz],[x,Y,zz],.028,wood);s.box([.8,.08,.55],[0,Y-.04,z],wood);
 const ph=a.pipe==='stopped'?.35:.55,R=.07,px=-.1,fy=Y+.14;s.cylinder(.06,.015,.14,[px,Y+.07,z],metal,20);if(a.pipe==='wood')s.box([.14,ph,.14],[px,fy+ph/2,z],wood);else s.lathe([[R*.8,0],[a.pipe==='reed'?R*.9:R,ph],[a.pipe==='reed'?R*.8:R-.008,ph],[R*.7,0]],metal,[px,fy,z]);s.box([.08,.04,.012],[px,fy+.05,z+R],dark);if(a.pipe==='stopped')s.cylinder(R,R,.025,[px,fy+ph,z],wood,20);
 if(a.task==='tune'){s.cylinder(R+.005,R+.005,.07,[px,fy+ph-.02,z],metal,24);p.reach('right',new THREE.Vector3(px-.06,fy+ph-.01,z+.02),{space:s.root});p.reach('left',new THREE.Vector3(px+.06,fy+ph-.08,z+.02),{space:s.root});}else if(a.task==='foot'){s.cylinder(.05,.01,.15,[.08,Y+.33,.15],metal,20);p.reach('right',new THREE.Vector3(.03,Y+.31,.15),{space:s.root});p.reach('left',new THREE.Vector3(.13,Y+.35,.15),{space:s.root});}else{const tx=a.task==='ear'?px+.07:px,ty=fy+.08;s.rod([tx,ty,z+.08],[-.24,Y+.28,.18],.006,brass);p.reach('right',new THREE.Vector3(-.24,Y+.28,.18),{space:s.root});p.reach('left',new THREE.Vector3(px+.06,fy+.2,z+.04),{space:s.root});}p.lookAt(new THREE.Vector3(px,fy+.1,z),s.root);
 if(a.tools==='knife')s.box([.2,.01,.025],[.2,Y+.006,.48],metal);if(a.tools==='mallet'){s.rod([.1,Y+.02,.45],[.3,Y+.02,.45],.012,wood);s.box([.05,.04,.08],[.32,Y+.02,.45],wood);}if(a.tools==='gauges')for(let j=0;j<3;j++)s.rod([.12+j*.07,Y+.01,.36],[.12+j*.07,Y+.01,.5],.006,brass);
 if(a.air==='hose')s.tube([[.4,Y-.03,z],[.6,.1,z],[.7,.025,.5]],.025,leather);if(a.air==='pedal'){s.box([.18,.04,.38],[.45,.02,.1],wood);s.rod([.45,.04,.1],[.35,Y-.05,z],.014,metal);}if(a.air==='trunk')s.box([.35,.12,.16],[.5,Y-.07,z],wood);if(a.state==='tag')s.label('VOICE',.11,.07,[px,fy+.3,z+R+.01],'#e2d5b4','#61563f');if(a.state==='sample')s.cylinder(.03,.01,.25,[.28,Y+.125,z],metal,16);if(a.state==='book')s.box([.14,.02,.12],[.23,Y+.01,.42],dark);return s.finish();

  },
});

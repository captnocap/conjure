import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    task: choice("What is the worker doing?", {"scoop": "Holding a broad sand scoop over the hopper.", "sack": "Tipping a small sack at the rim.", "level": "Using a short levelling rake.", "inspect": "Holding a sample tin at the hopper."}),
    clothes: choice("What work clothing is worn?", {"coat": "A short work coat.", "apron": "A front work apron.", "overalls": "One-piece work overalls.", "shirt": "A plain work shirt."}),
    head: choice("What headwear is visible?", {"cap": "A flat work cap.", "bare": "Short uncovered hair.", "bun": "Hair tied in a bun.", "hat": "A brimmed work hat."}),
    hopper: choice("What receiving bin is used?", {"round": "A round funnel bin.", "square": "A square loading bin.", "low": "A wide shallow sand pan.", "tall": "A narrow tall filling hopper."}),
    support: choice("What holds the receiving bin?", {"legs": "Four iron legs.", "wood": "A wooden trestle.", "block": "A solid masonry plinth.", "wheels": "A small service trolley."}),
    sand: choice("What is in the bin?", {"full": "A nearly full sand bed.", "low": "A low sand bed.", "heap": "A central mound.", "empty": "An empty bin."}),
    equipment: choice("What equipment is beside the worker?", {"sacks": "Two filled reserve sacks.", "bucket": "A handled empty bucket.", "brush": "A clearing brush on the ground.", "none": "No extra equipment."}),
    state: choice("What work stage is shown?", {"working": "Normal loading work.", "sample": "A sample card rests on the rim.", "closed": "A shutoff bar crosses the outlet.", "spill": "A small sand spill lies beside the bin."}),
    height: score("How tall is the worker?", ["Short adult", "Average adult", "Tall adult"])
  },
  build(a,context){
 const s=new Sculpture(context),iron=s.material('#71665c',{metalness:.5}),dark=s.material('#3e423d'),brass=s.material('#b59c66',{metalness:.6}),sand=s.material('#cdbb89'),wood=s.material('#a58b63'),pale=s.material('#d5cbb0');

 const H=1.58+a.height*.25,Y=H*.53,mat=a.clothes==='shirt'?pale:a.clothes==='coat'?dark:iron;const p=figure(s,{height:H,pose:'standing',style:'doll',hair:a.head==='bare'?'short':a.head,top:mat.color,bottom:dark.color,shoes:dark.color,skin:'#bc9b76'});p.root.position.z=-.13;s.root.add(p.root);
 if(a.clothes==='apron')s.box([.3,H*.32,.025],[0,H*.49,-.13],wood);
 const r=a.hopper==='tall'?.22:.32,D=a.hopper==='low'?.13:.3,by=Y-D,z=.25;const frame=a.support==='wood'?wood:iron;if(a.support==='block')s.cylinder(.27,.33,by,[0,by/2,z],pale,20);else for(const x of [-.22,.22])for(const zz of [z-.22,z+.22]){s.rod([x,0,zz],[x,by,zz],.025,frame);if(a.support==='wheels')s.cylinder(.05,.05,.025,[x,.05,zz],dark,12).rotation.x=Math.PI/2;}s.box([.6,.035,.6],[0,by-.0175,z],frame);
 if(a.hopper==='square'){s.box([.6,.025,.6],[0,by+.0125,z],iron);for(const zz of [z-.3,z+.3])s.box([.6,D,.02],[0,by+D/2,zz],iron);for(const x of [-.3,.3])s.box([.02,D,.6],[x,by+D/2,z],iron);}else s.lathe([[0,0],[r*.5,0],[r,D],[r-.02,D],[r*.5,.025],[0,.025]],iron,[0,by,z]);
 if(a.sand!=='empty'){const sy=a.sand==='low'?by+.04:Y-.04;s.cylinder(r*.8,r*.8,.015,[0,sy,z],sand,24);if(a.sand==='heap')s.cylinder(0,r*.6,.15,[0,sy+.07,z],sand,20);}
 const handY=Y+.18;if(a.task==='scoop'){s.box([.3,.035,.22],[0,handY,z],iron);s.rod([-.23,handY,z],[-.1,handY,z],.018,wood);s.rod([.1,handY,z],[.23,handY,z],.018,wood);p.reach('right',new THREE.Vector3(-.23,handY,z),{space:s.root});p.reach('left',new THREE.Vector3(.23,handY,z),{space:s.root});}else if(a.task==='sack'){s.ball([.17,.22,.11],[0,handY+.05,z],wood,16);p.reach('right',new THREE.Vector3(-.16,handY,z),{space:s.root});p.reach('left',new THREE.Vector3(.16,handY+.1,z),{space:s.root});}else if(a.task==='level'){s.rod([-.23,handY,.16],[.2,Y-.02,.5],.014,wood);for(let j=0;j<5;j++)s.rod([.1+j*.04,Y-.02,.48],[.1+j*.04,Y-.07,.48],.006,iron);p.reach('right',new THREE.Vector3(-.23,handY,.16),{space:s.root});p.reach('left',new THREE.Vector3(-.06,Y+.10,.294),{space:s.root});}else{s.cylinder(.07,.07,.06,[-.15,handY,z],iron,20);p.reach('right',new THREE.Vector3(-.15,handY-.02,z),{space:s.root});p.reach('left',new THREE.Vector3(-.08,handY,z),{space:s.root});}p.lookAt(new THREE.Vector3(0,Y,.4),s.root);
 if(a.equipment==='sacks')for(const x of [.5,.75])s.ball([.13,.22,.14],[x,.22,.14],wood,12);if(a.equipment==='bucket'){s.lathe([[0,0],[.13,0],[.16,.25],[.14,.25],[.11,.02],[0,.02]],iron,[.55,0,.2]);s.tube([[.4,.22,.2],[.55,.4,.2],[.7,.22,.2]],.007,iron);}if(a.equipment==='brush'){s.rod([.45,.02,.25],[.45,.02,.65],.012,wood);s.box([.15,.04,.08],[.45,.02,.7],dark);}if(a.state==='spill')s.cylinder(.23,.25,.015,[.45,.0075,.55],sand,24);if(a.state==='sample')s.label('DRY',.15,.07,[.23,Y+.02,.55],'#e3d7b2','#655b44');if(a.state==='closed')s.rod([-.2,by+.02,z],[.2,by+.02,z],.015,brass);return s.finish();

  },
});

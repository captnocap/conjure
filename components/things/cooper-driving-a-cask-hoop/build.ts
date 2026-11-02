import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    task: choice("What is the cooper doing?", {"strike": "Holding the mallet above the hoop driver.", "set": "Resting the mallet against the driver.", "inspect": "Holding a loose hoop for inspection.", "measure": "Measuring the cask rim with a rule."}),
    clothes: choice("What work clothing is worn?", {"apron": "A broad leather work apron.", "shirt": "A plain rolled work shirt.", "vest": "A dark waistcoat.", "coat": "A short heavy work coat."}),
    head: choice("What hair or headwear is shown?", {"short": "Short uncovered hair.", "cap": "A close workshop cap.", "bun": "Hair in a bun.", "hat": "A felt work hat."}),
    cask: choice("What cask is being worked?", {"barrel": "A full-height curved barrel.", "keg": "A squat small keg.", "tub": "A wide shallow tub.", "open": "A partly raised stave shell."}),
    hoops: choice("What hoops bind the cask?", {"two": "Two broad iron hoops.", "three": "Three narrow hoops.", "wood": "Three wooden hoops.", "rope": "Two temporary rope bands."}),
    mallet: choice("What mallet is used?", {"round": "A round wooden mallet.", "square": "A square timber mallet.", "iron": "A short iron hoop hammer.", "long": "A long narrow mallet head."}),
    base: choice("What is under the cask?", {"floor": "Directly on the workshop floor.", "blocks": "Two low timber blocks.", "ring": "A low raising ring.", "board": "A broad work board."}),
    state: choice("What working detail is visible?", {"normal": "Normal hoop-driving work.", "shavings": "Wood shavings beside the cask.", "spare": "A loose spare hoop.", "chalk": "A chalk fitting mark."}),
    height: score("How tall is the cooper?", ["Short adult", "Average adult", "Tall adult"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#a68a5e'),light=s.material('#c0a46e'),dark=s.material('#5b543f'),iron=s.material('#606f5d',{metalness:.5}),brass=s.material('#b59e63'),pale=s.material('#dfd0a7');

 const H=1.58+a.height*.25,ch=a.cask==='tub'?.5:a.cask==='keg'?.6:.82,R=a.cask==='tub'?.37:.3,by=a.base==='floor'?0:.07,cz=.36;const p=figure(s,{height:H,pose:a.task==='measure'&&ch<.7?'crouching':'standing',style:'doll',hair:a.head,top:a.clothes==='coat'?'#756b50':'#d5c7a4',bottom:'#625d49',shoes:'#444f40',skin:'#b99a74'});p.root.position.z=a.task==='measure'&&ch<.7?-.24:-.1;s.root.add(p.root);if(a.clothes==='apron')p.pelvis.add(s.box([.33,.48,.025],[0,.02,.115],dark));if(a.clothes==='vest')p.joints.spine.add(s.box([.28,.34,.025],[0,H*.12,.11],dark));
 if(a.base==='blocks')for(const x of [-.2,.2])s.box([.12,.07,.7],[x,.035,cz],wood);if(a.base==='ring')s.cylinder(R*.85,R,.07,[0,.035,cz],wood,28);if(a.base==='board')s.box([.85,.07,.85],[0,.035,cz],wood);
 const n=a.cask==='open'?12:16;for(let j=0;j<n;j++){const t=j/16*Math.PI*2;s.surface((u,v,tgt)=>{const tt=t+(u-.5)*Math.PI*2/16*.95,rr=R+Math.sin(v*Math.PI)*.06;return tgt.set(Math.sin(tt)*rr,by+v*ch,cz+Math.cos(tt)*rr);},j%2?wood:light,{segments:[2,12]});}s.cylinder(R-.015,R-.015,.025,[0,by+.0125,cz],wood,28);
 for(const v of a.hoops==='three'||a.hoops==='wood'?[.12,.5,.88]:[.18,.8])s.ring(R+Math.sin(v*Math.PI)*.06+.009,a.hoops==='two'?.025:.014,[0,by+v*ch,cz],a.hoops==='wood'?light:a.hoops==='rope'?dark:iron).rotation.x=Math.PI/2;
 const workY=by+ch*.8,driverX=.18,driverZ=cz-.25,gripY=Math.max(H*.61,workY+.17);if(a.task==='inspect'){const rr=.26,cy=H*.64;s.ring(rr,.018,[0,cy,.2],iron);p.reach('right',new THREE.Vector3(-rr,cy,.2),{space:s.root});p.reach('left',new THREE.Vector3(rr,cy,.2),{space:s.root});}else if(a.task==='measure'){s.rod([-.28,by+ch+.025,cz-.2],[.28,by+ch+.025,cz-.2],.012,pale);p.reach('right',new THREE.Vector3(-.25,by+ch+.025,cz-.2),{space:s.root});p.reach('left',new THREE.Vector3(.25,by+ch+.025,cz-.2),{space:s.root});}else{s.rod([driverX,workY,driverZ],[driverX,gripY,driverZ],.018,iron);s.box([.07,.035,.07],[driverX,workY,driverZ],iron);const headY=a.task==='strike'?gripY+.18:gripY+.035,grip:[number,number,number]=[-.21,H*.68,.15];s.rod(grip,[driverX,headY,driverZ],.018,wood);if(a.mallet==='round')s.cylinder(.06,.06,.18,[driverX,headY,driverZ],dark,20).rotation.z=Math.PI/2;else s.box([a.mallet==='long'?.24:.16,.09,.09],[driverX,headY,driverZ],a.mallet==='iron'?iron:dark);p.reach('right',new THREE.Vector3(...grip),{space:s.root});p.reach('left',new THREE.Vector3(driverX,gripY-.06,driverZ),{space:s.root});}p.lookAt(new THREE.Vector3(0,by+ch,cz),s.root);
 if(a.state==='shavings')for(let j=0;j<5;j++)s.ring(.03,.004,[.5+j*.05,.01,.1],light,Math.PI*1.5).rotation.x=Math.PI/2;if(a.state==='spare')s.ring(.32,.014,[.65,.014,.2],iron).rotation.x=Math.PI/2;if(a.state==='chalk')s.label('X',.1,.1,[0,by+ch*.6,cz+R+.065],'#e0d2b0','#736346');return s.finish();

  },
});

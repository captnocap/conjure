import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    bells: choice("What bell set is under test?", {"single": "One large handbell.", "pair": "Two matched handbells.", "trio": "Three graduated handbells.", "four": "Four small treble bells."}),
    profile: choice("What bell profile is used?", {"flared": "A broad flared skirt.", "slender": "A narrow long bell.", "round": "A rounded cup bell.", "ribbed": "A bell with two decorative ribs."}),
    metal: choice("What bell metal is visible?", {"gold": "Polished golden brass.", "bronze": "Warm brown bronze.", "silver": "Silver plated metal.", "green": "Green patinated test pieces."}),
    frame: choice("What testing cradle is used?", {"wood": "A timber A-frame.", "metal": "A narrow steel portal frame.", "arch": "A curved overhead timber arch.", "case": "An open fitted instrument case."}),
    handles: choice("What handles are fitted?", {"leather": "Broad leather loops.", "wood": "Straight turned wood handles.", "ring": "Round metal suspension rings.", "strap": "Narrow fabric loops."}),
    beater: choice("What beater is present?", {"felt": "A round felt headed beater.", "rubber": "A black rubber hammer.", "wood": "A small wooden mallet.", "none": "No striking tool."}),
    measurement: choice("How is the pitch checked?", {"microphone": "A small microphone on a stand.", "pointer": "A mechanical vibrating pointer.", "card": "A printed musical scale card.", "none": "No extra measuring device."}),
    state: choice("What stage is the test at?", {"ready": "Bells hang freely ready to ring.", "damped": "A padded block touches one bell.", "marked": "One bell has a red test tag.", "removed": "A spare handle lies on the base."}),
    height: score("How tall is the bell cradle?", ["A compact cradle", "A standard test cradle", "A tall large-bell cradle"])
  },
  build(a,context){

 const s=new Sculpture(context),metal=s.material({gold:'#bca569',bronze:'#9e8254',silver:'#adb9a2',green:'#7d9c84'}[a.metal],{metalness:0.8,roughness:0.28}),wood=s.material('#a28a58'),dark=s.material('#4f6250'),n={single:1,pair:2,trio:3,four:4}[a.bells],w=0.4+n*0.3,h=0.65+a.height*0.4;
 s.box([w+0.3,0.08,0.6],[0,0.04,0],wood);for(const x of [-w/2,w/2]){if(a.frame==='wood')for(const z of [-0.23,0.23])s.rod([x,0.08,z],[x,h,0],0.03,wood);else s.rod([x,0.08,0],[x,h,0],0.03,a.frame==='metal'?dark:wood);}if(a.frame==='arch'){s.tube([[-w/2,h,0],[-w*0.25,h+0.2,0],[w*0.25,h+0.2,0],[w/2,h,0]],0.04,wood);s.rod([-w/2,h,0],[w/2,h,0],0.025,wood);}else s.rod([-w/2,h,0],[w/2,h,0],0.035,a.frame==='metal'?dark:wood);if(a.frame==='case'){s.box([w+0.3,0.45,0.035],[0,0.27,-0.3],wood);for(const z of [-0.28,0.28])s.box([w+0.3,0.12,0.03],[0,0.1,z],wood);}
 for(let i=0;i<n;i++){const x=(i-(n-1)/2)*0.31,r=n===1?0.2:0.12+(n-i)*0.012,bh=a.profile==='slender'?r*2:r*1.25,by=h-0.22-bh;s.lathe([[r,0],[r*0.95,0.04],[r*0.6,bh*0.65],[r*0.35,bh],[0,bh],[0,bh-0.03],[r*0.3,bh-0.03],[r*0.5,bh*0.6],[r-0.018,0]],metal,[x,by,0]);if(a.profile==='round')s.ring(r*0.7,0.015,[x,by+bh*0.5,0],metal).rotation.x=Math.PI/2;if(a.profile==='ribbed')for(let j=0;j<2;j++)s.ring(r*0.75-j*0.1*r,0.008,[x,by+bh*(0.3+j*0.2),0],metal).rotation.x=Math.PI/2;s.rod([x,by+bh-0.02,0],[x,by+0.04,0],0.006,dark);s.ball([0.02,0.02,0.02],[x,by+0.035,0],dark,12);
 if(a.handles==='wood')s.rod([x,by+bh,0],[x,h,0],0.025,wood);else{s.tube([[x,by+bh,0],[x-0.05,h-0.1,0],[x,h,0],[x+0.05,h-0.1,0],[x,by+bh,0]],a.handles==='leather'?0.018:0.009,a.handles==='ring'?metal:dark);}if(a.state==='marked'&&i===0)s.label('TEST',0.12,0.07,[x,by+bh*0.6,r*0.7],'#ddd2af','#a46c4d');if(a.state==='damped'&&i===0){s.box([0.15,by,0.15],[x,by/2,0.1],wood);s.box([0.16,0.05,0.16],[x,by,0.1],dark);}}
 if(a.beater!=='none'){s.rod([-0.35,0.12,0.2],[0.25,0.12,0.2],0.012,wood);s.ball([0.045,0.045,0.045],[-0.35,0.13,0.2],a.beater==='felt'?s.material('#c5bea0'):a.beater==='wood'?wood:dark,16);}if(a.measurement==='microphone'||a.measurement==='pointer'){s.rod([w/2+0.08,0.08,0.2],[w/2+0.08,h*0.65,0.2],0.012,dark);if(a.measurement==='microphone')s.ball([0.035,0.06,0.035],[w/2+0.08,h*0.65,0.2],dark,16);else s.rod([w/2+0.08,h*0.65,0.2],[w/2-0.15,h*0.6,0.2],0.005,metal);}if(a.measurement==='card')s.label('C D E F G A B',0.55,0.1,[0,0.09,-0.2],'#59694f','#dcd0ad').rotation.x=-Math.PI/2;if(a.state==='removed')s.ring(0.07,0.012,[0.3,0.1,0.2],dark).rotation.x=Math.PI/2;return s.finish();

  },
});

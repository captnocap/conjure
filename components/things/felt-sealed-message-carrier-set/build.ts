import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    count: choice("How many carriers are present?", {"two": "Two long carriers.", "three": "Three carriers.", "four": "Four carriers.", "six": "Six short carriers."}),
    body: choice("What carrier body form is used?", {"brass": "Smooth brass cylinders.", "ribbed": "Ribbed metal cylinders.", "clear": "Transparent inspection capsules.", "wood": "Wooden-bodied carriers."}),
    ends: choice("What end closure is fitted?", {"screw": "Screw caps with round grips.", "bayonet": "Flat bayonet-lock caps.", "dome": "Rounded impact noses.", "handle": "Caps with loop handles."}),
    seals: choice("What sealing rings are used?", {"felt": "Two broad felt rings.", "rubber": "Three thin rubber seals.", "brush": "A brush skirt at one end.", "leather": "Two leather sealing cuffs."}),
    display: choice("How are carriers arranged?", {"tray": "A fitted divided tray.", "rack": "A vertical dispatch rack.", "row": "A flat row on a board.", "fan": "A fanned inspection display."}),
    opening: choice("Which carriers are open?", {"closed": "Every carrier is closed.", "one": "One end cap is removed.", "half": "Alternate carriers are open.", "all": "Every carrier is uncapped."}),
    contents: choice("What is visible inside open capsules?", {"paper": "Rolled paper messages.", "slips": "Folded coloured message slips.", "empty": "Empty dark interiors.", "parcel": "Small wrapped parcels."}),
    labels: choice("How are capsules identified?", {"numbers": "Numbered route bands.", "tags": "Small hanging route tags.", "stripe": "A broad destination stripe.", "plain": "No extra markings."}),
    size: score("How large are the capsules?", ["Small office capsules", "Standard mail carriers", "Large parcel carriers"])
  },
  build(a,context){
 const s=new Sculpture(context),metal=s.material('#718879',{metalness:.5}),dark=s.material('#3f5247'),brass=s.material('#bca66e',{metalness:.7}),wood=s.material('#a58d64'),pale=s.material('#dbd1b1'),red=s.material('#a86d53');

 const n={two:2,three:3,four:4,six:6}[a.count],L=.26+a.size*.16,R=.045+a.size*.012,W=n*.16+.1,Y=a.display==='rack'?.12:.025;s.box([W,.025,a.display==='rack'?.28:L+.18],[0,.0125,0],wood);
 for(let j=0;j<n;j++){const x=(j-(n-1)/2)*.16,g=new THREE.Group();g.position.set(x,a.display==='rack'?.07+L/2:Y+R,0);g.rotation.x=a.display==='rack'?0:Math.PI/2;if(a.display==='fan')g.rotation.y=(j-(n-1)/2)*.12;s.root.add(g);const start=s.root.children.length,m=a.body==='wood'?wood:a.body==='clear'?s.material('#b6cabb',{transparent:true,opacity:.35,depthWrite:false}):brass;s.lathe([[R,-L/2],[R,L/2],[R-.007,L/2],[R-.007,-L/2]],m);const sealmat=a.seals==='felt'?dark:a.seals==='leather'?wood:metal;for(const y of a.seals==='rubber'?[-L*.38,0,L*.38]:[-L*.35,L*.35])s.ring(R+.004,a.seals==='felt'?.012:.007,[0,y,0],sealmat).rotation.x=Math.PI/2;if(a.seals==='brush')for(let k=0;k<20;k++){const t=k*Math.PI/10;s.rod([Math.cos(t)*R,L*.35,Math.sin(t)*R],[Math.cos(t)*(R+.016),L*.35,Math.sin(t)*(R+.016)],.002,dark);}if(a.body==='ribbed')for(let k=0;k<7;k++)s.ring(R,.002,[0,-L*.3+k*L*.6/6,0],metal).rotation.x=Math.PI/2;
 s.cylinder(R,R,.015,[0,-L/2,0],brass,24);const open=a.opening==='all'||a.opening==='one'&&j===0||a.opening==='half'&&j%2===0;if(!open){s.cylinder(R+.003,R+.003,.02,[0,L/2,0],brass,24);if(a.ends==='dome')s.ball([R,R*.7,R],[0,L/2,0],brass,16);if(a.ends==='handle')s.tube([[-.025,L/2,0],[-.025,L/2+.055,0],[.025,L/2+.055,0],[.025,L/2,0]],.005,metal);if(a.ends==='screw')s.cylinder(.02,.02,.02,[0,L/2+.02,0],metal,12);}else if(a.contents!=='empty'){if(a.contents==='paper')s.cylinder(R*.55,R*.55,L*.8,[0,.02,0],pale,16);else s.box([R*1.1,L*.8,R],[0,.02,0],a.contents==='parcel'?wood:pale);}
 if(a.labels==='stripe')s.ring(R+.003,.014,[0,0,0],red).rotation.x=Math.PI/2;if(a.labels==='numbers')s.label(String(j+1),.045,.04,[0,0,R+.004],'#e1d5b2','#566049');if(a.labels==='tags'){s.rod([0,L*.25,R],[.045,L*.1,R+.03],.002,wood);s.label(String(j+1),.045,.04,[.05,L*.1,R+.03],'#dfd1a8','#5d583f');}for(const o of s.root.children.slice(start))g.add(o);if(open)s.cylinder(R+.003,R+.003,.018,[x,.009,L/2+.14],brass,20);if(a.display==='tray')s.box([.012,.065,L+.15],[x+.075,.0325,0],wood);if(a.display==='rack'){s.box([.11,.07,.12],[x,.035,0],wood);s.ring(R+.012,.01,[x,Y+.08,0],metal).rotation.x=Math.PI/2;}}
 if(a.display==='rack'){for(const x of [-W*.46,W*.46])s.rod([x,0,-.08],[x,Y+.15,-.08],.02,wood);s.rod([-W*.46,Y+.08,-.08],[W*.46,Y+.08,-.08],.025,wood);}return s.finish();

  },
});

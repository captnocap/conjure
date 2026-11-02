import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    profile: choice("What inner bell profile is formed?", {"broad": "A broad low church bell core.", "slender": "A tall narrow tower bell core.", "stepped": "A visibly stepped building core.", "smooth": "A smooth carefully finished core."}),
    material: choice("What clay surface is visible?", {"red": "Warm red clay.", "buff": "Pale buff loam.", "grey": "Grey refractory clay.", "dark": "Dark fired clay."}),
    stage: choice("How far has the core progressed?", {"brick": "Brick courses still visible.", "coarse": "A rough clay coat.", "finished": "A smooth finished inner profile.", "partial": "One side remains exposed brick."}),
    stool: choice("What casting stool supports it?", {"stone": "A round stone stool.", "iron": "A cast iron ring base.", "brick": "A square brick plinth.", "timber": "Heavy temporary timber skids."}),
    spindle: choice("What remains on the centre axis?", {"tall": "A tall central steel spindle.", "short": "A short locating pin.", "cross": "A spindle with a cross bar.", "none": "No exposed spindle."}),
    vent: choice("How are gases vented?", {"centre": "A central vent opening.", "holes": "Six small shoulder vents.", "grooves": "Vertical vent grooves.", "none": "A closed unvented surface."}),
    tools: choice("What lies at the foot?", {"trowel": "A broad clay trowel.", "bucket": "A clay mixing bucket.", "bricks": "Three spare refractory bricks.", "none": "A clear casting stool."}),
    state: choice("What is happening to the mould?", {"drying": "Core left to dry.", "measured": "A measuring bar across the shoulder.", "repair": "A pale clay patch.", "number": "A numbered casting tag."}),
    size: score("How broad is the core?", ["A small bell core", "A normal bell core", "A great bell core"])
  },
  build(a,context){

 const s=new Sculpture(context),clay=s.material({red:'#aa8058',buff:'#c0af83',grey:'#99a38b',dark:'#796f51'}[a.material]),brick=s.material('#ae8c61'),iron=s.material('#657b68'),r=0.4+a.size*0.4,h=a.profile==='slender'?r*2:a.profile==='broad'?r:r*1.3,by=0.16;
 if(a.stool==='brick')s.box([r*2.4,by,r*2.4],[0,by/2,0],brick);else if(a.stool==='timber')for(const z of [-r*0.6,r*0.6])s.box([r*2.7,by,0.25],[0,by/2,z],s.material('#91784e'));else s.cylinder(r*1.25,r*1.25,by,[0,by/2,0],a.stool==='iron'?iron:s.material('#adb19a'),40);
 s.lathe([[0,0],[r,0],[r*0.9,h*0.16],[r*0.64,h*0.45],[r*0.47,h*0.75],[r*0.3,h*0.95],[0,h]],clay,[0,by,0]);const courses=Math.ceil(h/0.12);if(a.stage==='brick'||a.stage==='partial'||a.profile==='stepped')for(let j=0;j<courses;j++){const y=(j+0.5)*h/courses,rr=r*(1-0.72*y/h),count=12;for(let k=0;k<count;k++){if(a.stage==='partial'&&k>4)continue;const t=(k+(j%2)*0.5)*Math.PI*2/count;s.box([rr*0.5,h/courses*0.86,0.07],[Math.sin(t)*rr,by+y,Math.cos(t)*rr],brick).rotation.y=t;}}
 if(a.stage==='coarse')for(let j=0;j<25;j++){const y=context.random()*h,rr=r*(1-0.72*y/h),t=context.random()*Math.PI*2;s.ball([0.035,0.018,0.025],[Math.sin(t)*rr,by+y,Math.cos(t)*rr],clay,8);}
 if(a.spindle!=='none'){const sh=a.spindle==='short'?0.16:0.65;s.rod([0,by+h-0.05,0],[0,by+h+sh,0],0.025,iron);if(a.spindle==='cross')s.rod([-r*0.65,by+h+sh-0.08,0],[r*0.65,by+h+sh-0.08,0],0.018,iron);}if(a.vent==='centre')s.cylinder(r*0.1,r*0.1,0.01,[0,by+h+0.005,0],s.material('#4c5947'),20);if(a.vent==='holes')for(let j=0;j<6;j++){const t=j*Math.PI/3;s.ball([0.025,0.01,0.025],[Math.sin(t)*r*0.28,by+h*0.96,Math.cos(t)*r*0.28],s.material('#59624a'),8);}if(a.vent==='grooves')for(let j=0;j<6;j++){const t=j*Math.PI/3;s.tube([[Math.sin(t)*r,by+0.02,Math.cos(t)*r],[Math.sin(t)*r*0.65,by+h*0.45,Math.cos(t)*r*0.65],[Math.sin(t)*r*0.3,by+h*0.95,Math.cos(t)*r*0.3]],0.008,iron);}
 if(a.tools==='trowel')s.box([0.24,0.015,0.13],[r*1.05,by+0.015,0],iron);if(a.tools==='bucket')s.lathe([[0,0],[0.12,0],[0.16,0.24],[0.14,0.24],[0.1,0.03],[0,0.03]],iron,[r+0.25,0,0]);if(a.tools==='bricks')for(let j=0;j<3;j++)s.box([0.24,0.1,0.12],[r+0.2,0.05+j*0.1,0],brick);
 if(a.state==='measured')s.rod([-r*0.4,by+h,0],[r*0.4,by+h,0],0.02,iron);if(a.state==='repair')s.ball([0.15,0.15,0.025],[0,by+h*0.45,r*0.64],s.material('#c9b991'),16);if(a.state==='number')s.label('CAST 18',0.3,0.12,[0,by*0.6,r*1.26],'#58694f','#d9caa2');return s.finish();

  },
});

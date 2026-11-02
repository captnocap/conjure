import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    head: choice("What is the mallet head shape?", {"cylinder": "A round cylindrical head.", "block": "A squared hardwood head.", "barrel": "A bulging barrel shaped head.", "double": "A head with grooves at both ends."}),
    wood: choice("What timber makes the tool?", {"oak": "Golden oak.", "beech": "Pale beech.", "dark": "Dark oiled hardwood.", "red": "Red stained wood."}),
    groove: choice("What is the rope groove like?", {"deep": "A deep dark central groove.", "shallow": "A shallow polished groove.", "lined": "A copper lined groove.", "worn": "An irregular dark worn groove."}),
    handle: choice("How is the mallet handled?", {"straight": "A straight cylindrical handle.", "taper": "A tapered long handle.", "ball": "A rounded pommel handle.", "short": "A short palm grip."}),
    rope: choice("What rope lies beneath it?", {"hemp": "A golden hemp rope.", "tar": "A dark tarred rope.", "white": "A white cotton line.", "empty": "No rope beneath the head."}),
    serving: choice("How far has wrapping progressed?", {"start": "Only a short wrapped section.", "half": "A half served length.", "full": "Fine cord covers most of the rope.", "none": "The serving has not started."}),
    spool: choice("What feeds the fine cord?", {"wood": "A small wooden spool.", "bobbin": "A long narrow bobbin.", "coil": "A loose serving cord coil.", "none": "The cord supply is removed."}),
    state: choice("What is left beside the work?", {"ready": "Only the tool and line.", "knife": "A small rigging knife.", "tag": "A handwritten rope-size tag.", "wax": "A small cake of wax."}),
    size: score("How substantial is the serving mallet?", ["A light small-line mallet", "A general rigging mallet", "A heavy rope mallet"])
  },
  build(a,context){

    const s=new Sculpture(context),wood=s.material({oak:'#a88a55',beech:'#c2ab7b',dark:'#6b5d40',red:'#a46b4f'}[a.wood]),dark=s.material('#4d5648'),rope=s.material({hemp:'#b9a370',tar:'#505448',white:'#d6cdae',empty:'#b9a370'}[a.rope]),k=0.8+a.size*0.5,h=(a.head==='barrel'?0.11:0.09)*k,r=0.09*k;
    if(a.head==='block')s.box([0.3*k,0.18*k,0.18*k],[0,h,0],wood);else{s.cylinder(r,r,0.3*k,[0,h,0],wood,28).rotation.z=Math.PI/2;if(a.head==='barrel')s.ball([0.16*k,0.11*k,0.11*k],[0,h,0],wood,20);}
    const handleLength=a.handle==='short'?0.22:0.5*k;s.rod([0,h,0],[0,h,handleLength],a.handle==='taper'?0.026:0.033,wood,a.handle==='taper'?0.017:0.033);if(a.handle==='ball')s.ball([0.05,0.045,0.05],[0,h,handleLength],wood,16);
    s.box([0.3*k+0.005,0.015,0.045],[0,h+r*0.9,0],a.groove==='lined'?s.material('#ac875b',{metalness:0.7}):dark);if(a.groove==='deep'||a.groove==='worn')s.box([0.3*k+0.01,0.025,0.03],[0,h+r*0.87,0],dark);if(a.head==='double')for(const z of [-0.06,0.06])s.box([0.3*k+0.005,0.01,0.02],[0,h+r*0.8,z],dark);
    if(a.rope!=='empty'){s.rod([-0.65,0.04,-0.25],[0.65,0.04,-0.25],0.035,rope);const n=a.serving==='start'?8:a.serving==='half'?25:a.serving==='full'?45:0;for(let i=0;i<n;i++)s.ring(0.037,0.005,[-0.35+i*0.015,0.04,-0.25],dark).rotation.y=Math.PI/2;}
    if(a.spool!=='none'){if(a.spool==='coil')for(let j=0;j<5;j++)s.ring(0.06+j*0.008,0.006,[0.3,0.012,0.2],dark).rotation.x=Math.PI/2;else{const sh=a.spool==='bobbin'?0.22:0.11;s.cylinder(0.045,0.045,sh,[0.3,sh/2,0.2],dark,20);for(const y of [0.01,sh])s.cylinder(0.075,0.075,0.016,[0.3,y,0.2],wood,20);}s.tube([[0.3,0.015,0.2],[0.45,0.01,0],[-0.2,0.04,-0.25]],0.004,dark);}
    if(a.state==='knife'){s.box([0.18,0.01,0.04],[-0.3,0.01,0.3],s.material('#a9b09f',{metalness:0.7}));s.rod([-0.4,0.02,0.3],[-0.3,0.02,0.3],0.025,wood);}if(a.state==='tag')s.label('24 mm',0.18,0.08,[-0.3,0.006,0.25],'#5b614b','#ddd1ac').rotation.x=-Math.PI/2;if(a.state==='wax')s.cylinder(0.05,0.05,0.035,[-0.3,0.018,0.2],s.material('#cbbb74'),20);s.root.rotation.y=(context.random()-0.5)*0.25;return s.finish();

  },
});

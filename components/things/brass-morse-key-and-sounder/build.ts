import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    key: choice("What key mechanism is fitted?", {"straight": "A traditional straight lever key.", "camel": "A high curved camelback lever.", "side": "A sideways paddle key.", "double": "Two small side-by-side keys."}),
    base: choice("What is the base shape?", {"rectangle": "A rectangular timber board.", "oval": "An oval polished base.", "split": "Separate key and sounder blocks.", "metal": "A thin painted metal plate."}),
    metal: choice("What is the metal finish?", {"brass": "Warm polished brass.", "silver": "Bright nickel plating.", "dark": "Darkened old brass.", "copper": "Reddish copper fittings."}),
    knob: choice("What knob tops the key?", {"black": "A round black knob.", "ivory": "A pale ivory-coloured knob.", "wood": "A turned wooden knob.", "flat": "A broad flat paddle."}),
    sounder: choice("What kind of sounder is present?", {"twin": "Two exposed upright coils.", "single": "A single broad electromagnetic coil.", "covered": "A low metal coil cover.", "open": "An exposed armature without cover."}),
    wires: choice("How are the terminals wired?", {"red": "Red and black cloth wires.", "green": "Green paired instrument wires.", "bare": "Bare copper jumper links.", "none": "Unwired brass terminals."}),
    hood: choice("What surrounds the sounder?", {"none": "The sounder stands open.", "wood": "A sloping wooden sound box.", "tin": "A thin metal acoustic hood.", "glass": "A clear protective bell cover."}),
    state: choice("What message state is shown?", {"ready": "The key is raised between signals.", "pressed": "The key is pressed down.", "note": "A folded message slip beside the key.", "service": "One contact screw lies loose."}),
    spacing: score("How widely are the instruments spaced?", ["A compact set", "A normal operating set", "A wide working base"])
  },
  build(a,context){

 const s=new Sculpture(context),metal=s.material({brass:'#ba9f5e',silver:'#a7b3a5',dark:'#867342',copper:'#b08258'}[a.metal],{metalness:0.8}),wood=s.material('#8e7147'),black=s.material('#475345'),w=0.65+a.spacing*0.35,z=0.02;
 if(a.base==='oval')s.cylinder(w*0.58,w*0.58,0.045,[0,0.025,0],wood,48).scale.z=0.55;else if(a.base==='split')for(const x of [-w*0.26,w*0.26])s.box([w*0.45,0.055,0.4],[x,0.028,0],wood);else s.box([w,0.05,0.45],[0,0.025,0],a.base==='metal'?black:wood);
 for(const dz of a.key==='double'?[-0.09,0.09]:[0]){const x=-w*0.26,yy=a.state==='pressed'?0.12:0.16;s.box([0.08,0.12,0.12],[x,0.11,dz-0.06],metal);s.rod([x,0.16,dz-0.12],[x,yy,dz+0.13],a.key==='camel'?0.025:0.015,metal);if(a.key==='camel')s.ring(0.09,0.014,[x,0.17,dz],metal,Math.PI).rotation.y=Math.PI/2;const knob=s.material({black:'#3d493e',ivory:'#d8d0ad',wood:'#9a7a47',flat:'#485246'}[a.knob]);if(a.knob==='flat'||a.key==='side')s.box([0.12,0.025,0.08],[x,yy+0.025,dz+0.12],knob);else s.cylinder(0.055,0.045,0.035,[x,yy+0.025,dz+0.12],knob,24);s.cylinder(0.025,0.025,0.12,[x,0.1,dz+0.08],metal,16);}
 const sx=w*0.25,n=a.sounder==='single'?1:2;for(let j=0;j<n;j++){const x=sx+(j-(n-1)/2)*0.11;s.cylinder(0.047,0.047,0.12,[x,0.12,0],black,24);for(let k=0;k<7;k++)s.ring(0.048,0.003,[x,0.07+k*0.015,0],metal).rotation.x=Math.PI/2;}for(const zz of [-0.13,0.13])s.cylinder(0.018,0.018,0.21,[sx,0.16,zz],metal,12);s.box([0.16,0.018,0.25],[sx,a.state==='pressed'?0.21:0.24,0],metal);if(a.sounder==='covered')s.box([0.26,0.1,0.18],[sx,0.12,0],metal);if(a.sounder==='open')s.box([0.16,0.02,0.1],[sx,0.22,0],black);
 for(const x of [-w*0.4,w*0.4])for(const zz of [-0.17,0.17])s.cylinder(0.018,0.018,0.035,[x,0.07,zz],metal,16);if(a.wires!=='none')for(const zz of [-0.17,0.17])s.tube([[-w*0.4,0.07,zz],[-0.1,0.05,zz],[0.1,0.05,zz],[w*0.4,0.07,zz]],0.005,a.wires==='bare'?metal:s.material(a.wires==='green'?'#65775c':zz<0?'#8c5d43':'#465045'));
 if(a.hood==='wood'||a.hood==='tin'){const m=a.hood==='wood'?wood:metal;for(const x of [sx-0.16,sx+0.16])s.box([0.02,0.3,0.3],[x,0.2,-0.03],m);s.box([0.34,0.02,0.3],[sx,0.36,-0.03],m).rotation.x=0.12;s.box([0.34,0.3,0.02],[sx,0.2,-0.19],m);}if(a.hood==='glass')s.cylinder(0.2,0.2,0.34,[sx,0.22,0],s.material('#b2c5b5',{transparent:true,opacity:0.18,depthWrite:false}),32);
 if(a.state==='note')s.label('ARRIVED\n08.40',0.2,0.12,[-0.05,0.06,0.16],'#59664f','#dbd0ab').rotation.x=-Math.PI/2;if(a.state==='service')s.rod([-0.07,0.065,0.1],[0.07,0.065,0.1],0.01,metal);return s.finish();

  },
});

import * as THREE from 'three';
import { Sculpture, choice, score, defineThing } from '@conjure/kit';
export default defineThing({
  questions: {
    readout: choice("How is the water level displayed?", {"staff": "A tall numbered staff with black gauge marks.", "float": "A float and pointer move beside the staff.", "dial": "A round mechanical dial tops the staff.", "double": "Two parallel staffs show upstream and downstream levels."}),
    mount: choice("What carries the gauge?", {"pile": "A square timber pile.", "iron": "A cast-iron pedestal.", "brick": "A narrow brick pier.", "frame": "A freestanding maintenance frame."}),
    scale: choice("How is the staff graduated?", {"bands": "Alternating cream and black decimeter bands.", "red": "Red flood-warning bands above the safe zone.", "numbers": "Large black numerals on cream enamel.", "blue": "Blue and cream alternating bands."}),
    float: choice("If a float is fitted, what shape is it?", {"copper": "A copper spherical float.", "can": "A cylindrical metal float.", "wood": "A sealed wooden float box.", "missing": "Only an empty hanging wire remains."}),
    shelter: choice("What protects the mechanism?", {"none": "The gauge is fully exposed.", "hood": "A small pitched metal rain hood.", "box": "A glazed gauge cabinet.", "cage": "A protective iron bar cage."}),
    water: choice("What marks the latest water level?", {"algae": "A dark green algae line.", "silt": "A pale silt stain.", "clean": "The staff has been cleaned.", "flood": "A red flood marker is clipped high on the staff."}),
    attachment: choice("What is fixed beside the gauge?", {"hook": "A boat hook rests against the post.", "chain": "A short sounding chain hangs beside it.", "ledger": "A small waterproof log box.", "none": "No extra equipment."}),
    notice: choice("What operating notice is displayed?", {"normal": "NORMAL LEVEL", "low": "LOW WATER", "closed": "LOCK CLOSED", "watch": "FLOOD WATCH"}),
    level: score("Where does the indicator sit?", ["Near the bottom", "At working level", "Near the top"])
  },
  build(a,context){

    const s=new Sculpture(context),iron=s.material('#5f7165',{metalness:0.6}),wood=s.material('#8c7553'),cream=s.material('#ddd9bd'),dark=s.material('#354239'),red=s.material('#a44d36');
    s.box([0.6,0.12,0.5],[0,0.06,0],a.mount==='brick'?s.material('#a68b69'):iron);
    if(a.mount==='pile')s.box([0.24,2.5,0.24],[0,1.3,0],wood);
    if(a.mount==='iron')s.cylinder(0.09,0.14,2.5,[0,1.3,0],iron,16);
    if(a.mount==='brick')for(let j=0;j<12;j++)s.box([0.35,0.19,0.28],[0,0.22+j*0.195,0],s.material(j%2?'#ad8e6b':'#b59a77'));
    if(a.mount==='frame')for(const x of [-0.2,0.2])s.rod([x,0.08,-0.1],[x,2.6,0],0.035,iron);
    const xs=a.readout==='double'?[-0.12,0.12]:[0];
    for(const x of xs){s.box([0.18,2.28,0.035],[x,1.28,0.17],cream);for(let j=0;j<22;j++){const y=0.23+j*0.1;const c=a.scale==='blue'?s.material('#4e6d83'):a.scale==='red'&&j>15?red:dark;if(a.scale!=='numbers')s.box([0.17,0.045,0.01],[x,y,0.193],j%2?cream:c);s.box([j%5?0.045:0.085,0.012,0.012],[x-0.04,y,0.199],c);if(j%5===0)s.label(String(j),0.075,0.075,[x+0.025,y+0.033,0.205],'#354239','#ddd9bd');}}
    const h=0.35+a.level*1.85;
    if(a.readout==='float'){s.rod([0.29,2.38,0],[0.29,h,0],0.006,iron);if(a.float==='copper')s.ball([0.15,0.15,0.15],[0.29,h,0],s.material('#ab7f56',{metalness:0.65}),20);if(a.float==='can')s.cylinder(0.12,0.12,0.25,[0.29,h,0],iron,20);if(a.float==='wood')s.box([0.25,0.2,0.25],[0.29,h,0],wood);s.box([0.4,0.025,0.04],[0.09,h,0.23],red);}
    if(a.readout==='dial'){const plate=s.cylinder(0.28,0.28,0.06,[0,2.62,0.19],cream,40);plate.rotation.x=Math.PI/2;s.ring(0.28,0.02,[0,2.62,0.23],iron);for(let j=0;j<12;j++){const t=j*Math.PI/6;s.rod([Math.sin(t)*0.22,2.62+Math.cos(t)*0.22,0.234],[Math.sin(t)*0.25,2.62+Math.cos(t)*0.25,0.234],0.008,dark);}const t=-2+a.level*4;s.rod([0,2.62,0.24],[Math.sin(t)*0.21,2.62+Math.cos(t)*0.21,0.24],0.012,red);}
    if(a.shelter==='hood'){for(const side of [-1,1])s.box([0.36,0.04,0.44],[side*0.14,2.7,-0.01],iron).rotation.z=-side*0.3;}
    if(a.shelter==='box'){s.box([0.52,0.9,0.06],[0,2.2,-0.12],iron);for(const x of [-0.25,0.25])s.box([0.035,0.9,0.28],[x,2.2,0],iron);s.box([0.45,0.8,0.015],[0,2.2,0.23],s.material('#c6d6c6',{transparent:true,opacity:0.18,depthWrite:false}));}
    if(a.shelter==='cage')for(const x of [-0.24,0.24])for(const z of [-0.15,0.25])s.rod([x,0.13,z],[x,2.62,z],0.018,iron);
    if(a.water==='algae'||a.water==='silt')s.box([0.2,0.13,0.01],[0,h,0.21],s.material(a.water==='algae'?'#61755a':'#b8a883'));if(a.water==='flood')s.box([0.3,0.04,0.04],[0,2.22,0.23],red);
    if(a.attachment==='hook'){s.rod([-0.33,0.02,0],[-0.27,1.8,0],0.018,wood);s.ring(0.09,0.016,[-0.27,1.88,0],iron,Math.PI*1.4);}
    if(a.attachment==='chain')for(let j=0;j<14;j++)s.ring(0.035,0.009,[-0.3,1.9-j*0.065,0],iron).rotation.y=j%2*Math.PI/2;
    if(a.attachment==='ledger')s.box([0.32,0.24,0.2],[-0.29,1.4,0],wood);
    s.label({normal:'NORMAL LEVEL',low:'LOW WATER',closed:'LOCK CLOSED',watch:'FLOOD WATCH'}[a.notice],0.5,0.16,[0,0.14,0.27],'#394f3d','#dbd4b4');
    return s.finish();

  },
});

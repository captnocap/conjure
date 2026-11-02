import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    former: choice("What curve is formed?", {"shallow": "A shallow touring sweep.", "tight": "A tight lower fork bend.", "compound": "Two offset bending radii.", "paired": "Two parallel bending tracks."}),
    base: choice("What supports the former?", {"bench": "A thick timber bench.", "plate": "A wide steel mounting plate.", "stand": "A freestanding pedestal.", "skid": "Two oak machine skids."}),
    lever: choice("How is force applied?", {"long": "One long hand lever.", "double": "A two handed crossbar.", "wheel": "A large handwheel.", "short": "A compact lever with long grip."}),
    stock: choice("What is being bent?", {"pair": "Two matched steel blades.", "single": "A single fork blade.", "brass": "Two golden practice tubes.", "empty": "No tubing in the former."}),
    stops: choice("How is the bend limited?", {"pins": "A row of removable stop pins.", "scale": "A graduated curved scale.", "block": "A tall adjustable stop block.", "clamp": "A screw clamp at the working end."}),
    jaws: choice("What protects the tubing?", {"copper": "Copper soft jaw inserts.", "wood": "Wooden forming blocks.", "steel": "Polished steel shoes.", "leather": "Leather lined jaws."}),
    offcuts: choice("What rests beside the machine?", {"tube": "Short tube offcuts.", "blades": "A completed pair of curved blades.", "gauge": "A flat fork alignment template.", "none": "Clear working space."}),
    state: choice("What stage is the operation at?", {"start": "The lever is at its starting angle.", "pull": "The lever is halfway around.", "finish": "The lever is against the final stop.", "setup": "The forming shoe is removed for setup."}),
    radius: score("How generous is the bend radius?", ["A close radius", "A medium radius", "A broad radius"])
  },
  build(a,context){

    const s=new Sculpture(context),iron=s.material('#62736d',{metalness:0.7}),steel=s.material('#b4b9ab',{metalness:0.75}),wood=s.material('#a88b59'),jaw=s.material({copper:'#b47b55',wood:'#b39b6c',steel:'#a4afa7',leather:'#796041'}[a.jaws]);
    const y=a.base==='bench'?0.85:a.base==='stand'?1:0.2,r=(0.24+a.radius*0.2)*(a.former==='shallow'?1.15:a.former==='tight'?0.75:1);
    s.box([1.25,0.09,0.8],[0,y-0.06,0],a.base==='bench'?wood:iron);if(a.base==='bench')for(const x of [-0.5,0.5])for(const z of [-0.3,0.3])s.box([0.08,y-0.1,0.08],[x,(y-0.1)/2,z],wood);else if(a.base==='stand'){s.cylinder(0.1,0.15,0.9,[0,0.45,0],iron,20);s.box([0.8,0.08,0.7],[0,0.04,0],iron);}else for(const x of [-0.4,0.4])s.box([0.17,0.12,0.9],[x,0.06,0],wood);
    const arcs=a.former==='paired'?2:1;for(let j=0;j<arcs;j++){const zz=(j-(arcs-1)/2)*0.17;s.ring(r,0.07,[0,y+0.08,zz],iron,Math.PI*1.3).rotation.x=Math.PI/2;if(a.former==='compound')s.cylinder(0.14,0.14,0.13,[-0.3,y+0.1,0.2],iron,24);}
    s.cylinder(0.05,0.05,0.14,[0,y+0.1,0],steel,20);const angle={start:-1.2,pull:0.1,finish:1.1,setup:-0.8}[a.state],end:[number,number,number]=[Math.cos(angle)*(a.lever==='short'?0.55:0.8),y+0.2,Math.sin(angle)*(a.lever==='short'?0.55:0.8)];
    if(a.lever==='wheel'){s.ring(0.48,0.025,[0,y+0.22,0],iron).rotation.x=Math.PI/2;for(let j=0;j<4;j++)s.rod([0,y+0.22,0],[Math.cos(j*Math.PI/2)*0.48,y+0.22,Math.sin(j*Math.PI/2)*0.48],0.018,iron);s.rod([0,y+0.1,0],[0,y+0.22,0],0.03,steel);}else{s.rod([0,y+0.2,0],end,0.025,iron);s.rod([end[0]*0.8,end[1],end[2]*0.8],end,0.035,wood);if(a.lever==='double')s.rod([end[0]-0.18,end[1],end[2]],[end[0]+0.18,end[1],end[2]],0.025,wood);}
    if(a.state!=='setup')s.box([0.16,0.12,0.16],[r,y+0.17,0],jaw);else s.box([0.16,0.12,0.16],[-0.45,y+0.06,0.27],jaw);
    if(a.stock!=='empty')for(let i=0;i<(a.stock==='single'?1:2);i++)s.tube([[-0.5,y+0.15,-0.12+i*0.09],[-0.15,y+0.15,-0.12+i*0.09],[r*0.8,y+0.15,0.05+i*0.09],[r,y+0.15,0.28+i*0.09]],0.018,a.stock==='brass'?s.material('#b09a5c'):steel);
    if(a.stops==='pins'||a.stops==='scale')for(let j=0;j<9;j++){const t=j/8*Math.PI;const x=Math.cos(t)*(r+0.13),z=Math.sin(t)*(r+0.13);if(a.stops==='pins')s.cylinder(0.014,0.014,0.12,[x,y+0.06,z],steel,10);else s.box([0.01,0.005,0.055],[x,y+0.02,z],wood).rotation.y=-t;}
    if(a.stops==='block')s.box([0.12,0.25,0.16],[0.45,y+0.12,0.25],iron);if(a.stops==='clamp'){s.box([0.22,0.18,0.08],[-0.4,y+0.09,-0.25],iron);s.rod([-0.4,y,-0.25],[-0.4,y+0.3,-0.25],0.018,steel);s.rod([-0.5,y+0.3,-0.25],[-0.3,y+0.3,-0.25],0.014,wood);}
    if(a.offcuts==='tube')for(let i=0;i<4;i++)s.rod([-0.5+i*0.1,y+0.02,0.22],[-0.4+i*0.1,y+0.02,0.42],0.017,steel);if(a.offcuts==='blades')for(const z of [-0.27,-0.33])s.tube([[-0.5,y+0.025,z],[0,y+0.025,z],[0.25,y+0.025,z+0.12]],0.018,steel);if(a.offcuts==='gauge')s.box([0.45,0.01,0.16],[-0.2,y+0.01,-0.3],wood);
    return s.finish();

  },
});

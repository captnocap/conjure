import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    board: choice("What holds the terminals?", {"wood": "A dark wooden vertical panel.", "slate": "A grey slate switchboard.", "frame": "An open metal rack.", "desk": "A low sloping desk panel."}),
    insulators: choice("What porcelain supports are fitted?", {"spool": "Small double flanged spools.", "post": "Tall ribbed posts.", "bell": "Bell shaped porcelain caps.", "flat": "Flat round insulating discs."}),
    glaze: choice("What glaze is used?", {"white": "Cream white porcelain.", "brown": "Brown glazed porcelain.", "green": "Pale green porcelain.", "blue": "Blue-grey porcelain."}),
    wiring: choice("How are terminals connected?", {"horizontal": "Straight horizontal jumper bars.", "loops": "Loose curved wire loops.", "diagonal": "Diagonal cross connections.", "none": "Unconnected terminal posts."}),
    rows: choice("How are the rows arranged?", {"single": "One long row.", "double": "Two broad rows.", "grid": "A compact three-row grid.", "offset": "Two staggered rows."}),
    labels: choice("How are circuits marked?", {"numbers": "Numbered circuit plates.", "routes": "Short route name plates.", "colours": "Coloured terminal bands.", "none": "No circuit labels."}),
    protection: choice("What protects the circuits?", {"fuses": "Two ceramic fuse holders.", "knife": "A large knife disconnect.", "spark": "A small spark gap pair.", "none": "No added protection."}),
    state: choice("What maintenance is visible?", {"ready": "All circuits connected.", "isolated": "One red isolation marker.", "loose": "A loose jumper hangs down.", "spare": "A spare insulator sits at the foot."}),
    count: score("How many circuits are carried?", ["Three circuits", "Five circuits", "Eight circuits"])
  },
  build(a,context){

 const s=new Sculpture(context),wood=s.material('#887247'),metal=s.material('#9dab98',{metalness:0.7}),dark=s.material('#465649'),cer=s.material({white:'#d4d4ba',brown:'#8c6e4b',green:'#9aad91',blue:'#92a9a7'}[a.glaze],{roughness:0.3}),n=3+Math.round(a.count*5),rows=a.rows==='single'?1:a.rows==='grid'?3:2,w=0.2*n+0.25,h=0.3*rows+0.3;
 const start=s.root.children.length;if(a.board!=='frame')s.box([w,h,0.07],[0,h/2+0.08,0],a.board==='slate'?s.material('#6f7e6c'):wood);else{for(const x of [-w/2,w/2])s.rod([x,0.08,0],[x,h+0.08,0],0.025,dark);for(let j=0;j<rows;j++)s.rod([-w/2,0.3+j*0.3,0],[w/2,0.3+j*0.3,0],0.025,dark);}
 for(let j=0;j<rows;j++)for(let i=0;i<n;i++){const x=(i-(n-1)/2)*0.2+(a.rows==='offset'&&j?0.06:0),y=0.3+j*0.3;s.cylinder(0.065,0.065,a.insulators==='post'?0.13:0.06,[x,y,0.09],cer,24).rotation.x=Math.PI/2;if(a.insulators==='spool'||a.insulators==='post')for(let k=0;k<(a.insulators==='post'?4:2);k++)s.cylinder(0.08,0.05,0.02,[x,y,0.05+k*0.04],cer,24).rotation.x=Math.PI/2;if(a.insulators==='bell')s.cylinder(0.035,0.085,0.1,[x,y,0.11],cer,24).rotation.x=Math.PI/2;s.cylinder(0.02,0.02,0.08,[x,y,0.2],metal,12).rotation.x=Math.PI/2;
 if(i<n-1&&a.wiring!=='none'){const nx=x+0.2,ny=a.wiring==='diagonal'&&j<rows-1?y+0.3:y;s.tube([[x,y,0.24],[x+0.1,y-(a.wiring==='loops'?0.1:0),0.25],[nx,ny,0.24]],0.006,metal);}if(a.labels==='numbers'||a.labels==='routes')s.label(a.labels==='numbers'?String(j*n+i+1):['SEA','LAND','TEST'][i%3],0.12,0.05,[x,y-0.1,0.05],'#d9d1af','#5c6b55');if(a.labels==='colours')s.ring(0.03,0.008,[x,y,0.23],s.material(['#ac7354','#768d70','#b4a267'][i%3]));}
 if(a.protection==='fuses')for(const x of [-0.12,0.12])s.rod([x,0.1,0.08],[x,0.23,0.08],0.027,cer);if(a.protection==='knife'){s.box([0.22,0.05,0.1],[0,h+0.1,0],wood);s.rod([-0.08,h+0.1,0.06],[0.12,h+0.26,0.06],0.025,metal);}if(a.protection==='spark')for(const x of [-0.08,0.08])s.ball([0.05,0.05,0.05],[x,h+0.12,0],metal,16);
 if(a.board==='desk'){const g=new THREE.Group();for(const c of s.root.children.slice(start))g.add(c);g.rotation.x=-0.7;g.position.y=0.05;s.root.add(g);for(const x of [-w*0.4,w*0.4])s.rod([x,0,-h*0.4],[x,h*0.5,-h*0.4],0.03,dark);}else for(const x of a.board==='frame'?[-w/2,w/2]:[-w*0.4,w*0.4])s.box([0.1,0.08,0.45],[x,0.04,0],dark);
 if(a.state==='isolated')s.label('ISOLATED',0.25,0.1,[0,0.22,0.27],'#ddd0ae','#a3674b');if(a.state==='loose')s.tube([[-w*0.3,0.3,0.25],[-w*0.3,0.15,0.3],[-w*0.2,0.05,0.4]],0.008,metal);if(a.state==='spare')s.cylinder(0.08,0.06,0.08,[w/2,0.04,0.3],cer,24);return s.finish();

  },
});

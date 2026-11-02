import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    block: choice("What block is being serviced?", {"single": "One large sheave in an oval shell.", "double": "Two adjacent sheaves in a broad shell.", "triple": "Three sheaves in a broad shell.", "open": "One cheek is removed to expose the sheave."}),
    shell: choice("What are the block cheeks made from?", {"oak": "Golden oak cheeks.", "dark": "Dark tarred hardwood cheeks.", "painted": "Cream painted wooden cheeks.", "metal": "Grey metal cheeks."}),
    sheave: choice("What fills the rope groove?", {"brass": "A brass wheel with dark groove.", "wood": "A pale wooden wheel.", "iron": "A dark iron wheel.", "absent": "A bare central spindle without a wheel."}),
    strop: choice("How is the block attached?", {"rope": "A rope strop loops around the body.", "strap": "A flat metal strap and top eye.", "hook": "A curved top hook.", "none": "Its attachment has been removed."}),
    vice: choice("What holds the repair?", {"bench": "A blue cast iron bench vice.", "wood": "A large wooden jaw vice.", "stand": "A metal vice on a tall post.", "cradle": "A low shaped service cradle."}),
    line: choice("What is happening to the line?", {"threaded": "Rope passes through the pulley.", "coil": "A loose coil rests alongside.", "cut": "Short cut rope ends hang down.", "clear": "No rope near the sheave."}),
    tools: choice("What service tool is beside it?", {"spanner": "A spanner across the bench.", "pin": "A removed axle pin and washers.", "oil": "A small spouted oil can.", "brush": "A short bristle brush."}),
    state: choice("What repair is visible?", {"sound": "The block is ready to return aloft.", "split": "A dark split crosses one cheek.", "seized": "A rust-coloured sheave is seized in place.", "new": "A fresh pale cheek waits beside the block."}),
    size: score("How substantial is the rigging block?", ["A dinghy block", "A working boat block", "A large ship block"])
  },
  build(a,context){

    const s=new Sculpture(context),iron=s.material('#555e59',{metalness:0.6}),timber=s.material('#927347'),shell=s.material({oak:'#a28550',dark:'#4b4938',painted:'#d0c8a5',metal:'#8b9690'}[a.shell]),rope=s.material('#b8a87d'),brass=s.material(a.state==='seized'?'#9d6040':a.sheave==='brass'?'#af995e':a.sheave==='wood'?'#bba272':'#4a5350',{metalness:a.sheave==='wood'?0:0.65});
    const tall=a.vice==='stand',y=tall?1.05:0.55,r=0.18+a.size*0.1,n=a.block==='triple'?3:a.block==='double'?2:1,gap=0.1,w=n*gap+0.16;
    s.box([0.9,0.07,0.66],[0,tall?0.77:0.3,0],timber);for(const x of [-0.32,0.32])for(const z of [-0.23,0.23])s.box([0.06,tall?0.75:0.28,0.06],[x,tall?0.375:0.14,z],timber);
    const vm=a.vice==='wood'?timber:s.material('#526d79');s.box([0.32,0.08,0.3],[0,y-0.18,0],vm);
    for(const z of [-0.15,0.15]){s.box([0.38,0.18,0.06],[0,y-0.09,z],a.vice==='cradle'?timber:vm);s.box([0.4,0.035,0.025],[0,y+0.015,z*0.8],iron);}
    s.rod([0,y-0.1,0],[0,y-0.1,0.31],0.025,iron);s.rod([-0.14,y-0.1,0.31],[0.14,y-0.1,0.31],0.014,iron);
    const cy=y+r;for(const x of [-w/2,w/2])if(a.block!=='open'||x<0)s.ball([0.045,r*1.3,r*1.05],[x,cy,0],shell,20);
    for(let i=0;i<n;i++){const x=(i-(n-1)/2)*gap;if(a.sheave!=='absent'){s.cylinder(r,r,0.065,[x,cy,0],brass,32).rotation.z=Math.PI/2;s.ring(r*0.87,0.013,[x,cy,0],iron).rotation.y=Math.PI/2;}}
    s.rod([-w/2-0.035,cy,0],[w/2+0.035,cy,0],0.025,iron);
    if(a.strop==='rope')s.tube([[0,cy-r*1.3,-r],[0,cy+r*1.4,-r],[0,cy+r*1.8,0],[0,cy+r*1.4,r],[0,cy-r*1.3,r],[0,cy-r*1.3,-r]],0.022,rope);
    if(a.strop==='strap')for(const x of [-w/2-0.02,w/2+0.02]){s.box([0.028,r*2.3,0.07],[x,cy,0],iron);s.ring(0.07,0.018,[x,cy+r*1.5,0],iron).rotation.y=Math.PI/2;}
    if(a.strop==='hook')s.tube([[0,cy+r,0],[0,cy+r*1.7,0],[0,cy+r*1.9,0.08],[0,cy+r*1.65,0.13]],0.025,iron);
    if(a.line==='threaded'||a.line==='cut')s.tube([[0,y-0.1,-r],[0,cy,-r],[0,cy+r,0],[0,cy,r],[0,a.line==='cut'?cy-r:y-0.15,r]],0.019,rope);
    if(a.line==='coil')for(let i=0;i<4;i++)s.ring(0.11+i*0.012,0.013,[0.29,tall?0.82:0.35,0.08],rope).rotation.x=Math.PI/2;
    const ty=tall?0.83:0.36;if(a.tools==='spanner'){s.rod([-0.35,ty,0.18],[-0.12,ty,0.22],0.012,iron);s.ring(0.035,0.012,[-0.35,ty,0.18],iron).rotation.x=Math.PI/2;}
    if(a.tools==='pin'){s.rod([-0.36,ty,0.13],[-0.15,ty,0.13],0.016,iron);for(let j=0;j<3;j++)s.ring(0.028,0.007,[-0.3+j*0.06,ty,0.24],brass).rotation.x=Math.PI/2;}
    if(a.tools==='oil'){s.cylinder(0.035,0.055,0.1,[-0.3,ty+0.05,0.2],iron,18);s.rod([-0.3,ty+0.1,0.2],[-0.22,ty+0.2,0.2],0.009,iron);}
    if(a.tools==='brush'){s.box([0.18,0.025,0.05],[-0.28,ty,0.2],timber);s.box([0.12,0.035,0.045],[-0.3,ty+0.025,0.2],rope);}
    if(a.state==='split')s.rod([w/2+0.041,cy-r*0.65,-0.08],[w/2+0.047,cy+r*0.6,0.09],0.006,iron);
    if(a.state==='new')s.ball([0.04,r*1.25,r],[-0.3,ty+0.05,-0.12],s.material('#c7af7e'),18).rotation.z=Math.PI/2;
    s.root.rotation.y=(context.random()-0.5)*0.15;return s.finish();

  },
});

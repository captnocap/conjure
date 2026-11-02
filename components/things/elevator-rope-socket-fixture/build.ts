import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    sockets: choice("What socket type is displayed?", {"wedge": "Open wedge rope sockets.", "poured": "Closed tapered poured sockets.", "clevis": "Forked clevis end sockets.", "loop": "Thimble loop terminations."}),
    rail: choice("What carries the sockets?", {"beam": "A horizontal steel inspection beam.", "board": "A timber demonstration board.", "stand": "A narrow upright test stand.", "tray": "A low divided service tray."}),
    metal: choice("What finish do the sockets have?", {"galvanized": "Grey galvanized metal.", "black": "Blackened steel.", "bronze": "Warm bronze test pieces.", "red": "Red painted socket bodies."}),
    rope: choice("What cable remains fitted?", {"long": "Long upright wire rope tails.", "short": "Short cut steel rope ends.", "loop": "Loops of wire rope return to the sockets.", "bare": "No wire ropes are fitted."}),
    pins: choice("How are the clevis pins retained?", {"split": "Small split pin retainers.", "nuts": "Hexagonal nuts at the ends.", "rings": "Round retaining rings.", "removed": "Pins removed and laid below."}),
    wedges: choice("What is visible inside the sockets?", {"seated": "All wedges fully seated.", "raised": "One wedge lifted for inspection.", "loose": "Two loose wedges on the base.", "none": "Empty socket mouths."}),
    mark: choice("How are the connections identified?", {"numbers": "Numbered metal tags.", "paint": "Colour bands on the ropes.", "measure": "A short steel measuring rule.", "none": "No identification markings."}),
    state: choice("What service stage is shown?", {"ready": "Ready for installation.", "reject": "A red tag marks one socket.", "cleaning": "A wire brush rests below.", "cut": "Loose cut rope strands remain."}),
    number: score("How many rope terminations are displayed?", ["Two sockets", "Four sockets", "Six sockets"])
  },
  build(a,context){

    const s=new Sculpture(context),metal=s.material({galvanized:'#9daa98',black:'#4d5b4c',bronze:'#ae9763',red:'#a36c51'}[a.metal],{metalness:0.7}),dark=s.material('#4f5f51'),wood=s.material('#a58b5c'),n=2+Math.round(a.number*4),w=0.25*n+0.3,y=a.rail==='stand'?0.65:0.14;
    s.box([w,0.07,0.55],[0,0.04,0],a.rail==='board'?wood:dark);s.box([w,0.08,0.1],[0,y,0],a.rail==='board'?wood:dark);for(const x of [-w*0.4,w*0.4])s.rod([x,0.06,0],[x,y,0],0.025,dark);
    for(let i=0;i<n;i++){const x=(i-(n-1)/2)*0.25,sy=y+0.16;if(a.sockets==='loop'){s.ring(0.075,0.015,[x,sy,0],metal);s.tube([[x,sy-0.08,0],[x-0.07,sy,0],[x,sy+0.12,0],[x+0.07,sy,0],[x,sy-0.08,0]],0.008,dark);}else{if(a.sockets==='wedge'){for(const side of [-1,1])s.rod([x+side*0.045,sy-0.1,0],[x+side*0.075,sy+0.14,0],0.025,metal);s.rod([x-0.05,sy-0.1,0],[x+0.05,sy-0.1,0],0.025,metal);}else s.cylinder(0.075,0.035,0.24,[x,sy,0],metal,a.sockets==='clevis'?4:20);}
      if(a.wedges==='seated'||a.wedges==='raised')s.cylinder(0.04,0.015,0.15,[x,sy+(a.wedges==='raised'&&i===0?0.13:0),0.025],dark,4);
      if(a.rope!=='bare'){const h=a.rope==='short'?0.18:0.55;s.rod([x,sy+0.12,0],[x,sy+0.12+h,0],0.012,dark);if(a.rope==='loop')s.tube([[x,sy+0.12+h,0],[x+0.1,sy+0.1+h,0],[x+0.1,sy+0.08,0]],0.012,dark);if(a.mark==='paint')s.rod([x,sy+0.25,0],[x,sy+0.32,0],0.017,s.material(['#aa6f51','#82976f','#bcac69'][i%3]));}
      if(a.pins!=='removed'){s.rod([x-0.09,y+0.08,0],[x+0.09,y+0.08,0],0.015,metal);if(a.pins==='nuts')s.cylinder(0.028,0.028,0.02,[x+0.09,y+0.08,0],metal,6).rotation.z=Math.PI/2;else s.ring(a.pins==='rings'?0.035:0.02,0.005,[x+0.1,y+0.08,0],metal).rotation.y=Math.PI/2;}else s.rod([x,0.09,0.15],[x,0.09,0.3],0.015,metal);
      if(a.mark==='numbers')s.label(String(i+1),0.06,0.06,[x,y+0.02,0.07],'#d9d0b0','#5c6c55');}
    if(a.wedges==='loose')for(const x of [-0.15,0.15])s.cylinder(0.045,0.015,0.16,[x,0.1,0.2],metal,4).rotation.z=Math.PI/2;if(a.mark==='measure'){s.box([0.6,0.01,0.06],[0,0.08,0.22],metal);for(let j=0;j<12;j++)s.box([0.005,0.005,0.04],[-0.27+j*0.05,0.09,0.22],dark);}if(a.state==='reject')s.label('REJECT',0.2,0.1,[-w*0.3,y+0.3,0.08],'#e0d3b0','#a56d4c');if(a.state==='cleaning')s.box([0.3,0.035,0.08],[0.2,0.09,0.2],wood);if(a.state==='cut')for(let j=0;j<9;j++)s.rod([(context.random()-0.5)*0.5,0.08,0.2],[(context.random()-0.5)*0.5,0.08,0.3],0.003,metal);return s.finish();

  },
});

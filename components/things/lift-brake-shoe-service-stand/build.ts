import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    shoes: choice("How are the brake shoes arranged?", {"pair": "Two opposing curved shoes.", "single": "One large shoe.", "open": "Two shoes laid side by side.", "drum": "A pair fitted around a test drum."}),
    lining: choice("What friction lining is fitted?", {"brown": "Brown woven brake lining.", "grey": "Grey composite lining.", "black": "Dark rubber-like lining.", "bare": "Bare metal backing without lining."}),
    stand: choice("What supports the work?", {"cradle": "A low shaped metal cradle.", "bench": "A small timber bench.", "post": "A tall adjustable post stand.", "plate": "A flat steel service plate."}),
    arms: choice("What operating arms remain?", {"long": "Two long upright operating arms.", "short": "Short pivot arms.", "fork": "Forked twin operating arms.", "none": "Arms removed from the shoes."}),
    spring: choice("What spring arrangement is present?", {"single": "One central compression spring.", "double": "Two side springs.", "loose": "A removed spring on the base.", "none": "No spring fitted."}),
    rivets: choice("How is the lining attached?", {"row": "A single row of brass rivets.", "double": "Two parallel rivet rows.", "screws": "Large countersunk screw heads.", "plain": "No visible fasteners."}),
    tool: choice("What service tool lies nearby?", {"caliper": "A large jaw caliper.", "spanner": "A long open-ended spanner.", "brush": "A stiff wire brush.", "none": "No extra tool."}),
    state: choice("What repair is underway?", {"ready": "Freshly relined shoes.", "worn": "A dark polished wear band.", "removed": "One lining strip lies detached.", "tag": "A service date tag."}),
    diameter: score("How broad is the brake drum diameter?", ["A small brake", "A normal brake", "A broad heavy brake"])
  },
  build(a,context){

    const s=new Sculpture(context),metal=s.material('#64776a',{metalness:0.65}),steel=s.material('#a8b29e',{metalness:0.75}),lining=s.material({brown:'#9b8057',grey:'#939b87',black:'#4b5547',bare:'#8a9b88'}[a.lining]),wood=s.material('#a18a59'),r=0.23+a.diameter*0.2,baseY=a.stand==='bench'?0.6:a.stand==='post'?0.85:0.12,cy=baseY+r;
    s.box([1.2,0.08,0.8],[0,baseY-0.04,0],a.stand==='bench'?wood:metal);if(a.stand==='bench')for(const x of [-0.5,0.5])for(const z of [-0.3,0.3])s.box([0.06,0.52,0.06],[x,0.26,z],wood);if(a.stand==='post'){s.rod([0,0.05,0],[0,baseY,0],0.065,metal);s.box([0.8,0.08,0.7],[0,0.04,0],metal);}if(a.stand==='cradle')for(const x of [-0.35,0.35])s.box([0.12,0.08,0.6],[x,0.04,0],metal);
    for(let k=0;k<(a.shoes==='single'?1:2);k++){const angle=k*Math.PI+0.25,x=a.shoes==='open'?(k-0.5)*(r*2+0.1):0,ring=s.ring(r,0.045,[x,cy,0],metal,Math.PI*0.8);ring.rotation.z=angle;
      if(a.lining!=='bare'){const band=s.ring(r-0.025,0.025,[x,cy,0.02],lining,Math.PI*0.8);band.rotation.z=angle;}
      if(a.rivets!=='plain')for(let j=0;j<7;j++){const t=angle+j/6*Math.PI*0.8;for(const zz of a.rivets==='double'?[-0.035,0.035]:[0.04])s.ball([a.rivets==='screws'?0.012:0.008,0.008,0.005],[x+Math.cos(t)*r,cy+Math.sin(t)*r,zz],steel,8);}
      s.rod([x,baseY,0],[x+Math.cos(angle+Math.PI*0.4)*r,cy+Math.sin(angle+Math.PI*0.4)*r,0],0.025,metal);
      if(a.arms!=='none')for(const z of a.arms==='fork'?[-0.07,0.07]:[0])s.rod([x+(k?1:-1)*r*0.8,cy,z],[x+(k?1:-1)*r*1.1,cy+(a.arms==='long'?0.5:0.22),z],0.022,metal);
    }
    if(a.shoes==='drum')s.cylinder(r-0.06,r-0.06,0.24,[0,cy,0],steel,32).rotation.x=Math.PI/2;
    if(a.spring!=='none')for(const x of a.spring==='double'?[-0.3,0.3]:[0]){const yy=a.spring==='loose'?baseY+0.05:cy+r+0.18,zz=a.spring==='loose'?0.3:0;s.rod([x-0.2,yy,zz],[x+0.2,yy,zz],0.01,steel);for(let j=0;j<12;j++)s.ring(0.04,0.008,[x-0.17+j*0.03,yy,zz],steel).rotation.y=Math.PI/2;if(a.spring!=='loose')for(const dx of [-0.2,0.2])s.rod([x+dx,yy,zz],[dx<0?-r:r,cy+0.1,0],0.014,metal);}
    if(a.tool==='spanner'||a.tool==='caliper'){s.rod([-0.45,baseY+0.03,0.3],[0.2,baseY+0.03,0.3],0.012,steel);if(a.tool==='spanner')s.ring(0.045,0.014,[-0.45,baseY+0.03,0.3],steel,Math.PI*1.6).rotation.x=Math.PI/2;else for(const x of [-0.4,0])s.rod([x,baseY+0.03,0.3],[x,baseY+0.03,0.45],0.012,steel);}if(a.tool==='brush')s.box([0.26,0.05,0.08],[-0.3,baseY+0.03,0.3],wood);
    if(a.state==='worn')s.ring(r-0.025,0.012,[0,cy,0.05],s.material('#4d5649'),Math.PI*0.5).rotation.z=0.5;if(a.state==='removed')s.ring(r,0.02,[0.35,baseY+0.03,0.25],lining,Math.PI*0.65).rotation.x=Math.PI/2;if(a.state==='tag')s.label('RELINED',0.3,0.12,[0,baseY+0.01,-0.25],'#637058','#ddd1ad').rotation.x=-Math.PI/2;return s.finish();

  },
});

import * as THREE from 'three';
import { Sculpture, choice, score, noul, diorama, defineThing, defineWorld, figure } from '@conjure/kit';
export default defineThing({
  questions: {
    form: choice("What vessel form is being raised?", {"barrel": "A bulging barrel shell.", "tub": "A low open wash tub.", "vat": "A tall straight-sided vat.", "keg": "A small squat keg."}),
    assembly: choice("How complete is the stave shell?", {"half": "Only half the circle is raised.", "threequarters": "Three quarters of the shell.", "gap": "A nearly complete shell with one gap.", "complete": "A complete open shell."}),
    staves: choice("What stave edge pattern appears?", {"wide": "Wide heavy oak staves.", "narrow": "Many narrow staves.", "alternate": "Alternating wide and narrow cuts.", "rough": "Uneven upper stave ends."}),
    hoops: choice("What temporary hoops are used?", {"iron": "Two dark iron raising hoops.", "wood": "Three pale wooden hoops.", "rope": "Two rope binding loops.", "single": "One broad lower hoop."}),
    support: choice("What supports the assembly?", {"floor": "Directly on the floor.", "ring": "A low circular raising stand.", "blocks": "Two timber support blocks.", "cradle": "A square braced cradle."}),
    head: choice("What cask head is visible?", {"none": "No head fitted.", "bottom": "A bottom head in place.", "aside": "A loose head beside the shell.", "half": "A half-assembled head beside it."}),
    tools: choice("What tool accompanies the shell?", {"driver": "A short hoop-driving tool.", "mallet": "A heavy cooper mallet.", "stave": "A spare curved stave.", "none": "No loose tool."}),
    state: choice("What raising detail is visible?", {"ready": "Clean newly raised staves.", "chalk": "Two chalk match marks.", "wedge": "A spreading wedge in the gap.", "cord": "A binding cord crossing the mouth."}),
    height: score("How large is the vessel?", ["Small cask", "Standard barrel", "Large oak vessel"])
  },
  build(a,context){
 const s=new Sculpture(context),wood=s.material('#a68a5e'),light=s.material('#c0a46e'),dark=s.material('#5b543f'),iron=s.material('#606f5d',{metalness:.5}),brass=s.material('#b59e63'),pale=s.material('#dfd0a7');

 const H=(a.form==='tub'?.45:a.form==='keg'?.65:.85)+a.height*.4,R=a.form==='vat'?.45:.38,by=a.support==='floor'?0:.12,N=a.staves==='narrow'?22:a.staves==='wide'?12:16,f={half:.5,threequarters:.75,gap:.93,complete:1}[a.assembly],count=Math.floor(N*f),radius=(v:number)=>R+(a.form==='vat'?0:a.form==='tub'?v*.07:Math.sin(v*Math.PI)*.09);
 if(a.support==='ring')s.cylinder(R*.8,R,.12,[0,.06,0],dark,32);if(a.support==='blocks')for(const x of [-R*.6,R*.6])s.box([.15,.12,R*2.1],[x,.06,0],wood);if(a.support==='cradle'){for(const z of [-R*.8,R*.8])s.box([R*2.3,.12,.12],[0,.06,z],wood);for(const x of [-R*.8,R*.8])s.box([.12,.12,R*2.3],[x,.06,0],wood);}
 for(let j=0;j<count;j++){const t=j/N*Math.PI*2,span=Math.PI*2/N*.94,hh=H*(a.staves==='rough'?.95+(j%3)*.025:1);for(const inside of [false,true])s.surface((u,v,p)=>{const tt=t+(u-.5)*span,rr=radius(v)-(inside?.025:0);return p.set(Math.sin(tt)*rr,by+v*hh,Math.cos(tt)*rr);},j%2?wood:light,{segments:[2,14],flip:inside});for(const v of [0,1])s.surface((u,w,p)=>{const tt=t+(u-.5)*span,rr=radius(v)-w*.025;return p.set(Math.sin(tt)*rr,by+v*hh,Math.cos(tt)*rr);},wood,{segments:[2,1]});}
 for(const v of a.hoops==='single'?[.18]:a.hoops==='wood'?[.15,.5,.85]:[.18,.78])s.ring(radius(v)+.012,a.hoops==='single'?.035:a.hoops==='rope'?.012:.022,[0,by+H*v,0],a.hoops==='iron'||a.hoops==='single'?iron:a.hoops==='rope'?dark:light).rotation.x=Math.PI/2;
 const head=(x:number,z:number,half:boolean)=>{for(let j=-4;j<=4;j++){const xx=j*R*.19;if(half&&j>0)continue;const d=2*Math.sqrt(Math.max(0,R*R-xx*xx));s.box([R*.18,.035,d],[x+xx,.0175,z],wood);}};if(a.head==='bottom'){s.cylinder(R-.02,R-.02,.04,[0,by+.02,0],wood,32);for(let j=-3;j<=3;j++)s.box([.006,.004,R*1.3],[j*R*.22,by+.043,0],dark);}if(a.head==='aside'||a.head==='half')head(R*2.4,0,a.head==='half');
 if(a.tools==='driver'){s.rod([-.2,.025,R+ .23],[.15,.025,R+.23],.025,dark);s.box([.07,.05,.1],[.17,.025,R+.23],iron);}if(a.tools==='mallet'){s.rod([-.2,.025,R+.23],[.15,.025,R+.23],.018,wood);s.box([.1,.09,.2],[.18,.045,R+.23],dark);}if(a.tools==='stave')s.box([.15,.035,H],[R+.2,.0175,0],light);if(a.state==='chalk')for(const x of [-.07,.07])s.rod([x,by+H*.5,R+.1],[x,by+H*.65,R+.09],.005,pale);if(a.state==='wedge')s.box([.08,.14,.15],[R*.7,by+H*.7,R*.7],dark);if(a.state==='cord')s.rod([-R,by+H,0],[R,by+H,0],.007,dark);return s.finish();

  },
});

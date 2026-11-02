import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shape is the crock?", {"barrel": "A round straight-sided barrel crock.", "belly": "A broad bellied stoneware pot.", "tall": "A tall narrow fermenting crock.", "wide": "A low broad cabbage crock.", "small": "A small family counter crock."}),
  state: choice("What stage is the ferment at?", {"sealed": "The lid sits within the filled water moat.", "open": "The lid rests beside an open crock.", "weight": "Two weights cover the vegetables.", "packing": "Cabbage leaves show during packing.", "clean": "The clean empty crock is ready."}),
  detail: choice("What glaze covers the pottery?", {"brown": "Warm brown earthenware.", "cream": "Ivory stoneware with a dark rim.", "blue": "Muted blue glaze.", "green": "Soft green glaze.", "two": "A dark upper rim over pale clay."}),
  support: choice("What carries the crock?", {"bare": "It rests directly on the counter.", "board": "A round wooden trivet.", "mat": "A woven straw mat.", "feet": "Three low clay feet.", "tray": "A shallow wooden spill tray."}),
  extra: choice("What sits beside it?", {"tamper": "A short wood cabbage tamper.", "leaf": "A spare cabbage leaf.", "salt": "A small salt bowl.", "ladle": "A shallow wooden ladle.", "none": "Only the crock and lid."}),
  mark: choice("How is the batch marked?", {"day": "A STARTED MONDAY tag.", "cabbage": "A CABBAGE batch label.", "cloth": "A small tied cloth tag.", "band": "A blue stripe around the belly.", "plain": "Unmarked stoneware."}),
  extent: score("How broad is the crock?", ["A small kitchen batch", "A household preserving crock", "A large shared batch"]),
  load: score("How full is the crock?", ["A shallow layer", "Half full", "Packed close to the rim"]),
  closed: noul("Does a cloth wipe hang from one handle?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=(f===4?.13:f===3?.23:.18)+a.extent*.07,h=f===2?.5:f===3?.25:.36,mat=s.material(['#96734e','#d4c8a6','#748f9d','#809977','#bda67b'][d]),base=u===3?.04:u===0?0:.015,belly=f===1?r*1.2:r;s.lathe([[r*.8,0],[belly,h*.45],[r,h-.04],[r+.025,h],[r-.025,h],[r-.035,.035],[0,.035]],mat,[0,base,0]);s.ring(r+.014,.016,[0,base+h-.01,0],d===1||d===4?dark:mat).rotation.x=Math.PI/2;s.ring(r+.015,.004,[0,base+h-.001,0],s.material('#8fa69d')).rotation.x=Math.PI/2;for(const x of [-r*1.04,r*1.04])s.tube([[x,base+h*.55,-.05],[x*1.22,base+h*.57,0],[x,base+h*.55,.05]],.018,mat);
    const lidX=t===0?0:r*2.1,lidY=t===0?base+h+.012:.023;s.cylinder(r*.96,r,.025,[lidX,lidY,0],mat,32);s.ball([.045,.025,.045],[lidX,lidY+.032,0],mat,18);if(t>0&&t<4){const fy=base+.05+a.load*(h-.11);s.cylinder(r*.83,r*.83,.012,[0,fy,0],green,28);if(t===2)for(const x of [-r*.4,r*.4])s.box([r*.72,.025,r*1.15],[x,fy+.019,0],pale);else for(let i=0;i<8;i++){const ang=i*2.399,rr=r*.65*Math.sqrt(i/8);s.ball([r*.3,.014,r*.2],[Math.cos(ang)*rr,fy+.015,Math.sin(ang)*rr],s.material(i%2?'#c1c690':'#a4b47d'),12);}}if(u===1||u===2)s.cylinder(r*1.2,r*1.2,.015,[0,.0075,0],u===1?wood:pale,30);if(u===3)for(let i=0;i<3;i++)s.ball([.045,.035,.045],[Math.cos(i*2.094)*r*.65,.025,Math.sin(i*2.094)*r*.65],mat,12);if(u===4)s.box([r*2.5,.015,r*2.5],[0,.0075,0],wood);
    if(m<3)s.label(['STARTED MONDAY','CABBAGE','BATCH 02'][m],r*1.5,.055,[0,base+h*.55,belly+.004]);if(m===3)s.ring(belly+.002,.012,[0,base+h*.45,0],s.material('#6e8799')).rotation.x=Math.PI/2;if(a.closed)s.drape({size:[.15,.24],at:[-r*1.1,base+h*.55,.04],over:[{ball:.025,at:[-r*1.1,base+h*.55,.04]}],floor:.01,detail:12},pale);const x=-r*2;if(e===0){s.cylinder(.045,.045,.05,[x,.025,0],wood,18);s.rod([x,.04,0],[x,.26,0],.018,wood);}if(e===1)s.ball([.11,.007,.075],[x,.007,0],green,16);if(e===2)s.lathe([[.04,0],[.07,.05],[.06,.05],[.03,.01]],pale,[x,0,0]);if(e===3){s.ball([.045,.012,.035],[x,.015,-.08],wood,16);s.rod([x,.014,-.06],[x,.014,.14],.008,wood);}return s.finish();
  },
});

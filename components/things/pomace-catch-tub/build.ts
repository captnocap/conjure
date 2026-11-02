import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What holds the apple pomace?", {"staves": "A round stave-built wooden tub.", "steel": "A galvanized wash tub.", "crate": "A square slatted harvest crate.", "barrow": "A shallow tub on a one-wheel barrow.", "basket": "A deep woven gathering basket."}),
  state: choice("What is the tub doing?", {"filling": "Fresh loose pulp forms a mound.", "pressed": "Flat broken cakes of pressed pomace.", "scooped": "A hollow marks the last scoop.", "carried": "A cloth covers the load for carrying.", "empty": "Nearly empty with wet scraps on the bottom."}),
  detail: choice("What is mixed into the pomace?", {"peel": "Red apple peel flecks.", "seeds": "Dark seeds and broken cores.", "green": "Green peel curls.", "straw": "A little straw from the yard.", "clean": "Fine uniformly pale pulp."}),
  support: choice("How is the tub carried?", {"loops": "Two rope loop handles.", "iron": "Two curved iron handles.", "wood": "Two stout wooden grips.", "poles": "A pair of carrying poles.", "none": "No separate handles."}),
  extra: choice("What tool is left in it?", {"paddle": "A broad wooden scooping paddle.", "fork": "A short three-prong fork.", "shovel": "A square metal shovel.", "scoop": "A deep hand scoop.", "none": "No tool."}),
  mark: choice("What is on the side?", {"compost": "COMPOST written on a board.", "feed": "ANIMAL FEED on a tag.", "press": "PRESS DAY on a painted band.", "repair": "A bright repair hoop.", "plain": "No lettering."}),
  extent: score("How broad is the tub?", ["A small household tub", "A harvest tub", "A large communal tub"]),
  load: score("How much pomace remains?", ["A thin layer", "Half a tub", "A mound above the rim"]),
  closed: noul("Is a little spilled pomace scattered beside the tub?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.23+a.extent*.19,h=.32,mat=f===1?metal:wood,base=f===3?.28:0;
    if(f===2){s.box([r*2,.03,r*1.7],[0,base+.015,0],wood);for(const z of [-r*.85,r*.85])for(const y of [.08,.18,.28])s.box([r*2,.07,.025],[0,base+y,z],wood);for(const x of [-r,r])s.box([.025,h,r*1.7],[x,base+h/2,0],wood);}else{s.lathe([[r*.75,0],[r,h],[r-.015,h],[r*.72,.025]],mat,[0,base,0]);for(const y of [.05,.26])s.ring(r*(.75+y/h*.25),.009,[0,base+y,0],f===4?pale:metal).rotation.x=Math.PI/2;if(f===0)for(let i=0;i<18;i++){const ang=i*Math.PI/9;s.rod([Math.cos(ang)*r*.76,base+.02,Math.sin(ang)*r*.76],[Math.cos(ang)*r,base+h,Math.sin(ang)*r],.002,dark);}}
    const level=t===4?.04:.06+a.load*.26,pulp=s.material('#c1ad77');if(t!==3&&t!==4){s.cylinder(r*.65,r*.6,Math.max(.01,level-.025),[0,base+.025+Math.max(.01,level-.025)/2,0],pulp,24);}
    for(let i=0;i<(t===3?0:t===4?8:32);i++){const ang=random()*Math.PI*2,rr=Math.sqrt(random())*r*.55,x=Math.cos(ang)*rr,z=Math.sin(ang)*rr,y=base+(t===2&&x>0?level*.6:level)+random()*.025;s.ball([.045,t===1?.012:.025,.04],[x,y,z],pulp,8);if(i%3===0&&d!==4)s.rod([x,y+.02,z],[x+.03,y+.025,z+.015],d===1?.004:.006,d===0?s.material('#a86b4c'):d===2?green:d===3?pale:dark);}
    for(const sign of [-1,1]){const x=sign*(r+.02);if(u===0||u===1)s.ring(.07,.009,[x,base+h*.75,0],u===0?pale:metal).rotation.y=Math.PI/2;if(u===2)s.rod([x,base+h*.8,-.09],[x,base+h*.8,.09],.022,wood);if(u===3)s.rod([x,base+h*.6,-r-.3],[x,base+h*.6,r+.3],.025,wood);}
    if(f===3){s.cylinder(.16,.16,.05,[0,.16,r+.12],dark,20).rotation.z=Math.PI/2;for(const x of [-r*.65,r*.65]){s.rod([x,.16,r],[x,.5,-r-.4],.025,wood);s.rod([x,0,-r*.5],[x,.3,-r*.5],.02,metal);}}
    if(e<4){s.rod([-.08,base+level,0],[r*.7,base+h+.38,-.18],.018,wood);if(e===0)s.box([.12,.025,.2],[-.08,base+level+.01,0],wood);if(e===1)for(let i=0;i<3;i++)s.rod([-.13+i*.05,base+level,-.06],[-.13+i*.05,base+level,.12],.006,metal);if(e===2)s.box([.17,.012,.18],[-.08,base+level+.01,0],metal);if(e===3)s.ball([.09,.035,.07],[-.08,base+level+.01,0],metal,12);}
    if(t===3)s.drape({size:[r*2.2,r*2.2],at:[0,base+h+.2,0],over:[{cylinder:[r,h],at:[0,base+h/2,0]}],floor:base+.05,detail:14},pale);if(m<3)s.label(['COMPOST','ANIMAL FEED','PRESS DAY'][m],r*1.4,.08,[0,base+h*.65,r*.92]);if(m===3)s.ring(r*.9,.015,[0,base+h*.6,0],metal).rotation.x=Math.PI/2;if(a.closed)for(let i=0;i<8;i++)s.ball([.025,.012,.02],[r+.06+random()*.17,.012,(random()-.5)*r],pulp,8);return s.finish();
  },
});

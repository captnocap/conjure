import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What body does the smoker have?", {"round": "A compact cylindrical smoker.", "tall": "A tall narrow smoker.", "wide": "A broad old-fashioned can.", "guard": "A full wire-guarded smoker.", "small": "A little training smoker."}),
  state: choice("What is the smoker doing?", {"rest": "A closed smoker rests between inspections.", "puff": "A gentle puff curls from the spout.", "open": "The lid is hinged open for fuel.", "cool": "The lid is closed with a cooling plug in the spout.", "empty": "A cleaned open smoker is empty."}),
  detail: choice("What metal finish does it have?", {"steel": "Brushed stainless steel.", "tin": "Dull old tinned metal.", "copper": "A warm copper body.", "black": "A smoke-darkened steel body.", "patched": "A metal body with a small riveted repair."}),
  support: choice("How are the bellows built?", {"leather": "Dark brown leather bellows.", "red": "Muted red leather bellows.", "wood": "Pale wooden paddles and dark cloth folds.", "green": "Green canvas bellows.", "black": "Black flexible bellows with a wood grip."}),
  extra: choice("What lies beside the smoker?", {"fuel": "A little bundle of dry fuel strips.", "plug": "A small wooden cooling plug.", "tool": "A flat hive lever.", "brush": "A short ash-cleaning brush.", "none": "No loose item."}),
  mark: choice("What identifies the smoker?", {"badge": "A small APIARY brass badge.", "dots": "Two rows of bright rivets.", "stripe": "A narrow blue-painted bellows stripe.", "initial": "A small stamped BEE mark.", "plain": "Plain worn surfaces."}),
  extent: score("How large is the smoker?", ["A palm-sized smoker", "An everyday hive smoker", "A large inspection smoker"]),
  load: score("How far are the bellows opened?", ["Nearly compressed", "Half open", "Fully opened for the next puff"]),
  closed: noul("Is a wire hanging hook fitted to the heat guard?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=(f===4?.06:f===2?.12:.09)+a.extent*.025,h=f===1?.32:.23,body=s.material(['#929c96','#849187','#b08b64','#596356','#a4ada0'][d],{metalness:.7,roughness:.4});s.lathe([[0,0],[r,0],[r,h],[r-.008,h],[r-.008,.01],[0,.01]],body);s.ring(r,.007,[0,.02,0],metal).rotation.x=Math.PI/2;
    const open=t===2||t===4,lid=new THREE.Group();lid.add(s.mesh(new THREE.ConeGeometry(r,.13,28),body,[0,.065,0]));lid.add(s.tube([[0,.12,0],[.045,.17,0],[.08,.18,0]],.021,body));lid.position.set(0,h,0);if(open){lid.position.set(-r,h,0);lid.rotation.z=Math.PI*.65;lid.children.forEach(c=>c.position.x+=r);}s.root.add(lid);s.rod([-r,h-.02,-.025],[-r,h-.02,.025],.009,metal);
    for(let i=0;i<(f===3?10:6);i++){const ang=i*Math.PI*2/(f===3?10:6),rr=r+.018;s.rod([Math.cos(ang)*rr,.03,Math.sin(ang)*rr],[Math.cos(ang)*rr,h-.025,Math.sin(ang)*rr],.0025,metal);}for(const yy of [.05,h-.04])s.ring(r+.018,.003,[0,yy,0],metal).rotation.x=Math.PI/2;
    const gap=.035+a.load*.07,bellows=s.material(['#75533c','#a36651','#696958','#69846b','#454d43'][u]),bx=r+.055;s.box([.018,h*.9,r*1.45],[bx,h*.48,0],wood);const moving=new THREE.Group();moving.add(s.box([.018,h*.9,r*1.45],[0,0,0],wood));moving.position.set(bx+gap,h*.48,0);moving.rotation.z=-.08-a.load*.15;s.root.add(moving);for(let i=0;i<6;i++)s.box([gap,.018,r*1.35],[bx+gap/2,.04+i*h*.12,0],bellows);s.rod([r,h*.3,0],[bx,h*.3,0],.018,metal);
    if(t===1){const smoke=s.material('#c1c5b6',{transparent:true,opacity:.25,depthWrite:false});for(let i=0;i<3;i++)s.ball([.035+i*.014,.035+i*.018,.035+i*.014],[.09+i*.025,h+.23+i*.07,0],smoke,14);}if(t===3)s.cylinder(.017,.018,.045,[.085,h+.19,0],wood,14).rotation.z=-.5;if(d===4){s.box([r*.8,.08,.012],[0,h*.5,r+.003],metal);for(const x of [-r*.3,r*.3])for(const yy of [h*.5-.028,h*.5+.028])s.ball([.004,.004,.003],[x,yy,r+.012],dark,8);}
    if(m===0||m===3)s.label(m===0?'APIARY':'BEE',r*1.3,.035,[0,h*.55,r+.005]);if(m===1)for(let i=0;i<5;i++)for(const sign of [-1,1])s.ball([.004,.004,.003],[sign*r*.55,.04+i*h*.15,r*.84],pale,8);if(m===2)s.box([.004,.03,r*1.3],[bx+gap+.016,h*.5,0],s.material('#7695a0'));if(a.closed)s.tube([[0,h*.8,-r-.02],[0,h+.09,-r-.05],[0,h+.1,-r-.09],[0,h+.04,-r-.09]],.004,metal);
    if(e===0)for(let i=0;i<6;i++)s.rod([-r-.16+i*.01,.006,-.08],[-r-.16+i*.01,.006,.08],.003,wood);if(e===1)s.cylinder(.018,.012,.05,[-r-.12,.018,0],wood,12).rotation.x=Math.PI/2;if(e===2)s.box([.035,.005,.18],[-r-.12,.003,0],s.material('#aa6650'));if(e===3){s.rod([-r-.12,.01,-.07],[-r-.12,.01,.08],.006,wood);s.box([.05,.015,.05],[-r-.12,.012,.08],pale);}return s.finish({update:(_dt,time)=>{if(t===1)moving.rotation.z=-.1-a.load*.15+Math.sin(time*2)*.035;}});
  },
});

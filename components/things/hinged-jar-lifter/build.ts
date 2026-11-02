import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What type of jar lifter is used?", {"scissor": "Crossed scissor-action metal tongs.", "parallel": "Long parallel arms with a spring bridge.", "short": "A compact short-handled lifter.", "wide": "A broad lifter for large jars.", "wood": "Metal tongs with long wooden grips."}),
  state: choice("What is the lifter doing?", {"grip": "Gripping a closed preserving jar.", "open": "Open jaws stand over an empty work patch.", "rest": "The tongs lie flat beside a jar.", "release": "A jar sits just beneath the open jaws.", "stored": "The closed tongs lie alone."}),
  detail: choice("What finish covers the metal?", {"steel": "Bright steel.", "black": "Darkened steel.", "cream": "Cream enamel arms.", "green": "Muted green enamel.", "copper": "Warm copper-coloured metal."}),
  support: choice("What covers the jaws?", {"red": "Muted red rubber.", "black": "Black rubber grips.", "blue": "Blue rubber sleeves.", "tan": "Tan cork pads.", "green": "Dark green rubber."}),
  extra: choice("What sits beside the lifter?", {"cloth": "A thick folded jar towel.", "lid": "A spare metal jar lid.", "ring": "A loose sealing ring.", "label": "A small batch label card.", "none": "No loose item."}),
  mark: choice("What is on the handles?", {"loops": "Open loop grips.", "wood": "Two wooden grip sleeves.", "dots": "A row of pale grip studs.", "band": "A cream maker band.", "plain": "Plain metal grips."}),
  extent: score("How long are the tongs?", ["A compact jar lifter", "An everyday preserving lifter", "Long careful-reach tongs"]),
  load: score("How widely are the jaws opened?", ["A narrow jar grip", "A medium opening", "A wide open grip"]),
  closed: noul("Is a small wire storage latch closed around the handles?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const H=(f===2?.25:.38)+a.extent*.12,jarR=f===3?.1:.075,jaw=t===0?jarR:t===4?.035:.07+a.load*.07,mat=s.material(['#9ca59a','#4e5d4e','#d0cbb2','#7d987b','#af8b65'][d],{metalness:.6}),rub=s.material(['#ad6952','#465245','#668b9d','#b79f73','#647e60'][u]),g=new THREE.Group();for(const side of [-1,1]){const x=side*jaw;g.add(s.rod([x,.06,0],[-side*.055,H,0],.01,mat));g.add(s.tube([[x,.06,-.065],[x,.04,0],[x,.06,.065]],.014,rub));if(m===0){const ring=s.ring(.04,.008,[-side*.055,H+.025,0],mat);g.add(ring);}if(m===1||f===4)g.add(s.rod([-side*.055,H*.75,0],[-side*.055,H+.03,0],.018,wood));if(m===2)for(let i=0;i<5;i++)g.add(s.ball([.008,.008,.008],[-side*.055,H*.76+i*.022,.01],pale,8));if(m===3)g.add(s.box([.035,.05,.018],[-side*.055,H*.8,0],pale));}g.add(s.cylinder(.018,.018,.035,[0,H*.52,0],metal,16).rotateX(Math.PI/2));if(f===1)g.add(s.tube([[-.055,H,0],[-.04,H+.05,0],[.04,H+.05,0],[.055,H,0]],.006,metal));if(a.closed)g.add(s.ring(.065,.004,[0,H*.87,0],metal));if(t===2||t===4){g.rotation.x=-Math.PI/2;g.position.set(.24,.025,0);}else g.position.y=t===0?.13:t===3?.15:0;s.root.add(g);if(t===3){s.box([.12,.018,.14],[0,.009,-.08],wood);s.rod([0,.018,-.08],[0,.15+H*.52,-.08],.009,metal);s.rod([0,.15+H*.52,-.08],[0,.15+H*.52,0],.009,metal);}
    if(t!==1&&t!==4){const glass=s.material('#b2c2ac',{transparent:true,opacity:.35,depthWrite:false});s.lathe([[jarR*.8,0],[jarR,.025],[jarR,.2],[jarR*.85,.23],[jarR*.85,.25]],glass);s.cylinder(jarR*.84,jarR*.84,.17,[0,.095,0],green,24);s.cylinder(jarR*.92,jarR*.92,.018,[0,.26,0],metal,24);}if(t===1){s.box([jaw*2+.1,.025,.16],[0,.0125,0],wood);for(const x of [-jaw,jaw])s.rod([x,.01,0],[x,.065,0],.015,wood);}if(e===0)s.box([.2,.025,.17],[-.24,.013,0],pale);if(e===1)s.cylinder(.075,.075,.012,[-.24,.006,0],metal,24);if(e===2)s.ring(.07,.004,[-.24,.005,0],rub).rotation.x=Math.PI/2;if(e===3)s.label('BATCH 02',.17,.08,[-.24,.003,0]).rotation.x=-Math.PI/2;return s.finish();
  },
});

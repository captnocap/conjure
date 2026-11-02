import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing, figure } from '@conjure/kit';
const questions = {
  form: choice("What shallow water vessel is used?", {"round": "A round terracotta saucer.", "oval": "A broad oval stoneware dish.", "rect": "A long low enamel tray.", "double": "Two small connected drinking dishes.", "stone": "A shallow hollow in a flat stone."}),
  state: choice("What state is the water in?", {"full": "A fresh shallow water surface.", "low": "Water is low among the pebbles.", "refill": "A small inverted bottle replenishes the dish.", "dry": "The clean tray waits to be refilled.", "rain": "Fresh rain has filled the rim."}),
  detail: choice("What gives the bees a landing place?", {"stones": "Rounded pale river pebbles.", "marbles": "Large muted green glass marbles.", "cork": "Floating cork disks.", "gravel": "A bed of fine mixed pebbles.", "mixed": "A mix of stones and cork floats."}),
  support: choice("What supports the tray?", {"ground": "Directly on the rooftop floor.", "stool": "A low timber stool.", "brick": "Three old brick feet.", "slab": "A broad flat stone slab.", "stand": "A slender three-legged metal stand."}),
  extra: choice("What grows beside the water?", {"thyme": "A small thyme plant in a pot.", "lavender": "A little lavender pot.", "leaf": "A single fallen leaf beside the dish.", "bottle": "A spare water refill bottle.", "none": "Only the drinking station."}),
  mark: choice("What marks the station?", {"bee": "A small painted bee on the rim.", "water": "A BEE WATER plaque.", "dots": "Blue dots around the edge.", "date": "A little refill-date tag.", "plain": "Plain clay and stone."}),
  extent: score("How broad is the water tray?", ["A small garden saucer", "A rooftop drinking dish", "A broad communal bee bath"]),
  load: score("How many landing stones fill the water?", ["A few large stepping stones", "A close ring of safe landings", "A full shallow bed of stones"]),
  closed: noul("Are several worker bees resting on the landing stones?"),
};
export default defineThing({
  questions,
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const f = Object.keys(questions.form.options).indexOf(a.form), t = Object.keys(questions.state.options).indexOf(a.state), d = Object.keys(questions.detail.options).indexOf(a.detail), u = Object.keys(questions.support.options).indexOf(a.support), e = Object.keys(questions.extra.options).indexOf(a.extra), m = Object.keys(questions.mark.options).indexOf(a.mark);
    const wood = s.material('#a47c4e'), pale = s.material('#e0d2ac'), metal = s.material('#8f9995', { metalness: 0.7, roughness: 0.35 }), dark = s.material('#3d443c'), green = s.material('#667e50');
    const colors = ['#a64d39', '#497e70', '#d4af55', '#59778c', '#b47b8c'];

    const r=.18+a.extent*.16,h=.05,base=u===1?.22:u===2?.06:u===3?.025:u===4?.4:0,clay=s.material(f===2?'#c8d1bf':f===4?'#959d89':'#ae8966'),centers=f===3?[-r*.75,r*.75]:[0],rr=f===3?r*.6:r;
    for(const cx of centers){if(f===2){s.box([r*2,.018,r*1.3],[cx,base+.009,0],clay);for(const x of [-r,r])s.box([.015,h,r*1.3],[cx+x,base+h/2,0],clay);for(const z of [-r*.65,r*.65])s.box([r*2,h,.015],[cx,base+h/2,z],clay);}else{const dish=s.lathe([[0,0],[rr*.85,.01],[rr,h],[rr-.015,h],[rr*.8,.018],[0,.018]],clay,[cx,base,0]);if(f===1)dish.scale.z=.7;}
      if(t!==3){const water=s.cylinder(rr*.88,rr*.88,.003,[cx,base+(t===1?.022:.036),0],s.material('#91aaa4',{transparent:true,opacity:.7,depthWrite:false}),32);if(f===1||f===2)water.scale.z=.65;}
      const n=7+Math.round(a.load*13);for(let i=0;i<n;i++){const ang=i*2.399,rad=Math.sqrt((i+.5)/n)*rr*.78,x=cx+Math.cos(ang)*rad,z=Math.sin(ang)*rad*(f===1||f===2?.65:1),rockMat=d===1?s.material('#6e9d90',{roughness:.15}):d===2||d===4&&i%3===0?wood:pale,sz=d===3?.019:.028;s.ball([sz,.025,sz*.8],[x,base+.035,z],rockMat,10);if(a.closed&&i<5){s.ball([.009,.005,.004],[x,base+.064,z],dark,8);for(const dx of [-.004,.004])s.ball([.005,.001,.008],[x+dx,base+.069,z],pale,8);}}
    }
    if(u===1){s.box([r*2,.035,r*1.6],[0,base-.018,0],wood);for(const x of [-r*.6,r*.6])for(const z of [-r*.5,r*.5])s.rod([x,0,z],[x,base-.03,z],.018,wood);}if(u===2)for(let i=0;i<3;i++)s.box([.12,.06,.07],[Math.cos(i*2.094)*r*.6,.03,Math.sin(i*2.094)*r*.6],clay);if(u===3)s.ball([r*1.2,.025,r],[0,.025,0],pale,16);if(u===4){s.ring(r*.8,.012,[0,base-.015,0],metal).rotation.x=Math.PI/2;for(let i=0;i<3;i++)s.rod([Math.cos(i*2.094)*r,0,Math.sin(i*2.094)*r],[Math.cos(i*2.094)*r*.7,base,Math.sin(i*2.094)*r*.7],.009,metal);}
    if(t===2){const x=-r*.5;s.lathe([[.012,0],[.012,.05],[.045,.08],[.045,.24],[.035,.25]],s.material('#b9d0bd',{transparent:true,opacity:.45,depthWrite:false}),[x,base+.02,0]);s.tube([[x-.055,base,0],[x-.055,base+.18,0],[x+.055,base+.18,0],[x+.055,base,0]],.006,metal);}
    if(e<2){const x=r+.16;s.lathe([[.055,0],[.075,.11],[.07,.11],[.05,.015]],clay,[x,0,0]);for(let i=0;i<7;i++){const dx=(random()-.5)*.1,dz=(random()-.5)*.1;s.rod([x,.08,0],[x+dx,.22+random()*.08,dz],.003,green);s.ball([.015,e===1?.045:.02,.015],[x+dx,.27,dz],e===1?s.material('#8d879a'):green,10);}}if(e===2)s.ball([.06,.003,.025],[r+.12,.005,0],green,10);if(e===3)s.lathe([[.03,0],[.04,.1],[.014,.15],[.014,.19]],s.material('#bad0bf',{transparent:true,opacity:.5,depthWrite:false}),[r+.12,0,0]);const rimZ=rr*(f===1?.7:f===2?.65:1),mx=centers[0];if(m===0){s.ball([.018,.007,.002],[mx,base+.035,rimZ+.002],dark,10);for(const x of [-.012,.012])s.ball([.009,.015,.001],[mx+x,base+.045,rimZ+.004],pale,10);}if(m===1||m===3)s.label(m===1?'BEE WATER':'REFILLED',rr,.04,[mx,base+.027,rimZ+.007]);if(m===2)for(const cx of centers)for(let i=0;i<12;i++){const ang=i*Math.PI/6;s.ball([.006,.002,.006],[cx+Math.cos(ang)*rr*.94,base+h+.002,Math.sin(ang)*rimZ*.94],s.material('#688fa2'),8);}return s.finish();
  },
});

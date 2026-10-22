import * as THREE from 'three';
import { Sculpture, diorama, choice, score, noul, defineThing, defineWorld } from '@conjure/kit';

export default defineThing({
  questions: {

    style: choice('What kind of record player is it?', {deck:'A separate hi-fi turntable on a timber plinth.', suitcase:'A portable suitcase record player with open lid.', horn:'An old gramophone with a flared brass horn.'}),
    finish: choice('What is the casing finish?', {walnut:'Dark walnut timber.', cream:'Cream enamel.', teal:'Teal cloth covering.'}),
    disc: choice('What is on the platter?', {black:'A black vinyl record with a red centre label.', blue:'A translucent blue pressing.', none:'An empty rubber platter.'}),
    needle: choice('Where is the tonearm?', {playing:'Needle lowered on the record.', rest:'Tonearm parked on its support.', raised:'Tonearm lifted above the record.'}),
    sleeve: choice('What kind of sleeve lies beside it?', {none:'No loose sleeve.', portrait:'A warm abstract portrait cover.', landscape:'A moonlit landscape cover.', plain:'A plain paper sleeve with a circular cutout.'}),
    speakers: noul('Is there a pair of small bookshelf speakers beside it?'),
    dustCover: noul('If it is a hi-fi deck, is its clear dust cover raised?'),
    speed: choice('What speed is selected?', {album:'33 RPM long-playing album.', single:'45 RPM single.', old:'78 RPM shellac record.'}),
  },
  build(a, context) {

    const s=new Sculpture(context),color={walnut:'#806348',cream:'#ded5b8',teal:'#59837e'}[a.finish],body=s.material(color),dark=s.material('#303a35'),steel=s.material('#a6b3aa',{metalness:0.65}),cream=s.material('#e3d9bb');
    s.box([0.48,0.105,0.38],[0,0.065,0],body);for(const x of [-0.17,0.17])for(const z of [-0.12,0.12])s.cylinder(0.026,0.032,0.03,[x,0.018,z],dark,12);
    s.cylinder(0.157,0.157,0.012,[-0.04,0.127,0],steel,48);s.cylinder(0.148,0.148,0.008,[-0.04,0.138,0],dark,48);
    const disc=a.disc==='none'?null:s.cylinder(a.speed==='single'?0.113:0.145,a.speed==='single'?0.113:0.145,0.003,[-0.04,0.146,0],s.material(a.disc==='blue'?'#416f86':'#2c342f'),48);
    if(disc){s.cylinder(0.039,0.039,0.004,[-0.04,0.15,0],s.material('#ab6251'),24);for(let i=0;i<4;i++)s.ring(0.072+i*0.018,0.0007,[-0.04,0.149,0],s.material('#69746a')).rotation.x=Math.PI/2;}
    s.cylinder(0.005,0.005,0.025,[-0.04,0.159,0],steel,10);s.cylinder(0.027,0.03,0.065,[0.17,0.154,-0.12],steel,16);
    const tz=a.needle==='rest'?0.13:0.065,tx=a.needle==='rest'?0.175:0.045,ty=a.needle==='raised'?0.22:0.175;s.rod([0.17,0.2,-0.12],[tx,ty,tz],0.007,steel);s.box([0.029,0.013,0.024],[tx,ty,tz],dark);
    if(a.style==='suitcase'){s.box([0.48,0.055,0.34],[0,0.31,-0.25],body).rotation.x=-0.65;s.box([0.43,0.009,0.3],[0,0.331,-0.233],cream).rotation.x=-0.65;s.label('PORTABLE SOUND',0.3,0.055,[0,0.39,-0.188]);s.tube([[-0.07,0.07,0.21],[-0.065,0.045,0.24],[0.065,0.045,0.24],[0.07,0.07,0.21]],0.009,dark);}
    if(a.style==='horn'){const brass=s.material('#bca369',{metalness:0.6});s.tube([[0.18,0.15,-0.13],[0.21,0.27,-0.15],[0.16,0.36,-0.19]],0.018,brass);const horn=s.cylinder(0.18,0.018,0.35,[0.05,0.51,-0.2],brass,32);horn.rotation.z=0.48;s.cylinder(0.169,0.169,0.008,[-0.03,0.674,-0.2],dark,32).rotation.z=0.48;}
    if(a.style==='deck'&&a.dustCover){const cover=s.box([0.48,0.015,0.35],[0,0.33,-0.21],s.material('#bdcec5',{transparent:true,opacity:0.24}));cover.rotation.x=-0.75;}
    s.ball([0.014,0.014,0.008],[0.2,0.075,0.196],steel,12);s.label(a.speed==='album'?'33':a.speed==='single'?'45':'78',0.04,0.028,[0.12,0.074,0.196]);
    if(a.speakers)for(const x of [-0.4,0.4]){s.box([0.18,0.29,0.19],[x,0.15,-0.045],body);s.box([0.16,0.26,0.009],[x,0.15,0.055],dark);s.ring(0.049,0.01,[x,0.12,0.065],steel);s.ball([0.022,0.022,0.006],[x,0.23,0.065],steel,12);}
    if(a.sleeve!=='none'){const mat=s.material(a.sleeve==='plain'?'#dfd5b8':a.sleeve==='portrait'?'#b38370':'#789094');s.box([0.29,0.006,0.29],[-0.39,0.007,0.09],mat);if(a.sleeve==='plain')s.cylinder(0.055,0.055,0.003,[-0.39,0.013,0.09],dark,24);else{s.ball([0.09,0.004,0.08],[-0.39,0.014,0.09],cream,16);const l=s.label(a.sleeve==='portrait'?'AFTER HOURS':'THE LONG WAY HOME',0.25,0.04,[-0.39,0.017,0.205]);l.rotation.x=-Math.PI/2;}}
    const phase=context.random()*Math.PI*2;
    return s.finish({update:(_dt,time)=>{if(disc&&a.needle==='playing')disc.rotation.y=phase+time*(a.speed==='album'?3.46:a.speed==='single'?4.71:8.16);}});
  },
});

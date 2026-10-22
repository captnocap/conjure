import * as THREE from 'three';
import { diorama, choice, noul, defineWorld } from '@conjure/kit';

export default defineWorld({
  questions: {

    sky: choice('How is deep space presented?', {midnight:'A deep indigo void.', observatory:'A pale scientific star atlas.', wine:'A dark plum and rust universe.'}),
    field: choice('How crowded is the distant star field?', {sparse:'A few distant points and plenty of silence.', rich:'A rich background of tiny stars.', ribbon:'Stars concentrated into a diagonal ribbon.'}),
    view: choice('How do we survey the cosmos?', {sweep:'A broad oblique vista.', chart:'A high diagrammatic map.'}),

  },
  build(a, context) {
    const {mood, random} = context;
    const {art: s, world} = diorama(context, {background: {midnight:'#121b30',observatory:'#e0e5e5',wine:'#281b31'}[a.sky], floor:null, width:14, depth:10, floating:true, maxHeight:5, radius:2.2, pitch:a.view==='chart'?65:30});

    const stars=Array.from({length:a.field==='sparse'?60:260},(_,i)=>{const x=(random()-0.5)*14;return {at:[x,random()*7-1,a.field==='ribbon'?x*0.4+(random()-0.5)*1.5:(random()-0.5)*10] as [number,number,number],size:0.012+random()*0.022,color:a.sky==='observatory'?'#526c80':i%3?'#aabbdc':'#ead1a5'};});
    s.scatter(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#ffffff'}),stars);

    return world;
  },
});

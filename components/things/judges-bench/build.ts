import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const STYLES = {
  grand: { wood: '#4a2616', panel: '#623523', top: '#2c150c', leather: '#6a1826', trim: '#c9a24a', metal: 0.7 },
  municipal: { wood: '#a2784b', panel: '#b98f5e', top: '#6c5033', leather: '#3d4d5c', trim: '#8d9194', metal: 0.5 },
  modern: { wood: '#d3b98f', panel: '#e3cda6', top: '#35383b', leather: '#202327', trim: '#b9c0c4', metal: 0.8 },
  frontier: { wood: '#7a5839', panel: '#8d6a47', top: '#5a3f27', leather: '#6d4024', trim: '#3d3a37', metal: 0.4 },
} as const;
const PLATES = { judge: 'HON. JUDGE', silence: 'SILENCE', session: 'IN SESSION', adjourned: 'ADJOURNED', court: 'COURT No. 3', guilty: 'ALL RISE' } as const;

export default defineThing({
  questions: {
    style: choice('What kind of bench is it?', {
      grand: 'Dark carved mahogany with a tall pedimented canopy behind the chair, gilt trim and oxblood leather: an old high court.',
      municipal: 'Honey oak veneer and grey vinyl, a county courthouse built on a budget in the 1970s.',
      modern: 'Pale ash and black stone, flat and minimal, a new justice centre.',
      frontier: 'Rough sawn planks and an iron-bound chair: a circuit judge in a town hall or saloon.',
    }),
    seats: choice('How many judges does it seat?', {
      one: 'A single judge, alone with the decision.',
      three: 'A panel of three chairs, a tribunal or appeal court.',
    }),
    presence: choice('Who or what is at the bench right now?', {
      empty: 'Nobody. The chair sits squarely in place, waiting.',
      robe: 'Nobody, but a black robe is draped over the chair back.',
      askew: 'Nobody, and the chair is shoved back and turned aside as if someone left in a hurry.',
      judge: 'A robed, wigged judge sits there, more a dark shape than a person.',
    }),
    gavel: choice('Where is the gavel?', {
      rest: 'Lying at rest on its sounding block.',
      raised: 'Raised, about to come down.',
      fallen: 'Fallen to the floor in front of the bench.',
      none: 'Gone. Only the block remains.',
    }),
    papers: score('How much paperwork is piled on the bench?', ['Bare polished wood', 'One slim file', 'Several bound bundles', 'Tottering stacks']),
    carafe: choice('What state is the water carafe in?', {
      full: 'Full, with a clean upturned glass.',
      half: 'Half drunk, a long day.',
      empty: 'Empty and dry.',
      spilled: 'Knocked over, water pooled across the bench.',
    }),
    emblem: choice('What is mounted on the front panel?', {
      none: 'Nothing, plain panelling.',
      shield: 'A gilded heraldic shield.',
      seal: 'A round state seal.',
      scales: 'A small brass pair of scales.',
    }),
    plate: choice('What does the plate on the bench say?', PLATES),
    lamp: noul("Is there a green-shaded banker's lamp on the bench?"),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const st = STYLES[a.style];
    const wood = s.material(st.wood, { roughness: a.style === 'grand' ? 0.42 : 0.7 });
    const panel = s.material(st.panel, { roughness: 0.55 });
    const top = s.material(st.top, { roughness: 0.35 });
    const leather = s.material(mood.cheer > 0.7 && a.style === 'grand' ? '#1f4a35' : st.leather, { roughness: 0.6 });
    const trim = s.material(st.trim, { metalness: st.metal, roughness: 0.35 });
    const black = s.material('#17181b', { roughness: 0.8 });
    const white = s.material('#ece7da');
    const paper = s.material('#efe9d6');
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1f5', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
    const water = s.material('#8fc4d6', { roughness: 0.1, transparent: true, opacity: 0.75 });

    const n = a.seats === 'three' ? 3 : 1;
    const W = n === 3 ? 4.8 : 2.9;
    const D = 0.4, TOP = D + 1.12;
    const chairX = (i: number) => (i - (n - 1) / 2) * 1.45;

    // Dais with a step, the panelled front, returns and top.
    s.box([W + 1.1, D, 2.1], [0, D / 2, -0.25], wood);
    s.box([W + 1.5, D / 2, 2.3], [0, D / 4, -0.2], s.material(st.top));
    s.box([W, 1.12, 0.1], [0, D + 0.56, 0.5], wood);
    for (const x of [-1, 1]) s.box([0.1, 1.12, 0.95], [x * (W / 2 - 0.05), D + 0.56, 0.02], wood);
    s.box([W + 0.2, 0.07, 0.85], [0, TOP + 0.035, 0.12], top);
    s.box([W + 0.12, 0.09, 0.2], [0, TOP - 0.05, 0.5], panel);
    s.box([W + 0.08, 0.16, 0.16], [0, D + 0.08, 0.52], panel);
    const cols = Math.round(W / (a.style === 'frontier' ? 0.3 : 0.62));
    for (let i = 0; i < cols; i++) {
      const x = (i - (cols - 1) / 2) * (W - 0.2) / cols;
      if (a.style === 'frontier') s.box([(W - 0.2) / cols - 0.02, 0.86, 0.03], [x, D + 0.6 + (random() - 0.5) * 0.03, 0.56], random() > 0.5 ? panel : wood);
      else if (a.style === 'modern') s.box([0.02, 0.9, 0.02], [x + (W - 0.2) / cols / 2, D + 0.6, 0.555], top);
      else {
        if (mood.wear > 0.75 && random() < 0.2) continue;
        s.box([(W - 0.2) / cols - 0.12, 0.72, 0.03], [x, D + 0.6, 0.56], panel);
        s.box([(W - 0.2) / cols - 0.24, 0.6, 0.02], [x, D + 0.6, 0.582], wood);
      }
    }
    if (a.style === 'grand') for (const x of [-1, 1]) {
      s.cylinder(0.075, 0.09, 1.0, [x * (W / 2 + 0.02), D + 0.56, 0.56], wood, 14);
      s.ball([0.1, 0.1, 0.1], [x * (W / 2 + 0.02), TOP + 0.16, 0.5], trim, 14);
    }

    // Emblem and plate.
    const ez = 0.6;
    if (a.emblem === 'shield') {
      const shape = new THREE.Shape();
      shape.moveTo(-0.24, 0.28); shape.lineTo(0.24, 0.28); shape.lineTo(0.24, 0);
      shape.quadraticCurveTo(0.22, -0.26, 0, -0.36); shape.quadraticCurveTo(-0.22, -0.26, -0.24, 0); shape.closePath();
      s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }), trim, [0, D + 0.62, ez]);
      s.box([0.1, 0.56, 0.02], [0, D + 0.6, ez + 0.045], s.material('#8d1f2a'));
      s.box([0.42, 0.1, 0.02], [0, D + 0.72, ez + 0.047], s.material('#8d1f2a'));
    } else if (a.emblem === 'seal') {
      const disc = s.cylinder(0.32, 0.32, 0.04, [0, D + 0.62, ez + 0.01], trim, 32); disc.rotation.x = Math.PI / 2;
      const inner = s.cylinder(0.24, 0.24, 0.05, [0, D + 0.62, ez + 0.012], s.material('#22386b'), 32); inner.rotation.x = Math.PI / 2;
      for (let i = 0; i < 5; i++) s.rod([0, D + 0.62, ez + 0.04], [Math.sin(i * 1.2566) * 0.19, D + 0.62 + Math.cos(i * 1.2566) * 0.19, ez + 0.04], 0.03, trim, 0.004);
    } else if (a.emblem === 'scales') {
      const y = D + 0.6;
      s.rod([0, y - 0.3, ez], [0, y + 0.28, ez], 0.02, trim);
      s.rod([-0.3, y + 0.24, ez], [0.3, y + 0.24, ez], 0.015, trim);
      for (const x of [-0.3, 0.3]) {
        s.rod([x, y + 0.24, ez], [x - 0.09, y - 0.05, ez], 0.006, trim); s.rod([x, y + 0.24, ez], [x + 0.09, y - 0.05, ez], 0.006, trim);
        const pan = s.cylinder(0.12, 0.05, 0.04, [x, y - 0.06, ez], trim, 16); pan.castShadow = true;
      }
      s.box([0.26, 0.05, 0.06], [0, y - 0.31, ez], trim);
    }
    const plate = s.label(PLATES[a.plate], 0.62, 0.13, [n === 3 ? 0 : -W / 2 + 0.55, TOP + 0.14, 0.5], a.style === 'grand' ? '#2a1c08' : '#f4f1e8', a.style === 'grand' ? '#c9a24a' : '#24272b');
    plate.rotation.x = -0.25;
    s.box([0.64, 0.03, 0.08], [plate.position.x, TOP + 0.075, 0.49], top);

    // Grand canopy behind the chair.
    if (a.style === 'grand') {
      const cw = n === 3 ? 4.2 : 1.9;
      s.box([cw, 3.1, 0.12], [0, D + 1.55, -1.18], wood);
      s.box([cw - 0.5, 2.0, 0.03], [0, D + 1.7, -1.11], panel);
      for (const x of [-1, 1]) s.cylinder(0.09, 0.1, 3.1, [x * (cw / 2 - 0.02), D + 1.55, -1.08], wood, 14);
      s.box([cw + 0.3, 0.14, 0.34], [0, D + 3.17, -1.1], panel);
      const ped = new THREE.Shape(); ped.moveTo(-cw / 2 - 0.15, 0); ped.lineTo(cw / 2 + 0.15, 0); ped.lineTo(0, 0.55); ped.closePath();
      s.mesh(new THREE.ExtrudeGeometry(ped, { depth: 0.3, bevelEnabled: false }), wood, [0, D + 3.24, -1.25]);
      s.ball([0.12, 0.12, 0.05], [0, D + 3.44, -0.94], trim, 16);
    } else if (a.style === 'municipal') {
      // A tired flag on a stand and a wall-less acoustic screen.
      s.box([W + 0.4, 2.1, 0.06], [0, D + 1.05, -1.2], s.material('#8f7a5c'));
      s.cylinder(0.02, 0.02, 2.3, [W / 2 + 0.3, D + 1.15, -0.9], trim, 8);
      s.cylinder(0.16, 0.18, 0.05, [W / 2 + 0.3, D + 0.025, -0.9], trim, 16);
      s.box([0.04, 0.85, 0.5], [W / 2 + 0.3, D + 1.75, -0.63], s.material(mood.cheer > 0.5 ? '#274a8c' : '#5d6672'));
      s.ball([0.045, 0.045, 0.045], [W / 2 + 0.3, D + 2.33, -0.9], trim, 10);
    }

    // Chairs.
    const backH = { grand: 1.95, municipal: 1.5, modern: 1.7, frontier: 1.45 }[a.style];
    let armPivot: THREE.Group | null = null;
    for (let i = 0; i < n; i++) {
      const chair = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number]) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; chair.add(mesh); return mesh;
      };
      const frame = a.style === 'modern' ? black : wood;
      add(new THREE.BoxGeometry(0.66, 0.12, 0.6), leather, [0, 0.58, 0]);
      add(new THREE.BoxGeometry(0.7, backH, 0.1), frame, [0, 0.58 + backH / 2, -0.32]);
      add(new THREE.BoxGeometry(0.54, backH - 0.3, 0.06), leather, [0, 0.62 + backH / 2, -0.27]);
      if (a.style === 'grand' || a.style === 'frontier') {
        const cap = add(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 24, 1, false, 0, Math.PI), frame, [0, 0.58 + backH, -0.32]);
        cap.rotation.set(Math.PI / 2, Math.PI / 2, 0);
        if (a.style === 'grand') for (const x of [-1, 1]) add(new THREE.SphereGeometry(0.06, 12, 8), trim, [x * 0.35, 0.62 + backH, -0.32]);
      }
      for (const x of [-1, 1]) {
        add(new THREE.BoxGeometry(0.08, 0.06, 0.55), frame, [x * 0.36, 0.85, -0.02]);
        add(new THREE.BoxGeometry(0.07, 0.3, 0.07), frame, [x * 0.36, 0.7, 0.22]);
      }
      if (a.style === 'modern' || a.style === 'municipal') {
        add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 10), trim, [0, 0.27, 0]);
        for (let k = 0; k < 5; k++) { const leg = add(new THREE.BoxGeometry(0.06, 0.04, 0.34), trim, [Math.sin(k * 1.2566) * 0.17, 0.03, Math.cos(k * 1.2566) * 0.17]); leg.rotation.y = k * 1.2566; }
      } else for (const x of [-1, 1]) for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.08, 0.55, 0.08), frame, [x * 0.28, 0.27, z * 0.24]);
      const lead = i === (n - 1) / 2;
      if (a.presence === 'robe' && lead) {
        add(new THREE.BoxGeometry(0.8, 0.9, 0.2), black, [0.05, 0.4 + backH, -0.32]).rotation.z = 0.06;
        add(new THREE.BoxGeometry(0.3, 0.7, 0.08), black, [0.3, 0.1 + backH, -0.2]).rotation.z = -0.15;
      }
      chair.position.set(chairX(i), D, -0.55);
      if (a.presence === 'askew' && (lead || random() < 0.5)) {
        chair.position.z -= 0.35 + random() * 0.15; chair.position.x += (random() - 0.5) * 0.4; chair.rotation.y = (random() > 0.5 ? 1 : -1) * mix(0.5, 1.1, random());
      } else chair.rotation.y = (random() - 0.5) * 0.12;
      s.root.add(chair);

      if (a.presence === 'judge') {
        const x = chairX(i), y = D + 0.64, z = -0.5;
        s.lathe([[0.34, 0], [0.3, 0.45], [0.24, 0.75], [0.1, 0.84], [0, 0.85]], black, [x, y, z]);
        s.box([0.14, 0.2, 0.03], [x, y + 0.7, z + 0.22], white);
        if (a.style !== 'modern') s.box([0.5, 0.12, 0.3], [x, y + 0.74, z], s.material('#8d1f2a'));
        s.ball([0.11, 0.13, 0.12], [x, y + 0.99, z + 0.02], s.material(['#d9b596', '#b98a68', '#7a5238', '#e6c8ae'][Math.floor(random() * 4)]), 16);
        if (a.style === 'grand' || a.style === 'frontier') {
          s.ball([0.14, 0.11, 0.14], [x, y + 1.06, z - 0.02], white, 14);
          for (const sx of [-1, 1]) s.box([0.07, 0.3, 0.14], [x + sx * 0.13, y + 0.9, z - 0.02], white);
        } else s.ball([0.118, 0.09, 0.125], [x, y + 1.06, z - 0.02], s.material('#8f8f8c'), 14);
        // Arms: left rests on the bench; the lead judge's right may hold the gavel.
        s.rod([x - 0.26, y + 0.7, z], [x - 0.3, TOP + 0.1, z + 0.45], 0.07, black, 0.05);
        if (lead && a.gavel === 'raised') {
          armPivot = new THREE.Group(); armPivot.position.set(x + 0.28, y + 0.7, z);
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 10), black); arm.position.y = 0.3; arm.castShadow = true;
          armPivot.add(arm, makeGavel(wood, trim, [0, 0.52, 0], [-Math.PI / 2 + 0.3, 0, 0], 1.7));
          armPivot.rotation.x = 0.35; s.root.add(armPivot);
        } else s.rod([x + 0.26, y + 0.7, z], [x + 0.3, TOP + 0.1, z + 0.45], 0.07, black, 0.05);
      }
    }

    function makeGavel(headMat: THREE.Material, bandMat: THREE.Material, at: [number, number, number], rot: [number, number, number], scale: number) {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.28, 10), headMat); handle.position.y = 0.14;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.13, 16), headMat); head.position.y = 0.28; head.rotation.z = Math.PI / 2;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.03, 16), bandMat); band.position.y = 0.28; band.rotation.z = Math.PI / 2;
      for (const m of [handle, head, band]) m.castShadow = true;
      g.add(handle, head, band); g.position.set(...at); g.rotation.set(...rot); g.scale.setScalar(scale);
      return g;
    }

    // Gavel and block.
    const gx = chairX((n - 1) / 2) + 0.5, deskY = TOP + 0.07;
    s.cylinder(0.1, 0.11, 0.04, [gx, deskY + 0.02, 0.2], wood, 20);
    if (a.gavel === 'rest') s.root.add(makeGavel(wood, trim, [gx, deskY + 0.11, -0.28], [Math.PI / 2 - 0.04, 0, 0], 1.7));
    else if (a.gavel === 'raised' && !armPivot) s.root.add(makeGavel(wood, trim, [gx - 0.05, deskY + 0.04, 0.2], [0.5, 0.4, 0.25], 1.7));
    else if (a.gavel === 'fallen') s.root.add(makeGavel(wood, trim, [gx + (random() - 0.5) * 0.8, 0.07, 1.0 + random() * 0.15], [Math.PI / 2, 0, random() * 3], 1.7));

    // Carafe and glass.
    const cx = chairX((n - 1) / 2) - 0.55, cz = 0.22;
    const level = { full: 0.2, half: 0.11, empty: 0, spilled: 0 }[a.carafe];
    if (a.carafe === 'spilled') {
      const c = s.lathe([[0.0, 0], [0.075, 0.01], [0.085, 0.16], [0.035, 0.24], [0.04, 0.3]], glass, [cx, deskY + 0.08, cz]); c.rotation.z = Math.PI / 2 - 0.05;
      s.cylinder(0.3, 0.3, 0.006, [cx - 0.3, deskY + 0.004, cz], water, 24).scale.set(1, 1, 0.6);
      s.rod([cx - 0.5, deskY, cz + 0.3], [cx - 0.5, deskY - 0.3 - random() * 0.3, cz + 0.33], 0.012, water, 0.005);
    } else {
      s.lathe([[0.0, 0], [0.075, 0.01], [0.085, 0.16], [0.035, 0.24], [0.04, 0.3]], glass, [cx, deskY, cz]);
      if (level) s.cylinder(0.078, 0.07, level, [cx, deskY + 0.01 + level / 2, cz], water, 16);
      s.cylinder(0.04, 0.035, 0.11, [cx + 0.17, deskY + 0.055, cz + 0.05], glass, 12);
    }
    s.cylinder(0.14, 0.14, 0.012, [cx + 0.06, deskY + 0.006, cz], trim, 20).scale.set(1.3, 1, 1);

    // Papers: bound bundles with ribbon.
    const stacks = Math.round(mix(0, n === 3 ? 9 : 6, a.papers) * mix(0.8, 1.2, mood.density));
    const ribbon = s.material('#b3273a'), covers = ['#efe9d6', '#d8c9a0', '#9fb0b8', '#e4d7c0', '#c98f6a'];
    for (let i = 0; i < stacks; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * mix(0.85, W / 2 - 0.25, random()), z = mix(-0.1, 0.32, random());
      const h = a.papers < 0.35 ? 0.03 : mix(0.06, 0.1 + a.papers * 0.45, random());
      const layers = Math.max(1, Math.round(h / 0.05));
      for (let k = 0; k < layers; k++) {
        const b = s.box([0.24, h / layers - 0.004, 0.32], [x + (random() - 0.5) * 0.04 * (1 + mood.energy * 2), deskY + (k + 0.5) * h / layers, z], k % 2 ? paper : s.material(covers[Math.floor(random() * covers.length)]));
        b.rotation.y = (random() - 0.5) * mix(0.1, 0.7, mood.energy);
      }
      s.box([0.25, h + 0.004, 0.03], [x, deskY + h / 2, z], ribbon);
    }
    if (a.papers > 0.1) { const open = s.box([0.42, 0.012, 0.3], [chairX((n - 1) / 2), deskY + 0.006, 0.05], paper); open.rotation.y = (random() - 0.5) * 0.3; }
    if (mood.wear > 0.6) for (let i = 0; i < 4; i++) { const p = s.box([0.21, 0.004, 0.3], [(random() - 0.5) * W, 0.01, 0.9 + random() * 0.35], paper); p.rotation.y = random() * 3; }

    // Lamp and microphone.
    if (a.lamp) {
      const lx = W / 2 - 0.4;
      s.cylinder(0.09, 0.1, 0.025, [lx, deskY + 0.012, 0.15], trim, 16);
      s.rod([lx, deskY, 0.15], [lx, deskY + 0.3, 0.15], 0.012, trim);
      const shade = s.cylinder(0.07, 0.07, 0.3, [lx, deskY + 0.33, 0.19], s.material('#1f6b45', { emissive: '#3fae6d', emissiveIntensity: mix(0.25, 0.9, 1 - Math.abs(mood.daylight - 0.5) * 0) * mix(0.4, 1, mood.warmth), roughness: 0.3 }), 16);
      shade.rotation.z = Math.PI / 2; shade.scale.set(1, 1, 1.3);
      s.box([0.26, 0.01, 0.1], [lx, deskY + 0.285, 0.2], s.material('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 1.2 }));
    }
    if (a.style === 'modern' || a.style === 'municipal') for (let i = 0; i < n; i++) {
      const x = chairX(i) + 0.18;
      s.rod([x, deskY, 0.3], [x, deskY + 0.2, 0.36], 0.008, black);
      s.ball([0.022, 0.03, 0.022], [x, deskY + 0.22, 0.37], black, 8);
    }

    const pivot = armPivot as THREE.Group | null;
    const speed = mix(1.2, 6, mood.energy);
    return s.finish({ update: pivot ? (_dt, time) => { pivot.rotation.x = 0.25 + Math.max(0, Math.sin(time * speed)) ** 3 * 0.9; } : undefined });
  },
});

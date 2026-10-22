import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { afloat, painted, waterPatch } from './sea';

const LIVERY = {
  orange: 'International orange all over, the classic.',
  black: 'An orange canopy over black rubber tubes, an offshore workhorse.',
  red: 'Signal red, older and heavier.',
  lime: 'Fluorescent yellow-green, modern and unmissable.',
} as const;
const CANOPY: Record<keyof typeof LIVERY, string> = { orange: '#f25608', black: '#f25608', red: '#cf2219', lime: '#bfdc10' };
const TUBE: Record<keyof typeof LIVERY, string> = { orange: '#e84e06', black: '#24272a', red: '#b92520', lime: '#2a2d30' };

export default defineThing({
  questions: {
    canopy: choice('How is the canopy?', {
      open: 'The door is rolled wide open to the air.',
      ajar: 'The door is unzipped a slit, just enough to look out.',
      zipped: 'Zipped shut all round: a sealed orange tent with no sign of what is inside.',
      gone: 'Torn away: only the bare inflated arches and a few rags remain, everything exposed.',
    }),
    aboard: choice('If you can see inside, who or what is aboard?', {
      nobody: 'Nobody. It is empty.',
      survivor: 'One survivor huddled in the doorway, hood up.',
      pair: 'An adult with a child tucked against them.',
      dog: 'Only a dog, sitting up and watching the horizon.',
      supplies: 'No one, only ration packs, water pouches and a bailer left neatly on the floor.',
      seabird: 'No one human: a big seabird has taken it over.',
    }),
    signal: choice('How is it signalling?', {
      nothing: 'It is not signalling at all.',
      flare: 'A hand flare burning fierce red, trailing smoke.',
      smoke: 'An orange smoke float drifting beside it.',
      flag: 'A shirt tied to a paddle and held up as a flag.',
      strobe: 'The canopy strobe light pulsing white.',
      dye: 'A wide stain of bright green marker dye spreading in the water.',
    }),
    inflation: score('How well inflated is it?', ['Drum tight', 'Soft, the canopy sagging', 'Half collapsed and going down']),
    days: score('How long has it been adrift?', ['Launched within the hour', 'Several days, tally marks begun', 'Weeks: bleached, patched, weed growing']),
    livery: choice('What colours is it?', LIVERY),
    drogue: noul('Is the drogue (sea anchor) streamed out on its line?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const r = new Sculpture(context);
    s.root.add(r.root);
    const { mood, random } = context;
    const fade = a.days * 0.22 + mood.wear * 0.1;
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#f0c39a'), fade);
    const fabric = new THREE.MeshStandardMaterial({ color: tone(CANOPY[a.livery]), roughness: 0.7, side: THREE.DoubleSide, flatShading: true });
    const rubber = new THREE.MeshStandardMaterial({ color: a.livery === 'black' || a.livery === 'lime' ? new THREE.Color(TUBE[a.livery]) : tone(TUBE[a.livery]), roughness: 0.6 });
    const upperRubber = a.livery === 'black' ? new THREE.MeshStandardMaterial({ color: tone('#e84e06'), roughness: 0.6 }) : rubber;
    const silver = new THREE.MeshStandardMaterial({ color: '#e8eef0', metalness: 0.7, roughness: 0.25, emissive: '#aab4b8', emissiveIntensity: 0.25 });
    const dark = r.material('#25282b');
    const webbing = r.material('#e9e4d2', { roughness: 0.9 });
    const sag = a.inflation;
    const Rt = 1.12, rt = 0.2;
    const squash = mix(1, 0.62, sag);

    // Buoyancy tubes and floor.
    const tube = new THREE.TorusGeometry(Rt, rt, 12, 40);
    tube.rotateX(Math.PI / 2);
    const lower = r.mesh(tube, rubber, [0, 0.12, 0]);
    lower.scale.y = mix(1, 0.8, sag);
    const upperY = 0.12 + rt * 1.75 * mix(1, 0.75, sag);
    const upper = r.mesh(tube, upperRubber, [0, upperY, 0]);
    upper.scale.y = squash;
    upper.rotation.z = sag * 0.09;
    r.cylinder(Rt, Rt, 0.04, [0, 0.1, 0], dark, 32);
    const tape = r.mesh(new THREE.TorusGeometry(Rt + rt * 0.99, 0.022, 6, 48), silver, [0, upperY, 0]);
    tape.rotation.x = Math.PI / 2;
    const deckY = upperY + rt * squash * 0.9;

    // Lifeline scalloped around the outside, and the gas bottle that inflated it.
    for (let i = 0; i < 8; i++) {
      const from = (i / 8) * Math.PI * 2 + 0.2, to = ((i + 1) / 8) * Math.PI * 2 + 0.2, mid = (from + to) / 2, out = Rt + rt + 0.02;
      r.tube([[Math.cos(from) * out, upperY + 0.02, Math.sin(from) * out], [Math.cos(mid) * (out + 0.05), upperY - 0.22, Math.sin(mid) * (out + 0.05)], [Math.cos(to) * out, upperY + 0.02, Math.sin(to) * out]], 0.014, webbing);
    }
    const bottle = r.mesh(new THREE.CapsuleGeometry(0.075, 0.42, 4, 10), r.material('#8d9698', { metalness: 0.5, roughness: 0.4 }), [-(Rt + rt + 0.06) * 0.72, 0.12, -(Rt + rt + 0.06) * 0.72]);
    bottle.rotation.set(Math.PI / 2, 0, Math.PI / 4);

    // Canopy: a faceted dome with a door toward +z, on two inflated arches.
    const Rd = Rt + 0.02, domeH = mix(1.12, 0.6, sag);
    const canopy = new THREE.Group();
    canopy.position.y = deckY - 0.04;
    canopy.scale.y = domeH / Rd;
    canopy.rotation.z = sag * 0.12;
    r.root.add(canopy);
    const cast = <T extends THREE.Mesh>(mesh: T) => { mesh.castShadow = mesh.receiveShadow = true; canopy.add(mesh); return mesh; };
    const archMaterial = a.livery === 'black' ? rubber : upperRubber;
    for (const turn of [0.52, -0.52]) {
      const arch = cast(new THREE.Mesh(new THREE.TorusGeometry(Rd - 0.07, 0.075, 8, 28, Math.PI), archMaterial));
      arch.rotation.y = turn + Math.PI / 2;
    }
    const capT = Math.PI * 0.2, step = Math.PI / 6;
    const gap = a.canopy === 'open' ? step * 2 : a.canopy === 'ajar' ? step * 0.7 : 0;
    if (a.canopy !== 'gone') {
      cast(new THREE.Mesh(new THREE.SphereGeometry(Rd, 12, 3, 0, Math.PI * 2, 0, capT), fabric));
      cast(new THREE.Mesh(new THREE.SphereGeometry(Rd, Math.round((Math.PI * 2 - gap) / step), 4, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, capT, Math.PI / 2 - capT), fabric));
      if (gap > 0) {
        // The rolled door, tied up above the opening, and a dark interior behind it.
        const roll = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, a.canopy === 'open' ? 0.75 : 0.25, 4, 8), fabric));
        roll.rotation.z = Math.PI / 2;
        roll.position.set(0, Math.cos(capT) * Rd - 0.04, Math.sin(capT) * Rd + 0.1);
        const inner = cast(new THREE.Mesh(new THREE.SphereGeometry(Rd - 0.03, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5a2a16', roughness: 1, side: THREE.BackSide })));
        inner.castShadow = false;
      }
      // Reflective tape up the seams, a lettered panel and the tally of days.
      for (const k of [1, 3, 5, 7, 9, 11]) {
        const phi = Math.PI / 2 + k * step;
        const strip = cast(new THREE.Mesh(new THREE.TorusGeometry(Rd + 0.012, 0.02, 5, 14, Math.PI / 2 - capT * 0.4), silver));
        strip.rotation.y = phi;
      }
      const lettering = painted(256, 128, (ctx, w, h) => {
        ctx.fillStyle = `#${fabric.color.getHexString()}`; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#15171a'; ctx.font = 'bold 52px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('LIFERAFT', w / 2, 42, 236); ctx.font = 'bold 40px monospace'; ctx.fillText(`${4 + Math.floor(random() * 5) * 2} PERS`, w / 2, 94, 200);
      });
      const patchMesh = (map: THREE.Texture, phi: number, clip: boolean) => {
        const mesh = cast(new THREE.Mesh(new THREE.SphereGeometry(Rd + 0.012, 4, 3, phi - step * 0.42, step * 0.84, Math.PI * 0.27, Math.PI * 0.16), new THREE.MeshStandardMaterial({ map, roughness: 0.8, alphaTest: clip ? 0.5 : 0, side: THREE.DoubleSide })));
        mesh.castShadow = false;
      };
      patchMesh(lettering, Math.PI / 2 - step * 1.5, false);
      const tallies = Math.round(a.days * 34);
      if (tallies > 0) {
        const marks = painted(256, 128, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.strokeStyle = '#17181a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
          for (let i = 0; i < tallies; i++) {
            const group = Math.floor(i / 5), x0 = 14 + (group % 4) * 60, y0 = 10 + Math.floor(group / 4) * 60;
            ctx.beginPath();
            if (i % 5 === 4) { ctx.moveTo(x0 - 6, y0 + 40); ctx.lineTo(x0 + 44, y0 + 6); } else { ctx.moveTo(x0 + (i % 5) * 11, y0 + 2); ctx.lineTo(x0 + (i % 5) * 11 + 2, y0 + 44); }
            ctx.stroke();
          }
        });
        patchMesh(marks, Math.PI / 2 + step * 1.5, true);
      }
      if (a.days > 0.55) for (let i = 0; i < 3; i++) {
        const phi = random() * Math.PI * 2;
        if (Math.abs(((phi - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < step * 2) continue;
        cast(new THREE.Mesh(new THREE.SphereGeometry(Rd + 0.015, 2, 2, phi, 0.22, mix(0.75, 1.2, random()), 0.2), new THREE.MeshStandardMaterial({ color: '#8f9596', roughness: 0.9, side: THREE.DoubleSide }))).castShadow = false;
      }
    } else {
      const rag = new THREE.BufferGeometry();
      rag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.5, -0.1, 0, 0.12, -0.6, 0.06], 3));
      rag.computeVertexNormals();
      for (let i = 0; i < 6; i++) {
        const phi = random() * Math.PI * 2, t = mix(0.2, 1.1, random());
        const scrap = cast(new THREE.Mesh(rag, fabric));
        scrap.position.set(-Math.cos(phi) * Math.sin(t) * (Rd - 0.07) * 0.9, Math.cos(t) * (Rd - 0.07), Math.sin(phi) * Math.sin(t) * (Rd - 0.07) * 0.9);
        scrap.rotation.set(random() - 0.5, random() * 6, random() - 0.5);
        scrap.scale.setScalar(mix(0.6, 1.3, random()));
      }
    }
    // Strobe at the apex.
    const strobeOn = a.signal === 'strobe';
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const lamp = new THREE.MeshStandardMaterial({ color: '#f5f7f2', emissive: '#ffffff', emissiveIntensity: strobeOn ? 3 : 0.1 });
    const apexY = deckY - 0.04 + domeH;
    r.cylinder(0.05, 0.07, 0.06, [0, apexY + 0.03, 0], dark, 10);
    r.ball([0.05, 0.06, 0.05], [0, apexY + 0.1, 0], lamp, 10);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(mix(0.22, 0.5, dusk), 14, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: mix(0.1, 0.22, dusk), depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(0, apexY + 0.1, 0);
    halo.visible = strobeOn;
    r.root.add(halo);

    // Boarding ladder of webbing at the door.
    const doorR = Rt + rt + 0.02;
    for (const x of [-0.2, 0.2]) r.tube([[x, deckY, Rt * 0.92], [x, upperY + 0.1, doorR], [x, 0.05, doorR + 0.08], [x * 1.1, -0.4, doorR + 0.02]], 0.016, webbing);
    for (const y of [0.24, 0.0, -0.24]) r.box([0.46, 0.035, 0.05], [0, y, doorR + 0.07], y < -0.1 ? dark : webbing);

    // Who is aboard.
    const visible = a.canopy !== 'zipped';
    const skin = r.material(mix(0.3, 0.8, random()) > 0.55 ? '#c98f68' : '#8a5a3c');
    const person = (size: number, x: number, z: number, suit: string, wrapped: boolean) => {
      const g = new Sculpture(context);
      const cloth = g.material(wrapped ? '#c9ced2' : suit, wrapped ? { metalness: 0.6, roughness: 0.35 } : { roughness: 0.8 });
      g.ball([0.22, 0.3, 0.2], [0, 0.3, 0], cloth, 14);
      g.ball([0.25, 0.16, 0.27], [0, 0.14, 0.12], cloth, 12); // knees drawn up
      g.ball([0.125, 0.14, 0.13], [0, 0.66, 0.03], g.material(suit), 14); // hood
      g.ball([0.095, 0.105, 0.09], [0, 0.65, 0.07], skin, 12);
      if (!wrapped) g.box([0.3, 0.22, 0.1], [0, 0.38, 0.17], g.material('#f0b21c')); // lifejacket
      g.root.scale.setScalar(size);
      g.root.position.set(x, 0.12, z);
      g.root.rotation.y = (random() - 0.5) * 0.7;
      r.root.add(g.root);
      return g;
    };
    const grim = mood.cheer < 0.4;
    const seatZ = a.canopy === 'gone' ? 0.1 : 0.72;
    let waver: Sculpture | null = null;
    if (visible) {
      if (a.aboard === 'survivor') waver = person(1, 0, seatZ, '#c8322a', grim);
      else if (a.aboard === 'pair') { waver = person(1, -0.2, seatZ, '#1f4f8a', grim); person(0.62, 0.22, seatZ + 0.08, '#e2a31c', false); }
      else if (a.aboard === 'dog') {
        const coat = r.material(random() < 0.5 ? '#b7884f' : '#3a3431');
        const d = new Sculpture(context);
        d.ball([0.14, 0.22, 0.16], [0, 0.24, 0], coat, 12).rotation.x = -0.25;
        d.ball([0.15, 0.12, 0.2], [0, 0.1, -0.1], coat, 12);
        d.ball([0.1, 0.1, 0.11], [0, 0.52, 0.08], coat, 12);
        d.ball([0.055, 0.05, 0.09], [0, 0.49, 0.19], coat, 10);
        d.ball([0.025, 0.02, 0.02], [0, 0.5, 0.275], dark, 8);
        for (const side of [-1, 1]) { d.ball([0.035, 0.08, 0.03], [side * 0.085, 0.57, 0.04], coat, 8).rotation.z = side * 0.5; d.rod([side * 0.07, 0.2, 0.12], [side * 0.07, 0, 0.14], 0.03, coat); }
        d.rod([0, 0.08, -0.25], [0.04, 0.25, -0.36], 0.022, coat, 0.01);
        d.root.position.set(0, 0.12, seatZ);
        r.root.add(d.root);
      } else if (a.aboard === 'supplies') {
        for (let i = 0; i < 5; i++) r.box([0.2, 0.1, 0.14], [mix(-0.4, 0.4, random()), 0.17 + (i % 2) * 0.1, seatZ - 0.15 + (random() - 0.5) * 0.3], r.material(i % 2 ? '#e8e3d0' : '#c2a23a')).rotation.y = random();
        for (let i = 0; i < 4; i++) r.ball([0.09, 0.03, 0.13], [mix(-0.45, 0.45, random()), 0.15, seatZ + 0.1 + (random() - 0.5) * 0.2], r.material('#cfe2ea', { metalness: 0.4, roughness: 0.3 }), 10).rotation.y = random() * 3;
        r.cylinder(0.11, 0.08, 0.14, [0.42, 0.19, seatZ - 0.05], r.material('#d8432e'), 12);
      } else if (a.aboard === 'seabird') {
        const white = r.material('#f4f3ee'), wing = r.material('#33383d');
        const bird = new Sculpture(context);
        bird.ball([0.16, 0.15, 0.3], [0, 0.2, 0], white, 14);
        bird.ball([0.17, 0.05, 0.28], [0, 0.28, -0.05], wing, 12);
        bird.ball([0.085, 0.09, 0.1], [0, 0.42, 0.26], white, 12);
        bird.mesh(new THREE.ConeGeometry(0.035, 0.24, 8), r.material('#e8b9a8'), [0, 0.4, 0.44]).rotation.x = Math.PI / 2;
        bird.root.position.set(0, a.canopy === 'gone' ? 0.12 : upperY + rt * squash - 0.05, a.canopy === 'gone' ? 0 : Rt);
        bird.root.rotation.y = 0.6;
        r.root.add(bird.root);
      }
    }

    // Signals.
    const smokeMaterial = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: 1, transparent: true, opacity: 0.85 });
    const puffs: THREE.Mesh[] = [];
    const plume = (host: Sculpture, from: [number, number, number], hex: string, count: number, lean: number) => {
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const puff = host.ball([1, 1, 1], [from[0] - t * lean + (random() - 0.5) * 0.12, from[1] + t * mix(0.9, 1.6, 1 - mood.energy) + 0.05, from[2] + (random() - 0.5) * 0.15 - t * 0.2], smokeMaterial(hex), 10);
        puff.scale.setScalar(mix(0.06, 0.3, t) * mix(0.8, 1.2, random()));
        puff.castShadow = false;
        puff.userData.size = puff.scale.x;
        puffs.push(puff);
      }
    };
    const handAt: [number, number, number] = visible && waver ? [waver.root.position.x + 0.32, 1.05, waver.root.position.z + 0.05] : [0.42, deckY + 0.55, Rt * 0.8];
    const armFrom: [number, number, number] = visible && waver ? [waver.root.position.x + 0.18, 0.55, waver.root.position.z + 0.05] : [0.36, deckY - 0.05, Rt * 0.75];
    if (a.signal === 'flare') {
      r.rod(armFrom, handAt, 0.045, visible && waver ? r.material('#c8322a') : skin);
      r.rod(handAt, [handAt[0] + 0.03, handAt[1] + 0.22, handAt[2]], 0.02, r.material('#b1241c'));
      const fire = new THREE.MeshStandardMaterial({ color: '#ff5a3c', emissive: '#ff2a12', emissiveIntensity: 3.5 });
      r.ball([0.1, 0.13, 0.1], [handAt[0] + 0.03, handAt[1] + 0.3, handAt[2]], fire, 10);
      const flareHalo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff4a2a', transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
      flareHalo.position.set(handAt[0] + 0.03, handAt[1] + 0.3, handAt[2]);
      r.root.add(flareHalo);
      plume(r, [handAt[0], handAt[1] + 0.35, handAt[2]], '#e9d9d2', 7, mix(0.3, 1.6, mood.energy));
    } else if (a.signal === 'flag') {
      r.rod(armFrom, handAt, 0.045, visible && waver ? r.material('#c8322a') : skin);
      const top: [number, number, number] = [handAt[0] + 0.12, handAt[1] + 1.25, handAt[2]];
      r.rod([handAt[0] - 0.03, handAt[1] - 0.25, handAt[2]], top, 0.022, r.material('#d9c9a0'));
      const cloth = new THREE.PlaneGeometry(0.62, 0.42, 6, 3);
      const p = cloth.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9 + random()) * 0.05 * mix(0.3, 1.2, mood.energy));
      cloth.computeVertexNormals();
      r.mesh(cloth, new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f3f1ea' : '#e7dcc4', roughness: 0.9, side: THREE.DoubleSide }), [top[0] + 0.33, top[1] - 0.24, top[2]]);
    }

    // Trim: a soft raft wallows and tips.
    const tilt = (random() - 0.5) * 0.08 + sag * 0.12;
    r.root.rotation.z = tilt;
    r.root.rotation.y = (random() - 0.5) * 0.5;
    r.root.position.y = -sag * 0.07;

    const drogueX = -3.1;
    if (a.drogue) {
      const line = s.tube([[-(Rt + rt), 0.1, 0.1], [-1.9, -0.02, 0.2], [-2.5, 0.0, 0.05], [drogueX + 0.35, 0.05, 0]], 0.014, webbing);
      line.castShadow = false;
      const cone = s.mesh(new THREE.ConeGeometry(0.3, 0.55, 12, 1, true), new THREE.MeshStandardMaterial({ color: tone('#f2641a'), roughness: 0.8, side: THREE.DoubleSide }), [drogueX, 0.03, 0]);
      cone.rotation.z = Math.PI / 2 + 0.25;
      for (let i = 0; i < 4; i++) s.rod([drogueX + 0.33, 0.06, 0], [drogueX + 0.26, 0.03 + Math.cos(i * 1.57) * 0.3, Math.sin(i * 1.57) * 0.3], 0.006, webbing);
    }
    const left = a.drogue ? drogueX - 0.5 : -(Rt + rt) * 1.45, right = (Rt + rt) * 1.45 + (a.signal === 'smoke' ? 1.0 : 0);
    waterPatch(s, (right - left) / 2, (Rt + rt) * 1.42, { rings: 3, foam: 8, at: [(left + right) / 2, 0.25] });
    if (a.signal === 'smoke') {
      s.cylinder(0.08, 0.08, 0.16, [right - 0.75, 0.04, 0.5], s.material('#e8571c'), 10);
      plume(s, [right - 0.75, 0.1, 0.5], '#f08a2a', 9, mix(0.2, 1.8, mood.energy));
    } else if (a.signal === 'dye') {
      const stain = new THREE.Shape();
      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * Math.PI * 2, k = 1 + 0.25 * Math.sin(angle * 3 + 1) + 0.15 * Math.sin(angle * 7);
        const x = Math.cos(angle) * 0.95 * k, y = Math.sin(angle) * 0.5 * k;
        if (i === 0) stain.moveTo(x, y); else stain.lineTo(x, y);
      }
      const dye = s.mesh(new THREE.ShapeGeometry(stain), new THREE.MeshStandardMaterial({ color: '#19c43f', emissive: '#0c8a2a', emissiveIntensity: 0.35, roughness: 0.4 }), [0.4, 0.004, (Rt + rt) * 0.8]);
      dye.rotation.x = -Math.PI / 2;
      dye.castShadow = false;
    }
    if (a.days > 0.5) {
      const weed = new THREE.ConeGeometry(0.03, 0.2, 5);
      r.scatter(weed, r.material('#4c6b33', { roughness: 1 }), Array.from({ length: Math.round(a.days * 50) }, () => {
        const angle = random() * 6;
        return { at: [Math.cos(angle) * (Rt + rt * 0.8), -0.02, Math.sin(angle) * (Rt + rt * 0.8)] as const, size: mix(0.6, 1.5, random()) };
      })).rotation.x = Math.PI;
    }

    const pace = mix(0.5, 1.7, mood.energy), sway = mix(0.01, 0.08, mood.energy);
    return afloat(s, {
      footprint: (right - left) / 2,
      update: (_dt, time) => {
        r.root.rotation.z = tilt + Math.sin(time * pace) * sway;
        r.root.rotation.x = Math.cos(time * pace * 0.83) * sway * 0.8;
        if (strobeOn) { const on = (time * 1.4) % 1 < 0.5; lamp.emissiveIntensity = on ? 3 : 0.2; halo.visible = on; }
        for (const [i, puff] of puffs.entries()) puff.scale.setScalar(puff.userData.size * (1 + Math.sin(time * 1.3 + i) * 0.08));
      },
    });
  },
});
